---
paths:
  - "backend/src/**/*.spec.ts"
  - "backend/test/**"
---

# Tests del backend (Jest)

## Qué correr

- Unit: `npm run test:unit` (= `jest src/`), o uno solo con `npx jest src/<modulo>/<archivo>.spec.ts`.
- **No** corras `npm test`, `npm run test:e2e` ni `npx jest test/...` sin confirmación: los e2e hacen `prisma db push` y **borran todas las tablas** de la DB de `DATABASE_URL`.
- Si el usuario confirma e2e, verificá antes que `DATABASE_URL` apunte a una DB descartable (no la de dev) y que Postgres y Redis estén levantados.

## Unit tests (`src/**/*.spec.ts`)

- Van al lado del archivo que prueban: `<nombre>.service.spec.ts`.
- `Test.createTestingModule` con **todas** las dependencias del constructor mockeadas con `{ provide: X, useValue: mock }`. Nada real: ni Prisma, ni Redis, ni HTTP, ni MP.
- Mocks de referencia (`src/bets/bets.service.spec.ts`):
  - Prisma con `$transaction: jest.fn().mockImplementation(async (cb) => cb(mockPrisma))`, así el código adentro de la transacción usa el mismo mock.
  - `RedisService` como `{ redis: { get, set, eval, ... } }`.
  - Colas con `getQueueToken('<nombre>')`, `EventEmitter2` como `{ emit: jest.fn() }` y los gateways con solo los métodos que se llaman.
- `jest.clearAllMocks()` en `beforeEach`.
- Nombres en español y con el resultado esperado: `it('Debe lanzar BadRequestException si el saldo no alcanza', ...)`.
- Cada lógica nueva cubre el caso feliz y al menos un error. Si toca dinero o estados, sumá el caso de concurrencia: el `updateMany` condicional devuelve `{ count: 0 }` → aborta sin efectos.
- Afirmá efectos, no solo el valor de retorno: con qué `where` se llamó el update, que se creó la `CoinTransaction` y que se emitió (o **no**) el evento.
- No dejes specs `should be defined` como única prueba de algo que tiene lógica.

## E2E (`test/*.e2e-spec.ts`)

- Config propia: `test/jest-e2e.json` (con `test/jest-setup.ts`, que polyfilla `global.File`).
- Hay dos estilos:
  - **Controller aislado** (`webhook.e2e-spec.ts`, `subscriptions.e2e-spec.ts`): solo el controller, con los services en `useValue` y los guards reemplazados con `.overrideGuard(...)`. No toca la DB. Preferí este para probar rutas, validación de DTOs y auth.
  - **`AppModule` completo** (`bets.e2e-spec.ts`): usa Postgres y Redis reales y necesita **todas** las variables requeridas de `src/config/env.validation.ts` (sirven valores dummy, ver `.github/workflows/pipeline.yml`). Usalo solo cuando importa la integración con la DB o Redis.
- Un e2e nunca llama a una API externa real (MP, API-Football, Cloudinary, Resend, bot de Discord): mockeá esos providers con `overrideProvider`.
- Limpiá los datos que crea cada test para que no dependan del orden.
