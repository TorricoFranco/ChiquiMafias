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

No hay tests: se verifica con `npm run lint` + `npm run build`.

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

## Diseño

Las reglas visuales (paleta real, tipografía, radios) se cargan solas al editar `.tsx`, desde `../.claude/rules/frontend-ui.md`. La spec completa está en `DESIGN.md`.
