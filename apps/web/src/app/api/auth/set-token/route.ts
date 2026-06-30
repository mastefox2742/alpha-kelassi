import { cookies } from 'next/headers'
import { adminAuth } from '@/lib/firebase/admin'
import { NextResponse } from 'next/server'

const COOKIE_NAME = 'firebase-token'
const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60, // 1h — l'ID token Firebase expire en 1h
}

export async function POST(req: Request) {
  try {
    const { token } = await req.json()
    if (!token) return NextResponse.json({ error: 'Token manquant' }, { status: 400 })
    await adminAuth.verifyIdToken(token)
    const store = await cookies()
    store.set(COOKIE_NAME, token, COOKIE_OPTS)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Token invalide' }, { status: 401 })
  }
}

export async function DELETE() {
  const store = await cookies()
  store.delete(COOKIE_NAME)
  return NextResponse.json({ ok: true })
}
