import React from 'react';
import { TournamentType, ZoneType } from '../../type';

interface TournamentFiltersProps {
  activeTournament: TournamentType;
  onChangeTournament: (t: TournamentType) => void;
  activeZone: ZoneType;
  onChangeZone: (z: ZoneType) => void;
}

export const TournamentFilters: React.FC<TournamentFiltersProps> = ({
  activeTournament,
  onChangeTournament,
  activeZone,
  onChangeZone
}) => {
  return (
    <>
      <div className="px-1">
        <div className="text-[10px] uppercase font-bold text-[#c6c9ab] tracking-wider mb-1 px-1">
          Torneo Activo
        </div>
        <div className="grid grid-cols-2 gap-1.5 bg-[#131313] p-1 rounded-xl border border-[#353534]">
          {['APERTURA', 'CLAUSURA'].map((torneo) => (
            <button
              key={torneo}
              onClick={() => onChangeTournament(torneo as TournamentType)}
              className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                activeTournament === torneo
                  ? 'bg-[#d2f000] text-[#191e00] shadow-sm'
                  : 'text-[#c6c9ab] hover:text-[#e5e2e1] hover:bg-[#2a2a2a]'
              }`}
            >
              {torneo === 'APERTURA' ? 'Apertura' : 'Clausura'}
            </button>
          ))}
        </div>
      </div>

      <div className="px-1 mt-2">
        <div className="text-[10px] uppercase font-bold text-[#c6c9ab] tracking-wider mb-1 px-1">
          Fase Regular (15 Equipos)
        </div>
        <div className="grid grid-cols-2 gap-1.5 bg-[#131313] p-1 rounded-xl border border-[#353534]">
          {['A', 'B'].map((zona) => (
            <button
              key={zona}
              onClick={() => onChangeZone(zona as ZoneType)}
              className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                activeZone === zona
                  ? 'bg-[#2a2a2a] text-[#d2f000] border border-[#d2f000]/40'
                  : 'text-[#c6c9ab] hover:text-[#e5e2e1] hover:bg-[#2a2a2a]'
              }`}
            >
              Zona {zona}
            </button>
          ))}
        </div>
      </div>
    </>
  );
};