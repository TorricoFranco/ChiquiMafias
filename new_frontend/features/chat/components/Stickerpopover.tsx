"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Lock } from "lucide-react";
import { useUserInventory } from "@/features/inventory/hooks/useInventory";
import { useStoreItems, useBuyItem } from "@/features/store/hooks/useStore";

interface StickerpopoverProps {
  onSelectSticker: (assetId: string) => void;
  onClose: () => void;
}

export default function Stickerpopover({ onSelectSticker, onClose }: StickerpopoverProps) {
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const { data: storeData, isLoading: loading } = useStoreItems();
  const { data: inventory } = useUserInventory();
  const { mutateAsync: buyStoreItem } = useBuyItem();

  const items = storeData?.stickers ?? [];

  const isItemOwned = (itemId: string) => {
    if (!inventory) return false;
    if (Array.isArray(inventory)) {
      return inventory.some((inv) => inv.itemId === itemId || inv.item?.id === itemId);
    }
    return (inventory.stickers ?? []).some(
      (inv: any) => inv?.itemId === itemId || inv?.item?.id === itemId
    );
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const handleStickerClick = async (item: any) => {
    const isOwned = isItemOwned(item.id);

    if (isOwned) {
      onSelectSticker(item.assetId);
      onClose();
      return;
    }

    try {
      setBuyingId(item.id);
      await buyStoreItem({ itemId: item.id, price: item.price });

      onSelectSticker(item.assetId);
      onClose();
    } catch (err) {
      alert("No te alcanza la guita o falló la compra.");
    } finally {
      setBuyingId(null);
    }
  };

  return (
    <div
      ref={popoverRef}
      className="absolute bottom-14 left-0 z-50 w-72 bg-[#171717] border border-white/10 rounded-2xl p-3 shadow-2xl shadow-black/60 animate-in fade-in slide-in-from-bottom-2 duration-150"
    >
      <div className="flex justify-between items-center mb-2 pb-2 border-b border-white/5">
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
          Mis Stickers <span className="text-gray-600 normal-case font-bold">— hacé clic para enviar</span>
        </span>
      </div>

      {loading ? (
        <div className="h-32 flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-sky-500 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-center text-xs text-gray-500 my-6">No hay stickers disponibles.</p>
      ) : (
        <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto custom-scrollbar">
          {items.map((item) => {
            const userOwnsIt = isItemOwned(item.id);

            return (
              <button
                key={item.id}
                disabled={buyingId !== null}
                onClick={() => handleStickerClick(item)}
                className="relative aspect-square bg-black/40 hover:bg-[#d2f000]/5 hover:border-[#d2f000]/30 rounded-xl flex items-center justify-center p-1 border border-white/5 transition-all group"
              >
                <img
                  src={`/cosmetics/stickers/${item.assetId}.webp`}
                  alt={item.name}
                  className={`w-full h-full object-contain transition-all group-hover:scale-105 ${!userOwnsIt ? "opacity-20 blur-[0.5px]" : ""
                    }`}
                />

                {/* Candado de Compra */}
                {!userOwnsIt && (
                  <div className="absolute inset-0 bg-black/50 group-hover:bg-black/80 rounded-xl flex flex-col items-center justify-center transition-all">
                    {buyingId === item.id ? (
                      <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
                    ) : (
                      <>
                        <Lock className="w-3 h-3 text-amber-500 mb-0.5 group-hover:hidden" />
                        <span className="hidden group-hover:block text-[8px] font-black text-amber-400 text-center leading-none">
                          COMPRAR<br />${item.price}
                        </span>
                      </>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}