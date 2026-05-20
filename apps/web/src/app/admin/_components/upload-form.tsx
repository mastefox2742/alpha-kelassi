'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

type Level = 'bepc' | 'bac_a' | 'bac_c' | 'bac_d'
type DocType = 'cours' | 'examen'

interface Subject { id: string; name: string; level: Level }

interface Props {
  subjects: Subject[]
  onSuccess: () => void
}

export function UploadForm({ subjects, onSuccess }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    subject_id: '',
    type: 'cours' as DocType,
    title: '',
    level: 'bepc' as Level,
    year: '',
    session: '',
    is_premium: false,
    country_code: 'CG',
  })

  const filteredSubjects = subjects.filter((s) => s.level === form.level)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return setError('Sélectionnez un fichier PDF')
    if (!form.subject_id) return setError('Sélectionnez une matière')

    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()

    const meta = {
      ...form,
      year: form.year ? parseInt(form.year) : undefined,
      session: form.session || undefined,
    }

    const fd = new FormData()
    fd.append('file', file)
    fd.append('meta', JSON.stringify(meta))

    const res = await fetch(
      `${process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'}/api/admin/documents`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: fd,
      }
    )

    const json = await res.json() as { error?: { message: string } }
    if (!res.ok) {
      setError(json.error?.message ?? 'Erreur upload')
    } else {
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
      setForm((f) => ({ ...f, title: '', year: '', session: '' }))
      onSuccess()
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border p-6 space-y-4">
      <h2 className="font-semibold text-lg">Uploader un document</h2>

      {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Niveau</label>
          <select
            value={form.level}
            onChange={(e) => setForm((f) => ({ ...f, level: e.target.value as Level, subject_id: '' }))}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          >
            {(['bepc', 'bac_a', 'bac_c', 'bac_d'] as Level[]).map((l) => (
              <option key={l} value={l}>{l.toUpperCase().replace('_', ' ')}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as DocType }))}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          >
            <option value="cours">Cours</option>
            <option value="examen">Examen d'État</option>
          </select>
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Matière</label>
          <select
            value={form.subject_id}
            onChange={(e) => setForm((f) => ({ ...f, subject_id: e.target.value }))}
            className="w-full border rounded-lg px-3 py-2 text-sm"
            required
          >
            <option value="">— Choisir —</option>
            {filteredSubjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Titre</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="ex: Mathématiques BEPC 2023 — Session normale"
            required
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>

        {form.type === 'examen' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Année</label>
              <input
                type="number"
                value={form.year}
                onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))}
                placeholder="2023"
                min={1990} max={2030}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Session</label>
              <select
                value={form.session}
                onChange={(e) => setForm((f) => ({ ...f, session: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="">—</option>
                <option value="normale">Normale</option>
                <option value="rattrapage">Rattrapage</option>
              </select>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_premium}
            onChange={(e) => setForm((f) => ({ ...f, is_premium: e.target.checked }))}
            className="w-4 h-4"
          />
          <span className="text-sm text-gray-700">Document Premium</span>
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Fichier PDF</label>
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          required
          className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        {file && <p className="text-xs text-gray-500 mt-1">{file.name} — {(file.size / 1024 / 1024).toFixed(2)} Mo</p>}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Upload en cours...' : 'Uploader le document'}
      </button>
    </form>
  )
}
