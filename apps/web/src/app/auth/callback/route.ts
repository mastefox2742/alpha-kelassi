import { NextResponse } from 'next/server'

// Firebase gère le callback OAuth directement côté client (signInWithPopup).
// Cette route redirige simplement vers le dashboard.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const next = searchParams.get('next') ?? '/dashboard'
  return NextResponse.redirect(`${origin}${next}`)
}
