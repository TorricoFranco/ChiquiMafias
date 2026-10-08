@AGENTS.md

<!-- AGENTS.md lo genera Next.js (aviso de breaking changes de la versión instalada). No editarlo: las instrucciones del proyecto van acá abajo. -->

# new_frontend — ChiquiMafias (frontend activo)

Next.js 16.2 (App Router) + React 19.2 + TypeScript. Reemplaza a `../frontend/`, que es legacy y no se toca.

## Stack

- Datos remotos: TanStack Query 5 (`context/QueryProvider.tsx`, con devtools).
- Estado global: Zustand 4 en `store/` (`useUserStore` guarda `accessToken` y user, más `useUIStore`, `useNavigationStore` y `useTicketStore`).
- Estilos: Tailwind CSS 4 configurado en CSS (`@theme` en `app/globals.css`). **No hay `tailwind.config`.**
- Tiempo real: `socket.io-client`.
- UI: framer-motion, sonner (toasts; `<Toaster>` en `app/layout.tsx`), lucide-react, Material Symbols, dayjs y clsx.
- Fuentes: Inter (`font-sans`) y Montserrat (`font-headline`) vía `next/font/google`.

## Comandos (desde `new_frontend/`)

```bash
npm run dev     # next dev --webpack (en docker: puerto 3005)
npm run build   # verificación principal (tipos + build)
npm run lint    # eslint (eslint-config-next)
```

## Tests E2E (Playwright)

```bash
npm run dev:e2e              # servidor de tests en :3100 (dejalo corriendo: los tests lo reutilizan)
npx playwright test --project=mocked-desktop --project=mocked-mobile   # = npm run test:e2e
npx playwright test e2e/specs/mocked/bets --project=mocked-desktop     # un dominio
npm run typecheck:e2e        # tipos de e2e/ (factories con los tipos de features/*/types)
npm run test:e2e:report      # último reporte HTML
```

- **Mockeados** (`e2e/specs/mocked/`, la suite principal): no necesitan backend. La API (`http://localhost:3007`) se mockea en modo estricto: una request sin mock hace fallar el test con el método y el path. Socket.IO se emula con `page.routeWebSocket`, y Google, Mercado Pago y Cloudinary se stubbean.
- **Proyectos:** `mocked-desktop` corre todo menos `@mobile-only`. `mocked-mobile` (Pixel 7) corre solo lo marcado `@mobile` o `@mobile-only`.
- **Full-stack** (`e2e/specs/fullstack/`, `npm run test:e2e:fullstack`): smoke contra el stack real de Docker en :3005. No corre en CI.
  - Requisitos:
    - `.env.dev` con `ENABLE_DEV_TOOLS=true`, que habilita `POST /auth/dev-login`, y `CLIENT_URL=http://localhost:3005` (es el CORS de los sockets). Tiene que ser un solo valor: la validación de Joi rechaza una lista.
    - El backend no puede correr con `NODE_ENV=production`. `docker-compose.dev.yml` lo toma de `${NODE_ENV}`, o sea de la shell o del `.env` de la raíz, no de `.env.dev`. Si hace falta: `$env:NODE_ENV="development"; docker compose -f docker-compose.dev.yml up -d backend`.
  - Antes de correrlo: `docker compose -f docker-compose.dev.yml up` y `docker compose -f docker-compose.dev.yml exec backend npm run seed:e2e` (usuarios `e2e-*@chiquimafias.test` y el ítem `[E2E] Banner`). El setup carga monedas con `add-coins`.
  - Corre en serie y deja datos marcados `[E2E]` en la DB de dev (mercados, mensajes). Nunca borra tablas.
- **CI:** `.github/workflows/frontend.yml` corre el build de producción (`build:e2e` + `start:e2e`) con la suite mockeada.
- Convenciones en `../.claude/rules/frontend-e2e.md`, que se cargan solas al tocar `e2e/`.
- Si cambiás textos, roles o `aria-label` de la UI, corré los tests del dominio: los locators dependen de eso.
- Si cambia una respuesta del backend, actualizá también su factory en `e2e/factories/` y el mock por defecto en `e2e/support/defaults.ts`.

## Estructura

- `app/` — rutas. `layout.tsx` monta `QueryProvider > AuthProvider > SocketProvider`. `app/match/[id]` es el detalle de partido, y `app/@modal/(.)match` lo intercepta como modal (parallel + intercepting routes).
- `features/<dominio>/` — todo lo de un dominio vive junto:
  - `api/<dominio>Api.ts` — objeto con funciones async que usan `apiFetch`.
  - `hooks/use<X>.ts` — `useQuery` / `useMutation` sobre la api.
  - `components/` — UI del dominio (lo de admin va en `components/admin/`).
  - `types/index.ts` — tipos que reflejan los DTOs del backend.
  - `socket/use<X>Socket.ts` — eventos de Socket.IO que actualizan la cache de Query.
- `components/` — `layout/` (Header, Footer, MobileNav), `Social/` (sidebars) y `widgets/`.
- `lib/` — `apiFetch.ts` y `uploadHelper.ts`. `hooks/` tiene los hooks globales (`useWallet`, `useCountdown`). `types/` tiene los tipos globales.
- Alias de imports: `@/` → raíz de `new_frontend/`.

## Reglas

- HTTP: siempre `apiFetch` de `@/lib/apiFetch`, que agrega el Bearer, usa `credentials: "include"` y reintenta tras refrescar el token. Nunca `fetch` directo al backend.
- URL base: `process.env.NEXT_PUBLIC_API_URL` (`http://localhost:3007` en dev). Las rutas del backend no llevan prefijo `/api`.
- Si el `api/` falla, lanzá un `Error` con mensaje en español: `if (!res.ok) throw new Error('…')`.
- Query keys: arrays por dominio (`['markets']`, `['inventory']`). En `onSuccess` de las mutaciones, `queryClient.invalidateQueries({ queryKey: [...] })`.
- Sockets: para el namespace raíz (chat, matches, polls, fixture) usá el socket compartido `useGlobalSocket()` de `@/context/SocketContext`. El namespace `/bets` tiene conexión propia en `features/bets/socket/useBetsSocket.ts`. Si abrís un `io()` propio, pasá `auth: { token }` y `transports: ["websocket"]`, y hacé `disconnect()` / `off()` en el cleanup del `useEffect`.
- Componentes con estado, hooks o eventos llevan `"use client"`.
- Si cambia un DTO o un evento del backend, actualizá `features/<dominio>/types` y la api o el socket en el mismo cambio.
- Antes de usar una API de Next (routing, caching, `cookies()`, params async, metadata, etc.), leé la guía en `node_modules/next/dist/docs/`, porque Next 16 cambió APIs.
- Al terminar un cambio en `features/`, `app/`, `context/`, `store/` o `hooks/`, y antes de abrir la PR, pedí revisión al subagente `frontend-reviewer`.

## Diseño

Las reglas visuales (paleta real, tipografía, radios) se cargan solas al editar `.tsx`, desde `../.claude/rules/frontend-ui.md`. La spec completa está en `DESIGN.md`.
