'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'

interface SupplierTable {
  product_name: string[]
  lufa_farms_code: number[]
  rebate_per_unit: string[]
  rebate_cost: string[]
  qty_bought_at_rebate_cost: number[]
  regular_cost: string[]
  qty_bought_at_regular_cost: number[]
  credited_sum: string[]
  total_credited: string
}

interface Supplier {
  supplier: string
  emails: string[]
  language: string
  taxable: string
  year: number
  week: number
  period: string
  theme: string
  table: SupplierTable
}

interface WeekData {
  week: number
  total_suppliers: number
  suppliers: Supplier[]
}

interface AppConfig {
  ccRecipient: string
}

interface SentRecord {
  id: number
  sent_at: string
  week: number
  supplier: string
  recipients: string
  mode: string
  sent_by: string | null
}

// Formats "2026-04-05 to 2026-04-11" → "April 5 - April 11"
function formatPeriod(period: string): string {
  const parts = period.split(' to ')
  if (parts.length !== 2) return period
  const fmt = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-CA', { month: 'long', day: 'numeric' })
  }
  return `${fmt(parts[0])} - ${fmt(parts[1])}`
}

function buildEmailTable(supplier: Supplier): string {
  const { table } = supplier
  const isFr = supplier.language === 'fr'

  // Compact week label for the table cell: "W15 · Apr 5–11, 2026"
  const parts = supplier.period.split(' to ')
  let weekLabel = `W${supplier.week}`
  if (parts.length === 2) {
    const fmt = (s: string) => new Date(s + 'T00:00:00').toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
    const year = new Date(parts[1] + 'T00:00:00').getFullYear()
    weekLabel = `W${supplier.week} · ${fmt(parts[0])}–${fmt(parts[1])}, ${year}`
  }

  const base = 'border:1px solid #d0d0d0;padding:2px 6px;font-size:11px;font-family:Arial,sans-serif;line-height:1.3;'
  const th = (content: string) =>
    `<th style="${base}background-color:#e8e9ea;color:#333;font-weight:600;text-align:left;max-width:80px;">${content}</th>`
  const td = (content: string | number, extra = '') =>
    `<td style="${base}white-space:nowrap;${extra}">${content}</td>`
  const tdEmpty = () =>
    `<td style="${base}"></td>`
  const tdCredit = (content: string | number) =>
    `<td style="${base}white-space:nowrap;background-color:#ffd7d7;font-weight:bold;">${content}</td>`

  const dataRows = table.product_name
    .map((name, i) => {
      const totalQty = (table.qty_bought_at_rebate_cost[i] ?? 0) + (table.qty_bought_at_regular_cost[i] ?? 0)
      return `<tr>
        ${td(table.lufa_farms_code[i])}
        ${td(name)}
        ${td(weekLabel)}
        ${td(table.rebate_per_unit[i], 'font-weight:bold;')}
        ${td(totalQty)}
        ${td(table.qty_bought_at_rebate_cost[i])}
        ${td(table.qty_bought_at_regular_cost[i])}
        ${tdCredit(table.credited_sum[i])}
      </tr>`
    })
    .join('')

  // Yellow only on the last 2 cells — "TOTAL" label and the amount
  const yellow = 'background-color:#FFFF00;font-weight:bold;'
  const totalRow = `<tr>
    ${tdEmpty()}${tdEmpty()}${tdEmpty()}${tdEmpty()}${tdEmpty()}${tdEmpty()}
    ${td('TOTAL', yellow)}
    ${td(table.total_credited, yellow)}
  </tr>`

  return `<table style="border-collapse:collapse;font-family:Arial,sans-serif;">
    <thead>
      <tr>
        ${th('Code des Fermes Lufa')}
        ${th('Produit / Product')}
        ${th('Semaine / Week')}
        ${th('Rabais $/Unité / Rebate $/Unit')}
        ${th('Total sold quantities')}
        ${th('Quantities Bought at rebate cost')}
        ${th('Quantities Bought at Regular Cost')}
        <th style="${base}background-color:#e8e9ea;color:#333;font-weight:700;text-align:left;max-width:80px;">Credited Sum</th>
      </tr>
    </thead>
    <tbody>${dataRows}</tbody>
    <tfoot>${totalRow}</tfoot>
  </table>`
}

