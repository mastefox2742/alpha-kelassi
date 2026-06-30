'use client'

import { useState, Suspense } from 'react'
import { verifyPhoneOtp } from '@/lib/firebase/auth'
import { useRouter, useSearchParams } from 'next/navigation'

function VerifyOTPForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const phone = searchParams.get('phone') ?? ''

  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await verifyPhoneOtp(otp)
      router.push('/dashboard')
    } catch {
      setError('Code invalide ou expiré. Réessaie.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <div className="text-4xl text-center mb-4">📱</div>
        <h1 className="text-2xl font-bold text-center mb-2">Code de vérification</h1>
        <p className="text-sm text-gray-500 text-center mb-6">
          Entrez le code envoyé par SMS au <strong>{phone}</strong>
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
        )}

        <form onSubmit={handleVerify} className="space-y-4">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            placeholder="000000"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            required
            className="w-full px-4 py-4 border rounded-lg text-center text-2xl tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={loading || otp.length < 6}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Vérification...' : 'Confirmer'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function VerifyOTPPage() {
  return (
    <Suspense>
      <VerifyOTPForm />
    </Suspense>
  )
}
