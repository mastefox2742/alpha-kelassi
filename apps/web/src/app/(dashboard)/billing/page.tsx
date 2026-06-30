'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { auth } from '@/lib/firebase/client'
import { getIdToken } from 'firebase/auth'
import Link from 'next/link'

const FEATURES_FREE = [
  '5 questions IA par jour',
  'Cours BEPC & BAC (gratuits)',
  'Flashcards de base',
  'Progression basique',
]

const FEATURES_PREMIUM = [
  'Questions IA illimitées',
  'Tous les cours & examens d\'État',
  'Corrigés détaillés PDF',
  'Flashcards avancées (SM-2)',
  'Mode hors-ligne',
  'Progression complète + badges',
  'Support prioritaire',
]

const PLANS = [
  {
    id: 'monthly' as const,
    label: 'Mensuel',
    price: '2 000',
    currency: 'FCFA',
    period: '/mois',
    subprice: '≈ 3,50 $',
    highlight: false,
  },
  {
    id: 'yearly' as const,
    label: 'Annuel',
    price: '20 000',
    currency: 'FCFA',
    period: '/an',
    subprice: '≈ 33 $ · économise 4 000 FCFA',
    highlight: true,
    badge: '-17%',
  },
]

function BillingContent() {
  const searchParams = useSearchParams()
  const success = searchParams.get('success')
  const [loading, setLoading] = useState<string | null>(null)
  const [payMethod, setPayMethod] = useState<'mobile_money' | 'card'>('mobile_money')
  const [phone, setPhone] = useState('')

  async function handleSubscribe(plan: 'monthly' | 'yearly') {
    setLoading(plan)
    const user  = auth.currentUser
    const token = user ? await getIdToken(user).catch(() => null) : null
    const endpoint = payMethod === 'card' ? '/api/billing/checkout' : '/api/billing/cinetpay'
    const body     = payMethod === 'card' ? { plan } : { plan, phone }
    const res = await fetch(endpoint, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    })
    const json = (await res.json()) as { data?: { url?: string } }
    if (json.data?.url) window.location.href = json.data.url
    setLoading(null)
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl shadow-xl p-10 text-center max-w-sm w-full">
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">🎉</div>
          <h2 className="text-2xl font-black text-gray-900 mb-3">Abonnement activé !</h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-8">
            Bienvenue dans Kelassi Premium. Tu as maintenant accès à tous les cours, examens et à l'IA illimitée.
          </p>
          <Link href="/dashboard" className="w-full inline-block py-3.5 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 transition-colors">
            Aller au tableau de bord →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">

      {/* Header */}
      <div className="text-center mb-10">
        <span className="inline-block bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1.5 rounded-full mb-4">⭐ KELASSI PREMIUM</span>
        <h1 className="text-3xl font-black text-gray-900 mb-3">Réussis ton examen avec l'IA</h1>
        <p className="text-gray-500 max-w-md mx-auto">
          Accès illimité à tous les cours, examens d'État et questions au tuteur IA Kelassi.
        </p>
      </div>

      {/* Comparison */}
      <div className="grid grid-cols-2 gap-4 mb-10">
        {/* Free */}
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Gratuit</p>
          <p className="text-2xl font-black text-gray-900 mb-4">0 FCFA</p>
          <div className="space-y-2.5">
            {FEATURES_FREE.map((f) => (
              <div key={f} className="flex items-start gap-2 text-sm text-gray-600">
                <span className="text-gray-400 mt-0.5">✓</span>
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Premium */}
        <div className="bg-gradient-to-br from-blue-600 to-violet-600 rounded-2xl p-5 text-white">
          <p className="text-xs font-bold text-blue-200 uppercase tracking-wider mb-1">Premium</p>
          <p className="text-2xl font-black mb-4">2 000 FCFA<span className="text-sm font-normal opacity-70">/mois</span></p>
          <div className="space-y-2.5">
            {FEATURES_PREMIUM.map((f) => (
              <div key={f} className="flex items-start gap-2 text-sm text-blue-50">
                <span className="text-blue-300 mt-0.5 font-bold">✓</span>
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Payment method */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 mb-6">
        <p className="text-sm font-bold text-gray-700 mb-3">Mode de paiement</p>
        <div className="flex rounded-xl bg-gray-100 p-1 mb-5">
          {(['mobile_money', 'card'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setPayMethod(m)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                payMethod === m ? 'bg-white shadow text-gray-900' : 'text-gray-500'
              }`}
            >
              {m === 'mobile_money' ? '📱 Mobile Money' : '💳 Carte bancaire'}
            </button>
          ))}
        </div>

        {payMethod === 'mobile_money' && (
          <div className="mb-5">
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Numéro MTN / Orange Money</label>
            <div className="flex">
              <span className="px-4 py-3 bg-gray-100 border border-gray-200 border-r-0 rounded-l-xl text-gray-600 text-sm font-medium">
                🇨🇬 +242
              </span>
              <input
                type="tel"
                placeholder="06 XXX XX XX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="flex-1 px-4 py-3 border border-gray-200 rounded-r-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
          </div>
        )}

        {/* Plans */}
        <div className="grid grid-cols-2 gap-3">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl border-2 p-5 transition-all ${
                plan.highlight
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              {plan.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                  {plan.badge} économie
                </span>
              )}
              <p className="font-bold text-gray-900 mb-2">{plan.label}</p>
              <div className="flex items-baseline gap-1 mb-0.5 whitespace-nowrap">
                <span className="text-2xl font-black text-gray-900">{plan.price}</span>
                <span className="text-sm font-bold text-gray-500">{plan.currency}</span>
              </div>
              <p className="text-xs text-gray-400 mb-4">{plan.subprice}</p>
              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={!!loading || (payMethod === 'mobile_money' && !phone)}
                className={`w-full py-2.5 rounded-xl font-bold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  plan.highlight
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-900 text-white hover:bg-gray-700'
                }`}
              >
                {loading === plan.id ? 'Redirection…' : 'Choisir ce plan'}
              </button>
            </div>
          ))}
        </div>
      </div>

      <p className="text-center text-xs text-gray-400">
        Essai gratuit 14 jours · Annulation à tout moment · Paiement sécurisé CinetPay
      </p>
    </div>
  )
}

export default function BillingPage() {
  return (
    <Suspense>
      <BillingContent />
    </Suspense>
  )
}
