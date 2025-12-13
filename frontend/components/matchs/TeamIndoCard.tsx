"use client";

export const TeamInfoCard = ({ team }) => {
    const last5Render = team.last5.map((res, i) => (
        <span 
            key={i} 
            className={`w-5 h-5 flex items-center justify-center text-xs font-bold rounded-full text-white 
                ${res === 'W' ? 'bg-green-600' : res === 'D' ? 'bg-yellow-600' : 'bg-red-600'}`}
        >
            {res}
        </span>
    ));

        return (
        <div className="flex flex-col items-center p-4 bg-gray-900/50 rounded-lg shadow-xl">
            <img src={team.logo} alt={`${team.name} Logo`} className="w-16 h-16 object-contain mb-3 border border-gray-700 rounded-full" onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/100x100/1E293B/FFFFFF?text=LOGO" }} />
            <h3 className="text-xl font-bold text-white mb-2 text-center">{team.name}</h3>
            
            <div className="text-center text-sm text-gray-400 mb-4">
                <p>Posición: <span className="text-white font-semibold">{team.tablePosition}</span></p>
                <p>Puntos: <span className="text-white font-semibold">{team.points}</span></p>
            </div>
            
            <div className="flex space-x-1 justify-center">
                {last5Render}
            </div>
        </div>
    );
}