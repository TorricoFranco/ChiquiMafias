---
name: commit-haiku
description: Escribe el mensaje de commit con Haiku 5.5 y effort max, delegando la redacción a un subagente haiku aunque la sesión use otro modelo, y commitea solo con confirmación explícita. Úsala cuando el usuario pida commitear cambios concretos. No hace push ni PR (eso es finalizar-feature) y nunca toca main.
argument-hint: "[archivos o descripción del cambio a commitear]"
allowed-tools:
  - Agent
  - Bash(git status *)
  - Bash(git diff *)
  - Bash(git log *)
  - Bash(git branch *)
  - Bash(git checkout *)
  - Bash(git add *)
  - Bash(git commit *)
  - Bash(git show *)
---

# Commit con mensaje de Haiku 5.5 (effort max)

`$ARGUMENTS` define qué se commitea (archivos o descripción del cambio). Si viene vacío, mirá `git status --short` y preguntá qué entra.

## 1. Quién redacta el mensaje (regla fija)

El mensaje de commit **siempre** lo redacta un subagente con `model: "haiku"` y `effort: "max"` (Haiku 5.5, `claude-haiku-5-5`). Vale aunque la sesión esté en otro modelo, así que no depende de cómo esté configurada.

- Llamá a la herramienta Agent con `model: "haiku"` y `effort: "max"`.
- En el prompt pasá: la lista de archivos, `git diff --stat --ignore-cr-at-eol` de esos archivos, el pedido original del usuario y el formato de la sección 4.
- Pedí que devuelva **solo** el mensaje (asunto, cuerpo y la línea de Co-Authored-By), sin herramientas y sin tocar git.
- Si el subagente falla o no devuelve un mensaje usable, no commitees: avisá y preguntá.

La skill no cambia el modelo ni el effort de la sesión: eso lo hace el usuario con `/model` y `/effort`. Si la sesión está en otro modelo, decilo en la respuesta; el mensaje igual sale de Haiku por el subagente.

## 2. Qué archivos entran

- Solo los del pedido del usuario o los que él confirme.
- Nunca `git add -A` ni `git add .`. Usá rutas explícitas.
- Nunca entran: `new_frontend/app/s.png` (borrado del usuario), `.claude/agent-memory/*`, `.env*`, `backup_dev.sql`, ni archivos que no sean parte del cambio pedido.

## 3. Rama

- Si estás en `develop` y el cambio es nuevo, proponé `tipo/slug-en-kebab` desde `develop` con `git checkout -b`.
- Si ya estás en una rama de feature que corresponde, reusala.
- Nunca `main`.

## 4. Formato del mensaje

- Asunto: `tipo(scope): mensaje`. Tipos: `feat|fix|refactor|perf|security|test|chore`. En inglés, imperativo, hasta 72 caracteres.
- Cuerpo en inglés: qué cambia y por qué. Si hay cambios de comportamiento, listalos aparte.
- Última línea, siempre: `Co-Authored-By: Claude Haiku 5.5 <noreply@anthropic.com>`.

## 5. Confirmación (obligatoria)

Mostrá en un bloque: rama, asunto y cuerpo completos, y la lista de archivos. Preguntá: "¿Confirmás este commit?". Sin un sí explícito para este commit no ejecutes `git add` ni `git commit`. Una aprobación genérica anterior no cuenta.

## 6. Commit

1. Guardá el mensaje confirmado en un archivo temporal del scratchpad.
2. `git add -- <archivos explícitos>` y después `git commit -F <archivo>`.
3. Verificá con `git show --stat HEAD` y mostrá el hash y los archivos.
4. No hagas push ni PR. Eso es `/finalizar-feature`, o un pedido explícito.

Si un hook falla, no lo saltees (`--no-verify`): investigalo y avisá.

## Qué NO hace

- No cambia el modelo ni el effort de la sesión.
- No commitea sin confirmación explícita.
- No toca `main`, no reescribe historia, no hace push.
