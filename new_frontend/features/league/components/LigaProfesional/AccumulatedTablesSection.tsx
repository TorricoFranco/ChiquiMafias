import React from 'react';
import { Layers } from 'lucide-react';
import { StandingRow, AverageRow } from '../../type';
import { AnnualTable } from './tables/AnnualTable';
import { AveragesTable } from './tables/AveragesTable';

interface AccumulatedTablesSectionProps {
  annualStandings: StandingRow[];
  averages: AverageRow[];
}

export const AccumulatedTablesSection: React.FC<AccumulatedTablesSectionProps> = ({
  annualStandings,
  averages,
}) => {
  return (
    <div className="flex flex-col gap-6 pt-4 border-t border-[#353534]/70 max-w-3xl mx-auto w-full px-4">
      <div className="flex items-center gap-2">
        <Layers className="w-5 h-5 text-[#d2f000]" />
        <h3 className="font-black text-base text-[#e5e2e1] uppercase tracking-wider">
          Tablas Acumulativas de la Temporada 2026
        </h3>
      </div>

      <div className="flex flex-col gap-8 w-full">
        {/* Tabla Anual */}
        <div id="tabla-anual" className="scroll-mt-24 w-full">
          <AnnualTable
            annualStandings={annualStandings}
          />
        </div>

        {/* Tabla de Promedios */}
        <div id="tabla-promedios" className="scroll-mt-24 w-full">
          <AveragesTable averages={averages} />
        </div>
      </div>
    </div>
  );
};