"use client";

import React from 'react';
import { AlertTriangle, Coins, CreditCard, Info, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { useUserStore } from '@/store/useUserStore';
import {
    usePricingOverview,
    useUpdateCoinPackPrice,
    useUpdateStoreItemPrice,
    useUpdateSubscriptionPlanPrice,
} from '../hooks/usePricing';
import { PricingActiveDiscount, PricingStoreItem } from '../types';
import {
    MAX_STORE_DISCOUNT_PERCENTAGE,
    PRICE_LIMITS,
    suggestedRangeFor,
} from '../constants/pricing';
import { PriceRow } from './PriceRow';
import { PriceChangeLogTable } from './PriceChangeLogTable';

/**
 * Descuentos de **tienda** (filas de StoreDiscount) que afectan a un ítem.
 *
 * No es el precio final que paga un hincha: `getApplicableDiscount` del backend
 * arma el pool con tres fuentes antes de tomar los dos más altos — estos, el
 * `storeDiscountPercentage` del plan del usuario y el 5% de los domingos —, y eso
 * depende de quién mira la tienda y de qué día es. Acá se muestra como piso.
 */
const discountPercentageFor = (
    item: PricingStoreItem,
    discounts: PricingActiveDiscount[],
): number => {
    const applicable = discounts.filter((discount) => {
        if (discount.scope === 'ALL') return true;
        if (discount.scope === 'BY_TYPE') return discount.targetType === item.type;
        return discount.targetItemId === item.id;
    });

    const total = applicable
        .map((discount) => discount.percentage)
        .sort((a, b) => b - a)
        .slice(0, 2)
        .reduce((sum, percentage) => sum + percentage, 0);

    return Math.min(total, MAX_STORE_DISCOUNT_PERCENTAGE);
};

const SectionHeader: React.FC<{
    id: string;
    icon: React.ElementType;
    title: string;
    subtitle: string;
}> = ({ id, icon: Icon, title, subtitle }) => (
    <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-[#d2f000]" />
        <h2 id={id} className="text-sm font-black uppercase tracking-tight text-[#e5e2e1]">
            {title}
        </h2>
        <span className="text-[11px] text-[#909378]">{subtitle}</span>
    </div>
);

const TableShell: React.FC<{
    label: string;
    priceLabel: string;
    children: React.ReactNode;
}> = ({ label, priceLabel, children }) => (
    <div className="bg-[#1c1b1b] border border-[#353534] rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
        <table aria-label={label} className="w-full text-left text-xs text-[#e5e2e1]">
            <thead className="bg-[#171717] border-b border-[#353534] text-[10px] uppercase font-bold text-[#909378]">
                <tr>
                    <th className="py-3 px-4">Nombre</th>
                    <th className="py-3 px-4">{priceLabel}</th>
                    <th className="py-3 px-4">Nuevo precio</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-[#353534]/50">{children}</tbody>
        </table>
    </div>
);

export const AdminPricing: React.FC = () => {
    const userRole = useUserStore((state) => state.role);
    const isPresident = userRole === 'PRESIDENT';

    const { data, isLoading, error } = usePricingOverview(isPresident);

    const updatePack = useUpdateCoinPackPrice();
    const updateItem = useUpdateStoreItemPrice();
    const updatePlan = useUpdateSubscriptionPlanPrice();

    // Rechequeo de rol: la pestaña ya está gateada, esto cubre un activeTab forzado.
    if (!isPresident) return null;

    const onSuccess = (message: string) => toast.success(message);
    const onError = (err: unknown) => toast.error((err as Error).message);

    if (isLoading) {
        return (
            <p className="text-xs text-[#909378] bg-[#1c1b1b] border border-[#353534] rounded-2xl p-4">
                Cargando precios…
            </p>
        );
    }

    if (error || !data) {
        return (
            <p role="alert" className="text-xs text-[#ffb4ab] bg-[#1c1b1b] border border-red-500/30 rounded-2xl p-4">
                {(error as Error)?.message || 'No se pudieron cargar los precios.'}
            </p>
        );
    }

    return (
        <div className="flex flex-col gap-8">

            <div className="flex items-start gap-3 bg-[#1c1b1b] border border-[#454932] rounded-2xl p-4">
                <Info className="w-4 h-4 text-[#d2f000] shrink-0 mt-0.5" />
                <div className="text-[11px] text-[#c6c9ab] leading-relaxed">
                    <p className="font-bold text-[#e5e2e1] mb-1">Solo vos podés cambiar estos precios.</p>
                    <p>
                        Un cambio <strong>no</strong> afecta las órdenes de Mercado Pago ya generadas ni las
                        renovaciones de suscripciones ya autorizadas: esas siguen al precio con el que se
                        crearon. Aplica a las compras, altas y upgrades nuevos. Cada cambio queda registrado
                        en el historial de abajo.
                    </p>
                </div>
            </div>

            <section aria-labelledby="pricing-packs-title" className="flex flex-col gap-3">
                <SectionHeader
                    id="pricing-packs-title"
                    icon={Coins}
                    title="Packs de ChiquiCoins"
                    subtitle="precio en pesos"
                />
                <TableShell label="Packs de ChiquiCoins" priceLabel="Precio actual">
                    {data.coinPacks.map((pack) => (
                        <PriceRow
                            // El precio va en la key: si cambia en el servidor, la fila
                            // se remonta y el borrador arranca del valor nuevo.
                            key={`${pack.id}:${pack.priceARS}`}
                            name={pack.name}
                            detail={`${pack.coinsAmount.toLocaleString('es-AR')} monedas${pack.bonusCoins > 0 ? ` + ${pack.bonusCoins.toLocaleString('es-AR')} de regalo` : ''}`}
                            currentPrice={pack.priceARS}
                            currency="ARS"
                            min={PRICE_LIMITS.COIN_PACK.MIN}
                            max={PRICE_LIMITS.COIN_PACK.MAX}
                            isActive={pack.isActive}
                            isPending={updatePack.isPending && updatePack.variables?.id === pack.id}
                            hint={`Referencia: ${(pack.coinsAmount + pack.bonusCoins).toLocaleString('es-AR')} monedas valen $${((pack.coinsAmount + pack.bonusCoins) * data.coinValueARS).toLocaleString('es-AR')}`}
                            onSave={(priceARS) =>
                                updatePack.mutate(
                                    { id: pack.id, priceARS },
                                    { onSuccess: (res) => onSuccess(res.message), onError },
                                )
                            }
                        />
                    ))}
                </TableShell>
            </section>

            <section aria-labelledby="pricing-items-title" className="flex flex-col gap-3">
                <SectionHeader
                    id="pricing-items-title"
                    icon={ShoppingBag}
                    title="Recompensas de la tienda"
                    subtitle="precio en monedas"
                />
                <TableShell label="Recompensas de la tienda" priceLabel="Precio actual">
                    {data.storeItems.map((item) => {
                        const percentage = discountPercentageFor(item, data.activeDiscounts);
                        // Mismo redondeo que el backend: descuenta el monto, no el precio final.
                        const effective = Math.max(
                            0,
                            item.price - Math.round(item.price * (percentage / 100)),
                        );

                        return (
                            <PriceRow
                                key={`${item.id}:${item.price}`}
                                name={item.name}
                                detail={item.type}
                                currentPrice={item.price}
                                currency="COINS"
                                min={PRICE_LIMITS.STORE_ITEM.MIN}
                                max={PRICE_LIMITS.STORE_ITEM.MAX}
                                integerOnly
                                isActive={item.isActive}
                                isPending={updateItem.isPending && updateItem.variables?.id === item.id}
                                hint={
                                    <>
                                        <span>
                                            {suggestedRangeFor(item.type)} · equivale a $
                                            {(item.price * data.coinValueARS).toLocaleString('es-AR')}
                                        </span>
                                        {percentage > 0 && (
                                            <span className="block text-[#ffb4ab] font-medium mt-0.5">
                                                Descuento de tienda vigente −{percentage}%: queda en{' '}
                                                {effective.toLocaleString('es-AR')} monedas como máximo
                                                (un suscriptor o un domingo paga menos)
                                            </span>
                                        )}
                                    </>
                                }
                                onSave={(price) =>
                                    updateItem.mutate(
                                        { id: item.id, price },
                                        { onSuccess: (res) => onSuccess(res.message), onError },
                                    )
                                }
                            />
                        );
                    })}
                </TableShell>
            </section>

            <section aria-labelledby="pricing-plans-title" className="flex flex-col gap-3">
                <SectionHeader
                    id="pricing-plans-title"
                    icon={CreditCard}
                    title="Planes de suscripción"
                    subtitle="precio base en pesos"
                />
                <div className="flex items-start gap-2 text-[11px] text-[#c6c9ab]">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#ffb4ab] shrink-0 mt-0.5" />
                    <span>
                        El precio base también define el orden de la grilla de planes y el bono en monedas
                        que recibe quien hace un upgrade desde ese plan.
                    </span>
                </div>
                <TableShell label="Planes de suscripción" priceLabel="Precio base actual">
                    {data.subscriptionPlans.map((plan) => (
                        <PriceRow
                            key={`${plan.id}:${plan.basePriceARS}`}
                            name={plan.name}
                            detail={plan.tier}
                            currentPrice={plan.basePriceARS}
                            currency="ARS"
                            min={PRICE_LIMITS.SUBSCRIPTION_PLAN.MIN}
                            max={PRICE_LIMITS.SUBSCRIPTION_PLAN.MAX}
                            isActive={plan.isActive}
                            isPending={updatePlan.isPending && updatePlan.variables?.id === plan.id}
                            hint={
                                plan.basePriceARS < PRICE_LIMITS.SUBSCRIPTION_PLAN.MIN ? (
                                    <span className="text-[#ffb4ab] font-bold">
                                        Plan en $0: Mercado Pago rechaza el checkout hasta que le pongas precio.
                                    </span>
                                ) : undefined
                            }
                            onSave={(basePriceARS) =>
                                updatePlan.mutate(
                                    { id: plan.id, basePriceARS },
                                    { onSuccess: (res) => onSuccess(res.message), onError },
                                )
                            }
                        />
                    ))}
                </TableShell>
            </section>

            <PriceChangeLogTable changes={data.recentChanges} />
        </div>
    );
};
