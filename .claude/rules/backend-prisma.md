---
paths:
  - "backend/prisma/**"
---

# Prisma (`backend/prisma/schema.prisma`)

- Prisma **6** está fijado (VS Code tiene `prisma.pinToPrisma6`). No actualizar a Prisma 7 sin que te lo pidan.
- Después de editar el schema: `npx prisma format` y luego `npx prisma generate`. Sin `generate`, los tipos de `@prisma/client` quedan viejos y el build falla.
- Para aplicarlo a la DB de dev: `npx prisma db push` (pide confirmación). CI y prod usan `npx prisma migrate deploy`.
- `backend/prisma/migrations/` está en `.gitignore`, así que las migraciones no viajan por git. Antes de asumir que un cambio de schema llega a CI o prod, avisá y preguntá cómo se despliega.
- Nunca `prisma migrate reset` ni `db push --force-reset`: borran datos.
- Cambios destructivos (renombrar o borrar columnas, cambiar tipos, agregar `NOT NULL` sin default): avisá y proponé cómo migrar los datos existentes.
- Los montos de monedas son `Int`. No introducir `Float` para dinero.
- Si un campo nuevo se expone en la API, actualizá el DTO y el tipo del front (`new_frontend/features/<dominio>/types`).
