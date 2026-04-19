'use client'

export interface ToggleProps {
  enabled: boolean
  onChange: (v: boolean) => void
  labelOn: string
  labelOff: string
  colorOn: string
}

export default function Toggle({ enabled, onChange, labelOn, labelOff, colorOn }: ToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className="flex items-center gap-2 cursor-pointer select-none text-slate-700"
    >
      <div className={`relative h-6 w-11 rounded-full transition-colors duration-300 ease-in-out ${enabled ? colorOn : 'bg-slate-300'}`}>
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 ease-in-out ${enabled ? 'translate-x-5' : 'translate-x-0'}`}
          style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.25)' }}
        />
      </div>
      <span className="text-xs font-semibold">{enabled ? labelOn : labelOff}</span>
    </button>
  )
}
