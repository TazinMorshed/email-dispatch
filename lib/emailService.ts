import type { Supplier } from '@/lib/types'

/** Sums an array of currency strings like ["$52.20", "$90.86"] into "$143.06" */
export function computeSupplierTotal(creditedSums: string[]): string {
  const total = creditedSums.reduce((sum, val) => {
    const num = parseFloat(val.replace(/[^0-9.-]/g, ''))
    return sum + (isNaN(num) ? 0 : num)
  }, 0)
  return `$${total.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/** Formats "2026-04-05 to 2026-04-11" → "April 5 - April 11" */
export function formatPeriod(period: string): string {
  const parts = period.split(' to ')
  if (parts.length !== 2) return period
  const fmt = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-CA', { month: 'long', day: 'numeric' })
  }
  return `${fmt(parts[0])} - ${fmt(parts[1])}`
}

function resolveWeekRange(period: string): [string, string] | null {
  const parts = period.split(' to ')
  if (parts.length === 2) return [parts[0], parts[1]]
  // Single date — treat it as the last day (Saturday) and back-compute the start (Sunday)
  const end = new Date(parts[0] + 'T00:00:00')
  if (isNaN(end.getTime())) return null
  const start = new Date(end)
  start.setDate(end.getDate() - 6)
  const pad = (d: Date) => d.toISOString().slice(0, 10)
  return [pad(start), pad(end)]
}

export function buildEmailTable(supplier: Supplier): string {
  const { table } = supplier
  const range = resolveWeekRange(supplier.period)
  let weekLabel = `W${supplier.week}`
  if (range) {
    const fmt = (s: string) => new Date(s + 'T00:00:00').toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
    const year = new Date(range[1] + 'T00:00:00').getFullYear()
    weekLabel = `W${supplier.week} · ${fmt(range[0])}–${fmt(range[1])}, ${year}`
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

  const yellow = 'background-color:#FFFF00;font-weight:bold;'
  const totalRow = `<tr>
    ${tdEmpty()}${tdEmpty()}${tdEmpty()}${tdEmpty()}${tdEmpty()}${tdEmpty()}
    ${td('TOTAL', yellow)}
    ${td(computeSupplierTotal(table.credited_sum), yellow)}
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

export function buildMergedTable(suppliers: Supplier[], isFr: boolean): string {
  const base = 'border:1px solid #d0d0d0;padding:2px 6px;font-size:11px;font-family:Arial,sans-serif;line-height:1.3;'
  const th = (content: string) =>
    `<th style="${base}background-color:#e8e9ea;color:#333;font-weight:600;text-align:left;max-width:80px;">${content}</th>`
  const td = (content: string | number, extra = '') =>
    `<td style="${base}white-space:nowrap;${extra}">${content}</td>`
  const tdEmpty = () => `<td style="${base}"></td>`
  const tdCredit = (content: string | number) =>
    `<td style="${base}white-space:nowrap;background-color:#ffd7d7;font-weight:bold;">${content}</td>`
  const yellow = 'background-color:#FFFF00;font-weight:bold;'

  const allDataRows = suppliers.map((supplier) => {
    const { table } = supplier
    const range = resolveWeekRange(supplier.period)
    let weekCell = `W${supplier.week}`
    if (range) {
      const fmt = (s: string) => new Date(s + 'T00:00:00').toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
      const year = new Date(range[1] + 'T00:00:00').getFullYear()
      weekCell = `W${supplier.week} · ${fmt(range[0])}–${fmt(range[1])}, ${year}`
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

  const subtotalRows = suppliers.map((supplier) => {
    const label = isFr ? `Sous-total W${supplier.week}` : `Subtotal W${supplier.week}`
    return `<tr>
      ${tdEmpty()}${tdEmpty()}${tdEmpty()}${tdEmpty()}${tdEmpty()}${tdEmpty()}
      ${td(label, yellow)}
      ${td(computeSupplierTotal(supplier.table.credited_sum), yellow)}
    </tr>`
  }).join('')

  const grandTotal = suppliers.reduce((sum, sup) => {
    const val = parseFloat(computeSupplierTotal(sup.table.credited_sum).replace(/[^0-9.-]/g, ''))
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

export function generateEmailHtml(suppliers: Supplier[], senderName?: string): { subject: string; html: string } {
  if (suppliers.length === 0) {
    throw new Error('generateEmailHtml requires at least one supplier')
  }

  const primary = suppliers[0]
  const isTaxable = primary.taxable === 'Yes'
  const isFr = primary.language === 'fr'

  const weekTag = suppliers.map((sup) => `W${sup.week}`).join('-')
  const subject = `Promotion ${weekTag} - count & recount - ${primary.supplier}`

  const st = 'font-family:Arial,sans-serif;font-size:14px;color:#000;'
  const p0   = (text: string) => `<p style="margin:0;${st}">${text}</p>`
  const gap  = `<br>`
  const gap2 = `<br><br>`

  const tablesHtml = suppliers.length === 1
    ? buildEmailTable(suppliers[0])
    : buildMergedTable(suppliers, isFr)

  const firstName = senderName?.split(' ')[0] ?? ''
  const closingText = isFr ? 'Merci de ta collaboration,' : 'Thank you for your collaboration,'
  const closing = firstName
    ? `<p style="margin:0;${st}">${closingText}</p><p style="margin:0;${st}">${firstName}</p>`
    : `<p style="margin:0;${st}">${closingText}</p>`

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
