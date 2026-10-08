# ChiquiMafias — Frontend

Aplicación web de [ChiquiMafias](../README.md).

**Next.js 16 (App Router) · React 19 · TanStack Query 5 · Zustand · Tailwind CSS 4 · socket.io-client**

- Arquitectura del front: [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md#frontend)
- Sistema de diseño "Estadio Digital": [DESIGN.md](DESIGN.md)
- Instalación del stack completo: [docs/SETUP.md](../docs/SETUP.md)

## Scripts

```bash
npm run dev -- -p 3005   # desarrollo (necesita el backend en :3007)
npm run build            # build de producción (también chequea tipos)
npm run lint

npm run test:e2e             # Playwright, suite mockeada (desktop + mobile)
npm run test:e2e:ui          # modo UI de Playwright
npm run test:e2e:fullstack   # smoke contra el stack real de Docker en :3005
npm run typecheck:e2e        # tipos de e2e/
```

Variables (`.env.local`): `NEXT_PUBLIC_API_URL` (por defecto `http://localhost:3007`) y
`NEXT_PUBLIC_GOOGLE_CLIENT_ID`.

## Estructura

```
app/                 # rutas: home, /match/[id] (también como modal), /shop
features/<dominio>/  # todo lo de un dominio junto
  api/               #   funciones async sobre lib/apiFetch
  hooks/             #   useQuery / useMutation
  components/        #   UI del dominio
  types/             #   copia de los DTOs del backend
  socket/            #   eventos de Socket.IO que actualizan la cache
components/          # layout (Header, Footer, MobileNav), sidebars y widgets
context/             # QueryProvider, AuthProvider, SocketContext
store/               # stores de Zustand (sesión y UI)
lib/apiFetch.ts      # fetch con Bearer, cookies y refresh automático del token
e2e/                 # tests de Playwright: specs, factories, page objects y mocks
```

## Tests

La suite principal (`e2e/specs/mocked/`) **no necesita backend**:

- La API se mockea en modo estricto: una request sin mock hace fallar el test.
- Socket.IO se emula con `page.routeWebSocket`.
- Google, Mercado Pago y Cloudinary se stubbean.

Corre en dos proyectos, `mocked-desktop` y `mocked-mobile` (Pixel 7), y la CI
([`frontend.yml`](../.github/workflows/frontend.yml)) la ejecuta contra el build de
producción en cada push o PR a `develop` y `main`.
