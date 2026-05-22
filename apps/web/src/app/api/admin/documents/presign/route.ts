import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const supabaseAdmin = createAdminClient(
  process.env['NEXT_PUBLIC_SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_ROLE_KEY']!
)

export async function GET(req: NextRequest) {
  // Auth
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  // Vérif admin
  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin requis' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const filename = searchParams.get('filename') ?? 'document'
  const isPremium = searchParams.get('premium') === 'true'

  const safeName = filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '_')
    .replace(/^[._]+/, '')
    .slice(0, 100)

  const bucket = isPremium ? 'pdfs-premium' : 'pdfs-public'
  const storagePath = `${Date.now()}_${safeName}`

  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUploadUrl(storagePath)

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Erreur presign' }, { status: 500 })
  }

  return NextResponse.json({ signedUrl: data.signedUrl, path: storagePath, bucket })
}