function buildMergedTable(suppliers: Supplier[], isFr: boolean): string {
  const base = 'border:1px solid #d0d0d0;padding:2px 6px;font-size:11px;font-family:Arial,sans-serif;line-height:1.3;'
  const th = (content: string) =>
    `<th style="${base}background-color:#e8e9ea;color:#333;font-weight:600;text-align:left;max-width:80px;">${content}</th>`
  const td = (content: string | number, extra = '') =>
    `<td style="${base}white-space:nowrap;${extra}">${content}</td>`
  const tdEmpty = () => `<td style="${base}"></td>`
  const tdCredit = (content: string | number) =>
    `<td style="${base}white-space:nowrap;background-color:#ffd7d7;font-weight:bold;">${content}</td>`
  const yellow = 'background-color:#FFFF00;font-weight:bold;'

  // Build rows for every week
  const allDataRows = suppliers.map((supplier) => {
    const { table } = supplier
    const parts = supplier.period.split(' to ')
    let weekCell = `W${supplier.week}`
    if (parts.length === 2) {
      const fmt = (s: string) => new Date(s + 'T00:00:00').toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
      const year = new Date(parts[1] + 'T00:00:00').getFullYear()
      weekCell = `W${supplier.week} · ${fmt(parts[0])}–${fmt(parts[1])}, ${year}`
    }
    return table.product_name.map((name, i) => {
      const totalQty = (table.qty_bought_at_rebate_cost[i] ?? 0) + (table.qty_bought_at_regular_cost[i] ?? 0)
      return `<tr>
        ${td(table.lufa_farms_code[i])}
        ${td(name)}
        ${td(weekCell)}
        ${td(table.rebate_per_unit[i], 'font-weight:bold;')}
        ${td(totalQty)}
        ${td(table.qty_bought_at_rebate_cost[i])}
        ${td(table.qty_bought_at_regular_cost[i])}
        ${tdCredit(table.credited_sum[i])}
      </tr>`
    }).join('')
  }).join('')

  // Per-week subtotal rows + grand total
  const subtotalRows = suppliers.map((supplier) => {
    const label = isFr ? `Sous-total W${supplier.week}` : `Subtotal W${supplier.week}`
    return `<tr>
      ${tdEmpty()}${tdEmpty()}${tdEmpty()}${tdEmpty()}${tdEmpty()}${tdEmpty()}
      ${td(label, yellow)}
      ${td(supplier.table.total_credited, yellow)}
    </tr>`
  }).join('')

  const grandTotal = suppliers.reduce((sum, sup) => {
    const val = parseFloat(sup.table.total_credited.replace(/[^0-9.-]/g, ''))
    return sum + (isNaN(val) ? 0 : val)
  }, 0)
  const grandFormatted = grandTotal.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const grandLabel = isFr ? 'TOTAL GÉNÉRAL' : 'GRAND TOTAL'
  const grandRow = `<tr>
    ${tdEmpty()}${tdEmpty()}${tdEmpty()}${tdEmpty()}${tdEmpty()}${tdEmpty()}
    ${td(grandLabel, 'background-color:#FFD700;font-weight:bold;')}
    ${td(`$${grandFormatted}`, 'background-color:#FFD700;font-weight:bold;')}
  </tr>`

  return `<table style="border-collapse:collapse;font-family:Arial,sans-serif;">
    <thead>
      <tr>
        ${th('Code des Fermes Lufa')}
        ${th('Produit / Product')}
        ${th('Semaine / Week')}
        ${th('Rabais $/Unité / Rebate $/Unit')}
        ${th('Total sold quantities')}
        ${th('Quantities Bought at rebate cost')}
        ${th('Quantities Bought at Regular Cost')}
        <th style="${base}background-color:#e8e9ea;color:#333;font-weight:700;text-align:left;max-width:80px;">Credited Sum</th>
      </tr>
    </thead>
    <tbody>${allDataRows}</tbody>
    <tfoot>${subtotalRows}${grandRow}</tfoot>
  </table>`
}

