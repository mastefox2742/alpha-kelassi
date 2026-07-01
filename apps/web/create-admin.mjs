import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const env = Object.fromEntries(
  readFileSync(join(__dirname, '.env.local'), 'utf-8')
    .split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)

const app = getApps().length === 0
  ? initializeApp({
      credential: cert({
        projectId:   env.FIREBASE_PROJECT_ID,
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
        privateKey:  (env.FIREBASE_PRIVATE_KEY || '').replace(/^"|"$/g, '').replace(/\\n/g, '\n'),
      }),
    })
  : getApps()[0]

const adminAuth = getAuth(app)
const adminDb   = getFirestore(app)
adminDb.settings({ ignoreUndefinedProperties: true })

const EMAIL    = 'fresneilm139@gmail.com'
const PASSWORD = 'Admin@Kelassi2025!'
const NAME     = 'Admin Kelassi'

async function main() {
  let uid
  try {
    const existing = await adminAuth.getUserByEmail(EMAIL)
    uid = existing.uid
    await adminAuth.updateUser(uid, { password: PASSWORD, displayName: NAME })
    console.log(`Compte existant mis a jour : ${uid}`)
  } catch {
    const user = await adminAuth.createUser({ email: EMAIL, password: PASSWORD, displayName: NAME })
    uid = user.uid
    console.log(`Compte cree : ${uid}`)
  }

  // Custom claim dans le JWT — pas besoin de Firestore pour verifier le role admin
  await adminAuth.setCustomUserClaims(uid, { admin: true })
  console.log(`Custom claim admin:true pose sur ${uid}`)

  // Firestore optionnel (peut echouer si base en mode Datastore)
  try {
    await adminDb.collection('users').doc(uid).set(
      { uid, email: EMAIL, full_name: NAME, role: 'admin', level: 'bac_c', created_at: new Date() },
      { merge: true }
    )
    console.log('Firestore OK')
  } catch (e) {
    console.warn('Firestore ignore (mode Datastore probablement) :', e.message)
  }

  console.log(`\nEmail: ${EMAIL}\nPassword: ${PASSWORD}`)
  process.exit(0)
}

main().catch(e => { console.error(e.message, e.details, e.code); process.exit(1) })
