"use client";

import { useEffect, useState } from "react";
import { storeApi } from "@/services/store";
import { StoreItem } from "@/types/store";
import { useInventoryStore } from "@/store/useInventoryStore";
import { useSubscriptions } from "@/hook/react-query/useSubcriptions";
import { useUserStore } from "@/store/useUserStore";         // ⚡ Tu store de Zustand
import { X, Lock, CheckCircle, Loader2, Tag, Layers, Crown } from "lucide-react";
import { SubscriptionTier } from "@/types/subscription";    // O de donde importes tus enums espejo

type StoreTab = "STICKER_PACK" | "NAME_COLOR" | "BANNER" | "CONSUMIBLES" | "SUBSCRIPTION";

const TYPE_FOLDER_MAP: Record<string, string> = {
    STICKER_PACK: "stickers",
    BANNER: "banners",
    MEGAPHONE: "megaphones",
    CUSTOM_POLL: "polls",
};

// Mapeo visual de los Tiers comerciales para no mostrar "TIER_1" a secas
const TIER_DETAILS_MAP: Record<string, { name: string; color: string }> = {
    TIER_1: { name: "Socio Bronce 🥉", color: "text-amber-600 bg-amber-600/10 border-amber-600/20" },
    TIER_2: { name: "Socio Plata 🥈", color: "text-slate-300 bg-slate-300/10 border-slate-300/20" },
    TIER_3: { name: "Socio Oro ✨ (Chiqui Mafias)", color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" },
};

export default function StoreModal({ onClose }: { onClose: () => void }) {
    const [catalog, setCatalog] = useState<StoreItem[]>([]);
    const [activeTab, setActiveTab] = useState<StoreTab>("STICKER_PACK");
    const [loading, setLoading] = useState(true);
    const [actionId, setActionId] = useState<string | null>(null);

    const { items: inventoryItems, buyStoreItem } = useInventoryStore();

    // ⚡ Zustand: Traemos el tier actual del usuario (ajustá la clave según tu store)
    const currentTier = useUserStore((state) => state.tier || (state as any).tier || null);

    // ⚡ React Query: Traemos la lógica de Mercado Pago y planes
    const {
        plans,
        isLoadingPlans,
        startCheckout,
        isCheckingOut,
        startUpgrade,
        isUpgrading
    } = useSubscriptions();

    useEffect(() => {
        async function loadCatalog() {
            try {
                const items = await storeApi.getStoreItems();
                setCatalog(items);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        loadCatalog();
    }, [inventoryItems]);

    const filteredCatalog = catalog.filter(item => {
        if (activeTab === "CONSUMIBLES") {
            return item.type === "MEGAPHONE" || item.type === "CUSTOM_POLL";
        }
        return item.type === activeTab;
    });

    const handlePurchase = async (item: StoreItem) => {
        try {
            setActionId(item.id);
            await buyStoreItem(item.id, item.currentPrice);
        } catch (err: any) {
            alert(err.message || "Error al procesar la transacción.");
        } finally {
            setActionId(null);
        }
    };

    const getCosmeticImagePath = (item: StoreItem) => {
        const folder = TYPE_FOLDER_MAP[item.type] || `${item.type.toLowerCase()}s`;
        return `/cosmetics/${folder}/${item.assetId}.webp`;
    };

    // ⚡ Helper para calcular jerarquía de Upgrades dinámicamente
    const getTierPower = (tier: string | null) => {
        if (tier === "TIER_1") return 1;
        if (tier === "TIER_2") return 2;
        if (tier === "TIER_3") return 3;
        return 0;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#141414] border border-white/10 rounded-3xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden shadow-2xl">

                {/* Header */}
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                    <div>
                        <h2 className="text-xl font-black uppercase tracking-tight text-white">Mercado de la Tribuna</h2>
                        <p className="text-xs text-gray-400">Personalizá tu presencia en el chat en vivo o hacete socio</p>
                    </div>
                    <button onClick={onClose} className="bg-white/5 hover:bg-white/10 p-2 rounded-full transition-colors">
                        <X className="w-5 h-5 text-white" />
                    </button>
                </div>

                {/* Tabs de Navegación */}
                <div className="flex border-b border-white/5 bg-black/20 p-2 gap-2 overflow-x-auto">
                    {(["STICKER_PACK", "NAME_COLOR", "BANNER", "CONSUMIBLES", "SUBSCRIPTION"] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 min-w-[100px] py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${activeTab === tab ? "bg-sky-600 text-white shadow-lg" : "text-gray-400 hover:text-white hover:bg-white/5"
                                }`}
                        >
                            {tab === "CONSUMIBLES" ? "Consumibles" : tab === "SUBSCRIPTION" ? "Socios 👑" : `${tab.replace("_", " ")}s`}
                        </button>
                    ))}
                </div>

                {/* Cuerpo del catálogo / Planes */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-black/10">

                    {/* VISTA 1: Pestaña de Suscripciones (React Query) */}
                    {activeTab === "SUBSCRIPTION" ? (
                        isLoadingPlans ? (
                            <div className="h-full flex items-center justify-center">
                                <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {plans?.map((plan: any) => {
                                    const isCurrent = currentTier === plan.tier;
                                    const currentPower = getTierPower(currentTier);
                                    const planPower = getTierPower(plan.tier);

                                    // Es upgrade si el plan es mayor al que ya tiene y el usuario ya es socio de algo
                                    const isUpgrade = planPower > currentPower && currentPower > 0;
                                    // Bloqueado si intenta comprar un tier inferior al que ya posee
                                    const isDowngrade = planPower < currentPower;

                                    const tierMeta = TIER_DETAILS_MAP[plan.tier] || { name: plan.name, color: "text-white bg-white/5" };

                                    return (
                                        <div key={plan.tier} className="bg-[#1c1c1c] border border-white/5 rounded-2xl p-5 flex flex-col justify-between hover:border-white/10 transition-all relative overflow-hidden group">
                                            <div>
                                                <div className="flex justify-between items-start mb-3">
                                                    <h3 className="font-black text-base text-white tracking-tight">{tierMeta.name}</h3>
                                                    {isCurrent && (
                                                        <span className="bg-green-500/10 text-green-400 text-[9px] font-black uppercase px-2 py-0.5 rounded border border-green-500/20 tracking-wider">
                                                            Tu Plan
                                                        </span>
                                                    )}
                                                </div>

                                                <p className="text-2xl font-mono font-black text-white">${plan.basePriceARS}<span className="text-xs text-gray-500 font-sans font-normal"> /mes</span></p>

                                                {/* Lista de beneficios ficticios o devueltos por el backend */}
                                                <ul className="text-[11px] text-gray-400 space-y-2 mt-4 border-t border-white/5 pt-4">
                                                    {plan.benefits?.map((b: string, i: number) => (
                                                        <li key={i} className="flex items-start gap-1.5">
                                                            <span className="text-sky-400">•</span> {b}
                                                        </li>
                                                    )) || (
                                                            <>
                                                                <li>• Multiplicador de monedas diarias</li>
                                                                <li>• Color de nombre exclusivo en salas</li>
                                                                <li>• Acceso a encuestas presidenciales</li>
                                                            </>
                                                        )}
                                                </ul>
                                            </div>

                                            <button
                                                disabled={isCurrent || isDowngrade || isCheckingOut || isUpgrading}
                                                onClick={() => isUpgrade ? startUpgrade(plan.tier) : startCheckout(plan.tier)}
                                                className={`w-full py-2.5 rounded-xl font-black text-xs uppercase tracking-wider mt-6 transition flex justify-center items-center gap-1 ${isCurrent
                                                        ? "bg-green-500/10 text-green-500/40 border border-green-500/10 cursor-not-allowed"
                                                        : isDowngrade
                                                            ? "bg-white/5 text-gray-600 cursor-not-allowed line-through"
                                                            : isUpgrade
                                                                ? "bg-gradient-to-r from-sky-500 to-blue-600 hover:opacity-90 text-white shadow-lg"
                                                                : "bg-white text-black hover:bg-gray-200 shadow-md"
                                                    }`}
                                            >
                                                {isCheckingOut || isUpgrading ? (
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                ) : isCurrent ? (
                                                    "Socio Activo"
                                                ) : isDowngrade ? (
                                                    "No disponible"
                                                ) : isUpgrade ? (
                                                    <>Subir de Nivel ⚡</>
                                                ) : (
                                                    <>Asociarme <Crown className="w-3 h-3 ml-0.5" /></>
                                                )}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )

                        /* VISTA 2: Pestaña del catálogo de cosméticos tradicional */
                    ) : loading ? (
                        <div className="h-full flex items-center justify-center">
                            <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
                        </div>
                    ) : filteredCatalog.length === 0 ? (
                        <p className="text-center text-sm text-gray-500 my-12">No hay artículos disponibles en esta categoría.</p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {filteredCatalog.map((item) => {
                                const userInventoryItem = inventoryItems.find(inv => inv.itemId === item.id);
                                const ownedQuantity = userInventoryItem ? userInventoryItem.quantity : 0;
                                const isOwned = ownedQuantity > 0;
                                const isPermanent = item.type === "STICKER_PACK" || item.type === "NAME_COLOR" || item.type === "BANNER";

                                return (
                                    <div key={item.id} className="bg-[#1c1c1c] border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:border-white/10 transition-all group relative overflow-hidden">

                                        {item.isDiscounted && (!isPermanent || !isOwned) && (
                                            <div className="absolute top-2 right-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-md flex items-center gap-1">
                                                <Tag className="w-2.5 h-2.5" />
                                                <span className="text-[9px] font-black uppercase tracking-wider">-{item.discountPercentage}% OFF</span>
                                            </div>
                                        )}

                                        {!isPermanent && isOwned && (
                                            <div className="absolute top-2 left-2 bg-white/5 border border-white/10 text-gray-300 px-2 py-0.5 rounded-md flex items-center gap-1">
                                                <Layers className="w-2.5 h-2.5 text-sky-400" />
                                                <span className="text-[9px] font-black">Tenés: {ownedQuantity}</span>
                                            </div>
                                        )}

                                        <div className="flex items-center gap-4 mb-4 mt-2">
                                            <div className="w-16 h-16 bg-black/40 rounded-xl flex items-center justify-center border border-white/5 overflow-hidden flex-shrink-0">
                                                {item.type === "NAME_COLOR" ? (
                                                    <div className="w-6 h-6 rounded-full shadow-inner border border-white/20" style={{ backgroundColor: item.assetId }} />
                                                ) : (
                                                    <img
                                                        src={getCosmeticImagePath(item)}
                                                        alt={item.name}
                                                        className="w-12 h-12 object-contain"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).src = "/images/cosmetics/fallback.webp";
                                                        }}
                                                    />
                                                )}
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-white leading-tight">{item.name}</h4>
                                                <p className="text-[11px] text-gray-400 line-clamp-2 mt-0.5">{item.description}</p>
                                                {item.isDiscounted && item.discountName && (!isPermanent || !isOwned) && (
                                                    <span className="text-[9px] text-emerald-400/80 font-semibold block mt-0.5">⏱️ {item.discountName}</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                                            <div className="flex flex-col">
                                                {item.isDiscounted && (!isPermanent || !isOwned) ? (
                                                    <>
                                                        <span className="text-[10px] text-gray-500 line-through leading-none">${item.price} ARS</span>
                                                        <span className="text-xs font-black text-emerald-400 leading-tight">${item.currentPrice} ARS</span>
                                                    </>
                                                ) : (
                                                    <span className="text-xs font-black text-amber-400">${item.price} ARS</span>
                                                )}
                                            </div>

                                            {isPermanent && isOwned ? (
                                                <span className="flex items-center gap-1 text-[10px] font-black uppercase text-green-500 bg-green-500/10 px-3 py-1.5 rounded-xl">
                                                    <CheckCircle className="w-3 h-3" /> Adquirido
                                                </span>
                                            ) : (
                                                <button
                                                    disabled={actionId !== null}
                                                    onClick={() => handlePurchase(item)}
                                                    className="bg-white text-black hover:bg-gray-200 text-[10px] font-black uppercase px-4 py-2 rounded-xl transition-all flex items-center gap-1"
                                                >
                                                    {actionId === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Lock className="w-3 h-3" />}
                                                    {!isPermanent && isOwned ? "Comprar más" : "Comprar"}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}