---
name: finalizar-feature
description: Cierra un feature o fix ya implementado y verificado. Corre la verificación completa (build+lint+test:unit backend, lint+build new_frontend), infiere tipo de rama, scope y mensaje de commit a partir del diff, crea o reusa la rama, pide confirmación explícita antes de commitear, pushea y abre la PR contra develop. Nunca toca main.
argument-hint: "[tipo(scope): mensaje opcional, sobreescribe lo inferido]"
allowed-tools:
  - Bash(git status *)
  - Bash(git diff *)
  - Bash(git log *)
  - Bash(git branch *)
  - Bash(git remote *)
  - Bash(npm run build *)
  - Bash(npm run lint *)
  - Bash(npm run test:unit *)
  - Bash(npx jest src/*)
  - Bash(npx prisma generate *)
  - Bash(npx prisma validate *)
  - Bash(npx tsc --noEmit *)
  - Bash(git checkout -b *)
  - Bash(git add *)
  - Bash(git commit *)
  - Bash(git push *)
  - Bash(gh --version *)
  - Bash(gh auth status *)
  - Bash(gh pr create *)
---

# Finalizar feature: $ARGUMENTS

Cierra un feature o fix que ya está implementado y probado a mano: verifica, commitea y abre la PR contra `develop`. Si `$ARGUMENTS` trae un mensaje con formato `tipo(scope): mensaje`, usalo tal cual en vez de inferirlo. **Nunca** toca `main`: ni checkout, ni commit, ni push, ni merge contra esa rama, bajo ninguna circunstancia.

## 1. Qué cambió

```bash
git branch --show-current
git status --short
git diff --stat develop...HEAD
```

Agrupá por app (`backend/`, `new_frontend/`, `discord-bot/`; ignorá `frontend/`, es legacy) tanto el working tree sucio como los commits locales que `develop` todavía no tiene. Si no hay nada de nada (ni working tree sucio ni commits por encima de `develop`), decilo y terminá: no hay nada que cerrar.

## 2. Rama actual: chequeo de seguridad

```bash
git branch --show-current
```

Si la rama actual es `main`: **frená ahí mismo**. No sigas con ningún paso de este skill sobre `main`, ni para verificar ni para nada. Avisá al usuario que el cierre sobre `main` es manual.

## 3. Verificación (equivalente a `/verificar`)

No sigas al paso 4 si algo de esto falla. Corré todo sin frenar en el primer error y recién después decidí si cortar.

**Backend** (si cambió algo en `backend/`), desde `backend/`:

1. Si cambió `prisma/schema.prisma`: `npx prisma validate` + `npx prisma generate`.
2. `npm run build`
3. `npm run test:unit` (= `jest src/`). **Nunca** `npm test` ni `npm run test:e2e`: incluyen los e2e, que borran la DB real (`backend/CLAUDE.md`, `.claude/rules/backend-tests.md`).
4. `npm run lint`. Aplica `--fix`: si modifica archivos, mostralos — van a entrar en el commit.

Si el cambio toca `wallet/`, `bets/`, `subscriptions/`, `webhook/`, `coin-shop/`, `store/` o `streaks/`, recomendá correr el subagente `backend-reviewer` antes de seguir al paso 4 (no sigas sin que el usuario lo haya corrido o decida explícitamente saltarlo).

**new_frontend** (si cambió algo en `new_frontend/`), desde `new_frontend/`:

1. `npm run lint`
2. `npm run build`

**discord-bot**: no tiene build ni tests; solo revisá que las rutas nuevas validen `x-discord-bot-token`.

Si algo falla: mostrá el error relevante (no el log entero) y **cortá el skill ahí**. No hay commit, no hay push, no hay PR hasta que esto pase limpio.

## 4. Inferir tipo, scope y mensaje de commit

Si `$ARGUMENTS` ya viene en formato `tipo(scope): mensaje` con `tipo` en `feat|fix|refactor|perf|security|test|chore`, usalo tal cual y saltá al paso 5.

Si no, inferí mirando el diff completo (`git diff develop...HEAD` + working tree) **y** el pedido original en la conversación (es la señal más confiable sobre el diff solo):

- **tipo**: `feat` si agrega capacidad nueva (endpoint, módulo, componente, pantalla); `fix` si corrige un comportamiento roto; `refactor` si reordena sin cambiar comportamiento; `perf` si es optimización medible; `security` si toca auth, guards o validación de payloads por un motivo de seguridad; `test` si son specs nuevos sin tocar código de producción; `chore` para tooling, deps, config o docs.
- **scope**: el dominio o módulo predominante tocado (nombre de carpeta en `backend/src/<scope>` o de `new_frontend/features/<scope>`, o `discord-bot`). Si el cambio cruza backend y new_frontend del mismo dominio (típico: agregar un endpoint y su consumo en el front), usá el nombre del dominio común (ej. `bets`), no "backend" ni "frontend".
- **mensaje**: en inglés, imperativo, resumen corto (idealmente bajo 72 caracteres) de qué cambia.

**Si los cambios tocan dominios sin relación entre sí** (ej. algo en `wallet/` y algo en `discord-bot/` que no son parte del mismo feature): no asumas un solo commit. Mostrale al usuario los grupos que detectaste y preguntá si quiere un commit por grupo (y posiblemente ramas/PRs separadas) antes de seguir.

## 5. Rama: reusar o crear

- Si la rama actual matchea `^(feat|fix|refactor|perf|security|test|chore)/`: reusala, no crees una nueva.
- Si la rama actual es `develop` y hay cambios sueltos: creá la rama desde ahí.
  ```bash
  git checkout -b <tipo>/<scope-o-slug-en-kebab-case>
  ```
- Si la rama actual no es ninguna de las anteriores ni `develop` ni `main` (por ejemplo una rama vieja con otro nombre): avisá y preguntá qué hacer, no asumas.
- Si la rama ya tenía commits locales sin pushear (se retoma un feature grande en curso), no es un problema: el commit nuevo se agrega arriba. Mencionalo en la confirmación del paso 6 para que el usuario sepa cuántos commits van a salir juntos.

## 6. Confirmación explícita (obligatoria antes de tocar git)

Mostrale al usuario, en un bloque claro:

- Rama final (reusada o nueva, con su nombre).
- Tipo + scope + mensaje de commit propuestos: `tipo(scope): mensaje`.
- Lista de archivos que van a entrar (`git status --short` filtrado a las apps relevantes).

Preguntá explícitamente si confirma. **No ejecutes `git add` ni `git commit` sin un sí explícito para este paso puntual** — una aprobación genérica anterior en la conversación ("dale, seguí") no cuenta como esta confirmación.

## 7. Commit

```bash
git checkout -b <rama>   # solo si es nueva (ya corrido en el paso 5)
git add <paths de las apps que realmente cambiaron>
git commit -m "<tipo>(<scope>): <mensaje>"
```

Evitá `git add -A`/`git add .` a ciegas: agregá los paths de las apps involucradas para no colar archivos sueltos sin relación que pudieran estar en el working tree. Si `git status` muestra algo de `.env*` o `backup_dev.sql`, no lo agregues bajo ninguna circunstancia (no debería pasar, están en `.gitignore`, pero es una verificación barata).

## 8. Push

```bash
git push -u origin <rama>
```

## 9. Pull Request contra `develop`

Antes de nada:

```bash
gh --version
gh auth status
```

- Si `gh` no está instalado, o no está autenticado: **no falles en silencio**. Avisá al usuario, y como alternativa generá a mano el título y el body propuestos (mismo formato que abajo) y el link de comparación para abrir la PR manualmente:
  ```
  https://github.com/<owner>/<repo>/compare/develop...<rama>?expand=1
  ```
  `<owner>/<repo>` salen de `git remote get-url origin`. El commit y el push del paso 7-8 ya quedaron hechos; solo falta la PR, que el usuario abre a mano.

- Si `gh` está disponible y autenticado:
  ```bash
  gh pr create --base develop --head <rama> --title "<tipo>(<scope>): <mensaje>" --body "<resumen de los cambios>

  ## Plan de test
  <si aplica: qué se probó a mano / qué falta>

  🤖 Generated with [Claude Code](https://claude.com/claude-code)"
  ```

**Nunca** `--base main`. Esta skill no abre, no sugiere ni acepta pedidos de abrir una PR contra `main`.

## 10. Cierre

Reportá en pocas líneas: rama usada, hash y mensaje del commit, si se pusheó, y el link de la PR (o el link manual de fallback si no había `gh`). Recordá que el merge a `main` queda fuera de esta skill y es manual.

## Qué NO hace esta skill

- No toca `main` de ninguna forma: ni checkout, ni commit, ni push, ni merge. Eso es 100% manual.
- No corre `npm test`, `npm run test:e2e`, `npx jest test/...` ni nada que incluya e2e: borran la DB real. Si el usuario quiere correr e2e, es un paso aparte con su propia confirmación explícita.
- No commitea ni pushea sin haber mostrado antes la rama y el mensaje propuestos y recibido un sí explícito puntual.
- No usa `git push --force` ni reescribe historia.
- No corrige fallos de verificación por su cuenta más allá de lo que ya hace `npm run lint --fix`; si build o tests fallan, corta y devuelve el control.
