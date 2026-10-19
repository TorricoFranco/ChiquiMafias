---
name: frontend-feature
description: Crea o extiende un dominio en new_frontend/features/<dominio> (api con apiFetch, hooks de TanStack Query, types, componentes y socket) conectado a endpoints reales del backend.
argument-hint: <dominio> [qué pantalla o funcionalidad]
---

# Feature de frontend: $ARGUMENTS

Trabajá en `new_frontend/`. Seguí `new_frontend/CLAUDE.md`. La regla de UI (`.claude/rules/frontend-ui.md`) se carga sola al editar `.tsx`.

## 1. Contrato primero

- Buscá en `backend/src/<dominio>/` el controller (rutas, `@Public`, roles), los DTOs y, si existe, el gateway (eventos y namespace).
- Si el endpoint todavía no existe, frená y ofrecé `/nest-module`, o preguntá.
- Revisá si ya existe `features/<dominio>/` y extendelo en vez de duplicarlo.

## 2. Archivos (en `features/<dominio>/`)

- `types/index.ts` — interfaces que reflejan **exactamente** los DTOs y respuestas del backend (mismos nombres de campo y tipos; las fechas llegan como `string`).
- `api/<dominio>Api.ts` — un `export const <dominio>Api = { ... }` con funciones async:
  - `apiFetch(\`${process.env.NEXT_PUBLIC_API_URL}/<ruta>\`, { method, body: JSON.stringify(...) })`, de `@/lib/apiFetch`.
  - `if (!res.ok) throw new Error('<mensaje en español>')` y `return res.json()`.
  - Referencia: `features/bets/api/betsApi.ts`.
- `hooks/use<Dominio>.ts` — `useQuery({ queryKey: ['<dominio>', ...], queryFn, staleTime })`. Las mutaciones van con `useMutation` y en `onSuccess` hacen `queryClient.invalidateQueries({ queryKey: ['<dominio>'] })`, más un `toast` de `sonner`. Referencia: `features/bets/hooks/`.
- `components/` — componentes `"use client"` con la paleta y las formas de la regla de UI. Copiá la estructura visual de un componente hermano.
- `socket/use<Dominio>Socket.ts` (solo si hay tiempo real) — namespace raíz → `useGlobalSocket()`; namespace propio → `io()` con `auth: { token }` y `transports: ["websocket"]`. Actualizá la cache con `queryClient.setQueryData` o con `invalidateQueries`. Limpiá listeners y conexión en el cleanup.

## 3. Rutas

Si hace falta una página nueva, va en `app/`. Antes de usar APIs de Next (params async, metadata, `cookies()`, caching), leé `node_modules/next/dist/docs/`.

## 4. Verificar (desde `new_frontend/`)

```bash
npm run lint
npm run build
```

## 5. Cerrar

Listá los archivos creados y los endpoints o eventos que consume. Si algún tipo no coincide con el backend, decilo explícitamente.