function generateEmailHtml(suppliers: Supplier[], senderName?: string): { subject: string; html: string } {
  const primary = suppliers[0]
  const isTaxable = primary.taxable === 'Yes'
  const isFr = primary.language === 'fr'

  // Subject: Promotion W13-W14-W15 - count & recount - SupplierName
  const weekTag = suppliers.map((sup) => `W${sup.week}`).join('-')
  const subject = `Promotion ${weekTag} - count & recount - ${primary.supplier}`

  const st = 'font-family:Arial,sans-serif;font-size:14px;color:#000;'
  const p0   = (text: string) => `<p style="margin:0;${st}">${text}</p>`
  const gap  = `<br>`
  const gap2 = `<br><br>`

  // All weeks merged into one table — the Week column in each row identifies the week
  const tablesHtml = suppliers.length === 1
    ? buildEmailTable(suppliers[0])
    : buildMergedTable(suppliers, isFr)

  const firstName = senderName?.split(' ')[0] ?? ''
  const closingText = isFr ? 'Merci de ta collaboration,' : 'Thank you for your collaboration,'
  const closing = firstName
    ? `<p style="margin:0;${st}">${closingText}</p><p style="margin:0;${st}">${firstName}</p>`
    : `<p style="margin:0;${st}">${closingText}</p>`

  // Week reference text: "13" / "13 and 14" / "13, 14 and 15"
  const weekNums = suppliers.map((sup) => sup.week)
  const sep = isFr ? ' et ' : ' and '
  const weekRef = weekNums.length === 1
    ? String(weekNums[0])
    : weekNums.slice(0, -1).join(', ') + sep + weekNums[weekNums.length - 1]
  const semaineLabel = isFr
    ? (weekNums.length === 1 ? `semaine ${weekRef}` : `semaines ${weekRef}`)
    : (weekNums.length === 1 ? `week ${weekRef}` : `weeks ${weekRef}`)

  let body = ''

  if (!isTaxable && isFr) {
    body = `
      ${p0('Bonjour,')}
      ${gap}
      ${p0(`Voici le résultat des promotions de la ${semaineLabel} - <strong>étant donné que le produit est non-taxable, nous allons déduire ce montant du prochain paiement.</strong>`)}
      ${gap}
      ${tablesHtml}
            ${gap2}
      ${closing}
    `
  } else if (!isTaxable && !isFr) {
    body = `
      ${p0('Hi,')}
      ${gap}
      ${p0(`Here are the results of the promotions for ${semaineLabel} - <strong>since the products are non-taxable, we will deduct this amount on your next payment.</strong>`)}
      ${gap}
      ${tablesHtml}
            ${gap2}
      ${closing}
    `
  } else if (isTaxable && isFr) {
    body = `
      ${p0('Bonjour,')}
      ${gap}
      ${p0(`Voici les résultats des promotions de la ${semaineLabel}`)}
      ${gap}
      ${tablesHtml}
            ${gap}
      ${p0('<strong>Les produits étant taxables, merci d\'envoyer une note de crédit à billing@lufa.com et à moi.</strong>')}
      ${gap2}
      ${closing}
    `
  } else {
    body = `
      ${p0('Hi,')}
      ${gap}
      ${p0(`Here are the promotions for ${semaineLabel}`)}
      ${gap}
      ${tablesHtml}
            ${gap}
      ${p0('<strong>Please send the credit note (tax included) directly to: 📩 billing@lufa.com and myself.</strong>')}
      ${gap2}
      ${closing}
    `
  }

  const html = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#000;max-width:900px;">${body}</div>`
  return { subject, html }
}

