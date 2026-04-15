/**
 * Database utility script
 *
 * Usage (from project root):
 *   npx tsx scripts/db-utils.ts peek     — print first 10 rows of each table
 *   npx tsx scripts/db-utils.ts clean    — delete ALL rows from both tables
 */

import { createClient } from '@libsql/client'
import { readFileSync } from 'fs'
import { join } from 'path'

// Load .env.local manually so this script works without a running Next.js server
function loadEnv() {
  try {
    const raw = readFileSync(join(process.cwd(), '.env.local'), 'utf8')
    for (const line of raw.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      const val = trimmed.slice(eq + 1).trim()
      if (!process.env[key]) process.env[key] = val
    }
  } catch {
    // .env.local not found — env vars must already be set
  }
}

loadEnv()

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

// ─── peek ────────────────────────────────────────────────────────────────────

async function peek() {
  // supplier_emails
  const emailRows = await client.execute(
    'SELECT supplier, emails, updated_at FROM supplier_emails ORDER BY updated_at DESC LIMIT 10',
  )
  console.log('\n── supplier_emails (up to 10 rows) ──────────────────────────')
  if (emailRows.rows.length === 0) {
    console.log('  (empty)')
  } else {
    console.log(
      'supplier'.padEnd(30),
      'emails'.padEnd(50),
      'updated_at',
    )
    console.log('─'.repeat(100))
    for (const row of emailRows.rows) {
      const emails = JSON.parse(row.emails as string) as string[]
      console.log(
        String(row.supplier).padEnd(30),
        emails.join(', ').padEnd(50),
        String(row.updated_at),
      )
    }
  }

  // sent_emails
  const sentRows = await client.execute(
    'SELECT id, sent_at, week, supplier, recipients, mode, sent_by FROM sent_emails ORDER BY sent_at DESC LIMIT 10',
  )
  console.log('\n── sent_emails (up to 10 rows) ──────────────────────────────')
  if (sentRows.rows.length === 0) {
    console.log('  (empty)')
  } else {
    console.log(
      'id'.padEnd(6),
      'week'.padEnd(6),
      'supplier'.padEnd(30),
      'mode'.padEnd(6),
      'sent_by'.padEnd(30),
      'sent_at',
    )
    console.log('─'.repeat(110))
    for (const row of sentRows.rows) {
      console.log(
        String(row.id).padEnd(6),
        String(row.week).padEnd(6),
        String(row.supplier).padEnd(30),
        String(row.mode).padEnd(6),
        String(row.sent_by ?? '—').padEnd(30),
        String(row.sent_at),
      )
    }
  }
  console.log('')
}

// ─── clean ───────────────────────────────────────────────────────────────────

async function clean() {
  await client.batch([
    'DELETE FROM supplier_emails',
    'DELETE FROM sent_emails',
  ], 'write')
  console.log('\n✓ Both tables cleared (supplier_emails, sent_emails)\n')
}

// ─── main ────────────────────────────────────────────────────────────────────

const command = process.argv[2]

if (command === 'peek') {
  peek().catch((err) => { console.error(err); process.exit(1) })
} else if (command === 'clean') {
  clean().catch((err) => { console.error(err); process.exit(1) })
} else {
  console.log('\nUsage:')
  console.log('  npx tsx scripts/db-utils.ts peek    — view first 10 rows')
  console.log('  npx tsx scripts/db-utils.ts clean   — wipe all data\n')
  process.exit(1)
}
