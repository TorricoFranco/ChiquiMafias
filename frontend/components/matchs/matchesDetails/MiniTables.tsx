export const MiniTables = ({ tables }) => {
    const sections = [
        { title: "Tabla Torneo", data: tables.tournament },
        { title: "Tabla Anual", data: tables.annual },
        { title: "Promedios", data: tables.averages },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {sections.map((sec) => (
                <div key={sec.title} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                    <h5 className="text-[10px] font-bold uppercase text-gray-500 mb-4 tracking-widest">{sec.title}</h5>

                    <div className="space-y-2">
                        {[...sec.data.home, ...sec.data.away]
                            .sort((a, b) => a.rank - b.rank)
                            .map((team) => (
                                <div
                                    key={team.teamId}
                                    className={`flex items-center justify-between p-2 rounded-lg ${team.isTarget ? 'bg-sky-500/20 border border-sky-500/30' : ''}`}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-mono text-gray-500 w-4">{team.rank}</span>
                                        <img src={team.logo} className="w-4 h-4 object-contain" alt="" />
                                        <span className="text-[11px] font-bold truncate max-w-[80px]">{team.name}</span>
                                    </div>
                                    <span className="text-[11px] font-black">{team.points} pts</span>
                                </div>
                            ))}
                    </div>
                </div>
            ))}
        </div>
    );
};