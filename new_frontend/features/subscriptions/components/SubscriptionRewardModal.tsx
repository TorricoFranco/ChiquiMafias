

import React, { useEffect, useState, useRef } from 'react';
import { Sparkles, Coins, CheckCircle2, Gift, ChevronLeft, ChevronRight } from 'lucide-react';
import { useUserStore } from "@/store/useUserStore";
import { getChatBubbleComponent } from '../../chat/config/chatBubbleRegistry';
import { NAME_COLORS } from '../../chat/config/ColorsRegistry';
import { getBannerUrl } from '../../chat/config/BannersRegistry';

export enum ItemType {
    STICKER_PACK = 0,
    NAME_COLOR = 1,
    BANNER = 2,
    CHAT_BUBBLE = 3,
    MEGAPHONE = 4,
    CUSTOM_POLL = 5,
    BUFF = 6,
}

interface CosmeticItem {
    assetId: string;
    quantity: number;
    type?: ItemType | string | number;
    name?: string;
}

interface RewardModalProps {
    data: {
        tier: string;
        gifts: {
            coins?: number;
            cosmetics: CosmeticItem[];
        };
    };
    onClose: () => void;
}

// Mapea directamente el enum/número a un tipo estándar
const normalizeItemType = (type?: ItemType | string | number): string => {
    if (type === ItemType.STICKER_PACK || type === 'STICKER_PACK' || type === 0) return 'STICKER_PACK';
    if (type === ItemType.NAME_COLOR || type === 'NAME_COLOR' || type === 1) return 'NAME_COLOR';
    if (type === ItemType.BANNER || type === 'BANNER' || type === 2) return 'BANNER';
    if (type === ItemType.CHAT_BUBBLE || type === 'CHAT_BUBBLE' || type === 3) return 'CHAT_BUBBLE';
    if (type === ItemType.MEGAPHONE || type === 'MEGAPHONE' || type === 4) return 'MEGAPHONE';
    if (type === ItemType.CUSTOM_POLL || type === 'CUSTOM_POLL' || type === 5) return 'CUSTOM_POLL';
    if (type === ItemType.BUFF || type === 'BUFF' || type === 6) return 'BUFF';
    return 'STICKER_PACK';
};

const resolveCosmeticMeta = (cosmetic: CosmeticItem) => {
    const normType = normalizeItemType(cosmetic.type);
    const id = cosmetic.assetId || '';

    let name = cosmetic.name;
    if (!name) {
        if (normType === 'NAME_COLOR') name = `Color ${id.replace('color_', '').toUpperCase()}`;
        else if (normType === 'BANNER') name = `Banner ${id.replace('banner_', '').toUpperCase()}`;
        else if (normType === 'CHAT_BUBBLE') name = `Burbuja ${id.replace('bubble_', '').toUpperCase()}`;
        else if (normType === 'MEGAPHONE') name = 'Megáfono';
        else if (normType === 'CUSTOM_POLL') name = 'Encuesta Destacada';
        else name = id.replace(/-/g, ' ');
    }

    return { type: normType, name };
};

