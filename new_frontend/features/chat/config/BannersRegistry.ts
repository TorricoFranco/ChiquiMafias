
export interface BannerConfig {
  assetUrl: string;
}

export const BANNERS: Record<string, BannerConfig> = {
  default: {
    assetUrl: "/cosmetics/banners/default.webp",
  },
  bombonera: {
    assetUrl: "/cosmetics/banners/bombonera.webp",
  },
  monumental: {
    assetUrl: "/cosmetics/banners/monumental.webp",
  }
};

export const getBannerUrl = (assetId?: string | null): string => {
  if (!assetId) return BANNERS.default.assetUrl;
  return BANNERS[assetId]?.assetUrl || `/cosmetics/banners/${assetId}.webp`;
};