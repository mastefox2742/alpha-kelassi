import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

let _admin: ReturnType<typeof createAdminClient> | null = null
function getAdmin() {
  if (!_admin) {
    _admin = createAdminClient(
      process.env['NEXT_PUBLIC_SUPABASE_URL']!,
      process.env['SUPABASE_SERVICE_ROLE_KEY']!
    )
  }
  return _admin
}

/** DELETE /api/account — suppression RGPD du compte */
export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  // Supprime l'entrée users (cascade PostgreSQL supprime tout le reste)
  const { error } = await supabase.from('users').delete().eq('id', user.id)
  if (error) return NextResponse.json({ error: { code: 'DB_ERROR', message: error.message } }, { status: 500 })

  // Supprime aussi l'utilisateur Auth via le service role
  await getAdmin().auth.admin.deleteUser(user.id).catch(() => null)

  return NextResponse.json({ data: { deleted: true } })
}