export const SubscriptionRewardModal: React.FC<RewardModalProps> = ({ data, onClose }) => {
    const [show, setShow] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const username = useUserStore((state) => state.username);
    const name = useUserStore((state) => state.name);
    const displayName = username || name || 'Usuario';

    useEffect(() => {
        setShow(true);
    }, []);

    const { coins, cosmetics = [] } = data.gifts;

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const scrollAmount = direction === 'left' ? -280 : 280;
            scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Background Overlay */}
            <div
                className={`absolute inset-0 bg-black/85 backdrop-blur-md transition-opacity duration-300 ${show ? 'opacity-100' : 'opacity-0'}`}
                onClick={onClose}
            />

            {/* Modal Container */}
            <div
                className={`relative w-full max-w-4xl flex flex-col bg-[#1c1b1b] border-2 border-[#d2f000]/40 rounded-3xl p-6 shadow-[0_0_50px_rgba(210,240,0,0.15)] transform transition-all duration-300 ${show ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-4'}`}
            >
                {/* Decoración Superior */}
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-10">
                    <div className="bg-[#d2f000] p-3.5 rounded-full shadow-[0_0_25px_rgba(210,240,0,0.5)] animate-bounce">
                        <Gift className="w-8 h-8 text-[#191e00]" />
                    </div>
                </div>

                {/* Encabezado */}
                <div className="text-center mt-4 mb-4 flex-shrink-0">
                    <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight flex items-center justify-center gap-2">
                        <Sparkles className="text-[#d2f000] w-6 h-6" />
                        ¡Recompensas {data.tier.replace('_', ' ')}!
                        <Sparkles className="text-[#d2f000] w-6 h-6" />
                    </h2>
                    <p className="text-[#c6c9ab] text-xs md:text-sm mt-1">
                        Tus beneficios ya fueron acreditados en tu cuenta.
                    </p>
                </div>

                {/* Slider Horizontal */}
                <div className="relative group my-2">
                    <button
                        onClick={() => scroll('left')}
                        className="absolute -left-3 top-1/2 -translate-y-1/2 z-20 bg-[#d2f000] hover:bg-[#e0ff1a] text-[#191e00] p-2 rounded-full shadow-[0_0_15px_rgba(210,240,0,0.4)] transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                        aria-label="Anterior"
                    >
                        <ChevronLeft className="w-6 h-6 stroke-[3]" />
                    </button>

                    <div
                        ref={scrollRef}
                        className="flex items-center gap-4 overflow-x-auto py-4 px-3 scroll-smooth snap-x snap-mandatory scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none]"
                    >
                        {/* Monedas */}
                        {coins && coins > 0 && (
                            <div className="snap-center shrink-0 w-44 h-48 bg-[#131313] border border-[#ffcc00]/50 rounded-2xl p-4 flex flex-col items-center justify-between relative overflow-hidden group hover:border-[#ffcc00] transition-colors shadow-lg">
                                <div className="relative w-20 h-20 flex items-center justify-center bg-[#ffcc00]/20 rounded-full shadow-[0_0_20px_rgba(255,204,0,0.3)] my-auto">
                                    <Coins className="w-10 h-10 text-[#ffcc00]" />
                                </div>
                                <div className="text-center w-full">
                                    <span className="block text-2xl font-black text-[#ffcc00]">+{coins}</span>
                                    <span className="text-xs uppercase font-bold text-[#e5e2e1]">Monedas</span>
                                </div>
                            </div>
                        )}

                        {/* Cosméticos */}
                        {cosmetics.map((cosmetic, index) => {
                            const { type, name: cosmeticName } = resolveCosmeticMeta(cosmetic);

                            const nameColorClass = type === 'NAME_COLOR'
                                ? (NAME_COLORS[cosmetic.assetId]?.textClass || NAME_COLORS.default?.textClass || "text-yellow-400")
                                : "";

                            const ChatBubblePreview = type === 'CHAT_BUBBLE'
                                ? getChatBubbleComponent(cosmetic.assetId)
                                : null;

                            return (
                                <div
                                    key={`${cosmetic.assetId}-${index}`}
                                    className="snap-center shrink-0 w-44 h-48 bg-[#131313] border border-[#353534] rounded-2xl p-3 flex flex-col items-center justify-between relative group hover:border-[#d2f000]/60 transition-all duration-300 shadow-lg"
                                >
                                    <div className="h-28 w-full flex items-center justify-center relative rounded-xl overflow-hidden bg-[#181818]/60 p-1">

                                        {type === 'BANNER' && (
                                            <img
                                                src={getBannerUrl(cosmetic.assetId)}
                                                alt={cosmeticName}
                                                className="w-full h-full object-cover rounded-lg"
                                                onError={(e) => { e.currentTarget.src = getBannerUrl('default'); }}
                                            />
                                        )}

                                        {type === 'NAME_COLOR' && (
                                            <span className={`text-lg font-black drop-shadow-md text-center truncate px-1 ${nameColorClass}`}>
                                                {displayName}
                                            </span>
                                        )}

                                        {type === 'CHAT_BUBBLE' && ChatBubblePreview && (
                                            <div className="w-full flex justify-center scale-90 origin-center">
                                                <ChatBubblePreview>
                                                    <span className="text-xs font-bold text-white px-1 truncate">
                                                        {displayName}
                                                    </span>
                                                </ChatBubblePreview>
                                            </div>
                                        )}

                                        {type === 'MEGAPHONE' && (
                                            <img src="/icons/megaphone-icon.png" className="w-16 h-16 object-contain drop-shadow-[0_0_12px_rgba(210,240,0,0.5)] transform group-hover:scale-110 transition-transform" alt="Megáfono" />
                                        )}

                                        {type === 'CUSTOM_POLL' && (
                                            <img src="/icons/custom-poll-icon.png" className="w-16 h-16 object-contain drop-shadow-[0_0_12px_rgba(210,240,0,0.5)] transform group-hover:scale-110 transition-transform" alt="Encuesta" />
                                        )}

                                        {type === 'STICKER_PACK' && (
                                            <img
                                                src={`/cosmetics/stickers/${cosmetic.assetId}.png`}
                                                className="w-full h-full object-contain p-1 transform group-hover:scale-110 transition-transform duration-300"
                                                alt={cosmeticName}
                                                onError={(e) => {
                                                    const img = e.currentTarget;
                                                    if (img.src.endsWith('.png')) {
                                                        img.src = `/cosmetics/stickers/${cosmetic.assetId}.webp`;
                                                    } else if (img.src.endsWith('.webp')) {
                                                        img.src = `/cosmetics/stickers/${cosmetic.assetId}.jpg`;
                                                    } else {
                                                        img.src = '/icons/sticker-placeholder.png';
                                                    }
                                                }}
                                            />
                                        )}

                                        {cosmetic.quantity > 1 && (
                                            <div className="absolute top-1 right-1 bg-[#d2f000] text-[#191e00] font-black text-xs px-2 py-0.5 rounded-full shadow-md z-10">
                                                x{cosmetic.quantity}
                                            </div>
                                        )}
                                    </div>

                                    <div className="text-center w-full px-1">
                                        <span className="block text-xs font-extrabold text-[#e5e2e1] truncate capitalize" title={cosmeticName}>
                                            {cosmeticName}
                                        </span>
                                        <span className="text-[9px] font-bold text-[#d2f000] uppercase tracking-wider block mt-0.5">
                                            {['MEGAPHONE', 'CUSTOM_POLL'].includes(type) ? 'Consumible' : type === 'STICKER_PACK' ? 'Sticker' : 'Permanente'}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <button
                        onClick={() => scroll('right')}
                        className="absolute -right-3 top-1/2 -translate-y-1/2 z-20 bg-[#d2f000] hover:bg-[#e0ff1a] text-[#191e00] p-2 rounded-full shadow-[0_0_15px_rgba(210,240,0,0.4)] transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                        aria-label="Siguiente"
                    >
                        <ChevronRight className="w-6 h-6 stroke-[3]" />
                    </button>
                </div>

                {/* Botón Cierre */}
                <div className="w-full border-t border-[#353534] pt-4 mt-2 flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="w-full bg-[#d2f000] hover:bg-[#b8d300] text-[#191e00] font-black text-sm py-3.5 px-6 rounded-xl uppercase transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(210,240,0,0.2)] active:scale-98"
                    >
                        <CheckCircle2 className="w-5 h-5" />
                        ¡Entendido!
                    </button>
                </div>

            </div>
        </div>
    );
};