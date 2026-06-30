'use client'

import { useEffect, useState } from 'react'
import { auth } from '@/lib/firebase/client'
import { getIdToken } from 'firebase/auth'

const API_URL = ''

const TYPE_CONFIG = {
  annonce: { label: 'Annonce', color: 'bg-blue-100 text-blue-700', emoji: '📢' },
  promo:   { label: 'Promotion', color: 'bg-amber-100 text-amber-700', emoji: '🎁' },
  pub:     { label: 'Publicité', color: 'bg-violet-100 text-violet-700', emoji: '📣' },
  alerte:  { label: 'Alerte', color: 'bg-red-100 text-red-700', emoji: '⚠️' },
}

interface Notif {
  id: string; type: keyof typeof TYPE_CONFIG; title: string; message: string
  cta_label: string | null; cta_url: string | null
  is_active: boolean; target_plan: string; expires_at: string | null; created_at: string
}

const EMPTY = { type: 'annonce' as const, title: '', message: '', cta_label: '', cta_url: '', is_active: true, target_plan: 'all', expires_at: '' }

async function getToken() {
  const user = auth.currentUser
  if (!user) return ''
  try { return await getIdToken(user) } catch { return '' }
}

export default function AdminNotificationsPage() {
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    const token = await getToken()
    const res = await fetch(`${API_URL}/api/admin/notifications`, { headers: { Authorization: `Bearer ${token}` } })
    const { data } = await res.json()
    setNotifs(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError(null)
    const token = await getToken()
    const body = { ...form, cta_label: form.cta_label || null, cta_url: form.cta_url || null, expires_at: form.expires_at || null }
    const res = await fetch(`${API_URL}/api/admin/notifications`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
    if (!res.ok) { const j = await res.json(); setError(j.error?.message ?? 'Erreur'); setSaving(false); return }
    setForm(EMPTY); setShowForm(false)
    await load()
    setSaving(false)
  }

  async function handleToggle(n: Notif) {
    const token = await getToken()
    await fetch(`${API_URL}/api/admin/notifications/${n.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ is_active: !n.is_active }),
    })
    setNotifs((prev) => prev.map((x) => x.id === n.id ? { ...x, is_active: !x.is_active } : x))
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette notification ?')) return
    const token = await getToken()
    await fetch(`${API_URL}/api/admin/notifications/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    setNotifs((prev) => prev.filter((n) => n.id !== id))
  }

  return (
    <div className="px-8 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Notifications</h1>
          <p className="text-gray-500 text-sm mt-1">Annonces, promos, alertes affichées aux utilisateurs</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 shadow-sm"
        >
          {showForm ? '✕ Annuler' : '+ Nouvelle notification'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6 space-y-4">
          <h2 className="font-bold text-gray-900">Créer une notification</h2>
          {error && <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm">{error}</div>}

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as any }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.emoji} {v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">Audience</label>
              <select
                value={form.target_plan}
                onChange={(e) => setForm((f) => ({ ...f, target_plan: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tous les utilisateurs</option>
                <option value="free">Utilisateurs gratuits</option>
                <option value="premium">Abonnés Premium</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">Expire le</label>
              <input
                type="datetime-local"
                value={form.expires_at}
                onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">Titre</label>
            <input
              type="text" required value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="ex: Nouvelle application disponible !"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">Message</label>
            <textarea
              required value={form.message} rows={3}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              placeholder="Contenu de la notification…"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">Texte du bouton (optionnel)</label>
              <input
                type="text" value={form.cta_label}
                onChange={(e) => setForm((f) => ({ ...f, cta_label: e.target.value }))}
                placeholder="ex: Découvrir →"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">URL du bouton (optionnel)</label>
              <input
                type="url" value={form.cta_url}
                onChange={(e) => setForm((f) => ({ ...f, cta_url: e.target.value }))}
                placeholder="https://…"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox" checked={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm text-gray-700 font-medium">Activer immédiatement</span>
            </label>
            <button type="submit" disabled={saving} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Envoi…' : 'Publier la notification'}
            </button>
          </div>
        </form>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : notifs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <p className="text-4xl mb-3">🔔</p>
          <p className="text-gray-500 font-medium">Aucune notification</p>
          <p className="text-gray-400 text-sm mt-1">Créez votre première annonce ci-dessus.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifs.map((n) => {
            const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.annonce
            return (
              <div key={n.id} className={`bg-white rounded-2xl border shadow-sm p-5 transition-all ${n.is_active ? 'border-gray-100' : 'border-gray-200 opacity-60'}`}>
                <div className="flex items-start gap-4">
                  <span className="text-2xl flex-shrink-0 mt-0.5">{cfg.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-bold text-gray-900">{n.title}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${cfg.color}`}>{cfg.label}</span>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {n.target_plan === 'all' ? 'Tous' : n.target_plan === 'free' ? 'Gratuits' : 'Premium'}
                      </span>
                      {!n.is_active && <span className="text-xs text-gray-400">· Désactivée</span>}
                      {n.expires_at && (
                        <span className="text-xs text-gray-400">
                          · Expire {new Date(n.expires_at).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">{n.message}</p>
                    {n.cta_label && <p className="text-xs text-blue-600 mt-1.5 font-medium">🔗 {n.cta_label}</p>}
                    <p className="text-xs text-gray-400 mt-2">
                      Créée le {new Date(n.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleToggle(n)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${n.is_active ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                    >
                      {n.is_active ? 'Désactiver' : 'Activer'}
                    </button>
                    <button
                      onClick={() => handleDelete(n.id)}
                      className="px-3 py-1.5 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
