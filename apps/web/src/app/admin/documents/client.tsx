'use client'

import { useState, useRef } from 'react'
import { UploadForm } from '../_components/upload-form'
import { getIdToken } from '@/lib/firebase/auth'
import type { Level } from '@alpha-kelassi/types'

const API_URL = ''  // routes Next.js locales

interface Subject { id: string; name: string; level: Level }
interface Document {
  id: string; title: string; type: string; level: string
  year: number | null; is_premium: boolean; created_at: string
  corrige_url: string | null
  subjects: { name: string } | null
}

async function getToken() {
  return (await getIdToken()) ?? ''
}

export function AdminDocumentsClient({ subjects, documents: initial }: { subjects: Subject[]; documents: Document[] }) {
  const [docs, setDocs] = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [corrigeDocId, setCorrigeDocId] = useState<string | null>(null)
  const [uploadingCorrige, setUploadingCorrige] = useState(false)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'cours' | 'examen'>('all')
  const corrigeRef = useRef<HTMLInputElement>(null)

  const filtered = docs.filter((d) => {
    const matchType = filterType === 'all' || d.type === filterType
    const matchSearch = !search || d.title.toLowerCase().includes(search.toLowerCase()) || d.subjects?.name.toLowerCase().includes(search.toLowerCase())
    return matchType && matchSearch
  })

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Supprimer « ${title} » ? Cette action est irréversible.`)) return
    setDeletingId(id)
    const token = await getToken()
    await fetch(`${API_URL}/api/admin/documents/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    setDocs((d) => d.filter((doc) => doc.id !== id))
    setDeletingId(null)
  }

  async function handleCorrigeUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!corrigeDocId || !e.target.files?.[0]) return
    setUploadingCorrige(true)
    const token = await getToken()
    const fd = new FormData()
    fd.append('file', e.target.files[0])
    const res = await fetch(`${API_URL}/api/admin/documents/${corrigeDocId}/corrige`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    })
    if (res.ok) {
      const { data } = await res.json()
      setDocs((prev) => prev.map((d) => d.id === corrigeDocId ? { ...d, corrige_url: data.corrige_url } : d))
    }
    setUploadingCorrige(false)
    setCorrigeDocId(null)
    if (corrigeRef.current) corrigeRef.current.value = ''
  }

  return (
    <div className="px-8 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Documents</h1>
          <p className="text-sm text-gray-500">{docs.length} document(s) en base</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 shadow-sm"
        >
          {showForm ? '✕ Annuler' : '+ Uploader un PDF'}
        </button>
      </div>

      {showForm && (
        <div className="mb-8">
          <UploadForm subjects={subjects} onSuccess={() => { setShowForm(false); window.location.reload() }} />
        </div>
      )}

      {/* Hidden corrigé input */}
      <input ref={corrigeRef} type="file" accept="application/pdf" className="hidden" onChange={handleCorrigeUpload} />

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <input
          type="text"
          placeholder="Rechercher..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex bg-gray-100 rounded-xl p-1">
          {(['all', 'cours', 'examen'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${filterType === t ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
            >
              {t === 'all' ? 'Tous' : t === 'cours' ? 'Cours' : 'Examens'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Titre', 'Matière', 'Type', 'Niveau', 'Accès', 'Corrigé', 'Date', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((doc) => (
              <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate">{doc.title}</td>
                <td className="px-4 py-3 text-gray-500">{doc.subjects?.name ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${doc.type === 'examen' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                    {doc.type}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 uppercase text-xs">{doc.level.replace('_', ' ')}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${doc.is_premium ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                    {doc.is_premium ? '⭐ Premium' : 'Gratuit'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {doc.corrige_url ? (
                    <span className="text-xs text-emerald-600 font-medium">✅ Disponible</span>
                  ) : (
                    <button
                      onClick={() => { setCorrigeDocId(doc.id); setTimeout(() => corrigeRef.current?.click(), 50) }}
                      disabled={uploadingCorrige}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
                    >
                      {uploadingCorrige && corrigeDocId === doc.id ? 'Upload…' : '+ Ajouter'}
                    </button>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                  {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleDelete(doc.id, doc.title)}
                    disabled={deletingId === doc.id}
                    className="px-2.5 py-1 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 disabled:opacity-50 transition-colors"
                  >
                    {deletingId === doc.id ? '…' : 'Supprimer'}
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                  {search ? 'Aucun résultat pour cette recherche' : 'Aucun document — uploadez votre premier PDF ci-dessus'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
