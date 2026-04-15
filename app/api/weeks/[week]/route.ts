import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ week: string }> }) {
  const { week } = await params
  const weekNum = parseInt(week)
  if (isNaN(weekNum) || weekNum < 1) {
    return NextResponse.json({ error: 'Invalid week' }, { status: 400 })
  }
  const filename = `week_${String(weekNum).padStart(2, '0')}.json`
  const filepath = join(process.cwd(), 'Data', 'email_drafts', filename)
  let raw: string
  try {
    raw = readFileSync(filepath, 'utf-8')
  } catch {
    return NextResponse.json({ error: `Week ${weekNum} data not found` }, { status: 404 })
  }
  try {
    return NextResponse.json(JSON.parse(raw))
  } catch {
    console.error(`[weeks] week_${weekNum}.json is not valid JSON`)
    return NextResponse.json({ error: `Week ${weekNum} data is corrupted` }, { status: 500 })
  }
}
