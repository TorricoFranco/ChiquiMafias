"use client";

import React, { useId, useRef, useState } from "react";
import { toast } from "sonner";
import { useUserStore } from "@/store/useUserStore";
import TeamSelectorModal from "@/features/auth/components/TeamSelectorModal";
import { Check, Edit2, Loader2, X } from "lucide-react";
import { useUserInventory, useEquipItem, useUnequipItem } from "@/features/inventory/hooks/useInventory";
import { EquipableType, InventoryItem } from "@/features/inventory/types";
import { InventorySection } from "@/features/inventory/components/InventorySection";
import { getBannerUrl } from '@/features/chat/config/BannersRegistry';
import { TIER_UI_CONFIG } from "@/features/auth/constants/ROLES_SUBSCRIPTION";
import { useTeams } from "@/features/teams/hooks/useTeams";
import { useUpdateProfile } from "@/features/profile/hooks/useUpdateProfile";
import { USERNAME_MAX_LENGTH, USERNAME_MIN_LENGTH, USERNAME_PATTERN } from "@/features/profile/types";

// Mismas reglas que CompleteProfileDto del backend.
const validateUsername = (value: string): string | null => {
    if (value.length < USERNAME_MIN_LENGTH) return `Mínimo ${USERNAME_MIN_LENGTH} caracteres.`;
    if (value.length > USERNAME_MAX_LENGTH) return `Máximo ${USERNAME_MAX_LENGTH} caracteres.`;
    if (!USERNAME_PATTERN.test(value)) return "Solo letras, números y guion bajo.";
    return null;
};

