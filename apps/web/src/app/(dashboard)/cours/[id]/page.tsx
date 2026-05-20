import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { PDFViewer } from './pdf-viewer'
import Link from 'next/link'

export default async function CoursDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: doc } = await supabase
    .from('documents')
    .select('*, subjects(name, level)')
    .eq('id', id)
    .single()

  if (!doc) notFound()

  if (doc.is_premium) {
    const { data: profile } = await supabase.from('users').select('plan').eq('id', user.id).single()
    if (profile?.plan !== 'premium') {
      return (
        <div className="max-w-2xl mx-auto px-6 py-20 text-center">
          <p className="text-5xl mb-4">⭐</p>
          <h2 className="text-xl font-bold mb-2">Contenu Premium</h2>
          <p className="text-gray-500 mb-6">Ce document est réservé aux abonnés Premium.</p>
          <Link href="/billing" className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700">
            Passer à Premium — 2 000 FCFA/mois
          </Link>
        </div>
      )
    }
  }

  // URL signée Supabase Storage (15 min)
  const bucket = doc.is_premium ? 'pdfs-premium' : 'pdfs-public'
  const fileName = doc.pdf_url.split('/').pop() ?? ''
  const { data: signed } = await supabase.storage.from(bucket).createSignedUrl(fileName, 900)

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Fil d'Ariane */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
        <Link href="/cours" className="hover:text-gray-600">Cours</Link>
        <span>›</span>
        <span className="text-gray-700">{doc.title}</span>
      </div>

      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold">{doc.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-400 uppercase">{doc.level.replace('_', ' ')}</span>
            {doc.year && <span className="text-xs text-gray-400">· {doc.year}</span>}
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              doc.type === 'examen' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
            }`}>
              {doc.type}
            </span>
          </div>
        </div>
        <Link
          href={`/tuteur?document=${doc.id}`}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
        >
          🤖 Demander à Kelassi
        </Link>
      </div>

      {/* Lecteur PDF */}
      {signed?.signedUrl ? (
        <PDFViewer url={signed.signedUrl} />
      ) : (
        <div className="bg-gray-100 rounded-xl p-8 text-center text-gray-400">
          URL PDF indisponible
        </div>
      )}
    </div>
  )
}
