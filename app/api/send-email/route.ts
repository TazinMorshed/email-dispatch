import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { google } from 'googleapis'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { subject, html, includeSignature, to: toOverride } = await req.json()

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
    const message = err instanceof Error ? err.message : 'Gmail API error'
    return NextResponse.json({ error: message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
