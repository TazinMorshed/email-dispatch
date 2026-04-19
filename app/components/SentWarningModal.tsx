'use client'

import type { Supplier, SentRecord } from '@/lib/types'

interface SentWarningModalProps {
  supplier: Supplier
  sentRecord: SentRecord | null
  onCancel: () => void
  onConfirm: () => void
}

export default function SentWarningModal({ supplier, sentRecord, onCancel, onConfirm }: SentWarningModalProps) {
  return (
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
          for Week {supplier.week}
          {sentRecord ? (
            <>
              {' '}on{' '}
              <span className="font-semibold text-slate-800">
                {new Date(sentRecord.sent_at).toLocaleDateString('en-CA', {
                  weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
                })}
              </span>
            </>
          ) : ' this session'}.
        </p>
        <p className="mt-1 text-sm text-slate-500">Do you want to send it again?</p>
        <div className="mt-5 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-600"
          >
            Send anyway
          </button>
        </div>
      </div>
    </div>
  )
}
