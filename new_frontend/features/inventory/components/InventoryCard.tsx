import React from 'react';
import { CheckCircle2, XCircle, Package, Image as ImageIcon, Sparkles } from 'lucide-react';
import { InventoryItem } from '../types';
import { UserTeam } from '@/types/user';
import { NAME_COLORS } from '@/features/chat/config/ColorsRegistry';
import { getChatBubbleComponent } from '@/features/chat/config/chatBubbleRegistry';
import { getBannerUrl } from '@/features/chat/config/BannersRegistry';

interface InventoryCardProps {
    inventoryItem: InventoryItem;
    isProcessing: boolean;
    onToggleEquip: (inv: InventoryItem) => void;
    team: UserTeam | null;
}

export const InventoryCard: React.FC<InventoryCardProps> = ({
    inventoryItem,
    isProcessing,
    onToggleEquip,
    team
}) => {
    const { item, isEquipped, quantity, isExclusive } = inventoryItem;

    const isConsumable = ['MEGAPHONE', 'CUSTOM_POLL'].includes(item.type);
    const isSticker = item.type === 'STICKER_PACK';

    const teamName = team?.name || "el fulbo carajo";

    const nameColorStyle = NAME_COLORS[item.assetId]?.textClass || NAME_COLORS.default?.textClass || "";

    const ChatBubblePreview = getChatBubbleComponent(
        item.type === 'CHAT_BUBBLE' ? item.assetId : null
    );

    const cardStyles = isExclusive
        ? (isEquipped && !isSticker 
            ? 'border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.3)]' 
            : 'border-amber-500/40 hover:border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.1)] hover:shadow-[0_0_20px_rgba(251,191,36,0.25)]')
        : (isEquipped && !isSticker 
            ? 'border-[#d2f000]' 
            : 'border-[#353534] hover:border-[#454932]');

    return (
        <article aria-label={item.name} className={`bg-[#1c1b1b] border rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all duration-300 group relative ${cardStyles}`}>

            {/* Brillo de fondo para ítems exclusivos */}
            {isExclusive && (
                <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/5 via-transparent to-amber-500/10 rounded-2xl pointer-events-none" />
            )}

            {/* Icono de Equipado (Cambia a dorado si es exclusivo) */}
            {isEquipped && !isSticker && (
                <div className={`absolute -top-3 -right-3 text-[#191e00] p-1.5 rounded-full shadow-lg z-10 ${isExclusive ? 'bg-amber-400' : 'bg-[#d2f000]'}`}>
                    <CheckCircle2 className="w-4 h-4" />
                </div>
            )}

            <div className="flex flex-col gap-3 relative z-10">
                <div className="flex justify-between items-center border-b border-[#353534] pb-2 min-h-[32px]">
                    
                    {/* Contenedor de Badges (Tipo e Exclusividad) */}
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase text-[#d2f000] bg-[#d2f000]/10 px-2 py-0.5 rounded">
                            {isConsumable ? 'CONSUMIBLE' : isSticker ? 'COLECCIÓN' : 'PERMANENTE'}
                        </span>
                        
                        {/* BADGE EXCLUSIVO */}
                        {isExclusive && (
                            <span className="text-[10px] font-bold uppercase text-amber-300 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded flex items-center gap-1 shadow-[0_0_8px_rgba(251,191,36,0.2)]">
                                <Sparkles className="w-3 h-3" /> Exclusivo
                            </span>
                        )}
                    </div>

                    {isConsumable && (
                        <span className="text-[10px] font-bold uppercase bg-[#353534] text-white px-2 py-0.5 rounded flex items-center gap-1">
                            <Package className="w-3 h-3" /> x{quantity}
                        </span>
                    )}
                </div>

                {/* PREVIEW DEL ÍTEM */}
                <div className={`h-28 w-full rounded-xl bg-[#131313] border overflow-hidden relative flex items-center justify-center p-3 ${isExclusive ? 'border-amber-500/20' : 'border-[#353534]'}`}>

                    {item.type === 'BANNER' && (
                        <img
                            src={getBannerUrl(item.assetId)}
                            alt={`Banner ${item.name}`}
                            className="w-full h-full object-cover rounded-lg"
                            onError={(e) => {
                                e.currentTarget.src = getBannerUrl('default');
                            }}
                        />
                    )}

                    {item.type === 'NAME_COLOR' && (
                        <div className="flex flex-col items-center gap-1">
                            <span className="text-xs text-[#c6c9ab]">Color de chat:</span>
                            <span className={`text-base font-bold drop-shadow text-center ${nameColorStyle}`}>
                                Aguantee {teamName}!!
                            </span>
                        </div>
                    )}

                    {item.type === 'CHAT_BUBBLE' && ChatBubblePreview && (
                        <div className="w-full flex justify-center">
                            <ChatBubblePreview>
                                <span className="text-sm font-bold text-white">
                                    Aguantee {teamName}!!
                                </span>
                            </ChatBubblePreview>
                        </div>
                    )}

                    {item.type === 'STICKER_PACK' && (
                        <img
                            src={`/cosmetics/stickers/${item.assetId}.webp`}
                            alt={item.name}
                            className="w-full h-full p-1 object-contain drop-shadow-md hover:scale-105 transition-transform duration-300"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
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
                    <h3 className={`font-extrabold text-base ${isExclusive ? 'text-amber-400 drop-shadow-[0_0_5px_rgba(251,191,36,0.3)]' : 'text-[#e5e2e1]'}`}>
                        {item.name}
                    </h3>
                    <p className="text-xs text-[#c6c9ab] mt-1 line-clamp-2">
                        {item.description}
                    </p>
                </div>
            </div>

            {/* BOTONERA / ESTADO DEL ÍTEM */}
            <div className="pt-3 border-t border-[#353534] relative z-10">
                {isConsumable ? (
                    <div className="w-full bg-[#131313] border border-[#353534] text-[#909378] font-bold text-xs py-2.5 rounded-xl uppercase flex items-center justify-center gap-1">
                        Se usa automáticamente
                    </div>
                ) : isSticker ? (
                    <div className="w-full bg-[#131313] border border-[#353534] text-[#909378] font-bold text-xs py-2.5 rounded-xl uppercase flex items-center justify-center gap-1">
                        <ImageIcon className="w-4 h-4 opacity-70" /> Disponible en el chat
                    </div>
                ) : isEquipped ? (
                    <button
                        onClick={() => onToggleEquip(inventoryItem)}
                        disabled={isProcessing}
                        className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-bold text-xs py-2.5 rounded-xl uppercase transition-colors flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer"
                    >
                        <XCircle className="w-4 h-4" /> Desequipar
                    </button>
                ) : (
                    <button
                        onClick={() => onToggleEquip(inventoryItem)}
                        disabled={isProcessing}
                        className={`w-full font-black text-xs py-2.5 rounded-xl uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md active:scale-95 disabled:opacity-50
                            ${isExclusive 
                                ? 'bg-amber-400 hover:bg-amber-300 text-amber-950' 
                                : 'bg-[#d2f000] hover:bg-[#b8d300] text-[#191e00]'}`}
                    >
                        <CheckCircle2 className="w-4 h-4" /> Equipar
                    </button>
                )}
            </div>
        </article>
    );
};