// Prueba de carga contra endpoints públicos de lectura del backend (sin JWT).
// Desde la raíz del repo:
//   k6 run -e MODE=smoke -e API_URL=http://localhost:3007 scripts/load/api-lectura.js
// Modos: smoke (línea base), escalonada (busca el punto de quiebre) y sostenida (~33 min).
// Sin THROTTLE_LIMIT alto en el backend, el límite de 150 req/min por IP corta la prueba. Ver README.md.
import http from 'k6/http'
import { check, sleep } from 'k6'
import { Counter } from 'k6/metrics'

const API_URL = __ENV.API_URL || 'http://localhost:3007'
// Opcional: home del front en modo producción (npm run build && npm start en new_frontend).
const WEB_URL = __ENV.WEB_URL

const ESCENARIOS = {
  smoke: [{ duration: '1m', target: 5 }],
  escalonada: [
    { duration: '2m', target: 20 },
    { duration: '3m', target: 50 },
    { duration: '3m', target: 100 },
    { duration: '1m', target: 0 },
  ],
  sostenida: [
    { duration: '2m', target: 40 },
    { duration: '30m', target: 40 },
    { duration: '1m', target: 0 },
  ],
}

const MODE = __ENV.MODE || 'smoke'
if (!ESCENARIOS[MODE]) {
  throw new Error(`MODE desconocido: ${MODE}. Usá smoke, escalonada o sostenida.`)
}

// Rutas públicas de lectura del controller de stats.
const RUTAS = [
  '/stats/global',
  '/stats/top-earners?limit=10',
  '/stats/top-streaks?limit=10',
  '/stats/most-active?limit=10',
]

const throttled = new Counter('throttled_429')

export const options = {
  stages: ESCENARIOS[MODE],
  thresholds: {
    // Corta la prueba si más del 1 % de los pedidos fallan (después de 30 s de margen).
    http_req_failed: [{ threshold: 'rate<0.01', abortOnFail: true, delayAbortEval: '30s' }],
    http_req_duration: ['p(95)<1000'],
    // Un 429 significa que el backend está limitando: falta THROTTLE_LIMIT.
    throttled_429: ['count<1'],
  },
}

export default function () {
  const ruta = RUTAS[Math.floor(Math.random() * RUTAS.length)]
  const res = http.get(`${API_URL}${ruta}`, { tags: { ruta } })
  if (res.status === 429) throttled.add(1)
  check(res, { [`${ruta} responde 200`]: (r) => r.status === 200 })

  if (WEB_URL) {
    const web = http.get(WEB_URL, { tags: { ruta: 'web' } })
    check(web, { 'web responde 200': (r) => r.status === 200 })
  }

  sleep(1)
}
