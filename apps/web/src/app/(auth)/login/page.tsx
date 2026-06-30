'use client'

import React, { useState } from 'react'
import { signInWithEmail, signInWithGoogle, sendPhoneOtp } from '@/lib/firebase/auth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Tab = 'email' | 'phone'

export default function LoginPage(): React.JSX.Element {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await signInWithEmail(email, password)
      router.push('/dashboard')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur de connexion'
      setError(msg.includes('user-not-found') || msg.includes('wrong-password') || msg.includes('invalid-credential')
        ? 'Email ou mot de passe incorrect.' : msg)
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleLogin() {
    setLoading(true)
    setError(null)
    try {
      await signInWithGoogle()
      router.push('/dashboard')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      if (!msg.includes('cancelled') && !msg.includes('popup-closed')) setError('Connexion Google échouée.')
    } finally {
      setLoading(false)
    }
  }

  async function handlePhoneLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await sendPhoneOtp(phone, 'recaptcha-container')
      router.push(`/verify-otp?phone=${encodeURIComponent(phone)}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Envoi SMS échoué.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-violet-50 px-4 py-10">
      <div id="recaptcha-container" />
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-black">K</span>
            </div>
            <span className="text-2xl font-black text-gray-900">Kelassi</span>
          </Link>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl p-8">
          <h1 className="text-2xl font-black text-gray-900 mb-1 text-center">Bon retour ! 👋</h1>
          <p className="text-sm text-gray-400 text-center mb-7">Connecte-toi pour continuer à réviser</p>

          {/* Tabs */}
          <div className="flex rounded-2xl bg-gray-100 p-1 mb-6">
            {(['email', 'phone'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(null) }}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
                  tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t === 'email' ? '📧 Email' : '📱 SMS'}
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-5 p-3 bg-red-50 border border-red-100 text-red-700 rounded-xl text-sm">
              {error}
            </div>
          )}

          {tab === 'email' ? (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Adresse email</label>
                <input
                  type="email"
                  placeholder="ton@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Mot de passe</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Ton mot de passe"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
                <div className="text-right mt-1.5">
                  <Link href={"/forgot-password" as never} className="text-xs text-blue-600 hover:underline font-medium">
                    Mot de passe oublié ?
                  </Link>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors mt-2"
              >
                {loading ? 'Connexion…' : 'Se connecter →'}
              </button>
            </form>
          ) : (
            <form onSubmit={handlePhoneLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Numéro de téléphone</label>
                <div className="flex">
                  <span className="px-4 py-3 bg-gray-100 border border-gray-200 border-r-0 rounded-l-xl text-gray-600 text-sm font-medium">
                    🇨🇬 +242
                  </span>
                  <input
                    type="tel"
                    placeholder="06 XXX XX XX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-r-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Envoi SMS…' : 'Recevoir le code SMS →'}
              </button>
            </form>
          )}

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-100" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-white text-gray-400 font-medium">ou continuer avec</span>
            </div>
          </div>

          {/* Google */}
          <button
            onClick={handleGoogleLogin}
            className="w-full py-3 border border-gray-200 rounded-2xl font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 flex items-center justify-center gap-3 text-sm transition-all"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuer avec Google
          </button>

          <p className="text-center text-xs text-gray-400 mt-6">
            Pas encore de compte ?{' '}
            <Link href="/register" className="text-blue-600 font-bold hover:underline">
              Créer un compte gratuit
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
