'use client'

import { useState } from 'react'
import { getIdToken } from '@/lib/firebase/auth'

interface User {
  id: string; full_name: string | null; email: string | null
  phone: string | null; role: string; plan: string; created_at: string
}

export function AdminUsersClient({ users: initial }: { users: User[] }) {
  const [users, setUsers] = useState(initial)
  const [search, setSearch] = useState('')
  const [filterPlan, setFilterPlan] = useState<'all' | 'free' | 'premium'>('all')
  const [updating, setUpdating] = useState<string | null>(null)

  const filtered = users.filter((u) => {
    const matchPlan = filterPlan === 'all' || u.plan === filterPlan
    const q = search.toLowerCase()
    const matchSearch = !search || (u.full_name ?? '').toLowerCase().includes(q) || (u.email ?? '').toLowerCase().includes(q) || (u.phone ?? '').includes(q)
    return matchPlan && matchSearch
  })

  async function updateUser(id: string, patch: { plan?: string; role?: string }) {
    setUpdating(id)
    const token = await getIdToken()
    await fetch(`/api/admin/users/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body:    JSON.stringify(patch),
    })
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, ...patch } : u))
    setUpdating(null)
  }

  return (
    <div className="px-8 py-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900">Utilisateurs</h1>
        <p className="text-gray-500 text-sm mt-1">{users.length} compte(s) enregistré(s)</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total', value: users.length, color: 'bg-blue-50 text-blue-700' },
          { label: 'Gratuits', value: users.filter((u) => u.plan === 'free').length, color: 'bg-gray-50 text-gray-700' },
          { label: 'Premium', value: users.filter((u) => u.plan === 'premium').length, color: 'bg-amber-50 text-amber-700' },
        ].map((s) => (
          <div key={s.label} className={`${s.color} rounded-2xl px-5 py-4`}>
            <p className="text-2xl font-black">{s.value}</p>
            <p className="text-sm font-medium mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <input
          type="text" placeholder="Rechercher par nom, email, téléphone…"
          value={search} onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex bg-gray-100 rounded-xl p-1">
          {(['all', 'free', 'premium'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setFilterPlan(p)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${filterPlan === p ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
            >
              {p === 'all' ? 'Tous' : p === 'free' ? 'Gratuit' : 'Premium'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Utilisateur', 'Contact', 'Plan', 'Rôle', 'Inscrit le', 'Actions'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {(u.full_name ?? u.email ?? '?').charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-gray-900 truncate max-w-[160px]">
                      {u.full_name ?? <span className="text-gray-400 italic">Sans nom</span>}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  <div>{u.email ?? '—'}</div>
                  <div>{u.phone ?? '—'}</div>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${u.plan === 'premium' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                    {u.plan === 'premium' ? '⭐ Premium' : 'Gratuit'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${u.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-blue-50 text-blue-600'}`}>
                    {u.role === 'admin' ? '🛡 Admin' : 'Élève'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                  {new Date(u.created_at).toLocaleDateString('fr-FR')}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {u.plan === 'free' ? (
                      <button
                        onClick={() => updateUser(u.id, { plan: 'premium' })}
                        disabled={updating === u.id}
                        className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold hover:bg-amber-100 disabled:opacity-50 transition-colors whitespace-nowrap"
                      >
                        {updating === u.id ? '…' : '→ Premium'}
                      </button>
                    ) : (
                      <button
                        onClick={() => updateUser(u.id, { plan: 'free' })}
                        disabled={updating === u.id}
                        className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-200 disabled:opacity-50 transition-colors whitespace-nowrap"
                      >
                        {updating === u.id ? '…' : '→ Gratuit'}
                      </button>
                    )}
                    {u.role === 'student' && (
                      <button
                        onClick={() => { if (confirm(`Donner les droits admin à ${u.full_name ?? u.email} ?`)) updateUser(u.id, { role: 'admin' }) }}
                        disabled={updating === u.id}
                        className="px-2.5 py-1 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 disabled:opacity-50 transition-colors"
                      >
                        Admin
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                  Aucun utilisateur trouvé
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
