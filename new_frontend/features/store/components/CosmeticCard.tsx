import React, { useState } from 'react';
import { ShoppingBag, CheckCircle2, Minus, Plus } from 'lucide-react';
import { UserTeam } from '@/types/user';
import { StoreItem } from '../types';
import { useUserStore } from '@/store/useUserStore';

import { NAME_COLORS } from '@/features/chat/config/ColorsRegistry';
import { getChatBubbleComponent } from '@/features/chat/config/chatBubbleRegistry';
import { getBannerUrl } from '@/features/chat/config/BannersRegistry';
import { TIER_UI_CONFIG } from '@/features/auth/constants/ROLES_SUBSCRIPTION';

interface CosmeticCardProps {
  item: StoreItem;
  onBuy?: (item: StoreItem, quantity: number) => void;
  onEquip?: (item: StoreItem) => void;
  team: UserTeam | null;
}


export const CosmeticCard: React.FC<CosmeticCardProps> = ({ item, onBuy, onEquip, team }) => {
  const isConsumable = ['MEGAPHONE', 'CUSTOM_POLL'].includes(item.type);
  const isOwned = item.isOwned;

  const teamName = team?.name || "el fulbo carajo";

  const activeNameColorId = useUserStore((state) => state.activeNameColorId);
  const activeChatBubbleId = useUserStore((state) => state.activeChatBubbleId);

  const [previewWithActive, setPreviewWithActive] = useState(false);
  const [quantity, setQuantity] = useState(1);

  const nameColorStyle = NAME_COLORS[item.assetId]?.textClass || NAME_COLORS.default?.textClass || "";
  const activeNameColorStyle = activeNameColorId
    ? (NAME_COLORS[activeNameColorId]?.textClass || NAME_COLORS.default?.textClass)
    : NAME_COLORS.default?.textClass;

  const ItemChatBubble = getChatBubbleComponent(item.type === 'CHAT_BUBBLE' ? item.assetId : null);
  const ActiveChatBubble = getChatBubbleComponent(activeChatBubbleId);

  const canPreviewWithActive =
    (item.type === 'NAME_COLOR' && Boolean(activeChatBubbleId)) ||
    (item.type === 'CHAT_BUBBLE' && Boolean(activeNameColorId));


  const discountList = item.discountName
    ? item.discountName.split(' + ').map((name) => {
      let translatedName = name.trim();

      Object.entries(TIER_UI_CONFIG).forEach(([tierKey, config]) => {
        if (config.badge) {
          translatedName = translatedName.replace(tierKey, config.badge);
          const tierWithSpace = tierKey.replace('_', ' ');
          translatedName = translatedName.replace(tierWithSpace, config.badge);
        }
      });

      return translatedName;
    })
    : [];

  return (
    <article aria-label={item.name} className="bg-[#1c1b1b] border border-[#353534] hover:border-[#454932] rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all group">
      <div className="flex flex-col gap-3">

        <div className="flex justify-between items-center border-b border-[#353534] pb-2 min-h-[32px]">
          <span className="text-[10px] font-bold uppercase text-[#d2f000] bg-[#d2f000]/10 px-2 py-0.5 rounded">
            {isConsumable ? 'CONSUMIBLE (UNIDAD)' : 'PERMANENTE'}
          </span>

          {canPreviewWithActive ? (
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={previewWithActive}
                onChange={(e) => setPreviewWithActive(e.target.checked)}
                className="w-3.5 h-3.5 accent-[#d2f000] cursor-pointer rounded bg-[#131313] border-[#353534]"
              />
              <span className="text-[10px] font-semibold text-[#c6c9ab] hover:text-white transition-colors">
                Probar equipado
              </span>
            </label>
          ) : (
            item.isDiscounted && (
              <div className="relative group/discount cursor-pointer flex items-center">
                <div className="flex items-center gap-1.5 bg-[#ffb4ab]/10 border border-[#ffb4ab]/40 px-2 py-0.5 rounded shadow-[0_0_8px_rgba(255,180,171,0.3)] hover:shadow-[0_0_12px_rgba(255,180,171,0.6)] transition-all">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ffb4ab] animate-pulse" />
                  <span className="text-[10px] font-bold uppercase text-[#ffb4ab]">
                    {item.discountPercentage}% OFF
                  </span>
                </div>

                <div className="absolute bottom-full right-0 mb-2 w-max max-w-[220px] px-3 py-2 bg-[#131313] border border-[#ffb4ab]/30 rounded-lg opacity-0 group-hover/discount:opacity-100 transition-opacity pointer-events-none z-50 shadow-2xl flex flex-col gap-1.5 translate-y-1 group-hover/discount:translate-y-0 duration-200">
                  <span className="text-[9px] text-[#909378] uppercase font-bold tracking-wider">
                    Descuentos aplicados
                  </span>
                  <div className="flex flex-col gap-1">
                    {discountList.map((name, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-[#ffb4ab] font-semibold">
                        <span className="w-1 h-1 rounded-full bg-[#ffb4ab]/60" />
                        {name.trim()}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          )}
        </div>

        <div className="h-28 w-full rounded-xl bg-[#131313] border border-[#353534] overflow-hidden relative flex items-center justify-center p-3">

          {item.type === 'BANNER' && (
            <div className="w-full h-full rounded-lg overflow-hidden relative border border-[#353534]/50">
              <img
                src={getBannerUrl(item.assetId)}
                alt={item.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                onError={(e) => {
                  e.currentTarget.src = getBannerUrl('default');
                }}
              />
            </div>
          )}

          {item.type === 'NAME_COLOR' && (
            <>
              {previewWithActive && activeChatBubbleId ? (
                <div className="w-full flex justify-center">
                  <ActiveChatBubble>
                    <span className={`text-sm font-bold drop-shadow ${nameColorStyle}`}>
                      Aguantee {teamName}!!
                    </span>
                  </ActiveChatBubble>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xs text-[#c6c9ab]">Color de chat:</span>
                  <span className={`text-base font-bold drop-shadow text-center ${nameColorStyle}`}>
                    Auantee {teamName}!!
                  </span>
                </div>
              )}
            </>
          )}

          {item.type === 'CHAT_BUBBLE' && (
            <div className="w-full flex justify-center">
              <ItemChatBubble>
                <span className={`text-sm font-bold ${previewWithActive ? activeNameColorStyle : 'text-white'}`}>
                  Aguantee {teamName}!!
                </span>
              </ItemChatBubble>
            </div>
          )}

          {item.type === 'STICKER_PACK' && (
            <div className="flex flex-col items-center justify-center w-full h-full">
              <img
                src={`/cosmetics/stickers/${item.assetId}.webp`}
                alt={item.name}
                className="w-20 h-20 md:w-24 md:h-24 object-contain drop-shadow-md group-hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}

          {item.type === 'MEGAPHONE' && (
            <div className="flex flex-col items-center justify-center gap-1">
              <div className="relative">
                <div className="absolute inset-0 bg-[#d2f000]/20 blur-xl rounded-full" />
                <img
                  src="/icons/megaphone-icon.png"
                  alt="Megáfono"
                  className="relative w-20 h-20 object-contain drop-shadow-[0_0_8px_rgba(210,240,0,0.45)] group-hover:scale-110 group-hover:drop-shadow-[0_0_12px_rgba(210,240,0,0.7)] transition-all duration-300"
                />
              </div>
              <span className="font-bold text-[10px] text-[#e5e2e1] uppercase tracking-wider">
                Megáfono
              </span>
            </div>
          )}

          {item.type === 'CUSTOM_POLL' && (
            <div className="flex flex-col items-center justify-center gap-1">
              <div className="relative">
                <div className="absolute inset-0 bg-[#d2f000]/20 blur-xl rounded-full" />
                <img
                  src="/icons/custom-poll-icon.png"
                  alt="Encuesta"
                  className="relative w-[88px] h-[88px] object-contain drop-shadow-[0_0_8px_rgba(210,240,0,0.45)] group-hover:scale-110 group-hover:drop-shadow-[0_0_12px_rgba(210,240,0,0.7)] transition-all duration-300"
                />
              </div>
              <span className="font-bold text-[10px] text-[#e5e2e1] uppercase tracking-wider">
                Encuesta
              </span>
            </div>
          )}

        </div>

        <div>
          <h3 className="font-extrabold text-base text-[#e5e2e1]">{item.name}</h3>
          <p className="text-xs text-[#c6c9ab] leading-relaxed mt-1 line-clamp-2">
            {item.description}
          </p>
        </div>
      </div>

      <div className="pt-3 border-t border-[#353534] flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-bold uppercase text-[#909378]">Total:</span>
          <div className="flex items-center gap-2">
            {item.isDiscounted && (
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0">
                  <img
                    src="/icons/chiqui-coin-icon.png"
                    alt="Chiqui Coin"
                    className="w-full h-full object-cover opacity-60"
                  />
                </div>

                <span className="text-xs text-[#909378] line-through font-mono">
                  {item.price * quantity}
                </span>
              </div>
            )}

            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                <img
                  src="/icons/chiqui-coin-icon.png"
                  alt="Chiqui Coin"
                  className="w-full h-full object-cover"
                />
              </div>

              <span className="font-mono font-bold text-base text-[#d2f000]">
                {item.currentPrice * quantity}
              </span>
            </div>
          </div>
        </div>

        {isOwned && !isConsumable ? (
          <button
            disabled
            className="w-full bg-[#1c1b1b] border border-[#353534] text-[#666] font-bold text-xs py-2.5 rounded-xl uppercase cursor-not-allowed flex items-center justify-center gap-1 opacity-70"
          >
            <CheckCircle2 className="w-4 h-4 opacity-50" /> Ya Adquirido
          </button>
        ) : (
          <div className="flex gap-2">
            {isConsumable && (
              <div className="flex items-center justify-between bg-[#131313] border border-[#353534] rounded-xl px-2 min-w-[80px]">
                <button
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  aria-label="Restar una unidad"
                  className="p-1 text-[#c6c9ab] hover:text-[#d2f000] disabled:opacity-50 transition-colors"
                  disabled={quantity <= 1}
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-sm font-bold text-white font-mono">{quantity}</span>
                <button
                  onClick={() => setQuantity(q => q + 1)}
                  aria-label="Sumar una unidad"
                  className="p-1 text-[#c6c9ab] hover:text-[#d2f000] transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            )}

            <button
              onClick={() => onBuy?.(item, quantity)}
              className="flex-1 bg-[#d2f000] hover:bg-[#b8d300] text-[#191e00] font-black text-xs py-2.5 rounded-xl uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md active:scale-95"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Comprar</span>
            </button>
          </div>
        )}

        {isConsumable && item.ownedQuantity > 0 && (
          <div className="text-center mt-1">
            <span className="text-[10px] font-bold text-[#909378]">
              Tenés {item.ownedQuantity} en inventario
            </span>
          </div>
        )}
      </div>
    </article>
  );
};