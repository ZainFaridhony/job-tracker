import { type NextRequest } from 'next/server'
import { refreshSession } from '@job-tracker/db/proxy'
import { onboardingRedirect } from '@/lib/onboarding/gate'

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
  const { response, claims, redirect, supabase } = await refreshSession(request)
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

  if (claims && !isPublic(pathname)) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_step, onboarding_complete')
      .eq('id', claims.sub)
      .maybeSingle()

    // A missing row means the signup trigger did not fire. Treating that as
    // "not onboarded" routes them to the wizard, whose page bounces them to
    // /sign-in — a dead end, but not an open door.
    const target = onboardingRedirect(pathname, {
      complete: profile?.onboarding_complete ?? false,
      step: profile?.onboarding_step ?? 1,
    })

    if (target) {
      const url = request.nextUrl.clone()
      url.pathname = target
      url.search = ''
      return redirect(url)
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
