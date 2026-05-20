'use client'

import { useState } from 'react'
import { UploadForm } from '../_components/upload-form'

interface Subject { id: string; name: string; level: string }
interface Document {
  id: string
  title: string
  type: string
  level: string
  year: number | null
  is_premium: boolean
  created_at: string
  subjects: { name: string } | null
}

interface Props {
  subjects: Subject[]
  documents: Document[]
}

export function AdminDocumentsClient({ subjects, documents: initial }: Props) {
  const [docs, setDocs] = useState(initial)
  const [showForm, setShowForm] = useState(false)

  function handleSuccess() {
    setShowForm(false)
    // Rafraîchit la liste (simple rechargement)
    window.location.reload()
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Documents</h1>
          <p className="text-sm text-gray-500">{docs.length} document(s) en base</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          {showForm ? 'Annuler' : '+ Uploader un PDF'}
        </button>
      </div>

      {showForm && (
        <div className="mb-8">
          <UploadForm subjects={subjects} onSuccess={handleSuccess} />
        </div>
      )}

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['Titre', 'Matière', 'Type', 'Niveau', 'Année', 'Accès', 'Date'].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {docs.map((doc) => (
              <tr key={doc.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium max-w-[200px] truncate">{doc.title}</td>
                <td className="px-4 py-3 text-gray-600">{doc.subjects?.name ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    doc.type === 'examen' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {doc.type}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600 uppercase text-xs">{doc.level.replace('_', ' ')}</td>
                <td className="px-4 py-3 text-gray-600">{doc.year ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    doc.is_premium ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {doc.is_premium ? 'Premium' : 'Gratuit'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                </td>
              </tr>
            ))}
            {docs.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  Aucun document — uploadez votre premier PDF ci-dessus
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
