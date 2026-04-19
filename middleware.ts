import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware() {
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: '/api/auth/signin',
    },
  }
)

export const config = {
  matcher: [
    '/api/send-email',
    '/api/send-log',
    '/api/supplier-emails',
    '/api/debug-signature',
  ],
}
