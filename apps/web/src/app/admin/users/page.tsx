import { createClient } from '@/lib/supabase/server'
import { AdminUsersClient } from './client'

export default async function AdminUsersPage() {
  const supabase = await createClient()

  const { data: users } = await supabase
    .from('users')
    .select('id, full_name, email, phone, role, plan, created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  return <AdminUsersClient users={users ?? []} />
}