const UPDATE_ERROR_MESSAGE = "No se pudo actualizar en este momento. Probá de nuevo más tarde.";

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

    const [isEditingUsername, setIsEditingUsername] = useState(false);
    const [usernameDraft, setUsernameDraft] = useState("");
    const [usernameError, setUsernameError] = useState<string | null>(null);
    const usernameInputRef = useRef<HTMLInputElement>(null);
    const editButtonRef = useRef<HTMLButtonElement>(null);
    const usernameFieldId = useId();
    const usernameErrorId = `${usernameFieldId}-error`;
    const usernameHintId = `${usernameFieldId}-hint`;

    const { data: availableTeams = [] } = useTeams();
    const { mutate: updateProfile, isPending: isUpdating } = useUpdateProfile();

    const { data: inventory, isLoading } = useUserInventory();
    const { mutate: equipItem, isPending: isEquipping } = useEquipItem();
    const { mutate: unequipItem, isPending: isUnequipping } = useUnequipItem();

    const isProcessing = isEquipping || isUnequipping;

    const handleTeamSelect = (teamId: string) => {
        setIsTeamModalOpen(false);
        if (teamId === team?.id) return;

        updateProfile(
            { teamId },
            {
                onSuccess: () => toast.success("Equipo actualizado"),
                onError: () => toast.error(UPDATE_ERROR_MESSAGE),
            },
        );
    };

    const closeUsernameEditor = () => {
        setIsEditingUsername(false);
        setUsernameError(null);
        // Devuelve el foco al botón que abrió el editor.
        requestAnimationFrame(() => editButtonRef.current?.focus());
    };

    const startEditingUsername = () => {
        setUsernameDraft(username ?? "");
        setUsernameError(null);
        setIsEditingUsername(true);
        requestAnimationFrame(() => usernameInputRef.current?.select());
    };

    const handleUsernameSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isUpdating) return;

        const value = usernameDraft.trim();
        const error = validateUsername(value);
        if (error) {
            setUsernameError(error);
            usernameInputRef.current?.focus();
            return;
        }
        if (value === username) {
            closeUsernameEditor();
            return;
        }

        updateProfile(
            { username: value },
            {
                onSuccess: () => {
                    toast.success("Nombre de usuario actualizado");
                    closeUsernameEditor();
                },
                onError: () => {
                    setUsernameError(UPDATE_ERROR_MESSAGE);
                    usernameInputRef.current?.focus();
                },
            },
        );
    };

    const handleToggleEquip = (inv: InventoryItem) => {
        if (inv.isEquipped) {
            unequipItem(inv.item.type as EquipableType);
        } else {
            equipItem(inv.itemId);
        }
    };
    const activeBanner = inventory?.all?.find((inv: InventoryItem) => inv.item.type === 'BANNER' && inv.isEquipped);

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

                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                        type="button"
                        onClick={() => setActiveSubTab("BANNER")}
                        className="bg-[#1a1a1a] border border-[#454932] text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold text-sm hover:bg-[#2b2b2b] hover:text-[#d2f000] transition-colors focus-visible:outline-2 focus-visible:outline-[#d2f000]"
                    >
                        <Edit2 className="w-4 h-4" aria-hidden="true" />
                        Cambiar Banner
                    </button>
                </div>

                <div className="absolute -bottom-16 left-4 right-4 sm:left-8 sm:right-8 flex items-end gap-3 sm:gap-4 z-10">
                    <button
                        type="button"
                        onClick={() => setIsTeamModalOpen(true)}
                        aria-label="Cambiar equipo"
                        aria-haspopup="dialog"
                        disabled={isUpdating}
                        className="relative group/avatar shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d2f000] disabled:cursor-wait"
                    >
                        <img
                            src={team?.badgeUrl || "/default-avatar.png"}
                            alt={team ? `Escudo de ${team.name}` : "Sin equipo"}
                            className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#1a1a1a] border-4 border-[#131313] object-contain p-2 relative z-10"
                        />
                        <div className="absolute inset-0 bg-black/70 rounded-full opacity-0 group-hover/avatar:opacity-100 group-focus-visible/avatar:opacity-100 transition-opacity flex items-center justify-center z-20">
                            <Edit2 className="w-6 h-6 text-white" aria-hidden="true" />
                        </div>
                    </button>

                    <div className="mb-2 min-w-0 flex-1">
                        {isEditingUsername ? (
                            <form onSubmit={handleUsernameSubmit} noValidate className="flex flex-col gap-1 max-w-sm">
                                <label htmlFor={usernameFieldId} className="sr-only">
                                    Nombre de usuario
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        id={usernameFieldId}
                                        ref={usernameInputRef}
                                        type="text"
                                        value={usernameDraft}
                                        onChange={(e) => {
                                            setUsernameDraft(e.target.value);
                                            if (usernameError) setUsernameError(null);
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === "Escape") {
                                                e.preventDefault();
                                                closeUsernameEditor();
                                            }
                                        }}
                                        maxLength={USERNAME_MAX_LENGTH}
                                        autoComplete="off"
                                        autoCapitalize="off"
                                        spellCheck={false}
                                        disabled={isUpdating}
                                        aria-invalid={usernameError ? true : undefined}
                                        aria-describedby={usernameError ? usernameErrorId : usernameHintId}
                                        className="min-w-0 flex-1 bg-[#1C1B1B] border border-[#454932] rounded-lg px-3 py-2 text-base font-bold text-[#E5E2E1] placeholder:text-[#909378] focus:outline-none focus:border-[#D2F000] aria-[invalid=true]:border-[#D30017] disabled:opacity-60"
                                    />
                                    <button
                                        type="submit"
                                        disabled={isUpdating}
                                        aria-label="Guardar nombre de usuario"
                                        className="shrink-0 p-2 rounded-lg bg-[#D2F000] text-[#191E00] hover:bg-[#B8D300] transition-colors disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D2F000]"
                                    >
                                        {isUpdating
                                            ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                                            : <Check className="w-4 h-4" aria-hidden="true" />}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={closeUsernameEditor}
                                        disabled={isUpdating}
                                        aria-label="Cancelar edición"
                                        className="shrink-0 p-2 rounded-lg bg-[#2A2A2A] text-[#E5E2E1] hover:bg-[#353534] transition-colors disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D2F000]"
                                    >
                                        <X className="w-4 h-4" aria-hidden="true" />
                                    </button>
                                </div>
                                {usernameError ? (
                                    <p id={usernameErrorId} role="alert" className="text-xs font-medium text-[#FFB4AB]">
                                        {usernameError}
                                    </p>
                                ) : (
                                    <p id={usernameHintId} className="text-xs text-[#C6C9AB]">
                                        {USERNAME_MIN_LENGTH}-{USERNAME_MAX_LENGTH} caracteres: letras, números y guion bajo.
                                    </p>
                                )}
                            </form>
                        ) : (
                            <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2 drop-shadow-md min-w-0">
                                <span className="truncate">{username}</span>
                                <button
                                    ref={editButtonRef}
                                    type="button"
                                    onClick={startEditingUsername}
                                    aria-label="Editar nombre de usuario"
                                    className="shrink-0 text-gray-300 hover:text-[#d2f000] transition-colors bg-black/40 p-1.5 rounded-md backdrop-blur-sm focus-visible:outline-2 focus-visible:outline-[#d2f000]"
                                >
                                    <Edit2 className="w-4 h-4" aria-hidden="true" />
                                </button>
                            </h2>
                        )}
                        {tierConfig?.badge && !isEditingUsername && (
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

            <div className="px-4 sm:px-8 pb-10">
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
