#!/usr/bin/env bash
# Backup de Postgres (y del estado de Redis) con rotación. Pensado para correr en el VPS
# desde cron, como el usuario que maneja Docker. Ejemplo (todos los días a las 03:30):
#
#   30 3 * * * /srv/chiquimafias/scripts/ops/backup.sh >> /var/log/chiquimafias-backup.log 2>&1
#
# Qué hace:
#   1. pg_dump comprimido en $BACKUP_DIR/daily, verificado con gzip -t.
#   2. Copia del dump.rdb de Redis (saldos y apuestas en curso).
#   3. Rotación: 7 diarios, 4 semanales (los domingos) y 6 mensuales (el día 1).
#   4. Opcional: sube todo a un destino externo con rclone si definís BACKUP_RCLONE_REMOTE.
#
# Variables opcionales:
#   COMPOSE_DIR            carpeta del docker-compose.yml (por defecto, la raíz del repo)
#   BACKUP_DIR             destino local (por defecto /var/backups/chiquimafias)
#   BACKUP_RCLONE_REMOTE   por ejemplo "b2:mi-bucket/chiquimafias" (requiere rclone configurado)
#   KEEP_DAILY / KEEP_WEEKLY / KEEP_MONTHLY
#
# Un backup en el mismo disco no protege si se pierde el servidor: configurá el destino externo.
set -euo pipefail

COMPOSE_DIR="${COMPOSE_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/chiquimafias}"
KEEP_DAILY="${KEEP_DAILY:-7}"
KEEP_WEEKLY="${KEEP_WEEKLY:-4}"
KEEP_MONTHLY="${KEEP_MONTHLY:-6}"

log() { printf '%s %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"; }
die() { log "ERROR: $*"; exit 1; }

command -v docker >/dev/null || die "docker no está instalado"
cd "$COMPOSE_DIR"
compose() { docker compose "$@"; }

# Evita dos backups a la vez (cron + corrida manual).
mkdir -p "$BACKUP_DIR"/{daily,weekly,monthly}
exec 9>"$BACKUP_DIR/.lock"
flock -n 9 || die "ya hay otro backup corriendo"

STAMP="$(date '+%Y%m%d-%H%M%S')"
DAILY="$BACKUP_DIR/daily/db-$STAMP.sql.gz"
TMP="$DAILY.partial"
trap 'rm -f "$TMP"' EXIT

# --- 1. Postgres -----------------------------------------------------------
# Las credenciales se leen del propio contenedor, así no hay que parsear el .env.
log "Volcando Postgres..."
compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --clean --if-exists' \
  | gzip -9 > "$TMP"

gzip -t "$TMP" || die "el dump quedó corrupto"
[ "$(stat -c %s "$TMP")" -gt 1024 ] || die "el dump es sospechosamente chico"
mv "$TMP" "$DAILY"
log "Postgres OK: $DAILY ($(du -h "$DAILY" | cut -f1))"

# --- 2. Redis --------------------------------------------------------------
log "Guardando estado de Redis..."
if compose exec -T redis sh -c 'redis-cli --no-auth-warning -a "$REDIS_PASSWORD" SAVE' | grep -q OK; then
  RDB="$BACKUP_DIR/daily/redis-$STAMP.rdb"
  compose cp redis:/data/dump.rdb "$RDB" && log "Redis OK: $RDB" || log "AVISO: no se pudo copiar dump.rdb"
else
  log "AVISO: Redis no confirmó SAVE; el backup de Redis se omite"
fi

# --- 3. Rotación -----------------------------------------------------------
[ "$(date +%u)" = "7" ] && cp "$DAILY" "$BACKUP_DIR/weekly/" && log "Copia semanal"
[ "$(date +%d)" = "01" ] && cp "$DAILY" "$BACKUP_DIR/monthly/" && log "Copia mensual"

rotate() { # rotate <carpeta> <cuántos conservar>
  local dir="$1" keep="$2" pattern
  for pattern in 'db-*.sql.gz' 'redis-*.rdb'; do
    # ls falla si todavía no hay archivos de ese tipo (p. ej. Redis en weekly): no es un error.
    ls -1t "$dir"/$pattern 2>/dev/null | tail -n +"$((keep + 1))" | xargs -r rm -f || true
  done
}
rotate "$BACKUP_DIR/daily" "$KEEP_DAILY"
rotate "$BACKUP_DIR/weekly" "$KEEP_WEEKLY"
rotate "$BACKUP_DIR/monthly" "$KEEP_MONTHLY"

# --- 4. Destino externo (opcional) ----------------------------------------
if [ -n "${BACKUP_RCLONE_REMOTE:-}" ]; then
  command -v rclone >/dev/null || die "BACKUP_RCLONE_REMOTE está definido pero rclone no está instalado"
  log "Subiendo a $BACKUP_RCLONE_REMOTE..."
  rclone sync "$BACKUP_DIR" "$BACKUP_RCLONE_REMOTE" --exclude ".lock" --quiet
  log "Destino externo OK"
else
  log "AVISO: sin BACKUP_RCLONE_REMOTE; los backups quedan solo en este servidor"
fi

log "Listo."
