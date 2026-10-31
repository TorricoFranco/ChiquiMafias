# Resultados de las pruebas de carga (local)

Corridas del 30/10/2026 sobre la rama `test/load-k6-local`. Cómo se corren está en [README.md](README.md).

**Entorno:** Windows 10, Docker Desktop con WSL2, Postgres 15 y Redis 7 de `docker-compose.dev.yml` con poco volumen de datos, backend en `node dist/main` (build de la rama, Node 22.17) y k6 v2.3.0. El backend corrió en el puerto 3100 con `THROTTLE_LIMIT=100000` y con sus crons activos. La PC se reinició y Docker se reabrió entre corridas, lo que cambió el rendimiento base (ver "Sostenida: latencia").

## Resumen

- **El script y el override funcionan.** En todas las corridas válidas no hubo ni un 429. En la escalonada, a unas 44 req/s, el límite por defecto de 150 req/min habría cortado la prueba.
- **Los endpoints públicos de `/stats` no mostraron bloqueos en local.** Con hasta 100 usuarios concurrentes (escalonada): p95 de 10,8 ms y 0 errores.
- **No encontré un punto de quiebre.** Eso vale para estos endpoints, con poco volumen de datos y en este PC. No dice nada de la VPS.
- **Sostenida (33 min, 40 usuarios):** 73.957 peticiones, 0 fallos, 0 respuestas 429. La memoria del backend sube al principio, se estabiliza y baja al terminar la carga: no hay señal de fuga. La latencia fue más alta que en la escalonada, pero el control posterior muestra que la PC estaba más lenta, así que esa diferencia no se puede atribuir a la carga.

## Pruebas

| Prueba | Carga | Peticiones | Fallos | 429 | p95 | Máx. |
|---|---|---|---|---|---|---|
| Smoke contra stub local (valida el script, no el backend) | 5 usuarios, 1 min | 150 | 0 % | 0 | 0,9 ms | 1,1 ms |
| Smoke contra backend de la rama | 5 usuarios, 1 min | 150 | 0 % | 0 | 12,9 ms | 45,9 ms |
| Escalonada contra backend de la rama | hasta 100 usuarios, 9 min | 23.726 | 0 % | 0 | 10,8 ms | 115,9 ms |
| Sostenida contra backend de la rama | 40 usuarios, 33 min | 73.957 | 0 % | 0 | 44,8 ms | 215,0 ms |
| Smoke de control, después de la sostenida | 5 usuarios, 1 min | 150 | 0 % | 0 | 21,5 ms | 23,4 ms |

La primera corrida del smoke contra el backend se descartó: en ese momento el contenedor de desarrollo publicaba el mismo puerto (3007) y no había forma de saber qué backend respondió. Las corridas de la tabla usan el puerto 3100. La primera sostenida se interrumpió a los 20 minutos porque se apagó la PC, así que no aparece en la tabla.

## Sostenida: recursos

Medidos cada 30 segundos sobre el proceso de Node que escucha en el puerto 3100, y sobre Redis y Postgres desde dentro de sus contenedores.

- **Backend, memoria de trabajo:** 141 MB en la primera muestra, que se tomó a los 12 segundos del arranque. Subió a unos 159 MB a los 5 minutos y se estabilizó entre 170 y 171 MB entre los minutos 10 y 25. Cerró en 182 MB, con un máximo de 183 MB.
- **Backend, memoria privada:** de 148 MB a 200 MB (máximo 200,7 MB).
- **Backend, después de la carga:** al terminar la carga bajó a 101 MB de trabajo y 117 MB privada. La memoria se libera, así que no es una fuga continua.
- **Backend, CPU:** 578 segundos acumulados en 33 minutos, unos 0,3 núcleos en promedio.
- **Redis:** de 1,9 MB a 2,3 MB, con un máximo de 2,3 MB. El contenedor tiene 512 MB de límite.
- **Postgres:** entre 11 y 16 conexiones, con un promedio de 15,6. Estas cuentan también las conexiones del contenedor de desarrollo, que usa la misma base.

La primera sostenida, interrumpida, mostró el mismo patrón: la memoria del backend pasó de unos 108 MB a unos 158 MB en 20 minutos.

## Sostenida: latencia

La p95 de la sostenida (44,8 ms) es más de cuatro veces la de la escalonada (10,8 ms), con un ritmo parecido (37 y 44 req/s). El smoke de control, hecho después de la sostenida y con la misma configuración que el smoke anterior, dio una mediana de 16 ms y una p95 de 21,5 ms. Antes había dado una mediana de unos 6 ms y una p95 de 12,9 ms.

Es decir, la PC estaba más lenta al final de la sesión. Como las corridas se hicieron en momentos distintos, no se pueden comparar entre sí sin una línea base tomada en el mismo momento.

## Qué demuestra cada prueba

- **Smoke:** el script, los umbrales y el backend de la rama funcionan juntos.
- **Escalonada:** el override funciona, y estos endpoints aguantan 100 usuarios en local sin degradarse.
- **Sostenida:** el backend aguanta 33 minutos a 40 usuarios sin errores ni 429, y la memoria no crece sin límite en esta corrida.

## Qué no demuestra

- La capacidad de la VPS: 2 vCPU, 4 GB y los `mem_limit` de cada servicio en `docker-compose.yml`.
- WebSockets (chat, apuestas en vivo).
- Endpoints que escriben (apuestas, billetera, tienda, suscripciones).
- El frontend. Estas corridas no incluyeron `WEB_URL`.
- Redis con `maxmemory`, y Caddy.
- Volumen de datos real.
- Las causas de la latencia de la sostenida. Solo sabemos que la PC cambió entre corridas.

## Conclusiones

1. En local, los endpoints de lectura de `/stats` no son el cuello de botella con hasta 100 usuarios concurrentes.
2. El backend no mostró fuga de memoria en 33 minutos a 40 usuarios: la memoria sube, se estabiliza y baja al terminar la carga.
3. Los riesgos que marcó el análisis del código siguen sin probarse. Estas pruebas no los tocan (ver "Qué hacer").
4. Estos resultados no justifican cambios de infraestructura. Sí justifican probar esos riesgos en staging.

## Qué hacer, en orden

1. **Línea base en cada corrida:** antes y después de una prueba larga, correr un smoke de control en el mismo momento, para poder comparar.
2. **Staging con las specs de la VPS** (2 vCPU, 4 GB) y el mismo `docker-compose.yml`. Correr smoke, escalonada y sostenida ahí, con claves de prueba.
3. **Probar cada riesgo del código con un test concreto:**
   - Redis sin `maxmemory` y con `mem_limit` de 512 MB: llenar Redis y ver si el contenedor muere.
   - Backend con `mem_limit` de 768 MB y sin `--max-old-space-size`: correr la sostenida dentro de un contenedor con ese límite y ver si hay OOM.
   - Pool de Prisma por defecto: repetir la escalonada con `connection_limit` explícito y ver cuándo aparecen timeouts.
   - Crons: comparar la sostenida con y sin los crons que consultan la API externa.
4. **Agregar pruebas de WebSockets** (Socket.IO) y de endpoints de escritura que no muevan plata.
5. **Decidir el límite por IP** (150 req/min) para usuarios que comparten IP, por ejemplo NAT de celulares.
6. **Medir tráfico real** con los logs de acceso de Caddy, para tener números de producción.
