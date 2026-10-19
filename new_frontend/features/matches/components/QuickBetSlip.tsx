"use client";

import React, { useState } from "react";

// TODO: Reemplazar con lógica real de apuestas cuando esté disponible
export const QuickBetSlip: React.FC = () => {
  const [selectedOption, setSelectedOption] = useState<string>("BOCA");
  const [selectedMultiplier, setSelectedMultiplier] = useState<number>(1.8);
  const [stakeAmount, setStakeAmount] = useState<string>("");
  const [placedBetSuccess, setPlacedBetSuccess] = useState<boolean>(false);

  const options = [
    { label: "BOCA", odds: 1.8 },
    { label: "EMPATE", odds: 3.2 },
    { label: "RIVER", odds: 3.5 },
  ];

  const handleSelectOption = (label: string, odds: number) => {
    setSelectedOption(label);
    setSelectedMultiplier(odds);
    setPlacedBetSuccess(false);
  };

  const handleClear = () => {
    setStakeAmount("");
    setSelectedOption("BOCA");
    setSelectedMultiplier(1.8);
    setPlacedBetSuccess(false);
  };

  const stakeNumber = parseFloat(stakeAmount) || 0;
  const potentialGain = stakeNumber > 0 ? (stakeNumber * selectedMultiplier).toFixed(2) : "--";

  const handlePlaceBet = () => {
    if (stakeNumber <= 0) return;
    setPlacedBetSuccess(true);
    setTimeout(() => {
      setPlacedBetSuccess(false);
    }, 4000);
  };

  return (
    <div className="flex-1 p-4 py-6 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-['Montserrat',sans-serif] text-sm text-white uppercase tracking-widest font-bold">
            Apuesta Rápida
          </h3>
          <button
            type="button"
            onClick={handleClear}
            className="text-[10px] font-bold text-[#d2f000] underline cursor-pointer hover:opacity-80"
          >
            VACIAR
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <p className="text-xs font-bold text-white uppercase tracking-wider text-left">
            ¿QUIÉN VA A GANAR EL SUPERCLÁSICO?
          </p>

          <div className="grid grid-cols-1 gap-2">
            {options.map((opt) => {
              const isSelected = selectedOption === opt.label;
              return (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => handleSelectOption(opt.label, opt.odds)}
                  className={`flex justify-between items-center p-3 rounded-lg transition-all group cursor-pointer border ${
                    isSelected
                      ? "bg-[#d2f000]/10 border-[#d2f000]"
                      : "bg-[#201f1f] border-[#454932] hover:border-[#d2f000]/40"
                  }`}
                >
                  <span className="text-xs font-bold text-[#e5e2e1]">
                    {opt.label}
                  </span>
                  <span
                    className={`text-xs font-black ${
                      isSelected ? "text-[#d2f000]" : "text-[#c6c9ab]"
                    }`}
                  >
                    X {opt.odds}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-[#c6c9ab] uppercase block text-left">
              MONTO DE APUESTA ($)
            </label>
            <input
              type="number"
              value={stakeAmount}
              onChange={(e) => {
                setStakeAmount(e.target.value);
                setPlacedBetSuccess(false);
              }}
              placeholder="Ingresar monto..."
              className="w-full bg-[#353534] border border-[#454932] rounded-lg py-2 px-3 text-sm text-white focus:border-[#d2f000] focus:outline-none transition-all"
            />
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-[#454932]">
            <span className="text-[10px] font-bold text-[#c6c9ab] uppercase">
              GANANCIA POTENCIAL
            </span>
            <span className="text-sm font-bold text-[#d2f000]">
              ${potentialGain}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div className="flex justify-between items-center text-xs text-[#c6c9ab]">
          <span>Importe total</span>
          <span className="font-bold text-white">
            ${stakeNumber ? stakeNumber.toLocaleString() : "0.00"}
          </span>
        </div>

        {placedBetSuccess ? (
          <div className="w-full bg-green-600 text-white font-bold py-3 rounded-xl text-center shadow-lg text-xs uppercase tracking-wider animate-bounce">
            ¡Apuesta Realizada con Éxito! ⚽🔥
          </div>
        ) : (
          <button
            type="button"
            onClick={handlePlaceBet}
            disabled={stakeNumber <= 0}
            className={`w-full font-bold py-3 rounded-xl transition-all shadow-lg flex flex-col items-center justify-center cursor-pointer ${
              stakeNumber > 0
                ? "bg-[#d30017] hover:scale-[1.02] active:scale-[0.98] text-white"
                : "bg-[#353534] text-[#c6c9ab] cursor-not-allowed opacity-60"
            }`}
          >
            <span className="text-sm uppercase tracking-widest">
              APOSTAR AHORA
            </span>
            <span className="text-[9px] opacity-80 font-medium">
              CONFIRMAR Y ENVIAR
            </span>
          </button>
        )}
      </div>
    </div>
  );
};
