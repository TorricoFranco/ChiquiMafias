import React, { useMemo } from 'react';
import { Crown, ShieldCheck, CheckCircle2, Loader2, Lock, Flame } from 'lucide-react';
import { SubscriptionTier, SubscriptionPlanDto } from '../types/index';
import { TIER_UI_CONFIG } from '../../auth/constants/ROLES_SUBSCRIPTION';
import { useUserStore } from '@/store/useUserStore';

const TIER_WEIGHTS: Record<SubscriptionTier, number> = {
  [SubscriptionTier.NONE]: 0,
  [SubscriptionTier.TIER_1]: 1,
  [SubscriptionTier.TIER_2]: 2,
  [SubscriptionTier.TIER_3]: 3,
};

interface SubscriptionTabProps {
  plans: SubscriptionPlanDto[];
  isLoading: boolean;
  isProcessing: boolean;
  onSubscribe: (tier: SubscriptionTier, isUpgrade: boolean) => void;
}

export const SubscriptionTab: React.FC<SubscriptionTabProps> = ({
  plans,
  isLoading,
  isProcessing,
  onSubscribe,
}) => {
  const userStoreTier = useUserStore((state) => state.tier);

  const currentPlanTier = useMemo(() => {
    const activePlan = plans.find((p) => p.isCurrent);
    if (activePlan) return activePlan.tier;

    return userStoreTier || SubscriptionTier.NONE;
  }, [plans, userStoreTier]);

  const currentTierWeight = TIER_WEIGHTS[currentPlanTier];

  if (isLoading) {
    return (
      <div className="flex justify-center p-10">
        <Loader2 className="animate-spin text-[#d2f000] w-8 h-8" />
      </div>
    );
  }

  if (!plans || plans.length === 0) {
    return (
      <p className="text-center text-[#909378] py-8">
        No hay planes de suscripción disponibles en este momento.
      </p>
    );
  }

  return (
    <section className="flex flex-col gap-6 animate-in fade-in duration-300">
      <div className="flex flex-col gap-1">
        <h2 className="font-extrabold text-xl md:text-2xl text-[#e5e2e1] uppercase tracking-tight flex items-center gap-2">
          SUSCRIPCIONES EXCLUSIVAS
        </h2>
        <p className="text-xs text-[#c6c9ab]">
          Aumentá tus ganancias en apuestas y obtené insignias VIP en la plataforma.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {plans.map((plan, index) => {
          const uiConfig = TIER_UI_CONFIG[plan.tier];

          // Fallbacks
          const isPopular = Boolean(
            uiConfig?.popularTag || plan.tier === SubscriptionTier.TIER_2 || index === 1
          );
          const isVip = Boolean(
            uiConfig?.vipTag || plan.tier === SubscriptionTier.TIER_3 || index === 2
          );

          const isCurrentPlan = plan.isCurrent || plan.tier === currentPlanTier;
          const planWeight = TIER_WEIGHTS[plan.tier];

          const isDowngrade =
            !isCurrentPlan && currentTierWeight > 0 && planWeight < currentTierWeight;
          const isUpgrade =
            !isCurrentPlan && currentTierWeight > 0 && planWeight > currentTierWeight;

          const transitionKey = `${currentPlanTier}_TO_${plan.tier}`;
          const upgradeCoinsPerDay = plan.upgradeRules
            ? plan.upgradeRules[transitionKey] || 0
            : 0;

          const badgeColor =
            uiConfig?.badgeColor || (isPopular ? '#d2f000' : isVip ? '#e5e2e1' : '#909378');

          return (
            <div
              key={plan.id}
              className={`relative bg-[#1c1b1b] border rounded-2xl p-6 flex flex-col justify-between transition-all duration-300 ${isCurrentPlan
                ? 'border-[#d2f000] shadow-[0_0_25px_rgba(210,240,0,0.15)] ring-1 ring-[#d2f000]/50'
                : isPopular
                  ? 'border-[#d2f000] shadow-[0_0_30px_rgba(210,240,0,0.2)] scale-[1.02]'
                  : isVip
                    ? 'border-[#e5e2e1]/80 shadow-[0_0_30px_rgba(229,226,225,0.15)]'
                    : 'border-[#353534] hover:border-[#454932]'
                } ${isDowngrade ? 'opacity-70 grayscale-[30%]' : ''}`}
            >
              {/* Badges superiores contextuales */}
              {isPopular && !isCurrentPlan && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#d2f000] text-[#191e00] font-black text-[10px] px-3 py-1 rounded-full uppercase tracking-wider shadow-md whitespace-nowrap">
                  MÁS VENDIDO
                </div>
              )}

              {isVip && !isCurrentPlan && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 to-yellow-200 text-[#191e00] font-black text-[10px] px-3 py-1 rounded-full uppercase tracking-wider shadow-md flex items-center gap-1 whitespace-nowrap">
                  <Crown className="w-3 h-3 fill-[#191e00]" /> NIVEL LEYENDA
                </div>
              )}

              {isCurrentPlan && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#d2f000] text-[#191e00] font-black text-[10px] px-3 py-1 rounded-full uppercase tracking-wider shadow-md flex items-center gap-1 whitespace-nowrap">
                  <CheckCircle2 className="w-3 h-3 stroke-[3]" /> TU PLAN ACTUAL
                </div>
              )}

              <div className="flex flex-col gap-4 mt-2">
                {/* Plan Header */}
                <div className="flex flex-col gap-2 border-b border-[#353534] pb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span
                        className="text-[10px] font-extrabold px-2.5 py-0.5 rounded tracking-widest uppercase inline-block mb-1"
                        style={{
                          backgroundColor: `${badgeColor}20`,
                          color: badgeColor,
                          border: `1px solid ${badgeColor}40`,
                        }}
                      >
                        {uiConfig?.badge || plan.name}
                      </span>
                      <h3 className="font-extrabold text-2xl text-[#e5e2e1]">{plan.name}</h3>
                    </div>
                  </div>

                  {plan.pricing.discountPercentage > 0 && (
                    <div className="flex items-center">
                      <span className="bg-[#ffb4ab]/10 text-[#ffb4ab] border border-[#ffb4ab]/30 text-[10px] font-black px-2.5 py-1 rounded-md uppercase flex items-center gap-1.5 w-fit shadow-sm">
                        <Flame className="w-3.5 h-3.5 fill-[#ffb4ab]/50" />
                        {plan.pricing.promoMessage}
                      </span>
                    </div>
                  )}
                </div>

                {/* Pricing */}
                <div className="flex flex-col">
                  {plan.pricing.basePriceARS > plan.pricing.discountedPriceARS && (
                    <span className="text-xs text-[#909378] line-through font-mono">
                      ${plan.pricing.basePriceARS.toLocaleString('es-AR')} ARS / mes
                    </span>
                  )}
                  <div className="flex items-baseline gap-1">
                    <span className="font-black text-3xl md:text-4xl text-[#d2f000] font-mono">
                      ${plan.pricing.discountedPriceARS.toLocaleString('es-AR')}
                    </span>
                    <span className="text-xs font-bold text-[#c6c9ab]">ARS / mes</span>
                  </div>
                  <p className="text-[11px] text-[#009ee3] font-semibold mt-1 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Pago automático vía Mercado Pago
                  </p>
                </div>

                {/* Bonus mensual */}
                {uiConfig?.bonusCoins && (
                  <div className="bg-[#131313] border border-[#353534] p-3 rounded-xl flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#c6c9ab]">Regalo mensual:</span>
                    <span className="font-mono font-bold text-sm text-[#d2f000] flex items-center gap-1">
                      +{uiConfig.bonusCoins.toLocaleString('es-AR')}
                    </span>
                  </div>
                )}

                {/* Banner Bono Upgrade */}
                {isUpgrade && upgradeCoinsPerDay > 0 && (
                  <div className="bg-gradient-to-r from-[#d2f000]/10 to-transparent border border-[#d2f000]/30 p-3 rounded-xl mt-2 animate-in fade-in slide-in-from-bottom-2">
                    <span className="text-[10px] font-black text-[#d2f000] uppercase tracking-wider flex items-center gap-1.5 mb-1">
                      🎁 Bono Exclusivo por Upgrade
                    </span>

                    <p className="text-xs text-[#c6c9ab] leading-snug">
                      Te reintegramos{' '}
                      <span className="text-[#d2f000] font-mono font-bold inline-flex items-center gap-0.5 align-middle">
                        <span className="w-4 h-4 rounded-full overflow-hidden flex-shrink-0 inline-flex">
                          <img
                            src="/icons/chiqui-coin-icon.png"
                            alt="Chiqui Coin"
                            className="w-full h-full object-cover"
                          />
                        </span>
                        {upgradeCoinsPerDay}
                      </span>{' '}
                      por cada día que te sobre de tu plan actual.
                    </p>
                  </div>
                )}

                {/* Listado de Beneficios */}
                <div className="flex flex-col gap-2.5 my-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#909378]">
                    Beneficios incluidos:
                  </span>
                  {plan.benefits.map((benefit, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-[#e5e2e1]">
                      <CheckCircle2 className="w-4 h-4 text-[#d2f000] flex-shrink-0 mt-0.5" />
                      <span>{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Botones y Estados de Acción */}
              <div className="pt-4 border-t border-[#353534] mt-4">
                {isCurrentPlan ? (
                  <div className="w-full bg-[#d2f000]/10 border border-[#d2f000]/40 text-[#d2f000] font-extrabold text-xs py-3.5 rounded-xl text-center uppercase tracking-wider flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    PLAN ACTIVO
                  </div>
                ) : isDowngrade ? (
                  <div className="w-full flex items-center justify-center gap-2 bg-[#2a2a2a] text-[#707070] font-bold text-xs py-3.5 rounded-xl uppercase tracking-wider cursor-not-allowed">
                    <Lock className="w-4 h-4" />
                    PLAN INFERIOR
                  </div>
                ) : (
                  <button
                    onClick={() => onSubscribe(plan.tier, isUpgrade)}
                    disabled={isProcessing}
                    className={`w-full font-black text-xs py-3.5 rounded-xl transition-all uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-95 disabled:opacity-50 ${isUpgrade
                      ? 'bg-gradient-to-r from-[#d2f000] to-[#b8d300] text-[#191e00] shadow-[0_0_20px_rgba(210,240,0,0.4)]'
                      : isPopular
                        ? 'bg-[#d2f000] text-[#191e00] hover:bg-[#b8d300]'
                        : isVip
                          ? 'bg-[#009ee3] text-white hover:bg-[#0086c3]'
                          : 'bg-[#353534] hover:bg-[#2a2a2a] text-[#e5e2e1]'
                      }`}
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="w-4 h-4" />
                    )}
                    <span>
                      {isProcessing
                        ? 'PROCESANDO...'
                        : isUpgrade
                          ? 'MEJORAR PLAN'
                          : 'SUSCRIBIRSE'}
                    </span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}