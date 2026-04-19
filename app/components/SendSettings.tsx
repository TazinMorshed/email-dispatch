'use client'

import Link from 'next/link'
import type { Session } from 'next-auth'
import Toggle from './Toggle'

interface SendSettingsProps {
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
}

export default function SendSettings({
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
}: SendSettingsProps) {
  return (
    <div className={`flex shrink-0 items-center justify-between gap-4 border-b px-6 py-4 transition-colors ${sendToSupplier ? 'border-emerald-200 bg-emerald-50/70' : 'border-slate-100 bg-slate-50/70'}`}>
      <div className="flex items-center gap-5">
        {/* Signature toggle */}
        <div className="flex flex-col gap-0.5">
          <Toggle
            enabled={includeSignature}
            onChange={onIncludeSignatureChange}
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
            onChange={onSendToSupplierChange}
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
          onClick={onSend}
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
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Sent!
            </>
          ) : sending ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                <path d="M4 12a8 8 0 018-8v8H4z" fill="currentColor" className="opacity-75" />
              </svg>
              Sending...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              Send Email
            </>
          )}
        </button>
      ) : (
        <Link
          href="/api/auth/signin/google?callbackUrl=%2F"
          className="shrink-0 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
        >
          Sign in to Send
        </Link>
      )}
    </div>
  )
}
