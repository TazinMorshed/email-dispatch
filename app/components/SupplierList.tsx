'use client'

import { formatPeriod } from '@/lib/emailService'
import type { WeekData, SentRecord } from '@/lib/types'

interface SupplierListProps {
  weekData: WeekData
  selectedSupplier: string | null
  sentLog: Map<string, SentRecord>
  recentlySent: Map<number, Set<string>>
  onSelectSupplier: (supplierName: string) => void
}

export default function SupplierList({
  weekData,
  selectedSupplier,
  sentLog,
  recentlySent,
  onSelectSupplier,
}: SupplierListProps) {
  return (
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
                onClick={() => onSelectSupplier(s.supplier)}
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
                    selectedSupplier === s.supplier ? 'text-blue-700' : 'text-slate-900'
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
                  <p className="mt-1 truncate text-xs text-slate-400">{s.emails[0]}</p>
                ) : null}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
