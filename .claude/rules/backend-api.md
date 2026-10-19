---
paths:
  - "backend/src/**/*.controller.ts"
  - "backend/src/**/*.dto.ts"
  - "backend/src/**/dto/**"
  - "backend/src/auth/**"
---

# Rutas, DTOs y autorización (backend)

## Quién puede llamar a cada ruta

- El `JwtAuthGuard` global exige JWT en **toda** ruta. Decidí explícitamente cada ruta nueva: protegida (default), `@Public()` u `@OptionalAuth()` (`src/auth/decorators/auth.decorator.ts`).
- Con `@OptionalAuth()`, `@GetUser('id')` puede ser `null`: manejalo.
- **`@Roles(...)` solo es metadata.** Sin `@UseGuards(RolesGuard)` en el método o en la clase **no restringe nada** y cualquier usuario logueado entra. Siempre van juntos (ver `src/bets/bets.controller.ts` o, a nivel clase, `src/wallet/wallet.controller.ts`). Lo mismo pasa con `@RequireTier(...)` + `TiersGuard`.
- Jerarquía (`ROLE_HIERARCHY`): `USER < MODERATOR < ADMIN < PRESIDENT`. `@Roles(SystemRole.ADMIN)` deja pasar a `PRESIDENT`.
- `@AllowBannedForAppeal()` es solo para rutas de apelación de baneo.
- El usuario actual sale de `@GetUser('id')`, **nunca** del body, la query ni los params. Recibir un `userId` del cliente solo es válido en rutas de admin que operan sobre otro usuario.
- Rutas de servicio a servicio (bot de Discord, webhook de MP): `@Public()` y validar el secreto o la firma **antes** de tocar nada. Para el bot, reusá el `validateToken` de `src/discord/discord.controller.ts` (header `x-discord-bot-token` = `DISCORD_INTERNAL_SECRET`).
- Endpoints sensibles a abuso (login, compras, canjes): bajá el límite con `@Throttle(...)` como en `auth.controller.ts`; el global es 150 req/min por IP.

## DTOs

- Toda entrada (`@Body()`, `@Query()` con varios campos) usa una **clase** DTO con class-validator. Un tipo inline o una interface (`@Body() payload: { ... }`) no valida ni filtra nada: el `ValidationPipe` global lo ignora.
- `forbidNonWhitelisted: true`: cada campo que manda el front tiene que estar declarado, o la request da 400.
- Mensajes de validación en español (`{ message: '...' }`, ver `src/wallet/dto/admin-add-coins.dto.ts`). Propiedades con `!` (o `?` si son `@IsOptional()`).
- Objetos anidados: `@ValidateNested()` + `@Type(() => Dto)`. Arrays en el body raíz: `new ParseArrayPipe({ items: Dto })`. Enums de Prisma: `@IsEnum(Enum)`.
- Enteros (monedas, ids numéricos): `@IsInt()` y `@Min(1)` donde aplique, no solo `@IsNumber()`.
- Params y queries sueltos: `ParseIntPipe` / `ParseUUIDPipe` / `DefaultValuePipe` en vez de castear a mano.

## Respuestas y errores

- Errores con las excepciones HTTP de Nest (`BadRequestException`, `NotFoundException`, `ConflictException`, `ForbiddenException`) y mensajes en español. Si el front necesita distinguir el caso, agregá `code` (`{ message, code: 'USER_BANNED' }`).
- Nunca `throw new Error(...)` en el camino de una request: termina en un 500 sin mensaje útil.
- Mantené la forma de respuesta del controller vecino (varios endpoints de admin devuelven `{ status, message, data }`). No cambies la forma de una respuesta existente sin actualizar `new_frontend/features/<dominio>/types` y su `api/` en el mismo cambio.
- No devuelvas modelos de Prisma enteros con datos sensibles (`hashedRefreshToken`, `googleId`, emails de otros usuarios): elegí campos con `select`. `@Exclude()` solo funciona si devolvés una instancia de clase (ver `src/users/entities/user.entity.ts`), no con objetos planos de Prisma.
