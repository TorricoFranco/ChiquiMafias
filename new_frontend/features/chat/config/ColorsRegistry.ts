
export interface NameColorStyle {
  textClass: string;
}

export interface BannerStyle {
  bodyClass: string;
}

export const NAME_COLORS: Record<string, NameColorStyle> = {
  default: {
    textClass: "text-zinc-100 font-bold drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]"
  },

  // color_gold: {
  //   // Oro Campeón: Dorado brillante con sombra y tipografía extra gruesa
  //   textClass: "text-amber-400 font-black tracking-wide drop-shadow-[0_2px_5px_rgba(251,191,36,0.5)] animate-in fade-in"
  // },

  color_arg: {
    // Celeste, blanco, celeste radiante
    textClass: "bg-gradient-to-r from-sky-400 via-white to-sky-400 text-transparent bg-clip-text font-black drop-shadow-[0_0_8px_rgba(56,189,248,0.8)]"
  },

  color_boca: {
    // Azul y Oro
    textClass: "bg-gradient-to-r from-blue-800 via-yellow-400 to-blue-800 text-transparent bg-clip-text font-black drop-shadow-[0_2px_4px_rgba(30,58,138,0.8)]"
  },

  color_river: {
    // Blanco, Banda Roja, Blanco
    textClass: "bg-gradient-to-r from-zinc-100 via-red-600 to-zinc-100 text-transparent bg-clip-text font-black drop-shadow-[0_2px_4px_rgba(220,38,38,0.5)]"
  },

  color_toxic: {
    // Verde flúor radioactivo (Ideal para los "tóxicos" del chat)
    textClass: "text-green-400 font-black tracking-widest drop-shadow-[0_0_12px_rgba(74,222,128,1)]"
  },

  color_glitch: {
    // Efecto oscuro con sombra roja tipo error/cyberpunk
    textClass: "text-zinc-200 font-extrabold tracking-tighter drop-shadow-[2px_2px_0px_rgba(220,38,38,0.9)]"
  },

  color_cuervo: {
    // San Lorenzo: Azul y Rojo oscuro
    textClass: "bg-gradient-to-r from-blue-900 via-red-700 to-blue-900 text-transparent bg-clip-text font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
  },

  color_racing: {
    // La Academia: Celeste y blanco pero con un tono más frío que el de la selección
    textClass: "bg-gradient-to-r from-cyan-300 via-slate-100 to-cyan-300 text-transparent bg-clip-text font-black drop-shadow-[0_2px_6px_rgba(103,232,249,0.5)]"
  },

  color_bronze: {
    // Efecto cobre/bronce oxidado pero pulido. Tonos naranjas y marrones oscuros.
    textClass: "bg-gradient-to-r from-amber-800 via-orange-500 to-amber-900 text-transparent bg-clip-text font-black drop-shadow-[0_1px_3px_rgba(120,53,15,0.8)]"
  },

  color_silver: {
    // Efecto plata/cromo. Tonos grises azulados con un centro muy brillante.
    textClass: "bg-gradient-to-r from-slate-400 via-slate-100 to-slate-500 text-transparent bg-clip-text font-black drop-shadow-[0_2px_4px_rgba(100,116,139,0.5)]"
  },

  color_gold: {
    // Oro VIP. Un degradado rico en amarillos y ámbar con un resplandor dorado de fondo.
    textClass: "bg-gradient-to-r from-yellow-500 via-yellow-200 to-amber-500 text-transparent bg-clip-text font-black drop-shadow-[0_2px_8px_rgba(251,191,36,0.6)]"
  },

  color_diamond: {
    // Hielo/Cristal. Tonos cyan y blancos ultra puros con un aura celeste brillante.
    textClass: "bg-gradient-to-r from-cyan-300 via-white to-blue-300 text-transparent bg-clip-text font-black drop-shadow-[0_0_12px_rgba(103,232,249,0.8)]"
  },

  color_neon: {
    // Estilo Cyberpunk. Fucsia intenso con una sombra externa muy fuerte para el efecto "glow" de tubo de neón.
    textClass: "text-fuchsia-400 font-black tracking-wide drop-shadow-[0_0_12px_rgba(217,70,239,1)]"
  },
};