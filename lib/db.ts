import { createClient } from '@libsql/client'

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

// Creates both tables on first import if they don't exist
const initPromise = client.batch([
  `CREATE TABLE IF NOT EXISTS supplier_emails (
    supplier    TEXT PRIMARY KEY,
    emails      TEXT NOT NULL,
    updated_at  TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS sent_emails (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    sent_at     TEXT    NOT NULL,
    week        INTEGER NOT NULL,
    supplier    TEXT    NOT NULL,
    recipients  TEXT    NOT NULL,
    mode        TEXT    NOT NULL,
    sent_by     TEXT
  )`,
], 'write').catch((err) => {
  console.error('[db] Failed to initialize tables:', err)
  throw err
})

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SupplierEmailRecord {
  supplier: string
  emails: string      // JSON array string
  updated_at: string
}

export interface SentRecord {
  id: number
  sent_at: string
  week: number
  supplier: string
  recipients: string  // JSON array string
  mode: string        // 'test' | 'live'
  sent_by: string | null
}

// ─── supplier_emails ──────────────────────────────────────────────────────────

/** Save (or overwrite) the email list for a supplier */
export async function saveSupplierEmails(supplier: string, emails: string[]) {
  await initPromise
  await client.execute({
    sql: `INSERT INTO supplier_emails (supplier, emails, updated_at)
          VALUES (?, ?, ?)
          ON CONFLICT(supplier) DO UPDATE SET
            emails     = excluded.emails,
            updated_at = excluded.updated_at`,
    args: [supplier, JSON.stringify(emails), new Date().toISOString()],
  })
}

/** Get saved emails for a list of supplier names in one query */
export async function getSupplierEmailsForWeek(
  suppliers: string[],
): Promise<Map<string, string[]>> {
  await initPromise
  if (suppliers.length === 0) return new Map()

  const placeholders = suppliers.map(() => '?').join(', ')
  const result = await client.execute({
    sql: `SELECT supplier, emails FROM supplier_emails WHERE supplier IN (${placeholders})`,
    args: suppliers,
  })

  const map = new Map<string, string[]>()
  for (const row of result.rows) {
    try {
      const name = row.supplier as string
      const emails = JSON.parse(row.emails as string) as string[]
      map.set(name, emails)
    } catch {
      // Skip rows with corrupted email data
    }
  }
  return map
}

// ─── sent_emails ──────────────────────────────────────────────────────────────

/** Record a successful live send */
export async function recordSend(data: {
  week: number
  supplier: string
  recipients: string[]
  mode: string
  sent_by: string | null
}) {
  await initPromise
  await client.execute({
    sql: `INSERT INTO sent_emails (sent_at, week, supplier, recipients, mode, sent_by)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [
      new Date().toISOString(),
      data.week,
      data.supplier,
      JSON.stringify(data.recipients),
      data.mode,
      data.sent_by,
    ],
  })
}

/** Get all send records for a given week, most recent first */
export async function getSentForWeek(week: number): Promise<SentRecord[]> {
  await initPromise
  const result = await client.execute({
    sql: 'SELECT * FROM sent_emails WHERE week = ? ORDER BY sent_at DESC',
    args: [week],
  })
  return result.rows as unknown as SentRecord[]
}
