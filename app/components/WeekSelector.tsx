'use client'

interface WeekSelectorProps {
  availableWeeks: number[]
  selectedWeek: number | null
  onSelectWeek: (week: number) => void
  supplierSelected: boolean
  supplierWeeks: number[]
  loadingSupplierWeeks: boolean
  mergeWeeks: number[]
  onToggleMergeWeek: (week: number) => void
  activeMergedWeeks: number[]
}

export default function WeekSelector({
  availableWeeks,
  selectedWeek,
  onSelectWeek,
  supplierSelected,
  supplierWeeks,
  loadingSupplierWeeks,
  mergeWeeks,
  onToggleMergeWeek,
  activeMergedWeeks,
}: WeekSelectorProps) {
  return (
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
            onClick={() => onSelectWeek(w)}
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
      {selectedWeek !== null && supplierSelected && (
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
                onClick={() => onToggleMergeWeek(w)}
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
  )
}
