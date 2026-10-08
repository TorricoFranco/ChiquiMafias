import React from 'react';
import { InventoryCard } from './InventoryCard';
import { InventoryItem } from '../types';
import { UserTeam } from '@/types/user';

interface InventorySectionProps {
    activeSubTab: string;
    setActiveSubTab: (tab: string) => void;
    inventory: InventoryItem[];
    isLoading: boolean;
    isProcessing: boolean;
    onToggleEquip: (inv: InventoryItem) => void;
    team: UserTeam | null;
}

export const InventorySection: React.FC<InventorySectionProps> = ({
    activeSubTab,
    setActiveSubTab,
    inventory,
    isLoading,
    isProcessing,
    onToggleEquip,
    team
}) => {

    const filteredInventory = inventory.filter((inv) => {
        if (activeSubTab === 'all') return true;
        if (activeSubTab === 'CONSUMABLE') {
            return ['MEGAPHONE', 'CUSTOM_POLL'].includes(inv.item.type);
        }
        return inv.item.type === activeSubTab;
    });

    if (isLoading) {
        return <div className="text-[#c6c9ab] animate-pulse font-bold">Cargando inventario...</div>;
    }

    return (
        <section className="flex flex-col gap-6 animate-in fade-in duration-300">
            <div>
                <h2 className="font-extrabold text-xl md:text-2xl text-[#e5e2e1] uppercase tracking-tight">
                    MI INVENTARIO
                </h2>
                <p className="text-xs text-[#c6c9ab]">
                    Equipá tus cosméticos o revisá tus consumibles acumulados.
                </p>
            </div>

            {/* BOTONES DE FILTRADO (Igual que en CosmeticsTab) */}
            <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-[#909378] font-bold uppercase">Filtrar:</span>
                {[
                    { id: 'all', label: 'Todos' },
                    { id: 'BANNER', label: '🖼️ Banners' },
                    { id: 'STICKER_PACK', label: '😃 Stickers' },
                    { id: 'NAME_COLOR', label: '🎨 Color Mensaje' },
                    { id: 'CHAT_BUBBLE', label: '💬 Burbujas' },
                    { id: 'CONSUMABLE', label: '📢 Consumibles' },
                ].map((sub) => (
                    <button
                        key={sub.id}
                        aria-pressed={activeSubTab === sub.id}
                        onClick={() => setActiveSubTab(sub.id)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${activeSubTab === sub.id
                                ? 'bg-[#353534] border-[#d2f000] text-[#d2f000]'
                                : 'bg-[#131313] border-[#353534] text-[#c6c9ab] hover:text-[#e5e2e1]'
                            }`}
                    >
                        {sub.label}
                    </button>
                ))}
            </div>

            {/* GRILLA DE ÍTEMS */}
            {filteredInventory.length === 0 ? (
                <div className="py-10 text-center text-[#909378] border border-dashed border-[#353534] rounded-2xl">
                    <p className="font-bold">No tenés ítems de esta categoría.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredInventory.map((inv) => (
                        <InventoryCard
                            key={inv.id}
                            inventoryItem={inv}
                            isProcessing={isProcessing}
                            onToggleEquip={onToggleEquip}
                            team={team}
                        />
                    ))}
                </div>
            )}
        </section>
    );
};