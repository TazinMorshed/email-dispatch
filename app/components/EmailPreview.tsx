'use client'

import type { Session } from 'next-auth'
import type { Supplier } from '@/lib/types'
import { formatPeriod } from '@/lib/emailService'
import EmailTagInput from './EmailTagInput'
import SendSettings from './SendSettings'

interface EmailPreviewProps {
  supplier: Supplier
  emailContent: { subject: string; html: string } | null
  langOverride: 'en' | 'fr'
  taxableOverride: boolean
  onLangOverrideChange: (lang: 'en' | 'fr') => void
  onTaxableOverrideChange: (taxable: boolean) => void
  pendingEmails: string[]
  tagInput: string
  tagInputValid: boolean
  emailDirty: boolean
  onTagInputChange: (value: string) => void
  onTagKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  onTagBlur: () => void
  onRemoveTag: (index: number) => void
  onAccept: () => void
  includeSignature: boolean
  onIncludeSignatureChange: (v: boolean) => void
  sendToSupplier: boolean
  onSendToSupplierChange: (v: boolean) => void
  committedEmails: string[]
  ccRecipient: string
  session: Session | null
  sending: boolean
  sent: boolean
  noLiveRecipients: boolean
  onSend: () => void
  sendError: string | null
}

export default function EmailPreview({
  supplier,
  emailContent,
  langOverride,
  taxableOverride,
  onLangOverrideChange,
  onTaxableOverrideChange,
  pendingEmails,
  tagInput,
  tagInputValid,
  emailDirty,
  onTagInputChange,
  onTagKeyDown,
  onTagBlur,
  onRemoveTag,
  onAccept,
  includeSignature,
  onIncludeSignatureChange,
  sendToSupplier,
  onSendToSupplierChange,
  committedEmails,
  ccRecipient,
  session,
  sending,
  sent,
  noLiveRecipients,
  onSend,
  sendError,
}: EmailPreviewProps) {
  return (
    <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
      {/* Supplier info */}
      <div className="shrink-0 border-b border-slate-100 bg-slate-50/70 px-6 py-4">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-base font-semibold text-slate-900">{supplier.supplier}</h2>

          {/* Language toggle */}
          <div className="flex items-center rounded-full border border-slate-200 bg-white p-0.5 text-xs font-semibold shadow-sm">
            <button
              onClick={() => onLangOverrideChange('en')}
              className={`rounded-full px-2.5 py-1 transition-colors ${langOverride === 'en' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-800'}`}
            >EN</button>
            <button
              onClick={() => onLangOverrideChange('fr')}
              className={`rounded-full px-2.5 py-1 transition-colors ${langOverride === 'fr' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-800'}`}
            >FR</button>
          </div>

          {/* Taxable toggle */}
          <div className="flex items-center rounded-full border border-slate-200 bg-white p-0.5 text-xs font-semibold shadow-sm">
            <button
              onClick={() => onTaxableOverrideChange(false)}
              className={`rounded-full px-2.5 py-1 transition-colors ${!taxableOverride ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-800'}`}
            >No Tax</button>
            <button
              onClick={() => onTaxableOverrideChange(true)}
              className={`rounded-full px-2.5 py-1 transition-colors ${taxableOverride ? 'bg-amber-500 text-white' : 'text-slate-500 hover:text-slate-800'}`}
            >Taxable</button>
          </div>
        </div>

        <EmailTagInput
          pendingEmails={pendingEmails}
          tagInput={tagInput}
          tagInputValid={tagInputValid}
          emailDirty={emailDirty}
          onTagInputChange={onTagInputChange}
          onTagKeyDown={onTagKeyDown}
          onTagBlur={onTagBlur}
          onRemoveTag={onRemoveTag}
          onAccept={onAccept}
        />

        <p className="mt-1.5 text-xs text-slate-500">{formatPeriod(supplier.period)} · {supplier.theme}</p>
      </div>

      <SendSettings
        includeSignature={includeSignature}
        onIncludeSignatureChange={onIncludeSignatureChange}
        sendToSupplier={sendToSupplier}
        onSendToSupplierChange={onSendToSupplierChange}
        committedEmails={committedEmails}
        ccRecipient={ccRecipient}
        session={session}
        sending={sending}
        sent={sent}
        noLiveRecipients={noLiveRecipients}
        onSend={onSend}
      />

      {sendError && (
        <div className="shrink-0 border-b border-red-100 bg-red-50 px-6 py-3">
          <p className="text-sm font-medium text-red-600">{sendError}</p>
        </div>
      )}

      {/* Email body preview */}
      <div className="flex-1 overflow-y-auto bg-white p-6">
        <div className="mb-4 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Subject</p>
          <p className="text-sm font-medium text-slate-800">{emailContent?.subject}</p>
        </div>
        <div
          className="overflow-x-auto rounded-2xl border border-slate-100 bg-white p-4 shadow-inner shadow-slate-100/60"
          dangerouslySetInnerHTML={{ __html: emailContent?.html ?? '' }}
        />
      </div>
    </div>
  )
}
