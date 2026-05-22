import { createClient } from '@supabase/supabase-js'
import type { Database } from '@alpha-kelassi/types'

const supabaseUrl = process.env['SUPABASE_URL']!
const serviceRoleKey = process.env['SUPABASE_SERVICE_ROLE_KEY']!
const anonKey = process.env['SUPABASE_ANON_KEY'] || process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!

/**
 * Client avec les droits SERVICE_ROLE (Admin).
 * À utiliser UNIQUEMENT pour les jobs d'arrière-plan, les webhooks de paiement,
 * ou les opérations administratives ne pouvant pas être faites via RLS.
 */
export const supabaseAdmin = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
})

/**
 * Client par défaut utilisant la clé ANON.
 * Ce client respecte les politiques RLS si un token est fourni via les headers globaux.
 */
export const supabase = createClient<Database>(supabaseUrl, anonKey, {
  auth: { persistSession: false }
})

/**
 * Crée un client Supabase authentifié avec le JWT de l'utilisateur.
 * Ce client respectera strictement les politiques RLS de la base de données.
 */
export function createScopedClient(token: string) {
  return createClient<Database>(supabaseUrl, anonKey, {
    auth: { persistSession: false },
    global: {
      headers: {
        Authorization: 'Bearer ' + token,
      },
    },
  })
}
