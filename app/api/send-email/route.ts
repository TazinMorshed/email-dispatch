import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { google } from 'googleapis'
import { NextRequest, NextResponse } from 'next/server'
import { recordSend } from '@/lib/db'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  let body: { subject?: unknown; html?: unknown; includeSignature?: unknown; to?: unknown; week?: unknown; weeks?: unknown; supplier?: unknown; mode?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  const subject = body.subject as string | undefined
  const html = body.html as string | undefined
  const includeSignature = body.includeSignature
  const toOverride = body.to
  const weeks: number[] = Array.isArray(body.weeks)
    ? (body.weeks as unknown[]).map(Number).filter((n) => !isNaN(n))
    : body.week !== undefined
    ? [Number(body.week)]
    : []
  const supplier = body.supplier
  const mode = body.mode

  // Live mode passes supplier emails. If an explicit live recipient list is empty,
  // reject it instead of silently falling back to the test recipient.
  let to: string | undefined
  if (Array.isArray(toOverride)) {
    if (toOverride.length === 0) {
      return NextResponse.json({ error: 'No email to send' }, { status: 400 })
    }
    to = toOverride.join(', ')
  } else if (typeof toOverride === 'string' && toOverride) {
    to = toOverride
  } else {
    to = process.env.TEST_RECIPIENT
  }

  if (!to || !subject || !html) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const cc = mode === 'live' ? 'billing@lufa.com' : process.env.CC_RECIPIENT?.trim()

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  )
  oauth2Client.setCredentials({ access_token: session.accessToken })

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

  // Only fetch signature when the toggle is ON
  let signature = ''
  if (includeSignature) {
    try {
      const sendAsRes = await gmail.users.settings.sendAs.list({ userId: 'me' })
      const defaultSendAs = sendAsRes.data.sendAs?.find((s) => s.isDefault) ?? sendAsRes.data.sendAs?.[0]
      signature = defaultSendAs?.signature ?? ''
    } catch {
      // Signature fetch failed — continue without it
    }
  }

  const encodedSubject = `=?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`
  const fullHtml = signature ? `${html}<br>${signature}` : html

  const emailLines = [
    `To: ${to}`,
    ...(cc ? [`Cc: ${cc}`] : []),
    `Subject: ${encodedSubject}`,
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
    '',
    fullHtml,
  ]
  const raw = Buffer.from(emailLines.join('\r\n')).toString('base64url')

  try {
    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw },
    })
  } catch (err) {
    console.error('[send-email] Gmail API error:', err)
    let message = 'Gmail API error — failed to send email'
    if (err instanceof Error) {
      message = err.message
      const gmailErr = err as { code?: number; errors?: Array<{ message: string }> }
      if (gmailErr.code === 401) message = 'Gmail authentication failed — please sign out and sign in again'
      else if (gmailErr.code === 403) message = 'Gmail permission denied — missing gmail.send scope. Please sign out and sign in again.'
      else if (gmailErr.code === 429) message = 'Gmail rate limit exceeded — please wait a moment and try again'
      else if (gmailErr.errors?.[0]?.message) message = gmailErr.errors[0].message
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }

  // Only record live sends — test sends are not tracked
  if (mode === 'live' && weeks.length > 0 && supplier) {
    for (const w of weeks) {
      try {
        await recordSend({
          week: w,
          supplier: String(supplier),
          recipients: Array.isArray(toOverride) ? toOverride : [to as string],
          mode: 'live',
          sent_by: session.user?.email ?? null,
        })
      } catch (err) {
        console.error('[send-email] Failed to record send in DB:', err)
      }
    }
  }

  return NextResponse.json({ success: true })
}
