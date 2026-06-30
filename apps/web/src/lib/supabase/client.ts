// Ce fichier est conservé pour compatibilité pendant la migration.
// Utiliser apps/web/src/lib/firebase/client.ts à la place.
export { db as supabase, auth, storage } from '../firebase/client'

// Compatibilité — les pages encore non migrées importent createClient.
// Jette une erreur explicite au lieu d'un crash silencieux.
export const createClient = () => {
  throw new Error('[migration] createClient Supabase supprimé — utilise les fonctions Firebase de @/lib/firebase/auth')
}
