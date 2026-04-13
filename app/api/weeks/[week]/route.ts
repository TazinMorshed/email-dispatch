import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ week: string }> }) {
  const { week } = await params
  const weekNum = parseInt(week)
  if (isNaN(weekNum) || weekNum < 1 || weekNum > 15) {
    return NextResponse.json({ error: 'Invalid week' }, { status: 400 })
  }
  const filename = `week_${String(weekNum).padStart(2, '0')}.json`
  const filepath = join(process.cwd(), 'Data', 'email_drafts', filename)
  try {
    const raw = readFileSync(filepath, 'utf-8')
    return NextResponse.json(JSON.parse(raw))
  } catch {
    return NextResponse.json({ error: 'Week not found' }, { status: 404 })
  }
}
