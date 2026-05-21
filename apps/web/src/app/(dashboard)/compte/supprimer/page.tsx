'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'

export default function SupprimerComptePage() {
  const [step, setStep] = useState<'confirm' | 'exporting' | 'deleting' | 'done' | 'error'>('confirm')
  const [errorMsg, setErrorMsg] = useState('')
  const supabase = createClient()

  async function handleExport() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const res = await fetch(`${API_URL}/api/account/export`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    if (!res.ok) return

    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'kelassi-mes-donnees.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleDelete() {
    setStep('deleting')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Non connecté')

      const res = await fetch(`${API_URL}/api/account`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message ?? 'Erreur serveur')
      }

      await supabase.auth.signOut()
      setStep('done')
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Erreur inconnue')
      setStep('error')
    }
  }

  if (step === 'done') {
    return (
      <div className="max-w-lg mx-auto px-6 py-20 text-center">
        <p className="text-5xl mb-4">✅</p>
        <h1 className="text-xl font-bold mb-2">Compte supprimé</h1>
        <p className="text-gray-500 text-sm mb-6">
          Toutes tes données ont été effacées. Merci d'avoir utilisé Kelassi.
        </p>
        <Link href="/" className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
          Retour à l'accueil
        </Link>
      </div>
    )
  }

  if (step === 'error') {
    return (
      <div className="max-w-lg mx-auto px-6 py-20 text-center">
        <p className="text-5xl mb-4">❌</p>
        <h1 className="text-xl font-bold mb-2">Erreur</h1>
        <p className="text-gray-500 text-sm mb-6">{errorMsg}</p>
        <button
          onClick={() => setStep('confirm')}
          className="px-5 py-2.5 bg-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-300"
        >
          Réessayer
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <Link href="/dashboard" className="text-sm text-blue-600 hover:underline mb-6 inline-block">← Retour</Link>

      <div className="bg-white rounded-2xl border border-red-100 p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">⚠️</span>
          <h1 className="text-xl font-bold text-red-700">Supprimer mon compte</h1>
        </div>

        <p className="text-sm text-gray-600 mb-4 leading-relaxed">
          Cette action est <strong>irréversible</strong>. Elle supprimera définitivement :
        </p>
        <ul className="text-sm text-gray-600 space-y-1 mb-6 pl-4">
          <li>• Ton profil et tes informations personnelles</li>
          <li>• Tout ton historique de cours et d'examens consultés</li>
          <li>• Tes flashcards et ta progression SM-2</li>
          <li>• Tes conversations avec Kelassi IA</li>
          <li>• Ton abonnement actif (aucun remboursement)</li>
        </ul>

        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-6">
          <p className="text-sm text-amber-800 font-medium mb-2">Avant de supprimer, pense à exporter tes données</p>
          <button
            onClick={handleExport}
            className="text-sm text-amber-700 underline hover:text-amber-900"
          >
            Télécharger mes données (JSON) →
          </button>
        </div>

        <button
          onClick={handleDelete}
          disabled={step === 'deleting'}
          className="w-full py-3 bg-red-600 text-white rounded-xl font-medium text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {step === 'deleting' ? 'Suppression en cours…' : 'Supprimer définitivement mon compte'}
        </button>

        <p className="text-xs text-gray-400 mt-4 text-center">
          Conformément à notre{' '}
          <Link href="/confidentialite" className="underline hover:text-gray-600">politique de confidentialité</Link>
        </p>
      </div>
    </div>
  )
}
