/**
 * Seed du cours « Vie d'entreprise — Terminale G2 · G3 · BG » dans Firestore.
 *
 * Écrit (et ÉCRASE s'ils existent déjà, via des IDs déterministes) :
 *   - subjects/subj-vie-entreprise-bac-g          (la matière)
 *   - documents/cours-vie-entreprise-terminale-g  (le cours, avec text_content)
 *   - course_chapters/cveg-<n>                     (une fiche par chapitre, status 'done')
 *
 * Le contenu est lu depuis store/cours/vie-entreprise-terminale-g.md :
 *   - le titre (# …) devient le titre du document ;
 *   - chaque section de niveau 2 (## …) devient un chapitre / une fiche.
 *
 * Utilisation (mêmes identifiants Firebase que create-admin.mjs) :
 *   cd apps/web && node seed-vie-entreprise.mjs
 * Nécessite apps/web/.env.local avec FIREBASE_PROJECT_ID / _CLIENT_EMAIL / _PRIVATE_KEY.
 */
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

/* ── Identifiants Firebase (lus depuis .env.local, comme create-admin.mjs) ── */
const env = Object.fromEntries(
  readFileSync(join(__dirname, '.env.local'), 'utf-8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
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

const db = getFirestore(app)
db.settings({ ignoreUndefinedProperties: true })

/* ── Constantes du cours ──────────────────────────────────────────────────── */
const SUBJECT_ID  = 'subj-vie-entreprise-bac-g'
const DOCUMENT_ID = 'cours-vie-entreprise-terminale-g'
const LEVEL       = 'bac_g'          // Terminale série G (G2 · G3 · BG)
const COUNTRY     = 'CG'
const MD_PATH     = join(__dirname, '..', '..', 'store', 'cours', 'vie-entreprise-terminale-g.md')

/* ── Découpage du markdown en titre + chapitres ──────────────────────────── */
function parseCourse(md) {
  const lines = md.split('\n')
  const h1 = lines.find((l) => l.startsWith('# '))
  const title = h1 ? h1.replace(/^#\s+/, '').trim() : 'Vie d\'entreprise — Terminale G'

  // Chaque bloc "## " est un chapitre (une fiche de révision).
  const chapters = []
  const parts = md.split(/\n(?=##\s+)/g)
  for (const part of parts) {
    if (!part.startsWith('## ')) continue
    const firstLine = part.split('\n')[0]
    let chTitle = firstLine.replace(/^##\s+/, '').trim()
    // "Chapitre 1 — Le pilotage de l'entreprise" → on garde le titre complet.
    const body = part.trim()
    const wordCount = body.replace(/[#*>`|_-]/g, ' ').split(/\s+/).filter(Boolean).length
    // On promeut le titre de fiche en H1 pour un beau rendu dans le lecteur.
    const summaryMd = body.replace(/^##\s+/, '# ')
    chapters.push({ title: chTitle, summaryMd, wordCount })
  }
  return { title, chapters, fullText: md }
}

async function main() {
  const md = readFileSync(MD_PATH, 'utf-8')
  const { title, chapters, fullText } = parseCourse(md)
  const now = new Date()

  /* 1) Matière ------------------------------------------------------------- */
  await db.collection('subjects').doc(SUBJECT_ID).set({
    id:           SUBJECT_ID,
    name:         'Vie d\'entreprise',
    level:        LEVEL,
    country_code: COUNTRY,
    icon:         '🏢',
    created_at:   now,
  }, { merge: true })
  console.log(`Matière OK : ${SUBJECT_ID}`)

  /* 2) Document (cours) ---------------------------------------------------- */
  await db.collection('documents').doc(DOCUMENT_ID).set({
    id:            DOCUMENT_ID,
    subject_id:    SUBJECT_ID,
    type:          'cours',
    title,
    level:         LEVEL,
    year:          null,
    session:       null,
    country_code:  COUNTRY,
    pdf_url:       null,
    text_content:  fullText,
    is_premium:    false,
    synthesized_at: now,
    created_at:    now,
  }, { merge: true })
  console.log(`Document OK : ${DOCUMENT_ID} — « ${title} »`)

  /* 3) Chapitres (fiches) — on écrase l'ancien jeu de fiches --------------- */
  const existing = await db.collection('course_chapters')
    .where('document_id', '==', DOCUMENT_ID).get()
  const del = db.batch()
  existing.forEach((d) => del.delete(d.ref))
  await del.commit()
  console.log(`Anciennes fiches supprimées : ${existing.size}`)

  const write = db.batch()
  chapters.forEach((ch, i) => {
    const n = i + 1
    const ref = db.collection('course_chapters').doc(`cveg-${String(n).padStart(2, '0')}`)
    write.set(ref, {
      document_id:    DOCUMENT_ID,
      chapter_number: n,
      title:          ch.title,
      summary_md:     ch.summaryMd,
      raw_text:       null,
      word_count:     ch.wordCount,
      status:         'done',
      error_message:  null,
      created_at:     now,
      updated_at:     now,
    })
  })
  await write.commit()
  console.log(`Fiches écrites : ${chapters.length}`)
  chapters.forEach((ch, i) => console.log(`  ${i + 1}. ${ch.title}`))

  console.log('\n✅ Cours « Vie d\'entreprise » (Terminale G2 · G3 · BG) publié sur la plateforme.')
  process.exit(0)
}

main().catch((e) => { console.error(e.message, e.code ?? '', e.details ?? ''); process.exit(1) })
