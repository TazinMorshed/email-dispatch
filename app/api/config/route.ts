import { NextResponse } from 'next/server'

export async function GET() {
  if (!process.env.CC_RECIPIENT) {
    console.warn('[config] CC_RECIPIENT env var is not set')
  }
  return NextResponse.json({
    ccRecipient: process.env.CC_RECIPIENT ?? '',
  })
}
