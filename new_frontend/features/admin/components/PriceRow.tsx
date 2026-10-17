"use client";

import React, { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { PriceCurrency } from '../types';

interface PriceRowProps {
    name: string;
    /** Detalle secundario: monedas del pack, tipo del ítem, tier del plan. */
    detail: string;
    currentPrice: number;
    currency: PriceCurrency;
    min: number;
    max: number;
    /** Solo enteros (los precios en monedas son Int en la DB). */
    integerOnly?: boolean;
    isActive: boolean;
    /** Aviso contextual: descuento vigente, plan en $0, rango sugerido. */
    hint?: React.ReactNode;
    isPending: boolean;
    onSave: (price: number) => void;
}

export const formatPrice = (value: number, currency: PriceCurrency) =>
    currency === 'ARS'
        ? `$${value.toLocaleString('es-AR')}`
        : `${value.toLocaleString('es-AR')} monedas`;

export const PriceRow: React.FC<PriceRowProps> = ({
    name,
    detail,
    currentPrice,
    currency,
    min,
    max,
    integerOnly = false,
    isActive,
    hint,
    isPending,
    onSave,
}) => {
    const [draft, setDraft] = useState<string>(String(currentPrice));

    const parsed = Number(draft);
    const isNumber = draft.trim() !== '' && Number.isFinite(parsed);
    // Los precios en monedas son enteros; los de pesos admiten 2 decimales (el DTO
    // del backend usa @IsNumber({ maxDecimalPlaces: 2 })).
    const isWholeOk = integerOnly
        ? Number.isInteger(parsed)
        : Math.round(parsed * 100) === parsed * 100;
    const isInRange = parsed >= min && parsed <= max;
    const hasChanged = parsed !== currentPrice;
    const canSave = isNumber && isWholeOk && isInRange && hasChanged && !isPending;

    const error = !isNumber
        ? 'Ingresá un número'
        : !isWholeOk
            ? integerOnly
                ? 'Tiene que ser un número entero'
                : 'Como máximo 2 decimales'
            : !isInRange
                ? `Entre ${formatPrice(min, currency)} y ${formatPrice(max, currency)}`
                : null;

    const errorId = `price-error-${name.replace(/\s+/g, '-').toLowerCase()}`;
    const showError = hasChanged && !!error;

    return (
        <tr className="hover:bg-[#232323] transition-colors align-top">
            <td className="py-3.5 px-4">
                <span className="font-bold text-[#e5e2e1] block">{name}</span>
                <span className="text-[11px] text-[#909378]">{detail}</span>
                {!isActive && (
                    <span className="ml-2 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#2a2a2a] text-[#909378]">
                        Inactivo
                    </span>
                )}
            </td>

            <td className="py-3.5 px-4 font-mono font-black text-[#d2f000] text-sm whitespace-nowrap">
                {formatPrice(currentPrice, currency)}
            </td>

            <td className="py-3.5 px-4">
                <div className="flex items-center gap-2">
                    <input
                        type="number"
                        aria-label={`Nuevo precio de ${name}`}
                        aria-invalid={showError}
                        aria-describedby={showError ? errorId : undefined}
                        min={min}
                        max={max}
                        step={integerOnly ? 1 : 0.01}
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        className="w-32 bg-[#131313] border border-[#353534] focus:border-[#d2f000] text-xs text-[#e5e2e1] px-3 py-2 rounded-xl outline-none"
                    />
                    <button
                        type="button"
                        aria-label={`Guardar precio de ${name}`}
                        disabled={!canSave}
                        onClick={() => onSave(parsed)}
                        className="px-3 py-2 bg-[#d2f000] hover:bg-[#b8d300] text-[#191e00] font-bold text-xs rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
                    >
                        {isPending ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <Check className="w-3.5 h-3.5" />
                        )}
                        Guardar
                    </button>
                </div>

                {showError && (
                    <p id={errorId} className="text-[11px] text-[#ffb4ab] font-medium mt-1.5">
                        {error}
                    </p>
                )}
                {hint && <div className="text-[11px] text-[#909378] mt-1.5">{hint}</div>}
            </td>
        </tr>
    );
};
