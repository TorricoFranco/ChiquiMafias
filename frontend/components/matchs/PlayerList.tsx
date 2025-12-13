"use client";

export const PlayerList = ({ players, type }) => (
    <ul className="space-y-1 mt-2 text-sm text-gray-300 max-h-48 overflow-y-auto custom-scrollbar">
        {players.map((player) => (
            <li key={player.number} className="flex justify-between items-center p-1 hover:bg-gray-700 rounded-md transition duration-150">
                <span className="font-semibold text-white w-6 text-center">{player.number}</span>
                <span className="flex-1 truncate mx-2">{player.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${type === 'XI' ? 'bg-indigo-700/50' : 'bg-gray-700'}`}>{player.position}</span>
            </li>
        ))}
    </ul>
);