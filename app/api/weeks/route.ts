import { NextResponse } from 'next/server'
import { readdirSync } from 'fs'
import { join } from 'path'

// Returns the sorted list of available week numbers based on files in Data/email_drafts/
export async function GET() {
  try {
    const dir = join(process.cwd(), 'Data', 'email_drafts')
    const files = readdirSync(dir)
    const weeks = files
      .map((f) => f.match(/^week_(\d+)\.json$/))
      .filter((m): m is RegExpMatchArray => m !== null)
      .map((m) => parseInt(m[1]))
      .sort((a, b) => a - b)
    return NextResponse.json(weeks)
  } catch (err) {
    console.error('[weeks] Failed to read email_drafts directory:', err)
    return NextResponse.json(
      { error: 'Failed to load available weeks. Check that Data/email_drafts/ exists.' },
      { status: 500 }
    )
  }
}
