"use client";

import { useState, useEffect } from 'react';
import { betsApi, Market, MarketOption } from '@/services/betsApi';

interface PlaceBetDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  market: Market | null;
  option: MarketOption | null;
  onBetSuccess: () => void; // Para refrescar la grilla principal cuando gane la apuesta
}

export default function PlaceBetDrawer({ isOpen, onClose, market, option, onBetSuccess }: PlaceBetDrawerProps) {
  const [stake, setStake] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Limpiar estados cuando se abre/cierra el drawer con otra opción
  useEffect(() => {
    if (isOpen) {
      setStake('');
      setError(null);
      setSuccess(false);
    }
  }, [isOpen, option]);

  if (!isOpen || !market || !option) return null;

  // --- 🧠 MATEMÁTICA PARI-MUTUEL EN VIVO ---
  const currentTotalPool = market.options.reduce((acc, opt) => acc + opt.totalStaked, 0);
  const numericStake = Number(stake) || 0;

  // Simulamos el nuevo pozo si el usuario mete su stake
  const simulatedTotalPool = currentTotalPool + numericStake;
  const simulatedOptionStaked = option.totalStaked + numericStake;

  // Calculamos la cuota proyectada
  let cuotaProyectada = 0;
  if (simulatedTotalPool > 0 && simulatedOptionStaked > 0) {
    cuotaProyectada = simulatedTotalPool / simulatedOptionStaked;
  } else {
    cuotaProyectada = 100 / option.initialProb;
  }

  // Retorno estimado (Ganancia)
  const estimadoPayout = Math.floor(numericStake * cuotaProyectada);

  // --- HANDLER DE ENVÍO ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numericStake <= 0) {
      setError('El monto de la apuesta debe ser mayor a 0');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Llamada atómica a tu endpoint de NestJS
      await betsApi.placeBet(option.id, numericStake);
      
      setSuccess(true);
      setTimeout(() => {
        onBetSuccess(); // Refresca los mercados en la pantalla principal
        onClose();      // Cierra el drawer
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Hubo un problema al procesar tu apuesta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Backdrop de fondo oscuro */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Contenedor del Drawer lateral */}
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-zinc-900 border-l border-zinc-800 p-6 z-50 shadow-2xl flex flex-col justify-between text-white animate-slide-in">
        
        {/* Cabecera */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
              🎫 Cupón de Apuesta
            </h2>
            <button 
              onClick={onClose}
              className="text-zinc-400 hover:text-white p-1 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition text-sm"
            >
              ✕ Cerrar
            </button>
          </div>

          {/* Información del Evento */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 mb-6">
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded">
              {market.status}
            </span>
            <h3 className="font-bold text-zinc-200 mt-2 text-base">{market.title}</h3>
            
            <div className="mt-4 pt-3 border-t border-zinc-800 flex justify-between items-center">
              <div>
                <p className="text-xs text-zinc-500">Tu selección:</p>
                <p className="font-semibold text-zinc-300">{option.name}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-zinc-500">Cuota Actual:</p>
                <p className="font-mono font-bold text-emerald-400">
                  x{currentTotalPool > 0 && option.totalStaked > 0 
                    ? (currentTotalPool / option.totalStaked).toFixed(2) 
                    : (100 / option.initialProb).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Formulario e Input */}
          {!success ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                  Monto a apostar (Stake)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    placeholder="0 pts"
                    value={stake}
                    onChange={(e) => setStake(e.target.value)}
                    disabled={loading}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 outline-none p-4 rounded-xl font-mono text-lg font-bold text-zinc-100"
                    required
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-zinc-500 font-mono font-bold">
                    PTS
                  </span>
                </div>
              </div>

              {/* Caja de Información Pari-Mutuel Dinámica */}
              {numericStake > 0 && (
                <div className="bg-zinc-950/40 border border-dashed border-zinc-800 rounded-xl p-4 space-y-2 text-xs">
                  <div className="flex justify-between text-zinc-400">
                    <span>Nueva Cuota Proyectada:</span>
                    <span className="font-mono font-bold text-zinc-200">x{cuotaProyectada.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-zinc-800/60">
                    <span className="text-zinc-300 font-medium">Retorno Estimado:</span>
                    <span className="font-mono text-base font-extrabold text-emerald-400">
                      {estimadoPayout} monedas
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-500 italic mt-1 leading-relaxed">
                    * Al ser un sistema Pari-Mutuel, el premio final se define cuando el mercado cierra basándose en el pozo definitivo.
                  </p>
                </div>
              )}

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl text-xs font-semibold">
                  ⚠️ {error}
                </div>
              )}
            </form>
          ) : (
            // Pantalla de Éxito
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 text-center space-y-3 my-8">
              <span className="text-3xl">💎</span>
              <h4 className="font-bold text-emerald-400 text-lg">¡Apuesta Procesada!</h4>
              <p className="text-xs text-zinc-400">Tu stake fue descontado con éxito de tu billetera.</p>
            </div>
          )}
        </div>

        {/* Botón de Acción en el Footer */}
        {!success && (
          <div className="border-t border-zinc-800 pt-4 bg-zinc-900">
            <button
              onClick={handleSubmit}
              disabled={loading || numericStake <= 0}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 p-4 rounded-xl font-bold transition text-center shadow-lg shadow-emerald-500/5 disabled:shadow-none"
            >
              {loading ? 'Procesando Transacción...' : `Confirmar Apuesta de ${numericStake} pts`}
            </button>
          </div>
        )}

      </div>
    </>
  );
}