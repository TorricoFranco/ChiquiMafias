import React from "react";
import DefaultBanner from "../chat_bubble/DefaultBanner";
import FireballBanner from "../chat_bubble/FireballBanner";
import ArgentinaBanner from "../chat_bubble/ArgentinaBanner";
import SanLorenzoBanner from "../chat_bubble/SanLorenzoBanner";
import RiverPlateBanner from "../chat_bubble/RiverPlateBanner";
import BocaJuniorBanner from "../chat_bubble/BocaJuniorsBanner";
import HoloCardBanner from "../chat_bubble/HoloCardBanner";
import ToxicBanner from "../chat_bubble/ToxicBanner";
import EpicBubble from "../chat_bubble/EpicBubble";
import MythicBubble from "../chat_bubble/MythicBubble";

type ChatBubbleWrapperComponent = React.ComponentType<{ children: React.ReactNode }>;

export const CHAT_BUBBLE_REGISTRY: Record<string, ChatBubbleWrapperComponent> = {
  default: DefaultBanner,
  banner_fire_ball: FireballBanner,
  banner_argentina: ArgentinaBanner,
  banner_san_lorenzo: SanLorenzoBanner,
  banner_river_plate: RiverPlateBanner,
  banner_boca_junior: BocaJuniorBanner,
  banner_holo_card: HoloCardBanner,
  banner_toxic: ToxicBanner,
  bubble_epic: EpicBubble,
  bubble_mythic: MythicBubble,
};

export function getChatBubbleComponent(bannerId?: string | null): ChatBubbleWrapperComponent {
  if (!bannerId) return CHAT_BUBBLE_REGISTRY.default;
  return CHAT_BUBBLE_REGISTRY[bannerId] || CHAT_BUBBLE_REGISTRY.default;
}
