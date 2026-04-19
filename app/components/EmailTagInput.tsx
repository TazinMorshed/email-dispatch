'use client'

interface EmailTagInputProps {
  pendingEmails: string[]
  tagInput: string
  tagInputValid: boolean
  emailDirty: boolean
  onTagInputChange: (value: string) => void
  onTagKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  onTagBlur: () => void
  onRemoveTag: (index: number) => void
  onAccept: () => void
}

export default function EmailTagInput({
  pendingEmails,
  tagInput,
  tagInputValid,
  emailDirty,
  onTagInputChange,
  onTagKeyDown,
  onTagBlur,
  onRemoveTag,
  onAccept,
}: EmailTagInputProps) {
  return (
    <div className="mt-2 max-w-2xl">
      <div className={`flex flex-wrap items-center gap-1.5 rounded-2xl border px-3 py-2.5 shadow-sm transition-colors ${
        !tagInputValid
          ? 'border-red-300 bg-red-50 focus-within:ring-2 focus-within:ring-red-200'
          : emailDirty
          ? 'border-blue-300 bg-blue-50/60 focus-within:ring-2 focus-within:ring-blue-200'
          : 'border-slate-200 bg-white focus-within:ring-2 focus-within:ring-blue-100'
      }`}>
        {pendingEmails.map((email, i) => (
          <span key={email} className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
            {email}
            <button
              onClick={() => onRemoveTag(i)}
              className="ml-0.5 font-bold leading-none text-emerald-500 transition-colors hover:text-red-500"
            >×</button>
          </span>
        ))}
        <input
          type="text"
          value={tagInput}
          onChange={(e) => onTagInputChange(e.target.value)}
          onKeyDown={onTagKeyDown}
          onBlur={onTagBlur}
          className="min-w-[160px] flex-1 bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400"
          placeholder={pendingEmails.length === 0 ? 'email@domain.com' : 'Add email, press Enter'}
        />
      </div>
      <div className="flex items-center gap-2 mt-1">
        {!tagInputValid && (
          <span className="text-xs font-medium text-red-500">Invalid email address</span>
        )}
        {emailDirty && tagInputValid && (
          <>
            <button
              onClick={onAccept}
              className="rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-blue-700"
            >Accept</button>
            <span className="text-xs font-medium text-blue-600">Unsaved changes</span>
          </>
        )}
      </div>
    </div>
  )
}
