import { NextRequest, NextResponse } from 'next/server'
import { saveSupplierEmails, getSupplierEmailsForWeek } from '@/lib/db'

// GET /api/supplier-emails?suppliers=A,B,C
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('suppliers') ?? ''
  const suppliers = raw.split(',').map((s) => s.trim()).filter(Boolean)
  if (suppliers.length === 0) {
    return NextResponse.json({})
  }
  try {
    const map = await getSupplierEmailsForWeek(suppliers)
    return NextResponse.json(Object.fromEntries(map))
  } catch (err) {
    console.error('[supplier-emails] GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch supplier emails' }, { status: 500 })
  }
}

// POST /api/supplier-emails
// Body: { supplier: string, emails: string[] }
export async function POST(req: NextRequest) {
  let body: { supplier?: unknown; emails?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { supplier, emails } = body
  if (typeof supplier !== 'string' || !supplier.trim() || !Array.isArray(emails)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }
  // Validate each entry is a non-empty string
  const clean = (emails as unknown[]).filter((e): e is string => typeof e === 'string' && e.trim().length > 0)

  try {
    await saveSupplierEmails(supplier.trim(), clean)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[supplier-emails] POST error:', err)
    return NextResponse.json({ error: 'Failed to save supplier emails' }, { status: 500 })
  }
}
