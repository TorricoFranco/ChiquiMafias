"use client";

import React, { useState } from "react";
import { useUserStore } from "@/store/useUserStore";
import TeamSelectorModal from "@/features/auth/components/TeamSelectorModal";
import { Edit2 } from "lucide-react";
import { useUserInventory, useEquipItem, useUnequipItem } from "@/features/inventory/hooks/useInventory";
import { EquipableType, InventoryItem } from "@/features/inventory/types";
import { InventorySection } from "@/features/inventory/components/InventorySection";
import { getBannerUrl } from '@/features/chat/config/BannersRegistry';
import { TIER_UI_CONFIG } from "@/features/auth/constants/ROLES_SUBSCRIPTION";

export const ProfilePanel = () => {
    const username = useUserStore((state) => state.username);
    const team = useUserStore((state) => state.team);
    const activeBannerIdUser = useUserStore((state) => state.activeBannerId);
    const tier = useUserStore((state) => state.tier);

    const tierConfig = tier && tier !== "NONE"
        ? TIER_UI_CONFIG[tier]
        : null;

    const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);

    const [activeSubTab, setActiveSubTab] = useState<string>("all");

    const availableTeams: any[] = [];

    const { data: inventory, isLoading } = useUserInventory();
    const { mutate: equipItem, isPending: isEquipping } = useEquipItem();
    const { mutate: unequipItem, isPending: isUnequipping } = useUnequipItem();

    const isProcessing = isEquipping || isUnequipping;

    const handleTeamSelect = (teamId: string, teamName: string, badgeUrl: string) => {
        setIsTeamModalOpen(false);
    };

    const handleToggleEquip = (inv: InventoryItem) => {
        if (inv.isEquipped) {
            unequipItem(inv.item.type as EquipableType);
        } else {
            equipItem(inv.itemId);
        }
    };
    const activeBanner = inventory?.all?.find((inv: any) => inv.item.type === 'BANNER' && inv.isEquipped);

    const headerBannerUrl = getBannerUrl(activeBannerIdUser || activeBanner?.item.assetId || null);

    return (
        <div className="flex-1 bg-[#131313] flex flex-col min-w-0 overflow-y-auto custom-scrollbar">

            <div className="relative h-48 sm:h-52 bg-[#1a1a1a] border-b border-[#454932] group shrink-0">
                <img
                    src={headerBannerUrl}
                    alt="Banner de perfil"
                    className="w-full h-full object-cover transition-all"
                    onError={(e) => {
                        e.currentTarget.src = getBannerUrl('default');
                    }}
                />

                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                    <div
                        onClick={() => setActiveSubTab("BANNER")}
                        className="bg-[#1a1a1a] border border-[#454932] text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold text-sm hover:bg-[#2b2b2b] hover:text-[#d2f000] transition-colors"
                    >
                        <Edit2 className="w-4 h-4" />
                        Cambiar Banner
                    </div>
                </div>

                <div className="absolute -bottom-16 left-8 flex items-end gap-4 z-10">
                    <div className="relative group/avatar cursor-pointer" onClick={() => setIsTeamModalOpen(true)}>
                        <img
                            src={team?.badgeUrl || "/default-avatar.png"}
                            alt="Avatar"
                            className="w-24 h-24 rounded-full bg-[#1a1a1a] border-4 border-[#131313] object-contain p-2 relative z-10"
                        />
                        <div className="absolute inset-0 bg-black/70 rounded-full opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center z-20">
                            <Edit2 className="w-6 h-6 text-white" />
                        </div>
                    </div>

                    <div className="mb-2">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2 drop-shadow-md">
                            {username}
                            <button className="text-gray-300 hover:text-[#d2f000] transition-colors bg-black/40 p-1 rounded-md backdrop-blur-sm">
                                <Edit2 className="w-4 h-4" />
                            </button>
                        </h2>
                        {tierConfig?.badge && (
                            <span
                                className="text-xs px-2 py-0.5 rounded font-bold uppercase tracking-wider shadow-sm"
                                style={{
                                    backgroundColor: tierConfig.badgeColor,
                                    color: tierConfig.textColor,
                                }}
                            >
                                {tierConfig.badge}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="h-24 shrink-0"></div>

            <div className="px-8 pb-10">
                <InventorySection
                    activeSubTab={activeSubTab}
                    setActiveSubTab={setActiveSubTab}
                    inventory={inventory?.all || []}
                    isLoading={isLoading}
                    isProcessing={isProcessing}
                    onToggleEquip={handleToggleEquip}
                    team={team}
                />
            </div>

            <TeamSelectorModal
                isOpen={isTeamModalOpen}
                onClose={() => setIsTeamModalOpen(false)}
                onSelect={handleTeamSelect}
                teams={availableTeams}
            />
        </div>
    );
};