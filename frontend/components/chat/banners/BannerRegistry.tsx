// src/components/chat/banners/bannerRegistry.tsx
import React from "react";
import DefaultBanner from "./DefaultBanner";
import FireballBanner from "./FireballBanner";
import GoldenVipBanner from "./GoldenVipBanner";

// Definimos el tipo del layout que esperamos
type BannerWrapperComponent = React.ComponentType<{ children: React.ReactNode }>;

export const BANNER_REGISTRY: Record<string, BannerWrapperComponent> = {
  default: DefaultBanner,
  banner_gold: GoldenVipBanner,
  banner_fire_ball: FireballBanner

  // Mañana creás "banner_boca_junior" o "banner_river" y solo los agregás acá abajo:
  // banner_boquense: BoquenseBanner,
};

// Helper ultra seguro para renderizar con fallback si el backend manda fruta o el id no existe
export function getBannerComponent(bannerId?: string | null): BannerWrapperComponent {
  if (!bannerId) return BANNER_REGISTRY.default;
  return BANNER_REGISTRY[bannerId] || BANNER_REGISTRY.default;
}