# ChiquiMafias — Frontend 🖥️

**La cara de [ChiquiMafias](../README.md): partidos en vivo, chat, apuestas y tienda en una web que se actualiza sola.**

![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)
![TanStack Query](https://img.shields.io/badge/TanStack_Query-5-FF4154?logo=reactquery&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-e2e-2EAD33?logo=playwright&logoColor=white)

## ✨ Lo más importante

| | Qué hace | Cómo |
|---|---|---|
| 📡 | **Todo en vivo, sin recargar** | Los eventos de Socket.IO actualizan directamente la caché de TanStack Query: no hay estado duplicado. |
| 🔐 | **Sesión que no se rompe** | `apiFetch` agrega el token, y si recibe un 401 refresca **una sola vez** y reintenta. El refresh se coordina entre pestañas con la *Web Locks API*. |
| 🪟 | **Partido como modal o como página** | *Parallel + intercepting routes* de Next: desde la home se abre encima; con la URL directa, a pantalla completa. |
| 🧩 | **Organizado por dominio** | Más de 20 carpetas en `features/`, cada una con su `api`, `hooks`, `components`, `types` y `socket`. |
| 🎨 | **Diseño propio** | Sistema "Estadio Digital" ([DESIGN.md](DESIGN.md)) con Tailwind 4 configurado en CSS. |
| 🧪 | **Tests sin backend** | Playwright con API y sockets mockeados en modo estricto, en desktop y mobile, con chequeos de accesibilidad (axe). |

## 🗂️ Cómo orientarse

```
app/                 rutas: home, /match/[id] (también modal), /shop
features/<dominio>/  todo lo de un dominio junto
  ├─ api/            funciones async sobre lib/apiFetch
  ├─ hooks/          useQuery / useMutation
  ├─ components/     UI del dominio
  ├─ types/          copia de los DTOs del backend
  └─ socket/         eventos que actualizan la caché
components/          layout y widgets compartidos
context/             providers: Query, Auth, Socket
store/               Zustand (sesión y UI)
lib/apiFetch.ts      fetch con Bearer, cookies y refresh automático
e2e/                 specs, factories, page objects y mocks
```

> Los tipos de `types/` son **copias a mano** de los DTOs del backend: si cambia un contrato, se actualizan en el mismo cambio.

## 🚀 Para correrlo

Necesita el backend en `:3007`. Stack completo en [docs/SETUP.md](../docs/SETUP.md).

```bash
npm run dev -- -p 3005   # desarrollo
npm run build            # build de producción (también chequea tipos)
npm run lint
```

Variables en `.env.local`: `NEXT_PUBLIC_API_URL` (por defecto `http://localhost:3007`) y `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.

## 🧪 Tests

```bash
npm run test:e2e             # suite mockeada, desktop + mobile (no necesita backend)
npm run test:e2e:ui          # modo UI de Playwright
npm run test:e2e:fullstack   # smoke contra el stack real en :3005
npm run typecheck:e2e        # tipos de e2e/
```

- Una request sin mock **hace fallar el test**; Socket.IO se emula con `page.routeWebSocket`; Google, Mercado Pago y Cloudinary van stubbeados.
- Corre en `mocked-desktop` y `mocked-mobile` (Pixel 7) contra el build de producción en cada push o PR a `develop` y `main` ([`frontend.yml`](../.github/workflows/frontend.yml)).

Más detalle en [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md#frontend).
