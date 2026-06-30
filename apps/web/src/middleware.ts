import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_ROUTES = ['/', '/login', '/register', '/forgot-password', '/verify-otp']
const AUTH_ROUTES = ['/login', '/register']

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Lit le cookie firebase-token posé par /api/auth/set-token
  const token = request.cookies.get('firebase-token')?.value
  const isAuthenticated = Boolean(token)

  // Redirige vers /dashboard si déjà connecté et sur une page auth
  if (isAuthenticated && AUTH_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Redirige vers /login si non connecté et sur une page protégée
  // Les routes /api/ gèrent leur propre auth (pas de redirect middleware)
  const isPublic = PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith('/auth'))
    || pathname.startsWith('/api/')
  if (!isAuthenticated && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
