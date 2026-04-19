'use client'

interface SendToastProps {
  visible: boolean
  sendToSupplier: boolean
}

export default function SendToast({ visible, sendToSupplier }: SendToastProps) {
  return (
    <div
      className={`fixed bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-[0_18px_50px_rgba(15,23,42,0.12)] transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
      }`}
    >
      <svg className="h-4 w-4 shrink-0 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
      {sendToSupplier ? 'Email sent to supplier' : 'Email sent to test recipient'}
    </div>
  )
}
