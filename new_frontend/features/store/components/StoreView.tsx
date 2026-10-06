import React, { useState } from 'react';
import { Crown, Zap, ShoppingBag, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { StoreHeroBanner } from './StoreHeroBanner';
import { SubscriptionTab } from '@/features/subscriptions/components/SubscriptionTab';
import { CoinPacksTab } from './CoinPacksTab';
import { CosmeticsTab } from './CosmeticsTab';

import { useUserStore } from '@/store/useUserStore';
import { useUserInventory } from '@/features/inventory/hooks/useInventory';
import { useStoreItems, useBuyItem } from '../hooks/useStore';
import { useBuyCoinPack, useGetCoinPacks } from '@/features/coins-shop/hooks/useCoins-shop';
import { StoreItem } from '../types';
import { useSubscriptions } from '@/features/subscriptions/hooks/useSubcriptions';
import { SubscriptionTier, SubscriptionPlanDto } from '@/features/subscriptions/types';

export const StoreView: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'suscripciones' | 'coins' | 'cosmeticos'>('suscripciones');

    const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
    const [itemToBuy, setItemToBuy] = useState<StoreItem | null>(null);
    const [quantityToBuy, setQuantityToBuy] = useState<number>(1);
    const [purchaseError, setPurchaseError] = useState<string | null>(null);
    const [purchaseSuccess, setPurchaseSuccess] = useState<boolean>(false);

    const {
        plans,
        isLoadingPlans,
        startCheckout,
        isCheckingOut,
        startUpgrade,
        isUpgrading,
    } = useSubscriptions();

    const {
        balance,
        tier,
        activeBannerId,
        activeNameColorId,
        activeChatBubbleId,
        team,
    } = useUserStore();


    const { data: storeData } = useStoreItems();
    const { data: inventoryData } = useUserInventory();
    const { mutateAsync: buyItem, isPending: isBuying } = useBuyItem();

    const { data: coinPacks } = useGetCoinPacks();
    const { mutateAsync: buyCoinPack } = useBuyCoinPack();  

    const handleSubscribe = (targetTier: SubscriptionTier, isUpgrade: boolean) => {
        if (isUpgrade) {
            startUpgrade(targetTier);
        } else {
            startCheckout(targetTier);
        }
    };

    const handleBuyCoinPack = async (packId: string) => {
        try {
            await buyCoinPack(packId);
        } catch (error) {
            toast.error(error instanceof Error && error.message ? error.message : 'No pudimos iniciar el pago. Probá de nuevo.');
        }
    };

    const handleBuyCosmetic = (item: StoreItem, quantity: number = 1) => {
        setItemToBuy(item);
        setQuantityToBuy(quantity);
        setPurchaseError(null);
        setPurchaseSuccess(false);
        setPurchaseModalOpen(true);
    };

    const confirmPurchase = async () => {
        if (!itemToBuy) return;

        setPurchaseError(null);
        try {
            await buyItem({
                itemId: itemToBuy.id,
                price: itemToBuy.currentPrice,
                quantity: quantityToBuy,
            });
            setPurchaseSuccess(true);

            setTimeout(() => {
                setPurchaseModalOpen(false);
                setItemToBuy(null);
                setPurchaseSuccess(false);
            }, 1500);
        } catch (error: any) {
            setPurchaseError(error.message || 'Hubo un error al procesar la compra.');
        }
    };

    const totalMegaphones = inventoryData?.megaphones?.reduce((sum, inv) => sum + (inv.quantity || 1), 0) || 0;
    const totalTickets = inventoryData?.customPolls?.reduce((sum, inv) => sum + (inv.quantity || 1), 0) || 0;
    const ownedIds = inventoryData?.all?.map((inv) => inv.itemId) || [];

    const totalCost = itemToBuy ? itemToBuy.currentPrice * quantityToBuy : 0;
    const hasEnoughCoins = balance >= totalCost;

    const vipPlan = plans?.find((p: SubscriptionPlanDto) => p.tier === SubscriptionTier.TIER_3);

    const globalPromoMessage = vipPlan?.pricing.discountPercentage > 0
        ? vipPlan.pricing.promoMessage
        : null;

    const globalExpiresAt = vipPlan?.pricing.expiresAt || null;

    return (
        <div className="flex flex-col gap-8 pb-10">
            <StoreHeroBanner
                coins={balance}
                inventory={{
                    megaphones: totalMegaphones,
                    pollTickets: totalTickets,
                    ownedCosmeticIds: ownedIds,
                    activeBannerId: activeBannerId || undefined,
                    activeColorId: activeNameColorId || undefined,
                    activeBubbleId: activeChatBubbleId || undefined,
                }}
                activeSubscription={tier !== 'NONE' ? (tier as SubscriptionTier) : null}
                promoMessage={globalPromoMessage}
                expiresAt={globalExpiresAt}
            />

            <div role="tablist" className="flex flex-wrap items-center gap-3 border-b border-[#353534] pb-4">
                <button
                    role="tab"
                    aria-selected={activeTab === 'suscripciones'}
                    onClick={() => setActiveTab('suscripciones')}
                    className={`h-12 px-5 rounded-xl font-extrabold text-xs md:text-sm uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'suscripciones'
                        ? 'bg-[#d2f000] text-[#191e00] shadow-[0_0_15px_rgba(210,240,0,0.3)] scale-[1.02]'
                        : 'bg-[#1c1b1b] text-[#c6c9ab] border border-[#353534] hover:text-[#e5e2e1]'
                        }`}
                >
                    <Crown className="w-4 h-4" />
                    <span>Suscripciones VIP (Mercado Pago $ARS)</span>
                </button>
                <button
                    role="tab"
                    aria-selected={activeTab === 'coins'}
                    onClick={() => setActiveTab('coins')}
                    className={`h-12 px-5 rounded-xl font-extrabold text-xs md:text-sm uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'coins'
                        ? 'bg-[#009ee3] text-white shadow-[0_0_15px_rgba(0,158,227,0.3)] scale-[1.02]'
                        : 'bg-[#1c1b1b] text-[#c6c9ab] border border-[#353534] hover:text-[#e5e2e1]'
                        }`}
                >
                    <Zap className="w-4 h-4" />
                    <span>Packs Chiqui-Coins ($ARS)</span>
                </button>
                <button
                    role="tab"
                    aria-selected={activeTab === 'cosmeticos'}
                    onClick={() => setActiveTab('cosmeticos')}
                    className={`h-12 px-5 rounded-xl font-extrabold text-xs md:text-sm uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'cosmeticos'
                        ? 'bg-[#353534] text-[#d2f000] border border-[#d2f000] shadow-[0_0_15px_rgba(210,240,0,0.2)] scale-[1.02]'
                        : 'bg-[#1c1b1b] text-[#c6c9ab] border border-[#353534] hover:text-[#e5e2e1]'
                        }`}
                >
                    <ShoppingBag className="w-4 h-4 text-[#d2f000]" />
                    <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                        <img
                            src="/icons/chiqui-coin-icon.png"
                            alt=""
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <span>Cosméticos & Consumibles</span>
                </button>
            </div>

            {activeTab === 'suscripciones' && (
                <SubscriptionTab
                    plans={plans || []}
                    isLoading={isLoadingPlans}
                    isProcessing={isCheckingOut || isUpgrading}
                    onSubscribe={handleSubscribe}
                />
            )}

            {activeTab === 'coins' && (
                <CoinPacksTab
                    packs={coinPacks || []}
                    onBuyPack={handleBuyCoinPack}
                />
            )}

            {activeTab === 'cosmeticos' && (
                <CosmeticsTab
                    items={storeData?.all || []}
                    onBuyCosmetic={handleBuyCosmetic}
                    onEquipCosmetic={() => { }}
                    team={team}
                />
            )}

            {/* MODAL DE COMPRA DE COSMÉTICOS (NO TOCA MP) */}
            {purchaseModalOpen && itemToBuy && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-label="Confirmar Compra"
                        className="bg-[#1c1b1b] border border-[#353534] p-6 rounded-2xl w-full max-w-sm flex flex-col gap-5 shadow-2xl"
                    >
                        <div className="flex flex-col gap-1">
                            <h3 className="font-extrabold text-xl text-white">Confirmar Compra</h3>
                            <p className="text-sm text-[#c6c9ab]">
                                Estás por adquirir <strong className="text-white">{quantityToBuy}x {itemToBuy.name}</strong>.
                            </p>
                        </div>

                        <div className="bg-[#131313] p-4 rounded-xl border border-[#2a2a2a] flex justify-between items-center">
                            <span className="text-xs font-bold text-[#909378] uppercase">Costo total</span>
                            <div className="font-mono font-black text-lg text-[#d2f000] flex items-center gap-1.5 whitespace-nowrap">
                                <div className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0">
                                    <img
                                        src="/icons/chiqui-coin-icon.png"
                                        alt="Chiqui Coin"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <span>{totalCost}</span>
                            </div>
                        </div>

                        {purchaseSuccess ? (
                            <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400">
                                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                                <p className="text-xs font-bold">¡Compra exitosa! Revisa tu inventario.</p>
                            </div>
                        ) : !hasEnoughCoins ? (
                            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                <p className="text-xs font-bold">No tenés las monedas suficientes para esta compra.</p>
                            </div>
                        ) : purchaseError ? (
                            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                <p className="text-xs font-bold">{purchaseError}</p>
                            </div>
                        ) : null}

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => {
                                    setPurchaseModalOpen(false);
                                    setItemToBuy(null);
                                }}
                                disabled={isBuying || purchaseSuccess}
                                className="flex-1 py-3 rounded-xl font-bold text-xs bg-[#2a2a2a] text-white hover:bg-[#353534] transition-colors disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmPurchase}
                                disabled={!hasEnoughCoins || isBuying || purchaseSuccess}
                                className="flex-1 py-3 rounded-xl font-black text-xs bg-[#d2f000] text-[#191e00] hover:bg-[#b8d300] disabled:bg-[#2a2a2a] disabled:text-[#666] disabled:cursor-not-allowed transition-all flex items-center justify-center"
                            >
                                {isBuying ? 'Procesando...' : purchaseSuccess ? '¡Listo!' : 'Aceptar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};