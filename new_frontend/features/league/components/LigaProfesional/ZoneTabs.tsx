import React from 'react';
import { ZoneType } from '../../type';
import { Layers } from 'lucide-react';

interface ZoneTabsProps {
  activeZone: ZoneType;
  onChangeZone: (zone: ZoneType) => void;
}

export const ZoneTabs: React.FC<ZoneTabsProps> = ({ activeZone, onChangeZone }) => {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 text-xs font-bold text-[#8e9285] uppercase mr-1 hidden sm:flex">
        <Layers className="w-3.5 h-3.5 text-[#d2f000]" />
        <span>Zona:</span>
      </div>

      <div className="flex items-center bg-[#1c1b1b] border border-[#353534] p-1 rounded-xl">
        <button
          onClick={() => onChangeZone('A')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all cursor-pointer ${
            activeZone === 'A'
              ? 'bg-sky-500 text-white shadow-[0_0_10px_rgba(14,165,233,0.35)]'
              : 'text-[#c6c9ab] hover:text-[#e5e2e1]'
          }`}
        >
          <span>ZONA A</span>
        </button>

        <button
          onClick={() => onChangeZone('B')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all cursor-pointer ${
            activeZone === 'B'
              ? 'bg-sky-500 text-white shadow-[0_0_10px_rgba(14,165,233,0.35)]'
              : 'text-[#c6c9ab] hover:text-[#e5e2e1]'
          }`}
        >
          <span>ZONA B</span>
        </button>
      </div>
    </div>
  );
};
