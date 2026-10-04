---
name: nest-module
description: Crea un módulo NestJS nuevo en backend/src siguiendo las convenciones de ChiquiMafias (module, controller, service, DTOs, spec y registro en AppModule).
argument-hint: <nombre-del-modulo-en-kebab-case> [descripción breve]
---

# Nuevo módulo NestJS: $ARGUMENTS

Trabajá en `backend/`. Antes de escribir, leé un módulo parecido como referencia (`src/stats/` es chico y reciente) y las reglas de `backend/CLAUDE.md`.

## 1. Entender antes de generar

- Si no queda claro qué endpoints o qué modelo de Prisma usa el módulo, preguntá antes de crear archivos.
- Si toca monedas, saldo o pagos, seguí `.claude/rules/backend-money.md` y proponé un plan primero.
- Si necesita tablas nuevas, el cambio en `prisma/schema.prisma` va primero (`npx prisma format` + `npx prisma generate`).

## 2. Archivos (en `src/<nombre>/`)

- `<nombre>.module.ts` — `@Module({ controllers, providers })`. `PrismaService` y `RedisService` son **globales**: inyectalos sin importar sus módulos.
- `<nombre>.controller.ts` — `@Controller('<nombre>')`, sin prefijo `/api`.
  - Por defecto toda ruta exige JWT (guard global). Marcá `@Public()` u `@OptionalAuth()` (`src/auth/decorators/auth.decorator.ts`) solo si corresponde.
  - Usuario actual: `@GetUser('id') userId: string` (`src/auth/decorators/get-user.decorator.ts`).
  - Admin: `@UseGuards(RolesGuard)` + `@Roles(SystemRole.ADMIN)`.
- `<nombre>.service.ts` — la lógica de negocio. Inyección por constructor (`private readonly`). Errores con excepciones HTTP de Nest y mensajes en español.
- `dto/<accion>-<nombre>.dto.ts` — class-validator con mensajes en español (ver `src/wallet/dto/admin-add-coins.dto.ts`), propiedades con `!`. El `ValidationPipe` global usa `forbidNonWhitelisted`, así que **cada campo que mande el front tiene que estar en el DTO** o devuelve 400. El plugin de Swagger documenta los `*.dto.ts` solo.
- `<nombre>.service.spec.ts` — `Test.createTestingModule` con `PrismaService` mockeado (si usa transacciones: `$transaction: jest.fn().mockImplementation(async (cb) => cb(mockPrisma))`, como en `src/bets/bets.service.spec.ts`). Cubrí el caso feliz y al menos un error.
- Si emite en tiempo real: `<nombre>.gateway.ts`. Si lo dispara un cron: el cron **publica en Redis** (`RedisService.publish`) y el gateway re-emite; nunca emitir directo desde el cron.

Estilo: imports con alias `src/...`, comillas simples, sin `;` (Prettier del repo).

## 3. Registrar

Agregá el módulo a `imports` en `src/app.module.ts`.

## 4. Verificar (desde `backend/`)

```bash
npx prisma generate      # solo si tocaste el schema
npm run build
npx jest src/<nombre>
npm run lint             # aplica --fix; revisá el diff que deja
```

No corras `npm test`: incluye los e2e, que borran la DB. Para todos los unitarios: `npm run test:unit`.

## 5. Cerrar

- Resumí los endpoints creados (método, ruta, auth requerida, DTO).
- Si el front lo va a consumir, ofrecé correr `/frontend-feature <dominio>` para crear api, hooks y types.
