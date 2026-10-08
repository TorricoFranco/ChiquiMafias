---
paths:
  - "new_frontend/**/*.tsx"
  - "new_frontend/app/globals.css"
---

# UI de new_frontend — sistema "Estadio Digital"

Tema oscuro siempre, alto contraste, acento lima. Copiá el estilo de los componentes vecinos antes de inventar.

## Colores

Los componentes usan **clases arbitrarias con hex** (`bg-[#131313]`, `text-[#D2F000]`), no clases de tokens. Seguí ese patrón y usá **solo** estos valores:

| Rol | Hex |
|---|---|
| Fondo de la app | `#050505` |
| Superficies (cards, sidebars) | `#131313`, `#1C1B1B`, `#201F1F`, `#2A2A2A` |
| Bordes y superficies altas | `#353534` (bordes sutiles: `#454932`) |
| **Acento lima** (CTA, nav activa, cifras clave) | `#D2F000` (hover/dim `#B8D300`) |
| Texto sobre lima | `#191E00` |
| Texto principal | `#E5E2E1` |
| Texto secundario | `#C6C9AB` |
| Texto terciario / labels | `#909378`, `#8E9285` |
| Rojo (solo EN VIVO, errores y alertas) | `#FFB4AB` (texto), `#D30017` (fondo) |

- No uses `#DFFF00` aunque figure en `DESIGN.md`: el lima real del código es `#D2F000`.
- Para el glow del acento usá la clase `.neon-glow`, y para el indicador en vivo, `.live-pulse` (las dos están en `globals.css`).
- Si de verdad hace falta un color nuevo, agregalo a la tabla de `@theme` en `globals.css` y avisá.

## Tipografía

- Títulos, marcadores y cuotas: `font-black` o `font-extrabold`, con `uppercase` + `tracking` en headers y badges ("VIVO").
- Montserrat: `font-headline`. Cuerpo y datos: Inter (`font-sans`, por defecto).

## Formas y layout

- Cards y paneles: `rounded-xl` / `rounded-2xl`. Botones: `rounded-lg` / `rounded-xl`. Badges, avatares y pills: `rounded-full`.
- Barras de progreso de apuestas y encuestas: esquinas rectas o casi (`rounded-none` / `rounded-sm`).
- Densidad alta: espaciados en múltiplos de 4px. Mobile-first: la nav lateral se convierte en `MobileNav` abajo.

## Iconos, animación y feedback

- Iconos: `lucide-react` (opción por defecto) o Material Symbols (`<span className="material-symbols-outlined">`) donde el componente ya los use.
- Animaciones con `framer-motion`. Feedback con `toast` de `sonner`.

La spec completa de componentes (match cards, chat, barras de apuestas) está en `new_frontend/DESIGN.md`. Si `DESIGN.md` contradice al código existente, **gana el código**.
