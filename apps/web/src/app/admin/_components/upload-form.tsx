'use client'

import { useState, useRef } from 'react'

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
  const [progress, setProgress] = useState<string | null>(null)
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
    if (!file) return setError('Sélectionnez un fichier (PDF, DOCX ou TXT)')
    if (!form.subject_id) return setError('Sélectionnez une matière')

    setLoading(true)
    setError(null)

    try {
      // Étape 1 : obtenir une URL d'upload signée depuis Supabase
      setProgress('Préparation de l\'upload…')
      const presignRes = await fetch(
        `/api/admin/documents/presign?filename=${encodeURIComponent(file.name)}&premium=${form.is_premium}`
      )
      const presignJson = await presignRes.json() as { signedUrl?: string; path?: string; bucket?: string; error?: string }
      if (!presignRes.ok) throw new Error(presignJson.error ?? 'Erreur presign')

      const { signedUrl, path: storagePath, bucket } = presignJson as { signedUrl: string; path: string; bucket: string }

      // Étape 2 : upload direct vers Supabase Storage (pas de limite de taille)
      setProgress('Upload du fichier…')
      const uploadRes = await fetch(signedUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
      })
      if (!uploadRes.ok) throw new Error(`Erreur upload storage (${uploadRes.status})`)

      // Étape 3 : extraction texte + sauvegarde en base
      setProgress('Extraction du texte…')
      const meta = {
        ...form,
        year: form.year ? parseInt(form.year) : undefined,
        session: form.session || undefined,
      }

      const saveRes = await fetch('/api/admin/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storagePath, bucket, meta }),
      })
      const saveJson = await saveRes.json() as { error?: string; data?: unknown }
      if (!saveRes.ok) throw new Error(saveJson.error ?? 'Erreur sauvegarde')

      // Succès
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
      setForm((f) => ({ ...f, title: '', year: '', session: '' }))
      onSuccess()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
      setProgress(null)
    }
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
            <option value="examen">Examen d&apos;État</option>
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
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Fichier <span className="text-gray-400 font-normal">(PDF, DOCX ou TXT — taille illimitée)</span>
        </label>
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx,text/plain,.txt"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          required
          className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        {file && (
          <p className="text-xs text-gray-500 mt-1">
            {file.name} — {(file.size / 1024 / 1024).toFixed(2)} Mo
          </p>
        )}
        <p className="text-xs text-gray-400 mt-1">
          Le texte est extrait automatiquement et présenté de façon formatée aux élèves.
        </p>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? (progress ?? 'Upload en cours…') : 'Uploader le document'}
      </button>
    </form>
  )
}
