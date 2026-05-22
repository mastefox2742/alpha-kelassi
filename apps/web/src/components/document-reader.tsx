'use client'

import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'

interface Props {
  text: string
  title?: string
}

/**
 * Transforme le texte brut extrait (PDF/DOCX/TXT) en une mise en page
 * lisible et structurée optimisée pour la révision scolaire.
 *
 * Détecte automatiquement :
 * - Chapitres / parties (I. II. III. / Chapitre 1 / TITRE EN CAPS)
 * - Sous-sections (A. B. / 1. 2. au premier niveau)
 * - Blocs exercice / problème / question
 * - Formules LaTeX inline $...$ et bloc $$...$$
 */
export function DocumentReader({ text, title }: Props) {
  const markdown = textToMarkdown(text)

  return (
    <article className="document-reader max-w-3xl mx-auto px-5 py-8">
      {title && (
        <h1 className="text-2xl font-black text-gray-900 mb-6 leading-tight">{title}</h1>
      )}

      {/* Barre de progression de lecture */}
      <ReadingProgress />

      <div className="prose prose-gray prose-sm sm:prose-base max-w-none
        prose-headings:font-bold prose-headings:text-gray-900
        prose-h2:text-xl prose-h2:border-b prose-h2:border-gray-100 prose-h2:pb-2 prose-h2:mt-8
        prose-h3:text-base prose-h3:text-blue-800
        prose-p:leading-7 prose-p:text-gray-700
        prose-strong:text-gray-900
        prose-blockquote:border-blue-400 prose-blockquote:bg-blue-50 prose-blockquote:rounded-r-lg prose-blockquote:py-1
        prose-code:text-blue-700 prose-code:bg-blue-50 prose-code:px-1 prose-code:rounded
        prose-li:text-gray-700
      ">
        <ReactMarkdown
          remarkPlugins={[remarkMath]}
          rehypePlugins={[rehypeKatex]}
          components={{
            // Blocs exercice → card verte
            blockquote: ({ children }) => (
              <div className="not-prose my-4 border-l-4 border-emerald-400 bg-emerald-50 rounded-r-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-emerald-600 font-bold text-sm uppercase tracking-wide">✏️ Exercice</span>
                </div>
                <div className="text-gray-700 text-sm leading-relaxed">{children}</div>
              </div>
            ),
            // Titres h2 avec ancre pour table des matières
            h2: ({ children, ...props }) => {
              const id = String(children).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
              return (
                <h2 id={id} className="scroll-mt-16" {...props}>
                  {children}
                </h2>
              )
            },
          }}
        >
          {markdown}
        </ReactMarkdown>
      </div>
    </article>
  )
}

/**
 * Barre de progression de lecture fixée en haut de page.
 */
function ReadingProgress() {
  if (typeof window === 'undefined') return null
  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 h-1 bg-gray-100"
      suppressHydrationWarning
    >
      <div
        id="reading-progress-bar"
        className="h-full bg-blue-500 transition-all duration-150"
        style={{ width: '0%' }}
      />
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function(){
              var bar = document.getElementById('reading-progress-bar');
              if (!bar) return;
              function update() {
                var scrolled = window.scrollY;
                var total = document.body.scrollHeight - window.innerHeight;
                bar.style.width = total > 0 ? Math.min(100, (scrolled / total) * 100) + '%' : '0%';
              }
              window.addEventListener('scroll', update, { passive: true });
              update();
            })()
          `,
        }}
      />
    </div>
  )
}

/* ────────────────────────────────────────────────────────────
 * CONVERSION TEXTE BRUT → MARKDOWN
 * ──────────────────────────────────────────────────────────── */

function textToMarkdown(raw: string): string {
  const lines = raw.split('\n')
  const out: string[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i].trimEnd()
    const trimmed = line.trim()

    if (!trimmed) {
      // Ligne vide — ajoute séparation paragraphe
      if (out.length > 0 && out[out.length - 1] !== '') {
        out.push('')
      }
      i++
      continue
    }

    // ── Chapitre / Partie principale ──
    // Exemples : "CHAPITRE I — LES FONCTIONS", "Chapitre 1 : ...", "I. Titre", "Partie A —"
    if (isChapterHeading(trimmed)) {
      out.push('')
      out.push(`## ${cleanHeading(trimmed)}`)
      out.push('')
      i++
      continue
    }

    // ── Sous-section ──
    // Exemples : "A. Définition", "1.1 Les polynômes", "a) Propriétés"
    if (isSubheading(trimmed)) {
      out.push('')
      out.push(`### ${cleanHeading(trimmed)}`)
      out.push('')
      i++
      continue
    }

    // ── Bloc exercice / problème / question ──
    if (isExerciseStart(trimmed)) {
      // Collecte toutes les lignes du bloc exercice jusqu'à la prochaine section
      const block: string[] = [trimmed]
      i++
      while (i < lines.length) {
        const next = lines[i].trim()
        if (!next) { i++; break }
        if (isChapterHeading(next) || isSubheading(next) || isExerciseStart(next)) break
        block.push(next)
        i++
      }
      out.push('')
      out.push(`> **${block[0]}**`)
      for (let j = 1; j < block.length; j++) {
        out.push(`> ${block[j]}`)
      }
      out.push('')
      continue
    }

    // ── Ligne normale ──
    out.push(trimmed)
    i++
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

// Détecte un titre de chapitre/partie
function isChapterHeading(line: string): boolean {
  // Tout en majuscules (min 4 chars, pas une formule)
  if (line.length >= 4 && line === line.toUpperCase() && /[A-ZÀÂÉÊÈÙÛÎÏŒ]{3,}/.test(line) && !line.includes('$')) {
    return true
  }
  // "Chapitre N", "Chapter N", "Partie N", "Part N"
  if (/^(chapitre|chapter|partie|part)\s+\w/i.test(line)) return true
  // Numérotation romaine : "I.", "II.", "III.", "IV.", "V.", "VI."... suivie d'un titre
  if (/^(I{1,3}|IV|V?I{0,3}|IX|X{0,3})\.\s+\S/i.test(line) && line.length > 5) return true
  return false
}

// Détecte une sous-section
function isSubheading(line: string): boolean {
  // "A. Titre", "B. Titre" (lettre unique suivie d'un point)
  if (/^[A-Z]\.\s+\S/.test(line) && line.length > 4 && line.length < 80) return true
  // "a) Titre", "b) Titre"
  if (/^[a-z]\)\s+\S/.test(line) && line.length < 80) return true
  // "1.1 Titre", "2.3 Titre"
  if (/^\d+\.\d+\s+\S/.test(line) && line.length < 80) return true
  return false
}

// Détecte le début d'un énoncé d'exercice
function isExerciseStart(line: string): boolean {
  return /^(Exercice|Exercise|Problème|Problem|Question|Activité|Application|Exemple|Example)\s*\d*/i.test(line)
}

// Nettoie un titre pour l'affichage
function cleanHeading(line: string): string {
  return line
    .replace(/^(I{1,3}|IV|V?I{0,3}|IX|X{0,3})\.\s+/i, '')  // retire numéro romain
    .replace(/^[A-Z]\.\s+/, '')                                 // retire lettre sous-section
    .replace(/^(chapitre|chapter|partie|part)\s+\w+\s*[:\-–—]?\s*/i, '') // retire "Chapitre N :"
    .trim()
}
