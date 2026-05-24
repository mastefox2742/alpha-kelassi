/**
 * Algorithme SM-2 (SuperMemo 2) pour la répétition espacée.
 * quality : 0-5
 *   0-2 = réponse incorrecte (réinitialise)
 *   3   = correct avec difficulté
 *   4   = correct
 *   5   = parfait
 */
export interface SM2State {
  easeFactor: number  // [1.3, 2.5]
  interval:   number  // jours avant prochaine révision
  reps:       number  // nombre de répétitions consécutives réussies
}

export interface SM2Result extends SM2State {
  nextReview: Date
}

export function computeSM2(state: SM2State, quality: number): SM2Result {
  if (quality < 0 || quality > 5) throw new Error('quality must be 0-5')

  let { easeFactor, interval, reps } = state

  if (quality >= 3) {
    if      (reps === 0) interval = 1
    else if (reps === 1) interval = 6
    else                 interval = Math.round(interval * easeFactor)

    easeFactor = easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
    if (easeFactor < 1.3) easeFactor = 1.3
    reps += 1
  } else {
    interval = 1
    reps     = 0
  }

  const nextReview = new Date()
  nextReview.setDate(nextReview.getDate() + interval)
  nextReview.setHours(0, 0, 0, 0)

  return { easeFactor, interval, reps, nextReview }
}
