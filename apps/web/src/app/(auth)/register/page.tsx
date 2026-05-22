'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const LEVELS = [
  {
    value: 'bepc',
    label: 'BEPC',
    sub: '3ème — Brevet d\'Études du Premier Cycle',
    icon: '📘',
    gradient: 'from-blue-500 to-blue-600',
    border: 'border-blue-300',
    bg: 'bg-blue-50',
    ring: 'ring-blue-500',
  },
  {
    value: 'bac_c',
    label: 'BAC C',
    sub: 'Mathématiques & Sciences Physiques',
    icon: '🔬',
    gradient: 'from-violet-500 to-violet-600',
    border: 'border-violet-300',
    bg: 'bg-violet-50',
    ring: 'ring-violet-500',
  },
  {
    value: 'bac_d',
    label: 'BAC D',
    sub: 'Sciences de la Vie et de la Terre',
    icon: '🌿',
    gradient: 'from-emerald-500 to-emerald-600',
    border: 'border-emerald-300',
    bg: 'bg-emerald-50',
    ring: 'ring-emerald-500',
  },
  {
    value: 'bac_a',
    label: 'BAC A',
    sub: 'Lettres, Philosophie & Sciences Humaines',
    icon: '📖',
    gradient: 'from-amber-500 to-orange-500',
    border: 'border-amber-300',
    bg: 'bg-amber-50',
    ring: 'ring-amber-500',
  },
]

export default function RegisterPage() {
  const supabase = createClient()

  // Step 1 fields
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Step 2 field
  const [level, setLevel] = useState('')

  // UI state
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function validateStep1() {
    if (!fullName.trim()) return 'Entre ton nom complet.'
    if (!email.trim() || !email.includes('@')) return 'Adresse email invalide.'
    if (password.length < 8) return 'Le mot de passe doit faire au moins 8 caractères.'
    return null
  }

  function handleNext() {
    const err = validateStep1()
    if (err) { setError(err); return }
    setError(null)
    setStep(2)
  }

  async function handleSubmit() {
    if (!level) { setError('Choisis ton niveau.'); return }
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, study_level: level },
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setStep(1)
    } else {
      setSuccess(true)
    }
    setLoading(false)
  }

  // ── SUCCESS ──
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-violet-50 px-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-10 text-center">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">📧</div>
          <h2 className="text-2xl font-black text-gray-900 mb-3">Vérifie ton email !</h2>
          <p className="text-gray-500 text-sm leading-relaxed">
            Un lien de confirmation a été envoyé à<br />
            <strong className="text-gray-900">{email}</strong>
          </p>
          <p className="text-gray-400 text-xs mt-4">
            Clique sur le lien dans l'email pour activer ton compte et commencer à réviser.
          </p>
          <Link
            href="/login"
            className="inline-block mt-8 w-full py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-colors text-sm"
          >
            Aller à la connexion
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-start justify-center bg-gradient-to-br from-blue-50 via-white to-violet-50 px-4 py-10">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-black">K</span>
            </div>
            <span className="text-2xl font-black text-gray-900">Kelassi</span>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">

          {/* Progress bar */}
          <div className="h-1.5 bg-gray-100">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all duration-500"
              style={{ width: step === 1 ? '50%' : '100%' }}
            />
          </div>

          <div className="p-8">

            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-6">
              {[1, 2].map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    s < step
                      ? 'bg-blue-600 text-white'
                      : s === step
                      ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                      : 'bg-gray-100 text-gray-400'
                  }`}>
                    {s < step ? '✓' : s}
                  </div>
                  <span className={`text-xs font-medium ${s === step ? 'text-gray-900' : 'text-gray-400'}`}>
                    {s === 1 ? 'Mes infos' : 'Mon niveau'}
                  </span>
                  {s < 2 && <div className="w-8 h-px bg-gray-200 mx-1" />}
                </div>
              ))}
            </div>

            {/* ── STEP 1 : infos ── */}
            {step === 1 && (
              <>
                <h1 className="text-2xl font-black text-gray-900 mb-1">Créer mon compte</h1>
                <p className="text-sm text-gray-400 mb-7">Gratuit · 10 questions IA par jour</p>

                {error && (
                  <div className="mb-5 p-3 bg-red-50 border border-red-100 text-red-700 rounded-xl text-sm">
                    {error}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nom complet</label>
                    <input
                      type="text"
                      placeholder="Ex : Merveille Obambi"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Adresse email</label>
                    <input
                      type="email"
                      placeholder="ton@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Mot de passe</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="8 caractères minimum"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleNext()}
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
                    {password.length > 0 && (
                      <div className="mt-2 flex gap-1">
                        {[...Array(4)].map((_, i) => (
                          <div key={i} className={`h-1 flex-1 rounded-full transition-all ${
                            password.length >= [4, 6, 8, 12][i]
                              ? ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500'][i]
                              : 'bg-gray-100'
                          }`} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleNext}
                  className="mt-7 w-full py-3.5 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 transition-colors"
                >
                  Continuer →
                </button>

                <p className="text-center text-xs text-gray-400 mt-5">
                  Déjà un compte ?{' '}
                  <Link href="/login" className="text-blue-600 font-semibold hover:underline">
                    Se connecter
                  </Link>
                </p>
              </>
            )}

            {/* ── STEP 2 : niveau ── */}
            {step === 2 && (
              <>
                <button
                  onClick={() => { setStep(1); setError(null) }}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-5 -ml-1 transition-colors"
                >
                  ← Retour
                </button>

                <h1 className="text-2xl font-black text-gray-900 mb-1">Ton niveau</h1>
                <p className="text-sm text-gray-400 mb-6">On adapte les cours et exercices à ton niveau.</p>

                {error && (
                  <div className="mb-5 p-3 bg-red-50 border border-red-100 text-red-700 rounded-xl text-sm">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 mb-7">
                  {LEVELS.map((l) => (
                    <button
                      key={l.value}
                      onClick={() => setLevel(l.value)}
                      className={`relative p-4 rounded-2xl border-2 text-left transition-all duration-200 ${
                        level === l.value
                          ? `border-transparent ring-2 ${l.ring} ${l.bg} shadow-md scale-[1.02]`
                          : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {level === l.value && (
                        <div className="absolute top-2.5 right-2.5 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">✓</span>
                        </div>
                      )}
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${l.gradient} flex items-center justify-center text-xl mb-3 shadow-sm`}>
                        {l.icon}
                      </div>
                      <p className="font-black text-gray-900 text-base">{l.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5 leading-tight">{l.sub}</p>
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={!level || loading}
                  className="w-full py-3.5 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Création du compte…' : 'Créer mon compte 🚀'}
                </button>

                <p className="text-center text-xs text-gray-400 mt-4">
                  En créant un compte, tu acceptes nos{' '}
                  <Link href="/cgu" className="underline hover:text-gray-600">CGU</Link>
                </p>
              </>
            )}

          </div>
        </div>

      </div>
    </div>
  )
}
