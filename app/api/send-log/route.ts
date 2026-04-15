import { NextRequest, NextResponse } from 'next/server'
import { getSentForWeek } from '@/lib/db'

export async function GET(req: NextRequest) {
  const week = parseInt(req.nextUrl.searchParams.get('week') ?? '')
  if (isNaN(week) || week < 1 || week > 52) {
    return NextResponse.json({ error: 'Invalid week' }, { status: 400 })
  }
  try {
    const records = await getSentForWeek(week)
    return NextResponse.json(records)
  } catch (err) {
    console.error('[send-log] DB error:', err)
    return NextResponse.json({ error: 'Failed to fetch send log' }, { status: 500 })
  }
}
