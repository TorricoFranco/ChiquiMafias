#!/usr/bin/env bash
# Verifica DESDE AFUERA que el servidor solo expone lo previsto. Correlo desde tu PC (otra red que
# el VPS), no desde el servidor. No necesita nmap: usa /dev/tcp de bash y curl.
#
#   scripts/ops/scan-ports.sh <ip-o-dominio> [dominio-del-sitio] [dominio-de-la-api]
#   scripts/ops/scan-ports.sh 203.0.113.10 chiquimafias.com api.chiquimafias.com
#
# Sale con código 1 si hay algo que no debería estar abierto o si falla una comprobación.
set -uo pipefail

HOST="${1:-}"
APP="${2:-chiquimafias.com}"
API="${3:-api.chiquimafias.com}"
[ -n "$HOST" ] || { echo "Uso: $0 <ip-o-dominio> [dominio-del-sitio] [dominio-de-la-api]"; exit 2; }

EXPECTED_OPEN=" 22 80 443 "                         # si cambiaste el puerto SSH, ajustá esta lista
INTERNAL_PORTS="3001 3005 3007 5432 5433 6379 8080 9000 2375 2376 27017"
FAIL=0
CURL_OPTS="${CURL_OPTS:-}"   # por ejemplo "-k" para probar contra un certificado local

is_open() { timeout 3 bash -c "echo > /dev/tcp/$HOST/$1" 2>/dev/null; }
ok()   { echo "  [OK]    $*"; }
bad()  { echo "  [FALLA] $*"; FAIL=1; }

echo "== Puertos TCP en $HOST"
for p in 21 22 23 25 53 80 110 143 443 465 587 993 995 $INTERNAL_PORTS; do
  if is_open "$p"; then
    case "$EXPECTED_OPEN" in
      *" $p "*) ok "puerto $p abierto (esperado)" ;;
      *) bad "puerto $p ABIERTO y no debería estarlo" ;;
    esac
  fi
done
for p in 22 80 443; do
  is_open "$p" || bad "puerto $p cerrado y debería estar abierto"
done

echo "== HTTP/HTTPS"
code=$(curl $CURL_OPTS -s -o /dev/null -w '%{http_code}' --max-time 10 "http://$APP/")
case "$code" in 301|308) ok "http://$APP redirige a HTTPS ($code)" ;; *) bad "http://$APP respondió $code (se esperaba 301/308)" ;; esac

code=$(curl $CURL_OPTS -s -o /dev/null -w '%{http_code}' --max-time 10 "https://$APP/")
[ "$code" = "200" ] && ok "https://$APP responde 200" || bad "https://$APP respondió $code"

hsts=$(curl $CURL_OPTS -sI --max-time 10 "https://$API/" | grep -i '^strict-transport-security' || true)
[ -n "$hsts" ] && ok "la API envía HSTS" || bad "la API no envía Strict-Transport-Security"

code=$(curl $CURL_OPTS -s -o /dev/null -w '%{http_code}' --max-time 10 "https://$API/api")
[ "$code" = "404" ] && ok "Swagger no se publica (/api -> 404)" || bad "https://$API/api respondió $code (se esperaba 404)"

code=$(curl $CURL_OPTS -s -o /dev/null -w '%{http_code}' --max-time 10 -X POST -H 'Content-Type: application/json' -d '{"email":"x@x.com"}' "https://$API/auth/dev-login")
case "$code" in 404|401|403) ok "dev-login no está disponible ($code)" ;; *) bad "/auth/dev-login respondió $code" ;; esac

echo "== CORS"
good=$(curl $CURL_OPTS -sI --max-time 10 -H "Origin: https://$APP" "https://$API/" | grep -i '^access-control-allow-origin' || true)
echo "$good" | grep -qi "https://$APP" && ok "la API acepta el origen https://$APP" || bad "la API NO acepta https://$APP (revisá CLIENT_URL)"
for evil in "http://localhost:3005" "https://evil.example"; do
  r=$(curl $CURL_OPTS -sI --max-time 10 -H "Origin: $evil" "https://$API/" | grep -i '^access-control-allow-origin' || true)
  [ -z "$r" ] && ok "la API rechaza el origen $evil" || bad "la API acepta el origen $evil: $r"
done

echo "== www"
loc=$(curl $CURL_OPTS -sI --max-time 10 "https://www.$APP/" | grep -i '^location' | tr -d '\r' || true)
echo "$loc" | grep -qi "https://$APP" && ok "www redirige a https://$APP" || bad "www no redirige al dominio principal ($loc)"

echo
if [ "$FAIL" -eq 0 ]; then echo "Todo en orden."; else echo "Hay problemas: revisá las líneas [FALLA]."; fi
exit "$FAIL"
