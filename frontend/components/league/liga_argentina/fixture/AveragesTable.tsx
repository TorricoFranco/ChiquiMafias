"use client";
import { PromedioRow } from "@/lib/mocks";
import { ArrowDown } from "lucide-react";
import { getRelegationBadge } from "../functions/getRelegationBadge";


/**
 * Tabla de Promedios (Descenso)
 */
export const AveragesTable: React.FC<{ data: PromedioRow[] }> = ({ data }) => {

    const getRowStylingAverages = (row: PromedioRow) => {
        switch (row.relegation_flag) {
            case 'descenso_directo':
                return "bg-red-800/20 border-l-4 border-red-500 hover:bg-red-800/40";
            case 'promocion':
                return "bg-orange-800/20 border-l-4 border-orange-500 hover:bg-orange-800/40";
            default:
                return "hover:bg-gray-700/50";
        }
    }

    return (
        <div className="bg-gray-800 p-4 rounded-xl shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center border-b border-gray-700 pb-2">
                <ArrowDown className="w-5 h-5 mr-2 text-red-500" /> Tabla de Promedios (Descenso)
            </h3>
            
            <div className="overflow-x-auto custom-scrollbar-horizontal">
                <table className="min-w-full divide-y divide-gray-700 text-sm">
                    <thead className="bg-gray-700/50">
                        <tr>
                            <th className="px-3 py-2 text-center">Pos</th>
                            <th className="px-3 py-2 text-left">Equipo</th>
                            <th className="px-3 py-2 text-center hidden sm:table-cell">Temp</th>
                            <th className="px-3 py-2 text-center">Pts</th>
                            <th className="px-3 py-2 text-center">PJ</th>
                            <th className="px-3 py-2 text-center">Promedio</th>
                            <th className="px-3 py-2 text-left hidden lg:table-cell">Estado</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700/50">
                        {/* El promedio ya está ordenado ASC en el mock, por eso iteramos al revés para mostrar de mejor a peor */}
                        {data.slice().reverse().map((row, index) => (
                            <tr key={row.teamId} className={`border-b border-gray-700 transition duration-150 ${getRowStylingAverages(row)}`}>
                                <td className="px-3 py-2 text-center font-bold">{index + 1}</td>
                                <td className="px-3 py-2 font-semibold text-left flex items-center space-x-2">
                                    <span>{row.teamName}</span>
                                </td>
                                <td className="px-3 py-2 text-center text-gray-300 hidden sm:table-cell">{row.seasons_counted}</td>
                                <td className="px-3 py-2 text-center text-yellow-400 font-bold">{row.points_sum}</td>
                                <td className="px-3 py-2 text-center text-gray-300">{row.matches_sum}</td>
                                <td className="px-3 py-2 text-center bg-gray-600/50 font-extrabold text-lg">{row.promedio.toFixed(3)}</td>
                                <td className="px-3 py-2 text-left hidden lg:table-cell">
                                    {getRelegationBadge(row.relegation_flag)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="mt-4 p-2 text-xs text-gray-500 border-t border-gray-700">
                <span className="font-semibold text-white">Reglas:</span> Los últimos promedios definen el descenso a la B Nacional.
            </div>
        </div>
    );
};