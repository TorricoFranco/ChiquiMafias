import React, { useState } from 'react';
import { StoreItem } from '../types';
import { CosmeticCard } from './CosmeticCard';
import { UserTeam } from '@/types/user';
import { TIER_UI_CONFIG } from '@/features/auth/constants/ROLES_SUBSCRIPTION';

interface CosmeticsTabProps {
  items: StoreItem[];
  onBuyCosmetic: (item: StoreItem, quantity: number) => void;
  onEquipCosmetic: (item: StoreItem) => void;
  team: UserTeam | null;
}

export const CosmeticsTab: React.FC<CosmeticsTabProps> = ({
  items,
  onBuyCosmetic,
  onEquipCosmetic,
  team,
}) => {
  const [cosmeticFilter, setCosmeticFilter] = useState<'all' | 'permanent' | 'consumable'>('all');
  const [cosmeticSubtype, setCosmeticSubtype] = useState<string>('all');

  const isConsumable = (type: string) => ['MEGAPHONE', 'CUSTOM_POLL'].includes(type);

  const filteredCosmetics = items.filter((item) => {
    const itemIsConsumable = isConsumable(item.type);
    
    if (cosmeticFilter === 'permanent' && itemIsConsumable) return false;
    if (cosmeticFilter === 'consumable' && !itemIsConsumable) return false;
    
    if (cosmeticSubtype !== 'all' && item.type !== cosmeticSubtype) return false;
    
    return true;
  });

  return (
    <section className="flex flex-col gap-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="font-extrabold text-xl md:text-2xl text-[#e5e2e1] uppercase tracking-tight flex items-center gap-2">
            CATÁLOGO DE LA TIENDA
          </h2>
          <p className="text-xs text-[#c6c9ab]">
            Los artículos permanentes quedan en tu inventario. Los consumibles se gastan al usarlos.
          </p>
        </div>

        <div className="flex bg-[#131313] border border-[#353534] rounded-xl p-1">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'permanent', label: 'Permanentes' },
            { id: 'consumable', label: 'Consumibles' },
          ].map((tab) => (
            <button
              key={tab.id}
              aria-pressed={cosmeticFilter === tab.id}
              onClick={() => {
                setCosmeticFilter(tab.id as any);
                setCosmeticSubtype('all');
              }}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                cosmeticFilter === tab.id
                  ? 'bg-[#353534] text-[#d2f000]'
                  : 'text-[#c6c9ab] hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-[#909378] font-bold uppercase">Filtrar por tipo:</span>
        {[
          { id: 'all', label: 'Todos' },
          { id: 'BANNER', label: '🖼️ Banners' },
          { id: 'STICKER_PACK', label: '😃 Stickers' },
          { id: 'NAME_COLOR', label: '🎨 Color Mensaje' },
          { id: 'CHAT_BUBBLE', label: '💬 Burbujas' },
          { id: 'MEGAPHONE', label: '📢 Megáfonos' },
          { id: 'CUSTOM_POLL', label: '📊 Encuestas' }, 
        ]
        .filter(sub => {
           if (cosmeticFilter === 'permanent' && ['MEGAPHONE', 'CUSTOM_POLL'].includes(sub.id)) return false;
           if (cosmeticFilter === 'consumable' && ['BANNER', 'STICKER_PACK', 'NAME_COLOR', 'CHAT_BUBBLE'].includes(sub.id)) return false;
           return true;
        })
        .map((sub) => (
          <button
            key={sub.id}
            aria-pressed={cosmeticSubtype === sub.id}
            onClick={() => setCosmeticSubtype(sub.id)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              cosmeticSubtype === sub.id
                ? 'bg-[#353534] border-[#d2f000] text-[#d2f000]'
                : 'bg-[#131313] border-[#353534] text-[#c6c9ab] hover:text-[#e5e2e1]'
            }`}
          >
            {sub.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredCosmetics.map((item) => (
          <CosmeticCard
            key={item.id}
            item={item}
            onBuy={onBuyCosmetic}
            onEquip={onEquipCosmetic}
            team={team}
          />
        ))}
      </div>
    </section>
  );
};