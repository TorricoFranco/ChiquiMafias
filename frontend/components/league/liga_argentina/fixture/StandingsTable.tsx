"use client";
import { ZoneStandings } from "@/lib/mocks";
import { getRowStyling } from "../functions/getRowStyling";
import { AlertTriangle, BarChart3, Clock} from 'lucide-react';


/**
 * Tabla de Clasificación de Zona (Apertura/Clausura)
 */
export const StandingsTable: React.FC<{ data: ZoneStandings }> = ({ data }) => {
    const { rows, status, phaseDetail, updatedAt, zone, tournament } = data;
    
    if (status === 'not_started' || rows.length === 0) {
        return (
            <div className="p-8 bg-gray-700/50 rounded-xl text-center my-6 shadow-inner">
                <AlertTriangle className="w-10 h-10 text-yellow-500 mx-auto mb-3" />
                <h3 className="text-xl font-bold text-white">Torneo {tournament === 'apertura' ? 'Apertura' : 'Clausura'} Zona {zone}</h3>
                <p className="text-gray-300 mt-2">{phaseDetail || "Clasificación no disponible."}</p>
            </div>
        );
    }

    const renderRows = rows.map((row) => (
        <tr key={row.teamId} className={`border-b border-gray-700 transition duration-150 ${getRowStyling(row)}`}>
            <td className="px-3 py-2 text-center font-bold text-lg">{row.pos}</td>
            <td className="px-3 py-2 font-semibold text-left flex items-center space-x-2">
                <div className={`w-4 h-4 rounded-full ${row.pos <= 8 ? 'bg-amber-500' : 'bg-gray-500'}`} />
                <span>{row.teamName}</span>
            </td>
            <td className="px-3 py-2 text-center text-gray-300">{row.played}</td>
            <td className="px-3 py-2 text-center text-green-400 font-medium hidden sm:table-cell">{row.wins}</td>
            <td className="px-3 py-2 text-center text-gray-400 font-medium hidden sm:table-cell">{row.draws}</td>
            <td className="px-3 py-2 text-center text-red-400 font-medium hidden sm:table-cell">{row.losses}</td>
            <td className="px-3 py-2 text-center hidden md:table-cell">{row.gf}</td>
            <td className="px-3 py-2 text-center hidden md:table-cell">{row.ga}</td>
            <td className="px-3 py-2 text-center font-bold">{row.gd}</td>
            <td className="px-3 py-2 text-center bg-gray-600/50 font-extrabold text-xl text-yellow-300">{row.pts}</td>
        </tr>
    ));

    return (
        <div className="my-6 bg-gray-800 p-4 rounded-xl shadow-2xl">
            <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-3">
                <div className="text-lg font-bold text-white flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2 text-sky-400" />
                    Tabla de Posiciones - Zona {zone}
                </div>
                <div className="text-sm text-gray-400 flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    Actualizado: {new Date(updatedAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                </div>
            </div>

            <div className="overflow-x-auto custom-scrollbar-horizontal">
                <table className="min-w-full divide-y divide-gray-700 text-sm">
                    <thead className="bg-gray-700/50 sticky top-0 z-10">
                        <tr>
                            <th className="px-3 py-2 text-center">Pos</th>
                            <th className="px-3 py-2 text-left">Equipo</th>
                            <th className="px-3 py-2 text-center">Pj</th>
                            <th className="px-3 py-2 text-center hidden sm:table-cell">G</th>
                            <th className="px-3 py-2 text-center hidden sm:table-cell">E</th>
                            <th className="px-3 py-2 text-center hidden sm:table-cell">P</th>
                            <th className="px-3 py-2 text-center hidden md:table-cell">GF</th>
                            <th className="px-3 py-2 text-center hidden md:table-cell">GC</th>
                            <th className="px-3 py-2 text-center">DG</th>
                            <th className="px-3 py-2 text-center">Pts</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700/50">
                        {renderRows}
                    </tbody>
                </table>
            </div>
            
            <div className="mt-4 p-2 text-xs text-gray-500 border-t border-gray-700">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-3 h-3 rounded-sm bg-amber-500" />
                    <span className="font-semibold text-white">Clasificación a octavos</span>
                </div>
                <div>Los primeros 8 equipos clasifican a octavos; sólo se considera la posición final dentro de la zona.</div>
            </div>
        </div>
    );
};
