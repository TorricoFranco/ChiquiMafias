#!/usr/bin/env bash
# Genera backups/prod-seed.sql: el contenido inicial de producción a partir de la base de dev.
# Lleva el fútbol (ligas, equipos, partidos, jugadores), la tienda, los tiers de suscripción, los packs
# de monedas y UN usuario (el presidente, con su billetera e inventario). Lo que generan los usuarios
# (apuestas, encuestas, transacciones, órdenes, etc.) y los demás usuarios no se llevan. El detalle
# está en clean-for-prod.sql. Listo para cargar sobre una base con el schema (npx prisma migrate deploy).
#
#   KEEP_EMAIL=tu-correo@gmail.com bash scripts/prod-data/export-dev-to-prod.sh
#
# No modifica la base de dev: la lee con pg_dump, la copia a un Postgres descartable,
# limpia la copia (clean-for-prod.sql) y vuelca el resultado.
#
# Requisitos: Docker, el contenedor de dev (football_postgres) corriendo y `npx prisma` disponible.
set -euo pipefail

KEEP_EMAIL="${KEEP_EMAIL:-}"
[ -n "$KEEP_EMAIL" ] || { echo "Falta KEEP_EMAIL: el correo del usuario presidente que se conserva."; exit 1; }

cd "$(dirname "$0")/../.."          # backend/
SCRATCH=pg_scratch_export
PORT=55433
OUT=../backups/prod-seed.sql
URL="postgresql://postgres:scratch@localhost:$PORT/export"

mkdir -p ../backups
docker rm -f "$SCRATCH" >/dev/null 2>&1 || true
docker run -d --name "$SCRATCH" -e POSTGRES_PASSWORD=scratch -p "$PORT:5432" postgres:15 >/dev/null
trap 'docker rm -f "$SCRATCH" >/dev/null 2>&1 || true' EXIT
until docker exec "$SCRATCH" pg_isready -U postgres -h localhost >/dev/null 2>&1; do sleep 2; done
docker exec "$SCRATCH" psql -U postgres -h localhost -c 'create database export' >/dev/null

# 1) Schema desde las migraciones (la misma ruta que va a usar producción).
DATABASE_URL="$URL" npx prisma migrate deploy

# 2) Datos de dev -> copia descartable.
docker exec football_postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --data-only --disable-triggers --exclude-table=_prisma_migrations' \
  | docker exec -i "$SCRATCH" psql -U postgres -h localhost -d export -v ON_ERROR_STOP=1 -q >/dev/null

# 3) Reducción al contenido inicial (ver clean-for-prod.sql). Imprime un resumen para revisar.
docker exec -i "$SCRATCH" psql -U postgres -h localhost -d export -v ON_ERROR_STOP=1 -v "keep_email=$KEEP_EMAIL" < scripts/prod-data/clean-for-prod.sql

# 4) Volcado final. Tiene el email del presidente: backups/ está en .gitignore, no lo commitees.
docker exec "$SCRATCH" pg_dump -U postgres -h localhost -d export --data-only --disable-triggers > "$OUT"
echo "Listo: $OUT ($(wc -l < "$OUT") líneas)"
