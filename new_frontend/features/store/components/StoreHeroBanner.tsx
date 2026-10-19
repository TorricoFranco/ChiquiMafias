import React from 'react';
import { Flame, Clock } from 'lucide-react';
import { SubscriptionTier } from '@/features/subscriptions/types';
import { useCountdown } from '@/hooks/useCountdown';

export interface HeroInventory {
  megaphones: number;
  pollTickets: number;
  ownedCosmeticIds?: string[];
  activeBannerId?: string;
  activeColorId?: string;
  activeBubbleId?: string;
}

interface StoreHeroBannerProps {
  coins: number;
  inventory: HeroInventory;
  activeSubscription: SubscriptionTier | null;
  promoMessage?: string | null;
  expiresAt?: string | Date | null;
}

export const StoreHeroBanner: React.FC<StoreHeroBannerProps> = ({
  coins,
  inventory,
  activeSubscription,
  promoMessage,
  expiresAt,
}) => {
  const { hours, minutes, seconds } = useCountdown(expiresAt || null);
  const hasActivePromo = Boolean(promoMessage && expiresAt);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1c1b1b] via-[#2a2d15] to-[#131313] border-2 border-[#d2f000]/60 p-6 md:p-8 shadow-[0_0_35px_rgba(210,240,0,0.2)]">
      <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-[#d2f000]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex flex-col gap-2 max-w-2xl">

          {/* BADGES DINÁMICOS DE PROMOCIÓN */}
          <div className="flex flex-wrap items-center gap-2 min-h-[28px]">
            {hasActivePromo && (
              <>
                <span className="bg-[#d2f000] text-[#191e00] text-[11px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider flex items-center gap-1 shadow-sm">
                  <Flame className="w-3.5 h-3.5 fill-[#191e00]" /> {promoMessage}
                </span>
                <span className="bg-[#ffb4ab]/20 text-[#ffb4ab] border border-[#ffb4ab]/40 text-[11px] font-bold px-2.5 py-1 rounded-md uppercase flex items-center gap-1 animate-pulse">
                  <Clock className="w-3.5 h-3.5" /> QUEDAN {hours}H {minutes}M {seconds}S
                </span>
              </>
            )}
          </div>

          <h1 className="text-2xl md:text-4xl font-black text-[#e5e2e1] uppercase tracking-tight leading-none mt-1">
            TIENDA OFICIAL <span className="text-[#d2f000]">CHIQUI MAFIAS</span>
          </h1>
          <p className="text-xs md:text-sm text-[#c6c9ab] leading-relaxed">
            Conseguí ventajas exclusivas, multiplicadores de ganancias y cosméticos únicos. Pagá en Pesos Argentinos ($ARS) por <strong className="text-[#009ee3]">Mercado Pago</strong> o canjeá tus{' '}
            <strong className="text-[#d2f000] inline-flex items-center gap-1 align-middle">
              Chiqui-Coins
              <span className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 inline-block">
                <img
                  src="/icons/chiqui-coin-icon.png"
                  alt="Chiqui Coin"
                  className="w-full h-full object-cover"
                />
              </span>
            </strong>.
          </p>
        </div>

        {/* Balance e inventario */}
        <div className="bg-[#131313]/90 border border-[#353534] p-5 md:p-6 rounded-2xl flex flex-col gap-3 flex-shrink-0 w-full md:w-auto md:min-w-[320px] md:ml-8">
          <span className="text-[11px] text-[#909378] font-bold uppercase tracking-wider">
            Tu Inventario & Saldo
          </span>

          <div className="flex items-center justify-between gap-5">
            {/* Saldo */}
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 inline-flex">
                <img
                  src="/icons/chiqui-coin-icon.png"
                  alt="Chiqui Coin"
                  className="w-full h-full object-cover"
                />
              </span>

              <span className="text-lg text-[#d2f000] font-mono font-black">
                {coins.toLocaleString('es-AR')}
              </span>
            </div>

            <div className="h-8 w-px bg-[#353534]" />

            {/* Inventario */}
            <div className="flex items-center justify-center gap-5">

              {/* Megáfonos */}
              <div
                className="group flex flex-col items-center justify-center cursor-help"
                title="Megáfonos: fijá un mensaje en el chat global para que todos los usuarios lo vean."
              >
                <div className="flex items-center gap-1.5">
                  <div className="relative flex items-center justify-center">
                    <div className="absolute inset-0 bg-[#d2f000]/20 blur-md rounded-full opacity-70 group-hover:opacity-100 transition-opacity" />

                    <img
                      src="/icons/megaphone-icon.png"
                      alt="Megáfonos"
                      className="relative w-8 h-8 object-contain drop-shadow-[0_0_5px_rgba(210,240,0,0.45)] group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(210,240,0,0.7)] transition-all duration-200"
                    />
                  </div>

                  <strong className="text-[#e5e2e1] text-base font-mono font-black">
                    {inventory.megaphones}
                  </strong>
                </div>

                <span className="text-[8px] text-[#909378] font-bold uppercase tracking-wider mt-0.5">
                  Megáfonos
                </span>
              </div>

              <div className="h-9 w-px bg-[#353534]" />

              {/* Encuestas */}
              <div
                className="group flex flex-col items-center justify-center cursor-help"
                title="Encuestas: creá una encuesta de fútbol para que otros usuarios voten y comenten."
              >
                <div className="flex items-center gap-1.5">
                  <div className="relative flex items-center justify-center">
                    <div className="absolute inset-0 bg-[#d2f000]/20 blur-md rounded-full opacity-70 group-hover:opacity-100 transition-opacity" />

                    <img
                      src="/icons/custom-poll-icon.png"
                      alt="Tickets de encuesta"
                      className="relative w-9 h-9 object-contain drop-shadow-[0_0_5px_rgba(210,240,0,0.45)] group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(210,240,0,0.7)] transition-all duration-200"
                    />
                  </div>

                  <strong className="text-[#e5e2e1] text-base font-mono font-black">
                    {inventory.pollTickets}
                  </strong>
                </div>

                <span className="text-[8px] text-[#909378] font-bold uppercase tracking-wider mt-0.5">
                  Encuestas
                </span>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};