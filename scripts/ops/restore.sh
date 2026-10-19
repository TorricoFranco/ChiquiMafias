#!/usr/bin/env bash
# Restaura un backup de Postgres hecho por backup.sh. Es DESTRUCTIVO: reemplaza el contenido de
# la base actual. Pide confirmación escrita, frena el backend mientras restaura y lo vuelve a levantar.
#
#   scripts/ops/restore.sh /var/backups/chiquimafias/daily/db-20261020-033000.sql.gz
#
# Para restaurar Redis (opcional): frená redis, copiá el .rdb a /data/dump.rdb del volumen y levantalo.
set -euo pipefail

COMPOSE_DIR="${COMPOSE_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
FILE="${1:-}"

[ -n "$FILE" ] || { echo "Uso: $0 <archivo.sql.gz>"; exit 1; }
[ -f "$FILE" ] || { echo "No existe: $FILE"; exit 1; }
gzip -t "$FILE" || { echo "El archivo está corrupto: $FILE"; exit 1; }

cd "$COMPOSE_DIR"
echo "Esto REEMPLAZA la base de datos actual con: $FILE"
read -r -p 'Escribí RESTAURAR para continuar: ' answer
[ "$answer" = "RESTAURAR" ] || { echo "Cancelado."; exit 1; }

echo "Frenando backend y bot..."
docker compose stop backend discord_bot

# El dump trae --clean --if-exists: borra y recrea los objetos antes de cargar los datos.
echo "Restaurando..."
gunzip -c "$FILE" | docker compose exec -T postgres sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' >/dev/null

echo "Levantando backend y bot..."
docker compose up -d backend discord_bot
echo "Listo. Revisá: docker compose logs -f backend"
