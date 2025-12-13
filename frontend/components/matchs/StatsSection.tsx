"use client";
import { BarChart3} from 'lucide-react';

import { StatBar } from "./StarBar";

export const StatsSection = ({ stats, teams }) => {
    if (!stats) return null;

    return (
        <section className="bg-gray-800 p-5 rounded-lg mb-6 shadow-lg">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center border-b border-gray-700 pb-2">
                <BarChart3 className="w-5 h-5 mr-2 text-cyan-400" /> Estadísticas
            </h2>
            <div className="text-sm text-gray-400 flex justify-between px-2 mb-2">
                <span className="text-red-500 font-bold">{teams.home.name}</span>
                <span className="text-blue-500 font-bold">{teams.away.name}</span>
            </div>
            
            <StatBar label="Posesión" homeValue={stats.possession.home} awayValue={stats.possession.away} format="percent" />
            <StatBar label="Remates (Total)" homeValue={stats.shots.home} awayValue={stats.shots.away} />
            <StatBar label="Remates al Arco" homeValue={stats.shotsOnTarget.home} awayValue={stats.shotsOnTarget.away} />
            <StatBar label="Faltas" homeValue={stats.fouls.home} awayValue={stats.fouls.away} />
            <StatBar label="Pases" homeValue={stats.passes.home} awayValue={stats.passes.away} />
            <StatBar label="Ataques Peligrosos" homeValue={stats.dangerousAttacks.home} awayValue={stats.dangerousAttacks.away} />
            <StatBar label="Goles Esperados (xG)" homeValue={stats.xG.home} awayValue={stats.xG.away} format="decimal" />
        </section>
    );
};