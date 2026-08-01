import { type NextRequest } from 'next/server'
import { refreshSession } from '@job-tracker/db/proxy'

const PUBLIC_PREFIXES = [
  '/sign-in',
  '/sign-up',
  '/forgot-password',
  '/check-email',
  '/reset-password',
  '/auth',
]

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

export async function proxy(request: NextRequest) {
  const { response, claims, redirect } = await refreshSession(request)
  const { pathname } = request.nextUrl

  if (!claims && !isPublic(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/sign-in'
    url.search = ''
    url.searchParams.set('next', pathname)
    return redirect(url)
  }

  // A signed-in user has no business on the sign-in or sign-up screen.
  if (claims && (pathname === '/sign-in' || pathname === '/sign-up')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    url.search = ''
    return redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
