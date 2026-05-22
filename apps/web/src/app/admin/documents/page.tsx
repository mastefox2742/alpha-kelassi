import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminDocumentsClient } from './client'

export default async function AdminDocumentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: subjects } = await supabase
    .from('subjects')
    .select('id, name, level')
    .order('level')
    .order('name')

  const { data: documents } = await supabase
    .from('documents')
    .select('id, title, type, level, year, is_premium, corrige_url, created_at, subjects(name)')
    .order('created_at', { ascending: false })
    .limit(200)

  return <AdminDocumentsClient subjects={subjects ?? []} documents={documents ?? []} />
}
