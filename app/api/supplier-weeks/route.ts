import { NextRequest, NextResponse } from 'next/server'
import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'

// Returns sorted week numbers where the given supplier appears
export async function GET(req: NextRequest) {
  const supplier = req.nextUrl.searchParams.get('supplier')
  if (!supplier) {
    return NextResponse.json({ error: 'Missing supplier' }, { status: 400 })
  }

  try {
    const dir = join(process.cwd(), 'Data', 'email_drafts')
    const files = readdirSync(dir)
    const weeks: number[] = []

    for (const file of files) {
      const match = file.match(/^week_(\d+)\.json$/)
      if (!match) continue
      try {
        const raw = readFileSync(join(dir, file), 'utf-8')
        const data = JSON.parse(raw)
        const found = Array.isArray(data.suppliers) &&
          data.suppliers.some((s: { supplier: string }) => s.supplier === supplier)
        if (found) weeks.push(parseInt(match[1]))
      } catch {
        // skip corrupted files
      }
    }

    return NextResponse.json(weeks.sort((a, b) => a - b))
  } catch {
    return NextResponse.json([], { status: 200 })
  }
}
