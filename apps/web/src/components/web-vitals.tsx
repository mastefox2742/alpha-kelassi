'use client'

import { useReportWebVitals } from 'next/web-vitals'

/**
 * Rapporte les Core Web Vitals vers la console (dev) et
 * vers l'API d'analytics (prod) pour le monitoring Lighthouse.
 *
 * Inclure dans le layout racine : <WebVitals />
 */
export function WebVitals() {
  useReportWebVitals((metric) => {
    // Log en dev pour debugging
    if (process.env.NODE_ENV === 'development') {
      const color = metric.rating === 'good' ? '✅' : metric.rating === 'needs-improvement' ? '⚠️' : '❌'
      console.debug(`[CWV] ${color} ${metric.name}: ${Math.round(metric.value)}ms (${metric.rating})`)
    }

    // En prod : envoie vers l'endpoint de monitoring (non bloquant)
    if (process.env.NODE_ENV === 'production' && metric.rating !== 'good') {
      const body = JSON.stringify({
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        id: metric.id,
        navigationType: metric.navigationType,
        url: window.location.pathname,
      })
      // Utilise sendBeacon si disponible (non bloquant pour l'UX)
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/vitals', body)
      }
    }
  })

  return null
}
