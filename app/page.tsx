'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { generateEmailHtml } from '@/lib/emailService'
import { isValidEmail, buildUpdatedEmails } from '@/lib/emailUtils'
import type { Supplier, WeekData, AppConfig, SentRecord } from '@/lib/types'
import AppHeader from '@/app/components/AppHeader'
import WeekSelector from '@/app/components/WeekSelector'
import SupplierList from '@/app/components/SupplierList'
import EmailPreview from '@/app/components/EmailPreview'
import SentWarningModal from '@/app/components/SentWarningModal'
import SendToast from '@/app/components/SendToast'

export default function Page() {
  const { data: session } = useSession()
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
  const [sentLog, setSentLog] = useState<Map<string, SentRecord>>(new Map())
  const [showSentWarning, setShowSentWarning] = useState(false)
  const [savedEmails, setSavedEmails] = useState<Map<string, string[]>>(new Map())
  const [langOverride, setLangOverride] = useState<'en' | 'fr'>('en')
  const [taxableOverride, setTaxableOverride] = useState(false)
  const [mergeWeeks, setMergeWeeks] = useState<number[]>([])
  const [mergeWeekData, setMergeWeekData] = useState<Record<number, WeekData>>({})
  const [supplierWeeks, setSupplierWeeks] = useState<number[]>([])
  const [loadingSupplierWeeks, setLoadingSupplierWeeks] = useState(false)
  const [recentlySent, setRecentlySent] = useState<Map<number, Set<string>>>(new Map())
  const [emailContent, setEmailContent] = useState<{ subject: string; html: string } | null>(null)
  const [activeMergedWeeks, setActiveMergedWeeks] = useState<number[]>([])

  // Load app config once
  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((data: AppConfig) => setCcRecipient(data.ccRecipient ?? ''))
      .catch(() => setCcRecipient(''))
  }, [])

  // Load available weeks once
  useEffect(() => {
    fetch('/api/weeks')
      .then((r) => r.json())
      .then((weeks: number[]) => setAvailableWeeks(weeks))
      .catch(() => {
        console.error('[page] Failed to load available weeks')
        setAvailableWeeks([])
      })
  }, [])

  // Load week data + send log when selected week changes
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
    Promise.all([
      fetch(`/api/weeks/${selectedWeek}`).then((r) => {
        if (!r.ok) throw new Error(`Failed to load week ${selectedWeek} data (${r.status})`)
        return r.json()
      }),
      fetch(`/api/send-log?week=${selectedWeek}`).then((r) => {
        if (!r.ok) throw new Error(`Failed to load send log for week ${selectedWeek} (${r.status})`)
        return r.json()
      }),
    ]).then(([weekJson, logJson]) => {
      setWeekData(weekJson)
      if (Array.isArray(logJson)) {
        const map = new Map<string, SentRecord>()
        for (const record of logJson as SentRecord[]) {
          if (!map.has(record.supplier)) map.set(record.supplier, record)
        }
        setSentLog(map)
      }
      const supplierNames = (weekJson.suppliers as Supplier[]).map((s) => s.supplier)
      if (supplierNames.length > 0) {
        const query = supplierNames.map(encodeURIComponent).join(',')
        fetch(`/api/supplier-emails?suppliers=${query}`)
          .then((r) => r.json())
          .then((data: Record<string, string[]>) => setSavedEmails(new Map(Object.entries(data))))
          .catch((err) => console.error('[page] Failed to load saved emails:', err))
      }
    }).catch((err) => {
      console.error('[page] Failed to load week data:', err)
      setSendError(err instanceof Error ? err.message : 'Failed to load week data. Please try again.')
    }).finally(() => setLoadingWeek(false))
  }, [selectedWeek])

  const supplier = useMemo(
    () => weekData?.suppliers.find((s) => s.supplier === selectedSupplier) ?? null,
    [weekData, selectedSupplier]
  )

  // Load supplier-specific state when supplier changes
  useEffect(() => {
    if (!supplier) return
    const emails = savedEmails.get(supplier.supplier) ?? supplier.emails
    setPendingEmails(emails)
    setCommittedEmails(emails)
    setTagInput('')
    setLangOverride(supplier.language === 'fr' ? 'fr' : 'en')
    setTaxableOverride(supplier.taxable === 'Yes')
    setMergeWeeks([])
    setMergeWeekData({})
    setSupplierWeeks([])
    setLoadingSupplierWeeks(true)
    fetch(`/api/supplier-weeks?supplier=${encodeURIComponent(supplier.supplier)}`)
      .then((r) => r.json())
      .then((weeks: number[]) => setSupplierWeeks(weeks.filter((w) => w !== selectedWeek)))
      .catch((err) => {
        console.error('[page] Failed to fetch supplier weeks:', err)
        setSupplierWeeks([])
      })
      .finally(() => setLoadingSupplierWeeks(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSupplier, savedEmails])

  // Rebuild email content when supplier, overrides, or merge data changes
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
    try {
      setEmailContent(generateEmailHtml(allSups, session?.user?.name ?? undefined))
      setActiveMergedWeeks(allSups.map((s) => s.week))
    } catch (err) {
      console.error('[page] Failed to generate email HTML:', err)
      setSendError('Failed to generate email preview. Please try again.')
    }
  }, [supplier, mergeWeeks, mergeWeekData, langOverride, taxableOverride, session?.user?.name])

  // ─── Email tag helpers ──────────────────────────────────────────────────────

  const tagInputValid = tagInput.trim() === '' || isValidEmail(tagInput)
  const emailDirty = JSON.stringify(pendingEmails) !== JSON.stringify(committedEmails) || tagInput.trim() !== ''
  const noLiveRecipients = sendToSupplier && committedEmails.length === 0

  function addTag() {
    const updated = buildUpdatedEmails(pendingEmails, tagInput)
    setPendingEmails(updated)
    if (updated !== pendingEmails) setTagInput('')
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
    }).catch((err) => {
      console.error('[page] Failed to save supplier emails:', err)
      setSendError('Failed to save email changes. Please try again.')
    })
  }

  function handleSendToSupplierChange(nextValue: boolean) {
    if (nextValue) commitPendingEmails()
    setSendToSupplier(nextValue)
  }

  function toggleMergeWeek(w: number) {
    if (mergeWeeks.includes(w)) {
      setMergeWeeks((prev) => prev.filter((x) => x !== w))
      setMergeWeekData((prev) => { const { [w]: _, ...rest } = prev; return rest })
    } else {
      setMergeWeeks((prev) => [...prev, w].sort((a, b) => a - b))
      fetch(`/api/weeks/${w}`)
        .then((r) => {
          if (!r.ok) throw new Error(`Failed to load week ${w} data (${r.status})`)
          return r.json()
        })
        .then((data: WeekData) => setMergeWeekData((prev) => ({ ...prev, [w]: data })))
        .catch((err) => {
          console.error('[page] Failed to fetch merge week data:', err)
          setSendError(`Failed to load Week ${w} data for merge. Please try again.`)
          setMergeWeeks((prev) => prev.filter((x) => x !== w))
        })
    }
  }

  async function doSend() {
    if (!emailContent || !supplier) return
    const liveRecipients = sendToSupplier ? commitPendingEmails() : committedEmails
    if (sendToSupplier && liveRecipients.length === 0) {
      setSendError('No recipients — add at least one email address before sending live.')
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
        let message = `Server error (${res.status})`
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
      if (sendToSupplier) {
        const sentAt = new Date().toISOString()
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
      setSendError(err instanceof Error ? err.message : 'Network error — failed to reach server. Please check your connection.')
    } finally {
      setSending(false)
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
      <AppHeader />

      <WeekSelector
        availableWeeks={availableWeeks}
        selectedWeek={selectedWeek}
        onSelectWeek={setSelectedWeek}
        supplierSelected={!!supplier}
        supplierWeeks={supplierWeeks}
        loadingSupplierWeeks={loadingSupplierWeeks}
        mergeWeeks={mergeWeeks}
        onToggleMergeWeek={toggleMergeWeek}
        activeMergedWeeks={activeMergedWeeks}
      />

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
          <SupplierList
            weekData={weekData}
            selectedSupplier={selectedSupplier}
            sentLog={sentLog}
            recentlySent={recentlySent}
            onSelectSupplier={(name) => {
              setSelectedSupplier(name)
              setSent(false)
              setSendError(null)
            }}
          />

          <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
            {!supplier ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-sm font-medium text-slate-500">Select a supplier to preview the email</p>
              </div>
            ) : (
              <EmailPreview
                supplier={supplier}
                emailContent={emailContent}
                langOverride={langOverride}
                taxableOverride={taxableOverride}
                onLangOverrideChange={setLangOverride}
                onTaxableOverrideChange={setTaxableOverride}
                pendingEmails={pendingEmails}
                tagInput={tagInput}
                tagInputValid={tagInputValid}
                emailDirty={emailDirty}
                onTagInputChange={setTagInput}
                onTagKeyDown={handleTagKeyDown}
                onTagBlur={addTag}
                onRemoveTag={removeTag}
                onAccept={handleAccept}
                includeSignature={includeSignature}
                onIncludeSignatureChange={setIncludeSignature}
                sendToSupplier={sendToSupplier}
                onSendToSupplierChange={handleSendToSupplierChange}
                committedEmails={committedEmails}
                ccRecipient={ccRecipient}
                session={session ?? null}
                sending={sending}
                sent={sent}
                noLiveRecipients={noLiveRecipients}
                onSend={handleSend}
                sendError={sendError}
              />
            )}
          </div>
        </div>
      ) : null}

      <SendToast visible={sent} sendToSupplier={sendToSupplier} />

      {showSentWarning && supplier && (
        <SentWarningModal
          supplier={supplier}
          sentRecord={sentLog.get(supplier.supplier) ?? null}
          onCancel={() => setShowSentWarning(false)}
          onConfirm={() => { setShowSentWarning(false); doSend() }}
        />
      )}
    </div>
  )
}
