import React from 'react';
import { Trophy, Shield, Globe, Award, Calendar, ArrowLeft, Clock, Sparkles } from 'lucide-react';

interface UpcomingCompetitionViewProps {
  competitionId: string;
  onBackToLPF: () => void;
}

interface CompetitionDetail {
  id: string;
  name: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  flag: string;
  description: string;
  format: string;
  phases: string[];
  calendar: string;
}

const COMPETITION_DETAILS: Record<string, CompetitionDetail> = {
  'copa-argentina': {
    id: 'copa-argentina',
    name: 'Copa Argentina AXION energy 2026',
    subtitle: 'Torneo más federal del fútbol argentino',
    icon: Shield,
    accentColor: '#38e8ac',
    flag: '🏆',
    description:
      'Torneo oficial de eliminación directa que reúne a los clubes de todas las categorías del fútbol argentino (Primera División, Primera Nacional, B Metro, Federal A y Primera C).',
    format: 'Eliminación directa a partido único en estadios neutrales con penales.',
    phases: ['32avos de Final', '16avos de Final', 'Octavos', 'Cuartos', 'Semifinal', 'Gran Final'],
    calendar: 'Febrero a Noviembre 2026',
  },
  'copa-libertadores': {
    id: 'copa-libertadores',
    name: 'CONMEBOL Libertadores 2026',
    subtitle: 'La gloria eterna del continente',
    icon: Globe,
    accentColor: '#ffb4ab',
    flag: '🌎',
    description:
      'El torneo de clubes más prestigioso de América del Sur. Clasifican los mejores equipos de la Tabla Anual y los campeones del Apertura y Clausura.',
    format: 'Fase Preliminar (1, 2 y 3), Fase de Grupos (8 grupos de 4) y Cuadro Final.',
    phases: ['Fase Previa', 'Fase de Grupos (6 fechas)', 'Octavos ida/vuelta', 'Cuartos', 'Semifinal', 'Final Única'],
    calendar: 'Marzo a Noviembre 2026',
  },
  'copa-sudamericana': {
    id: 'copa-sudamericana',
    name: 'CONMEBOL Sudamericana 2026',
    subtitle: 'La Gran Conquista continental',
    icon: Award,
    accentColor: '#d2f000',
    flag: '🛡️',
    description:
      'La segunda competición internacional de clubes más importante de Sudamérica, con equipos clasificados del 5° al 10° puesto de la Tabla Anual.',
    format: 'Fase de Grupos de 32 equipos y Playoffs eliminatorios contra terceros de Libertadores.',
    phases: ['Fase Nacional Preliminar', 'Fase de Grupos', 'Playoffs de Octavos', 'Octavos', 'Cuartos', 'Semifinal', 'Final Única'],
    calendar: 'Abril a Noviembre 2026',
  },
};

export const UpcomingCompetitionView: React.FC<UpcomingCompetitionViewProps> = ({
  competitionId,
  onBackToLPF,
}) => {
  const detail = COMPETITION_DETAILS[competitionId] || COMPETITION_DETAILS['copa-argentina'];
  const Icon = detail.icon;

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-[#1c1b1b] border border-[#353534] rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-1/4 -translate-y-1/4 w-80 h-80 rounded-full bg-[#d2f000]/5 blur-3xl pointer-events-none" />

        <div className="flex items-start gap-4 z-10">
          <div className="w-16 h-16 rounded-2xl bg-[#2a2a2a] border border-[#353534] flex items-center justify-center text-3xl shadow-md flex-shrink-0">
            {detail.flag}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#353534] text-[#d2f000] border border-[#454932]">
                TEMPORADA 2026
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#ffb4ab]/15 text-[#ffb4ab] border border-[#ffb4ab]/30 flex items-center gap-1">
                <Clock className="w-3 h-3" /> PRÓXIMAMENTE
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-[#e5e2e1] uppercase tracking-tight">
              {detail.name}
            </h1>
            <p className="text-xs md:text-sm text-[#c6c9ab] mt-1 font-medium">
              {detail.subtitle}
            </p>
          </div>
        </div>

        <button
          onClick={onBackToLPF}
          className="z-10 flex items-center gap-2 bg-[#d2f000] hover:bg-[#b5cf00] text-[#191e00] font-black text-xs uppercase px-4 py-2.5 rounded-xl transition-all shadow-md cursor-pointer hover:scale-105"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Ir a Liga Profesional (Activa)</span>
        </button>
      </div>

      {/* Info & Format Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#1c1b1b] border border-[#353534] rounded-2xl p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-[#d2f000]">
            <Sparkles className="w-4 h-4" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#e5e2e1]">
              Descripción Oficial
            </h3>
          </div>
          <p className="text-xs text-[#c6c9ab] leading-relaxed">
            {detail.description}
          </p>
        </div>

        <div className="bg-[#1c1b1b] border border-[#353534] rounded-2xl p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-[#d2f000]">
            <Trophy className="w-4 h-4" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#e5e2e1]">
              Formato de Juego
            </h3>
          </div>
          <p className="text-xs text-[#c6c9ab] leading-relaxed">
            {detail.format}
          </p>
        </div>

        <div className="bg-[#1c1b1b] border border-[#353534] rounded-2xl p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-[#d2f000]">
            <Calendar className="w-4 h-4" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#e5e2e1]">
              Cronograma Estimado
            </h3>
          </div>
          <p className="text-xs text-[#c6c9ab] leading-relaxed">
            {detail.calendar}
          </p>
        </div>
      </div>

      {/* Stages Pipeline */}
      <div className="bg-[#1c1b1b] border border-[#353534] rounded-2xl p-6 flex flex-col gap-4">
        <h3 className="font-bold text-xs uppercase tracking-wider text-[#c6c9ab]">
          Fases de la Competición
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {detail.phases.map((phase, idx) => (
            <div
              key={idx}
              className="bg-[#131313] border border-[#353534] p-3 rounded-xl flex flex-col gap-1 text-center"
            >
              <span className="text-[10px] font-mono text-[#8e9285]">
                Paso 0{idx + 1}
              </span>
              <span className="text-xs font-bold text-[#e5e2e1]">{phase}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
