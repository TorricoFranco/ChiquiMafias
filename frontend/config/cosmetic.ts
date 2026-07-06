// src/config/cosmetics.ts

export interface NameColorStyle {
  textClass: string;
}

export interface BannerStyle {
  bodyClass: string;
}

// 🎨 ESTILOS DE NOMBRES (Tipografías, colores, sombras, efectos)
export const NAME_COLORS: Record<string, NameColorStyle> = {
  default: {
    textClass: "text-white font-semibold"
  },
  color_gold: {
    // Oro Campeón: Dorado brillante con sombra y tipografía extra gruesa
    textClass: "text-amber-400 font-black tracking-wide drop-shadow-[0_2px_5px_rgba(251,191,36,0.5)] animate-in fade-in"
  },
  // Acá vas sumando más en el futuro, ej: color_red, color_boquense, etc.
};