function Toggle({
  enabled,
  onChange,
  labelOn,
  labelOff,
  colorOn,
}: {
  enabled: boolean
  onChange: (v: boolean) => void
  labelOn: string
  labelOff: string
  colorOn: string
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className="flex items-center gap-2 cursor-pointer select-none text-slate-700"
    >
      <div className={`relative h-6 w-11 rounded-full transition-colors duration-300 ease-in-out ${enabled ? colorOn : 'bg-slate-300'}`}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 ease-in-out ${enabled ? 'translate-x-5' : 'translate-x-0'}`} style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.25)' }} />
      </div>
      <span className="text-xs font-semibold">{enabled ? labelOn : labelOff}</span>
    </button>
  )
}


export default function Page() {
  const { data: session, status } = useSession()
  const [availableWeeks, setAvailableWeeks] = useState<number[]>([])
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null)
  const [weekData, setWeekData] = useState<WeekData | null>(null)
  const [loadingWeek, setLoadingWeek] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [includeSignature, setIncludeSignature] = useState(true)
  const [sendToSupplier, setSendToSupplier] = useState(false)
  const [pendingEmails, setPendingEmails] = useState<string[]>([])
  const [committedEmails, setCommittedEmails] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [ccRecipient, setCcRecipient] = useState('')
  // key: supplier name → most recent SentRecord for this week
  const [sentLog, setSentLog] = useState<Map<string, SentRecord>>(new Map())
  const [showSentWarning, setShowSentWarning] = useState(false)
  // key: supplier name → saved email list from DB (overrides JSON)
  const [savedEmails, setSavedEmails] = useState<Map<string, string[]>>(new Map())
  // email content overrides — default to supplier's JSON values, togglable
  const [langOverride, setLangOverride] = useState<'en' | 'fr'>('en')
  const [taxableOverride, setTaxableOverride] = useState(false)
  // multi-week merge
  const [mergeWeeks, setMergeWeeks] = useState<number[]>([])
  const [mergeWeekData, setMergeWeekData] = useState<Record<number, WeekData>>({})
  // weeks (other than primary) where this supplier actually appears
  const [supplierWeeks, setSupplierWeeks] = useState<number[]>([])
  const [loadingSupplierWeeks, setLoadingSupplierWeeks] = useState(false)
  // session-level cache: week → set of supplier names sent this session (survives week navigation)
  const [recentlySent, setRecentlySent] = useState<Map<number, Set<string>>>(new Map())

  useEffect(() => {
    if (supplier) {
      // DB saved emails override JSON defaults
      const emails = savedEmails.get(supplier.supplier) ?? supplier.emails
      setPendingEmails(emails)
      setCommittedEmails(emails)
      setTagInput('')
      // Reset toggles to this supplier's defaults
      setLangOverride(supplier.language === 'fr' ? 'fr' : 'en')
      setTaxableOverride(supplier.taxable === 'Yes')
      // Reset merge when switching suppliers
      setMergeWeeks([])
      setMergeWeekData({})
      // Fetch which other weeks this supplier appears in
      setSupplierWeeks([])
      setLoadingSupplierWeeks(true)
      fetch(`/api/supplier-weeks?supplier=${encodeURIComponent(supplier.supplier)}`)
        .then((r) => r.json())
        .then((weeks: number[]) => setSupplierWeeks(weeks.filter((w) => w !== selectedWeek)))
        .catch(() => setSupplierWeeks([]))
        .finally(() => setLoadingSupplierWeeks(false))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSupplier, savedEmails])

  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((data: AppConfig) => setCcRecipient(data.ccRecipient ?? ''))
      .catch(() => setCcRecipient(''))
  }, [])

  useEffect(() => {
    fetch('/api/weeks')
      .then((r) => r.json())
      .then((weeks: number[]) => setAvailableWeeks(weeks))
      .catch(() => setAvailableWeeks([]))
  }, [])

  useEffect(() => {
    if (selectedWeek === null) return
    setLoadingWeek(true)
    setSelectedSupplier(null)
    setWeekData(null)
    setSent(false)
    setSendError(null)
    setSentLog(new Map())
    setSavedEmails(new Map())
    setMergeWeeks([])
    setMergeWeekData({})
    // Step 1: load week data + send log in parallel
    Promise.all([
      fetch(`/api/weeks/${selectedWeek}`).then((r) => r.json()),
      fetch(`/api/send-log?week=${selectedWeek}`).then((r) => r.json()),
    ]).then(([weekJson, logJson]) => {
      setWeekData(weekJson)
      if (Array.isArray(logJson)) {
        const map = new Map<string, SentRecord>()
        for (const record of logJson as SentRecord[]) {
          if (!map.has(record.supplier)) map.set(record.supplier, record)
        }
        setSentLog(map)
      }
      // Step 2: fetch saved emails for all suppliers in this week
      const supplierNames = (weekJson.suppliers as Supplier[]).map((s) => s.supplier)
      if (supplierNames.length > 0) {
        const query = supplierNames.map(encodeURIComponent).join(',')
        fetch(`/api/supplier-emails?suppliers=${query}`)
          .then((r) => r.json())
          .then((data: Record<string, string[]>) => {
            setSavedEmails(new Map(Object.entries(data)))
          })
          .catch(() => {})
      }
    }).finally(() => setLoadingWeek(false))
  }, [selectedWeek])

  // useMemo gives supplier a stable reference — only changes when weekData or selectedSupplier changes
  const supplier = useMemo(
    () => weekData?.suppliers.find((s) => s.supplier === selectedSupplier) ?? null,
    [weekData, selectedSupplier]
  )

  const [emailContent, setEmailContent] = useState<{ subject: string; html: string } | null>(null)
  const [activeMergedWeeks, setActiveMergedWeeks] = useState<number[]>([])

  // Rebuild email content whenever supplier, overrides, or merge data changes
  useEffect(() => {
    if (!supplier) {
      setEmailContent(null)
      setActiveMergedWeeks([])
      return
    }
    const override = (s: Supplier): Supplier => ({
      ...s,
      language: langOverride,
      taxable: taxableOverride ? 'Yes' : 'No',
    })
    const additionals: Supplier[] = mergeWeeks
      .map((w) => mergeWeekData[w]?.suppliers.find((s) => s.supplier === supplier.supplier))
      .filter((s): s is Supplier => !!s)
      .map(override)
    const allSups = [override(supplier), ...additionals].sort((a, b) => a.week - b.week)
    setEmailContent(generateEmailHtml(allSups, session?.user?.name ?? undefined))
    setActiveMergedWeeks(allSups.map((s) => s.week))
  }, [supplier, mergeWeeks, mergeWeekData, langOverride, taxableOverride, session?.user?.name])

  function isValidEmail(e: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim()) }
  function buildUpdatedEmails(baseEmails: string[], candidate: string) {
    const val = candidate.trim()
    if (!val || !isValidEmail(val) || baseEmails.includes(val)) {
      return baseEmails
    }
    return [...baseEmails, val]
  }
  const tagInputValid = tagInput.trim() === '' || isValidEmail(tagInput)
  const emailDirty = JSON.stringify(pendingEmails) !== JSON.stringify(committedEmails) || tagInput.trim() !== ''
  const noLiveRecipients = sendToSupplier && committedEmails.length === 0

  function addTag() {
    const updated = buildUpdatedEmails(pendingEmails, tagInput)
    setPendingEmails(updated)
    if (updated !== pendingEmails) {
      setTagInput('')
    }
  }
  function removeTag(i: number) { setPendingEmails((prev) => prev.filter((_, idx) => idx !== i)) }
  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === 'Tab' || e.key === ',') { e.preventDefault(); addTag() }
    else if (e.key === 'Backspace' && tagInput === '') removeTag(pendingEmails.length - 1)
  }
  function commitPendingEmails() {
    const updated = buildUpdatedEmails(pendingEmails, tagInput)
    setPendingEmails(updated)
    setCommittedEmails(updated)
    setTagInput('')
    return updated
  }
  function handleAccept() {
    const updated = commitPendingEmails()
    if (!supplier) return
    // Persist to DB so it survives page reloads and future weeks
    fetch('/api/supplier-emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ supplier: supplier.supplier, emails: updated }),
    }).then(() => {
      setSavedEmails((prev) => {
        const next = new Map(prev)
        next.set(supplier.supplier, updated)
        return next
      })
    }).catch(() => {})
  }
  function handleSendToSupplierChange(nextValue: boolean) {
    if (nextValue) {
      commitPendingEmails()
    }
    setSendToSupplier(nextValue)
  }

  async function doSend() {
    if (!emailContent || !supplier) return
    const liveRecipients = sendToSupplier ? commitPendingEmails() : committedEmails
    if (sendToSupplier && liveRecipients.length === 0) {
      setSendError('No email to send')
      return
    }
    setSending(true)
    setSendError(null)
    setSent(false)
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...emailContent,
          includeSignature,
          to: sendToSupplier ? liveRecipients : null,
          weeks: activeMergedWeeks,
          supplier: supplier.supplier,
          mode: sendToSupplier ? 'live' : 'test',
        }),
      })
      if (!res.ok) {
        let message = `Error ${res.status}`
        try {
          const data = await res.json()
          message = data.error ?? message
        } catch {
          // response body was not JSON
        }
        throw new Error(message)
      }
      setSent(true)
      setTimeout(() => setSent(false), 4000)
      // Only update the sent badge for live sends
      if (sendToSupplier) {
        const sentAt = new Date().toISOString()
        // Update sentLog for the primary week
        setSentLog((prev) => {
          const next = new Map(prev)
          next.set(supplier.supplier, {
            id: Date.now(),
            sent_at: sentAt,
            week: supplier.week,
            supplier: supplier.supplier,
            recipients: JSON.stringify(liveRecipients),
            mode: 'live',
            sent_by: null,
          })
          return next
        })
        // Mark ALL merged weeks as sent in the session cache
        setRecentlySent((prev) => {
          const next = new Map(prev)
          for (const w of activeMergedWeeks) {
            const weekSet = new Set(next.get(w) ?? [])
            weekSet.add(supplier.supplier)
            next.set(w, weekSet)
          }
          return next
        })
      }
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Failed to send')
    } finally {
      setSending(false)
    }
  }

  function toggleMergeWeek(w: number) {
    if (mergeWeeks.includes(w)) {
      setMergeWeeks((prev) => prev.filter((x) => x !== w))
      setMergeWeekData((prev) => { const { [w]: _, ...rest } = prev; return rest })
    } else {
      setMergeWeeks((prev) => [...prev, w].sort((a, b) => a - b))
      fetch(`/api/weeks/${w}`)
        .then((r) => r.json())
        .then((data: WeekData) => setMergeWeekData((prev) => ({ ...prev, [w]: data })))
        .catch(() => {})
    }
  }

  function handleSend() {
    if (!supplier) return
    const alreadySent = sentLog.get(supplier.supplier) ||
      recentlySent.get(selectedWeek ?? 0)?.has(supplier.supplier)
    if (alreadySent) {
      setShowSentWarning(true)
    } else {
      doSend()
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-[1400px] flex-col px-6 py-8">
      {/* Header */}
      <header className="mb-6 flex items-center justify-between rounded-[28px] border border-slate-200/80 bg-white/90 px-6 py-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)] backdrop-blur">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Promo Credit</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">Supplier Email Dispatch</h1>
        </div>
        {status === 'loading' ? (
          <div className="h-10 w-40 animate-pulse rounded-xl bg-slate-200" />
        ) : session ? (
          <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5">
            <span className="text-sm font-medium text-slate-600">Hello {session.user?.name ?? session.user?.email}</span>
            <button
              onClick={() => signOut()}
              className="text-sm font-medium text-slate-500 underline underline-offset-2 transition-colors hover:text-slate-900"
            >
              Sign out
            </button>
          </div>
        ) : (
          <Link
            href="/api/auth/signin/google?callbackUrl=%2F"
            className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Sign in with Google
          </Link>
        )}
      </header>

      {/* Week selector */}
      <div className="mb-5 rounded-[24px] border border-slate-200/80 bg-white/90 p-3 shadow-[0_18px_50px_rgba(15,23,42,0.06)] backdrop-blur">
        <div className="mb-3 flex items-center justify-between px-2">
          <div>
            <p className="text-sm font-semibold text-slate-900">Promotion Weeks</p>
            <p className="text-xs text-slate-500">Choose a week to load supplier credits and email drafts.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
        {availableWeeks.map((w) => (
          <button
            key={w}
            onClick={() => setSelectedWeek(w)}
            className={`rounded-full border px-4 py-2 text-sm font-medium shadow-sm transition-colors ${
              selectedWeek === w
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white hover:text-slate-900'
            }`}
          >
            Week {w}
          </button>
        ))}
        </div>
        {selectedWeek !== null && supplier && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-[0.14em]">Merge with:</span>
            {loadingSupplierWeeks ? (
              <span className="text-xs text-slate-400">Loading available weeks…</span>
            ) : supplierWeeks.length === 0 ? (
              <span className="text-xs text-slate-400">No other weeks available for this supplier</span>
            ) : (
              supplierWeeks.map((w) => (
                <button
                  key={w}
                  onClick={() => toggleMergeWeek(w)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    mergeWeeks.includes(w)
                      ? 'border-violet-500 bg-violet-500 text-white shadow-sm'
                      : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300 hover:text-slate-700'
                  }`}
                >
                  W{w}
                </button>
              ))
            )}
            {mergeWeeks.length > 0 && activeMergedWeeks.length > 1 && (
              <span className="ml-1 text-xs font-semibold text-violet-600">
                → W{activeMergedWeeks.join('-W')} merged
              </span>
            )}
          </div>
        )}
      </div>

      {/* Main content */}
      {selectedWeek === null ? (
        <div className="flex flex-1 items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-white/75">
          <p className="text-sm font-medium text-slate-500">Select a week to get started</p>
        </div>
      ) : loadingWeek ? (
        <div className="flex flex-1 items-center justify-center rounded-[28px] border border-slate-200 bg-white/80">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : weekData ? (
        <div className="flex gap-4 overflow-hidden" style={{ height: 'calc(100vh - 180px)' }}>
          {/* Supplier list */}
          <div className="flex h-full w-72 flex-shrink-0 flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
            <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Week {weekData.week} · {weekData.total_suppliers} suppliers
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {weekData.suppliers[0] ? formatPeriod(weekData.suppliers[0].period) : ''}
              </p>
            </div>
            <ul className="flex-1 divide-y divide-slate-100 overflow-y-auto">
              {weekData.suppliers.map((s) => {
                const sentRecord = sentLog.get(s.supplier)
                const sentThisSession = !sentRecord && recentlySent.get(weekData.week)?.has(s.supplier)
                const isSent = !!sentRecord || !!sentThisSession
                return (
                <li key={s.supplier}>
                  <button
                    onClick={() => {
                      setSelectedSupplier(s.supplier)
                      setSent(false)
                      setSendError(null)
                    }}
                    className={`w-full px-5 py-3.5 text-left transition-colors hover:bg-slate-50 ${
                      selectedSupplier === s.supplier
                        ? 'border-l-4 border-blue-600 bg-blue-50/70'
                        : isSent
                        ? 'border-l-4 border-emerald-400 bg-emerald-50/40'
                        : ''
                    }`}
                  >
                    <p
                      className={`text-sm font-medium leading-snug ${
                        selectedSupplier === s.supplier
                          ? 'text-blue-700'
                          : 'text-slate-900'
                      }`}
                    >
                      {s.supplier}
                    </p>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-xs text-slate-500">
                        {s.table.product_name.length} product{s.table.product_name.length !== 1 ? 's' : ''}
                      </span>
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                        {s.table.total_credited}
                      </span>
                    </div>
                    {sentRecord ? (
                      <p className="mt-1 text-xs font-semibold text-emerald-600">
                        ✓ Sent {new Date(sentRecord.sent_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    ) : sentThisSession ? (
                      <p className="mt-1 text-xs font-semibold text-emerald-600">✓ Sent</p>
                    ) : s.emails[0] ? (
                      <p className="mt-1 truncate text-xs text-slate-400">
                        {s.emails[0]}
                      </p>
                    ) : null}
                  </button>
                </li>
                )
              })}
            </ul>
          </div>

          {/* Email preview */}
          <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
            {!supplier ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-sm font-medium text-slate-500">Select a supplier to preview the email</p>
              </div>
            ) : (
              <>
                {/* Supplier info */}
                <div className="shrink-0 border-b border-slate-100 bg-slate-50/70 px-6 py-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-semibold text-slate-900">{supplier.supplier}</h2>

                    {/* Language toggle */}
                    <div className="flex items-center rounded-full border border-slate-200 bg-white p-0.5 text-xs font-semibold shadow-sm">
                      <button
                        onClick={() => setLangOverride('en')}
                        className={`rounded-full px-2.5 py-1 transition-colors ${langOverride === 'en' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-800'}`}
                      >EN</button>
                      <button
                        onClick={() => setLangOverride('fr')}
                        className={`rounded-full px-2.5 py-1 transition-colors ${langOverride === 'fr' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-800'}`}
                      >FR</button>
                    </div>

                    {/* Taxable toggle */}
                    <div className="flex items-center rounded-full border border-slate-200 bg-white p-0.5 text-xs font-semibold shadow-sm">
                      <button
                        onClick={() => setTaxableOverride(false)}
                        className={`rounded-full px-2.5 py-1 transition-colors ${!taxableOverride ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-800'}`}
                      >No Tax</button>
                      <button
                        onClick={() => setTaxableOverride(true)}
                        className={`rounded-full px-2.5 py-1 transition-colors ${taxableOverride ? 'bg-amber-500 text-white' : 'text-slate-500 hover:text-slate-800'}`}
                      >Taxable</button>
                    </div>

                  </div>
                  <div className="mt-2 max-w-2xl">
                    {/* Tag chip container */}
                    <div className={`flex flex-wrap items-center gap-1.5 rounded-2xl border px-3 py-2.5 shadow-sm transition-colors ${
                      !tagInputValid
                        ? 'border-red-300 bg-red-50 focus-within:ring-2 focus-within:ring-red-200'
                        : emailDirty
                        ? 'border-blue-300 bg-blue-50/60 focus-within:ring-2 focus-within:ring-blue-200'
                        : 'border-slate-200 bg-white focus-within:ring-2 focus-within:ring-blue-100'
                    }`}>
                      {pendingEmails.map((email) => (
                        <span key={email} className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                          {email}
                          <button
                            onClick={() => removeTag(pendingEmails.indexOf(email))}
                            className="ml-0.5 font-bold leading-none text-emerald-500 transition-colors hover:text-red-500"
                          >×</button>
                        </span>
                      ))}
                      <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={handleTagKeyDown}
                        onBlur={addTag}
                        className="min-w-[160px] flex-1 bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400"
                        placeholder={pendingEmails.length === 0 ? 'email@domain.com' : 'Add email, press Enter'}
                      />
                    </div>
                    {/* Status row */}
                    <div className="flex items-center gap-2 mt-1">
                      {!tagInputValid && (
                        <span className="text-xs font-medium text-red-500">Invalid email address</span>
                      )}
                      {emailDirty && tagInputValid && (
                        <>
                          <button
                            onClick={handleAccept}
                            className="rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-blue-700"
                          >Accept</button>
                          <span className="text-xs font-medium text-blue-600">Unsaved changes</span>
                        </>
                      )}
                    </div>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500">{formatPeriod(supplier.period)} · {supplier.theme}</p>
                </div>

                {/* Send settings bar */}
                <div className={`flex shrink-0 items-center justify-between gap-4 border-b px-6 py-4 transition-colors ${sendToSupplier ? 'border-emerald-200 bg-emerald-50/70' : 'border-slate-100 bg-slate-50/70'}`}>
                  {/* Toggles */}
                  <div className="flex items-center gap-5">
                    {/* Signature toggle */}
                    <div className="flex flex-col gap-0.5">
                      <Toggle
                        enabled={includeSignature}
                        onChange={setIncludeSignature}
                        labelOn="Signature ON"
                        labelOff="Signature OFF"
                        colorOn="bg-green-500"
                      />
                      <p className="pl-12 text-xs text-slate-500">
                        {includeSignature ? 'Your Gmail signature will be appended' : 'Email will be sent without signature'}
                      </p>
                    </div>

                    <div className="h-8 w-px bg-slate-200" />

                    {/* Recipient toggle */}
                    <div className="flex flex-col gap-0.5">
                      <Toggle
                        enabled={sendToSupplier}
                        onChange={handleSendToSupplierChange}
                        labelOn="LIVE — Sending to supplier"
                        labelOff="TEST — Sending to test address"
                        colorOn="bg-green-500"
                      />
                      <p className={`pl-12 text-xs font-medium ${sendToSupplier ? 'text-emerald-700' : 'text-slate-500'}`}>
                        {sendToSupplier
                          ? committedEmails.length > 0
                            ? `→ ${committedEmails.join(', ')}`
                            : '→ No email to send'
                          : `→ ${process.env.NEXT_PUBLIC_TEST_RECIPIENT}`}
                      </p>
                    </div>

                    {(sendToSupplier || ccRecipient) && (
                      <>
                        <div className="h-8 w-px bg-slate-200" />
                        <div className="flex flex-col gap-0.5">
                          <p className="text-xs font-semibold text-slate-700">CC</p>
                          <p className={`text-xs font-medium ${sendToSupplier ? 'text-emerald-700' : 'text-slate-500'}`}>
                            → {sendToSupplier ? 'billing@lufa.com' : ccRecipient}
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Send button */}
                  {session ? (
                    <button
                      onClick={handleSend}
                      disabled={sending || noLiveRecipients}
                      className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                        sent
                          ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                          : sendToSupplier
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {sent ? (
                        <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Sent!</>
                      ) : sending ? (
                        <><svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" /><path d="M4 12a8 8 0 018-8v8H4z" fill="currentColor" className="opacity-75" /></svg>Sending...</>
                      ) : (
                        <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>Send Email</>
                      )}
                    </button>
                  ) : (
                    <Link href="/api/auth/signin/google?callbackUrl=%2F" className="shrink-0 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700">
                      Sign in to Send
                    </Link>
                  )}
                </div>

                {sendError && (
                  <div className="shrink-0 border-b border-red-100 bg-red-50 px-6 py-3">
                    <p className="text-sm font-medium text-red-600">{sendError}</p>
                  </div>
                )}

                {/* Email preview */}
                <div className="flex-1 overflow-y-auto bg-white p-6">
                  {/* Subject */}
                  <div className="mb-4 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Subject</p>
                    <p className="text-sm font-medium text-slate-800">{emailContent?.subject}</p>
                  </div>
                  {/* Rendered email body — WYSIWYG of what gets sent */}
                  <div
                    className="overflow-x-auto rounded-2xl border border-slate-100 bg-white p-4 shadow-inner shadow-slate-100/60"
                    dangerouslySetInnerHTML={{ __html: emailContent?.html ?? '' }}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}

      {/* Toast */}
      <div
        className={`fixed bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-[0_18px_50px_rgba(15,23,42,0.12)] transition-all duration-300 ${
          sent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
      >
        <svg className="h-4 w-4 shrink-0 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        {sendToSupplier ? 'Email sent to supplier' : 'Email sent to test recipient'}
      </div>

      {/* Already-sent warning modal */}
      {showSentWarning && supplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_32px_80px_rgba(15,23,42,0.18)]">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50">
              <svg className="h-5 w-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-slate-900">Already sent</h3>
            <p className="mt-1.5 text-sm text-slate-500">
              An email was already sent to{' '}
              <span className="font-semibold text-slate-800">{supplier.supplier}</span>{' '}
              for Week {supplier.week} on{' '}
              <span className="font-semibold text-slate-800">
                {new Date(sentLog.get(supplier.supplier)!.sent_at).toLocaleDateString('en-CA', {
                  weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
                })}
              </span>
              .
            </p>
            <p className="mt-1 text-sm text-slate-500">Do you want to send it again?</p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setShowSentWarning(false)}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={() => { setShowSentWarning(false); doSend() }}
                className="flex-1 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-600"
              >
                Send anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
