"use client";

import { Users, Trophy, Zap} from 'lucide-react';
import { TeamInfoCard } from './TeamIndoCard';

export const MatchPreview = ({ matchInfo, teams }) => (
    <section className="bg-gray-800 p-5 rounded-lg mb-6 shadow-lg">
        <h2 className="text-xl font-bold text-white mb-3 flex items-center border-b border-gray-700 pb-2">
            <Trophy className="w-5 h-5 mr-2 text-yellow-400" /> Previa del Partido
        </h2>
        <p className="text-gray-300 mb-4">{matchInfo.previa}</p>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-gray-900 p-3 rounded-lg flex items-center">
                <Users className="w-4 h-4 mr-2 text-indigo-400" />
                <span className="font-semibold text-white mr-1">Estadio:</span>
                <span className="text-gray-300">{matchInfo.stadium}</span>
            </div>
            <div className="bg-gray-900 p-3 rounded-lg flex items-center">
                <Zap className="w-4 h-4 mr-2 text-pink-400" />
                <span className="font-semibold text-white mr-1">Árbitro:</span>
                <span className="text-gray-300">{matchInfo.referee}</span>
            </div>
        </div>
        
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <TeamInfoCard team={teams.home} />
            <TeamInfoCard team={teams.away} />
        </div>
    </section>
);
