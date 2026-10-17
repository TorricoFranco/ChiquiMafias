"use client";

import React from 'react';
import { History } from 'lucide-react';
import { PriceChangeLogEntry, PricedEntity } from '../types';
import { formatPrice } from './PriceRow';

const ENTITY_LABELS: Record<PricedEntity, string> = {
    COIN_PACK: 'Pack de monedas',
    STORE_ITEM: 'Tienda',
    SUBSCRIPTION_PLAN: 'Suscripción',
};

interface PriceChangeLogTableProps {
    changes: PriceChangeLogEntry[];
}

export const PriceChangeLogTable: React.FC<PriceChangeLogTableProps> = ({ changes }) => {
    return (
        <section aria-labelledby="pricing-history-title" className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-[#d2f000]" />
                <h2 id="pricing-history-title" className="text-sm font-black uppercase tracking-tight text-[#e5e2e1]">
                    Historial de cambios
                </h2>
                <span className="text-[11px] text-[#909378]">últimos {changes.length}</span>
            </div>

            {changes.length === 0 ? (
                <p className="text-xs text-[#909378] bg-[#1c1b1b] border border-[#353534] rounded-2xl p-4">
                    Todavía no se cambió ningún precio.
                </p>
            ) : (
                <div className="bg-[#1c1b1b] border border-[#353534] rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
                    <table
                        aria-label="Historial de cambios de precio"
                        className="w-full text-left text-xs text-[#e5e2e1]"
                    >
                        <thead className="bg-[#171717] border-b border-[#353534] text-[10px] uppercase font-bold text-[#909378]">
                            <tr>
                                <th className="py-3 px-4">Fecha</th>
                                <th className="py-3 px-4">Tipo</th>
                                <th className="py-3 px-4">Nombre</th>
                                <th className="py-3 px-4">Antes</th>
                                <th className="py-3 px-4">Después</th>
                                <th className="py-3 px-4">Quién</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#353534]/50">
                            {changes.map((change) => (
                                <tr key={change.id} className="hover:bg-[#232323] transition-colors">
                                    <td className="py-3 px-4 text-[#909378] whitespace-nowrap">
                                        {new Date(change.createdAt).toLocaleString('es-AR', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: '2-digit',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </td>
                                    <td className="py-3 px-4 text-[#c6c9ab]">{ENTITY_LABELS[change.entity]}</td>
                                    <td className="py-3 px-4 font-bold">{change.entityName}</td>
                                    <td className="py-3 px-4 font-mono text-[#909378] line-through whitespace-nowrap">
                                        {formatPrice(change.oldPrice, change.currency)}
                                    </td>
                                    <td className="py-3 px-4 font-mono font-black text-[#d2f000] whitespace-nowrap">
                                        {formatPrice(change.newPrice, change.currency)}
                                    </td>
                                    <td className="py-3 px-4 text-[#c6c9ab]">@{change.changedByUsername}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
};
