import { useState, useMemo } from "react";

export const SoccerPitch = ({ players, kitColors }) => {
  const renderPlayers = useMemo(() => {
    const rowsMap = {};

    // 1. Filtramos primero para asegurarnos que solo procesamos 
    // jugadores que TENGAN grid (si no tienen, no los podemos dibujar)
    const validPlayers = players.filter(p => p.grid !== null && p.grid !== undefined);

    // 2. Agrupamos para el centrado horizontal
    validPlayers.forEach(p => {
      const row = p.grid.split(":")[0];
      rowsMap[row] = (rowsMap[row] || 0) + 1;
    });

    return validPlayers.map((player) => {
      // 3. Usamos el encadenamiento opcional por seguridad extrema
      const parts = player.grid?.split(":") || ["5", "1"]; // Default a fila 5 si falla
      const [row, col] = parts.map(Number);

      /**
       * CONTROL VERTICAL MANUAL:
       */
      let yPos;
      switch (row) {
        case 1: yPos = 92; break; // Portero
        case 2: yPos = 72; break; // Defensas
        case 3: yPos = 50; break; // Mediocampistas
        case 4: yPos = 28; break; // Volantes ofensivos
        case 5: yPos = 12; break; // Delanteros
        default: yPos = 50;
      }

      /**
       * CENTRADO HORIZONTAL:
       */
      const totalInRow = rowsMap[row] || 1;
      const xPos = (col / (totalInRow + 1)) * 100;

      return { ...player, xPos, yPos };
    });
  }, [players]);

  const getColors = (pos) => {
    const type = pos === 'G' ? 'goalkeeper' : 'player';
    const colors = kitColors?.[type] || { primary: '263142', border: 'ffffff', number: 'ffffff' };
    return {
      bg: `#${colors.primary}`,
      border: `#${colors.border}`,
      text: `#${colors.number}`
    };
  };

  return (
    <div className="relative w-full max-w-[420px] mx-auto aspect-[4/5] bg-[#1a472a] rounded-xl border-2 border-white/10 shadow-2xl overflow-hidden">

      {/* Patrón de césped */}
      <div className="absolute inset-0 flex flex-col">
        {[...Array(10)].map((_, i) => (
          <div key={i} className={`flex-1 w-full ${i % 2 === 0 ? 'bg-black/5' : ''}`} />
        ))}
      </div>

      {/* Marcas de cancha */}
      <div className="absolute inset-0 border border-white/20 pointer-events-none">
        {/* Línea de mitad de cancha - Reforzada para ver el centrado */}
        <div className="absolute top-1/2 w-full h-[2px] bg-white/40 z-0" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 border-2 border-white/20 rounded-full" />

        {/* Áreas */}
        {['top-0', 'bottom-0'].map(pos => (
          <div key={pos} className={`absolute ${pos} left-1/2 -translate-x-1/2 w-48 h-16 border-${pos === 'top-0' ? 'b' : 't'} border-x border-white/20`}>
            <div className={`absolute ${pos === 'top-0' ? 'top-0' : 'bottom-0'} left-1/2 -translate-x-1/2 w-24 h-6 border-${pos === 'top-0' ? 'b' : 't'} border-x border-white/10`} />
          </div>
        ))}
      </div>

      {/* Jugadores */}
      {renderPlayers.map((p) => {
        const colors = getColors(p.pos);
        return (
          <div
            key={p.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-700 flex flex-col items-center z-10"
            style={{ left: `${p.xPos}%`, top: `${p.yPos}%` }}
          >
            {/* Círculo del jugador */}
            <div
              className="w-7 h-7 rounded-full border-2 flex items-center justify-center shadow-lg"
              style={{ backgroundColor: colors.bg, borderColor: colors.border }}
            >
              <span className="text-[10px] font-black" style={{ color: colors.text }}>
                {p.number}
              </span>
            </div>
            {/* Nombre con fondo para legibilidad */}
            <div className="mt-1 bg-black/80 px-1.5 py-0.5 rounded shadow-sm">
              <p className="text-[7px] font-bold text-white whitespace-nowrap uppercase tracking-tighter">
                {p.name.split(' ').pop()}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const LineupsSection = ({ match }) => {
  const [activeTab, setActiveTab] = useState("home");

  const teams = match.teams;
  const currentTeam = teams[activeTab];

  const playersData = match.lineups.find(l => l.teamId === currentTeam.id);

  const kitData = match.lineups.find(l => l.team_id === currentTeam.id);

  const coach = playersData?.coach;

  if (!playersData) return <div className="p-10 text-white/50 text-center">Formación no disponible</div>;

  return (
    <div className="w-full bg-[#121212] rounded-3xl overflow-hidden border border-white/10">
      {/* Tabs de equipos con Logo */}
      <div className="flex bg-white/5 p-1 gap-1">
        {["home", "away"].map((side) => (
          <button
            key={side}
            onClick={() => setActiveTab(side)}
            className={`flex-1 flex items-center justify-center gap-3 py-3 text-xs font-bold rounded-2xl transition-all ${activeTab === side ? "bg-white/10 text-white shadow-lg" : "text-gray-500 opacity-50 hover:opacity-100"
              }`}
          >
            <img src={teams[side].logo} alt="logo" className="w-5 h-5 object-contain" />
            <span className="uppercase tracking-tighter">{teams[side].name}</span>
          </button>
        ))}
      </div>

      <div className="p-4 space-y-5">
        {/* Táctica y Formación */}
        <div className="flex justify-between items-center px-1">
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Alineación Inicial</span>
          <span className="text-[10px] font-mono bg-green-500/20 text-green-400 px-2 py-1 rounded border border-green-500/20">
            {playersData.formation}
          </span>
        </div>

        {/*  Campo de juego */}
        <SoccerPitch
          players={playersData.startXI}
          kitColors={kitData?.kit_colors}
        />

        {/* --- COACH --- */}
        {coach && (
          <div className="relative group mx-1">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-sky-500/20 to-emerald-500/20 rounded-xl blur opacity-75"></div>
            <div className="relative flex items-center justify-between bg-white/[0.03] p-3 rounded-xl border border-white/10 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-sky-500/10 flex items-center justify-center border border-sky-500/20">
                  <span className="text-[10px] font-black text-sky-400 tracking-tighter">DT</span>
                </div>
                <div>
                  <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.15em]">Director Técnico</p>
                  <p className="text-sm font-bold text-white tracking-tight">
                    {typeof coach === 'object' ? coach.name : coach}
                  </p>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Suplentes*/}
        <div className="pt-4 border-t border-white/5">
          <h3 className="text-[10px] font-black text-gray-500 uppercase mb-3 px-1 tracking-widest">Suplentes</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
            {playersData.substitutes.map(sub => (
              <div key={sub.id} className="flex items-center gap-3 py-2 px-3 hover:bg-white/5 rounded-xl transition-colors">
                <span className="text-[10px] font-mono text-green-500 font-bold w-4">
                  {sub.number}
                </span>
                <span className="text-xs font-medium text-gray-300 truncate">
                  {sub.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};