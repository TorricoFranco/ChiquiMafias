"use client";
import { AnnualRow } from "@/lib/mocks";
import { Star } from "lucide-react";
import { getRowStylingAnnual } from "../functions/getRowStylingAnnual";
import { getQualificationBadge } from "../functions/getQualificationBadge";
import { getRelegationBadge } from "../functions/getRelegationBadge";


/**
 * Tabla Anual (Acumulada)
 */
export const AnnualTable: React.FC<{ data: AnnualRow[] }> = ({ data }) => {
    // Componente se mantiene igual...
    return (
        <div className="bg-gray-800 p-4 rounded-xl shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center border-b border-gray-700 pb-2">
                <Star className="w-5 h-5 mr-2 text-yellow-400" /> Tabla Anual (Acumulada)
            </h3>
            
            <div className="overflow-x-auto custom-scrollbar-horizontal">
                <table className="min-w-full divide-y divide-gray-700 text-sm">
                    <thead className="bg-gray-700/50">
                        <tr>
                            <th className="px-3 py-2 text-center">Pos</th>
                            <th className="px-3 py-2 text-left">Equipo</th>
                            <th className="px-3 py-2 text-center hidden md:table-cell">PJ</th>
                            <th className="px-3 py-2 text-center hidden sm:table-cell">G</th>
                            <th className="px-3 py-2 text-center hidden sm:table-cell">DG</th>
                            <th className="px-3 py-2 text-center">Pts</th>
                            <th className="px-3 py-2 text-left hidden lg:table-cell">Clasificación</th>
                            <th className="px-3 py-2 text-left hidden lg:table-cell">Descenso</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700/50">
                        {data.map((row) => (
                            <tr key={row.teamId} className={`border-b border-gray-700 transition duration-150 ${getRowStylingAnnual(row)}`}>
                                <td className="px-3 py-2 text-center font-bold">{row.pos}</td>
                                <td className="px-3 py-2 font-semibold text-left">{row.teamName}</td>
                                <td className="px-3 py-2 text-center text-gray-300 hidden md:table-cell">{row.played_total}</td>
                                <td className="px-3 py-2 text-center text-green-400 font-medium hidden sm:table-cell">{row.wins_total}</td>
                                <td className="px-3 py-2 text-center font-bold hidden sm:table-cell">{row.gd_total}</td>
                                <td className="px-3 py-2 text-center bg-gray-600/50 font-extrabold text-lg text-yellow-300">{row.pts_total}</td>
                                <td className="px-3 py-2 text-left hidden lg:table-cell">
                                    <div className="flex items-center gap-2 text-sm whitespace-nowrap">
                                        {getQualificationBadge(row.qualification)}
                                    </div>
                                </td>
                                <td className="px-3 py-2 text-left hidden lg:table-cell">
                                    <div className="flex items-center gap-2 whitespace-nowrap">
                                        {getRelegationBadge(row.relegation_flag)}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="mt-4 p-2 text-xs text-gray-500 border-t border-gray-700">
                <div className="mb-2"><span className="font-semibold text-white">Zonas de Copa:</span> Suma de puntos del Apertura y Clausura.</div>
                <div className="flex flex-col gap-2 mt-2">
                    <div className="flex items-center gap-2">
                        {getQualificationBadge('libertadores_group')}
                        <span className="text-gray-300">— Clasificación directa a Copa Libertadores (fase de grupos)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {getQualificationBadge('libertadores_qualifier')}
                        <span className="text-gray-300">— Pre-Libertadores (repechaje)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {getQualificationBadge('sudamericana')}
                        <span className="text-gray-300">— Clasificación a Copa Sudamericana</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {getRelegationBadge('descenso_directo')}
                        <span className="text-gray-300">— Descenso directo (bandera enviada por backend)</span>
                    </div>
                </div>
            </div>
        </div>
    );
};