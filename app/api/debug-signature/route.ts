import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { google } from 'googleapis'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  )
  oauth2Client.setCredentials({ access_token: session.accessToken })
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

  try {
    const res = await gmail.users.settings.sendAs.list({ userId: 'me' })
    return NextResponse.json(res.data)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[debug-signature] Gmail API error:', err)
    return NextResponse.json(
      { error: `Failed to fetch Gmail signature settings: ${message}` },
      { status: 500 }
    )
  }
}
