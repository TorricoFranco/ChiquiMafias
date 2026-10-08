import React, { useState } from 'react';
import { Trophy, ChevronDown, ChevronUp, Shield, Globe, Award, Check, Sparkles } from 'lucide-react';

export interface CompetitionItem {
  id: string;
  name: string;
  shortName: string;
  category: string;
  flag: string;
  active: boolean;
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const COMPETITIONS_LIST: CompetitionItem[] = [
  {
    id: 'lpf-2026',
    name: 'Liga Profesional Argentina',
    shortName: 'Liga Profesional',
    category: 'Primera División',
    flag: '🇦🇷',
    active: true,
    badge: 'ACTIVA 2026',
    icon: Trophy,
  },
  {
    id: 'copa-argentina',
    name: 'Copa Argentina AXION',
    shortName: 'Copa Argentina',
    category: 'Copa Nacional',
    flag: '🏆',
    active: false,
    badge: 'PRÓX.',
    icon: Shield,
  },
  {
    id: 'copa-libertadores',
    name: 'CONMEBOL Libertadores',
    shortName: 'Copa Libertadores',
    category: 'Continental',
    flag: '🌎',
    active: false,
    badge: 'PRÓX.',
    icon: Globe,
  },
  {
    id: 'copa-sudamericana',
    name: 'CONMEBOL Sudamericana',
    shortName: 'Copa Sudamericana',
    category: 'Continental',
    flag: '🛡️',
    active: false,
    badge: 'PRÓX.',
    icon: Award,
  },
];

interface CompetitionSidebarSelectorProps {
  selectedCompetitionId: string;
  onSelectCompetition: (id: string) => void;
  onShowNotice?: (message: string) => void;
}

export const CompetitionSidebarSelector: React.FC<CompetitionSidebarSelectorProps> = ({
  selectedCompetitionId,
  onSelectCompetition,
  onShowNotice,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const activeCompetition =
    COMPETITIONS_LIST.find((c) => c.id === selectedCompetitionId) ||
    COMPETITIONS_LIST[0];

  const handleSelect = (comp: CompetitionItem) => {
    onSelectCompetition(comp.id);
    setIsDropdownOpen(false);
    if (!comp.active) {
      onShowNotice?.(
        `${comp.name} se encuentra en preparación. Mostrando información oficial de la temporada 2026.`
      );
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Label Principal */}
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] uppercase font-black tracking-wider text-[#d2f000] flex items-center gap-1.5">
          <Sparkles className="w-3 h-3" />
          Competición Principal
        </span>
        <span className="text-[9px] text-[#8e9285] font-mono">
          {COMPETITIONS_LIST.length} TORNEOS
        </span>
      </div>

      {/* Selector Activo Header */}
      <div className="relative">
        <button
          onClick={() => setIsDropdownOpen((prev) => !prev)}
          className="w-full bg-[#242424] hover:bg-[#2a2a2a] border border-[#d2f000]/40 rounded-2xl p-2.5 flex items-center justify-between text-left transition-all shadow-md group cursor-pointer"
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-xl bg-[#d2f000] text-[#191e00] flex items-center justify-center font-bold text-sm shadow-sm flex-shrink-0">
              {activeCompetition.flag}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-black text-xs text-[#e5e2e1] truncate group-hover:text-[#d2f000] transition-colors">
                {activeCompetition.shortName}
              </span>
              <span className="text-[10px] text-[#c6c9ab] font-medium flex items-center gap-1">
                {activeCompetition.category}
                <span className="text-[#d2f000] text-[9px] font-mono font-bold">
                  • {activeCompetition.badge}
                </span>
              </span>
            </div>
          </div>

          <div className="p-1 text-[#c6c9ab] group-hover:text-[#e5e2e1]">
            {isDropdownOpen ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </button>

        {/* Dropdown Menu or Collapsible List */}
        {isDropdownOpen && (
          <div className="mt-2 flex flex-col gap-1.5 bg-[#141414] border border-[#353534] rounded-2xl p-2 shadow-2xl animate-in fade-in duration-150 z-30">
            <span className="text-[9px] uppercase font-bold text-[#8e9285] px-2 py-0.5">
              Cambiar Competición
            </span>
            {COMPETITIONS_LIST.map((comp) => {
              const isSelected = comp.id === selectedCompetitionId;
              const Icon = comp.icon;

              return (
                <button
                  key={comp.id}
                  onClick={() => handleSelect(comp)}
                  className={`flex items-center justify-between p-2 rounded-xl text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#d2f000] text-[#191e00] font-bold shadow-sm'
                      : 'hover:bg-[#222] text-[#c6c9ab] hover:text-[#e5e2e1]'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-base flex-shrink-0">{comp.flag}</span>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold truncate">
                        {comp.shortName}
                      </span>
                      <span
                        className={`text-[9px] ${
                          isSelected ? 'text-[#191e00]/80' : 'text-[#8e9285]'
                        }`}
                      >
                        {comp.category}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span
                      className={`text-[8px] font-mono font-black px-1.5 py-0.5 rounded ${
                        isSelected
                          ? 'bg-[#191e00] text-[#d2f000]'
                          : comp.active
                          ? 'bg-[#2a2a2a] text-[#d2f000]'
                          : 'bg-[#2a2a2a] text-[#8e9285]'
                      }`}
                    >
                      {comp.badge}
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
