export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

export function buildUpdatedEmails(baseEmails: string[], candidate: string): string[] {
  const val = candidate.trim()
  if (!val || !isValidEmail(val) || baseEmails.includes(val)) return baseEmails
  return [...baseEmails, val]
}
