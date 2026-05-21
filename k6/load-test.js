/**
 * Test de charge k6 — Alpha Kelassi API
 * Simule 500 utilisateurs simultanés sur les endpoints critiques
 *
 * Usage :
 *   k6 run --env API_URL=https://api.kelassi.app --env TOKEN=<jwt> k6/load-test.js
 *   k6 run --vus 50 --duration 2m k6/load-test.js   (smoke test local)
 */
import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend } from 'k6/metrics'

const API_URL = __ENV.API_URL || 'http://localhost:3001'
const TOKEN   = __ENV.TOKEN   || ''

// Métriques custom
const errorRate    = new Rate('errors')
const chatDuration = new Trend('chat_duration', true)

export const options = {
  scenarios: {
    // Montée en charge progressive → 500 VUs
    ramp_up: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 100 },   // montée
        { duration: '3m', target: 500 },   // pic
        { duration: '1m', target: 0 },     // descente
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<2000'],   // 95e percentile < 2s
    http_req_failed:   ['rate<0.01'],    // moins de 1% d'erreurs
    errors:            ['rate<0.05'],
  },
}

const HEADERS = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${TOKEN}`,
}

export default function () {
  const scenario = Math.random()

  if (scenario < 0.35) {
    // Scénario 1 : consultation liste cours (35%)
    const res = http.get(`${API_URL}/api/documents?type=cours&limit=20`, { headers: HEADERS })
    check(res, { 'documents 200': (r) => r.status === 200 }) || errorRate.add(1)
    sleep(1)

  } else if (scenario < 0.60) {
    // Scénario 2 : consultation liste examens (25%)
    const res = http.get(`${API_URL}/api/documents?type=examen&limit=20`, { headers: HEADERS })
    check(res, { 'examens 200': (r) => r.status === 200 }) || errorRate.add(1)
    sleep(1)

  } else if (scenario < 0.75) {
    // Scénario 3 : quota Kelassi IA (15%)
    const res = http.get(`${API_URL}/api/ai/quota`, { headers: HEADERS })
    check(res, { 'quota 200': (r) => r.status === 200 }) || errorRate.add(1)
    sleep(0.5)

  } else if (scenario < 0.85) {
    // Scénario 4 : flashcards dues (10%)
    const res = http.get(`${API_URL}/api/flashcards/due?limit=10`, { headers: HEADERS })
    check(res, { 'flashcards 200': (r) => r.status === 200 }) || errorRate.add(1)
    sleep(0.5)

  } else if (scenario < 0.92) {
    // Scénario 5 : dashboard progression (7%)
    const res = http.get(`${API_URL}/api/progress/dashboard`, { headers: HEADERS })
    check(res, { 'progress 200': (r) => r.status === 200 }) || errorRate.add(1)
    sleep(0.5)

  } else {
    // Scénario 6 : question Kelassi IA — le plus lourd (8%)
    const start = Date.now()
    const res = http.post(
      `${API_URL}/api/ai/chat`,
      JSON.stringify({ question: 'Explique-moi la photosynthèse simplement.' }),
      { headers: HEADERS, timeout: '30s' }
    )
    chatDuration.add(Date.now() - start)
    check(res, { 'chat 200': (r) => r.status === 200 || r.status === 429 }) || errorRate.add(1)
    sleep(3)
  }
}

export function handleSummary(data) {
  return {
    'k6/results/summary.json': JSON.stringify(data, null, 2),
    stdout: `
=== Résultats du test de charge ===
Requêtes totales : ${data.metrics.http_reqs.values.count}
Taux d'erreur    : ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%
p50 durée        : ${data.metrics.http_req_duration.values['p(50)'].toFixed(0)}ms
p95 durée        : ${data.metrics.http_req_duration.values['p(95)'].toFixed(0)}ms
p99 durée        : ${data.metrics.http_req_duration.values['p(99)'].toFixed(0)}ms
Seuil p95 < 2s   : ${data.metrics.http_req_duration.values['p(95)'] < 2000 ? '✅ OK' : '❌ DÉPASSÉ'}
`,
  }
}
