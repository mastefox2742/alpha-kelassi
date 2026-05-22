import type { Context, Next } from 'hono'
import type { AppVariables } from '../lib/types.js'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@alpha-kelassi/types'
import { createScopedClient } from '../lib/supabase.js'

export async function authMiddleware(c: Context<{ Variables: AppVariables }>, next: Next) {
  const authorization = c.req.header('Authorization')
  if (!authorization?.startsWith('Bearer ')) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Missing token' } }, 401)
  }

  const token = authorization.slice(7)
  
  // On utilise un client admin temporaire uniquement pour vérifier le token
  // car getUser() nécessite une clé valide pour contacter Supabase Auth
  const supabaseAuth = createClient<Database>(
    process.env['SUPABASE_URL']!,
    process.env['SUPABASE_SERVICE_ROLE_KEY']!,
    { auth: { persistSession: false } }
  )

  const { data: { user }, error } = await supabaseAuth.auth.getUser(token)
  if (error || !user) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Invalid token' } }, 401)
  }

  // Injecte l'ID utilisateur et le client Supabase sécurisé (RLS) dans le contexte
  c.set('userId', user.id)
  c.set('supabase', createScopedClient(token))
  
  await next()
}

