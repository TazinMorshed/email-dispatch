import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    ccRecipient: process.env.CC_RECIPIENT ?? '',
  })
}
