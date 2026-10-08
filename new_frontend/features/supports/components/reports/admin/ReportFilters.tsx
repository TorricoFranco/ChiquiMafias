import React from 'react';
import { Filter } from 'lucide-react';

interface ReportFiltersProps {
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  reasonFilter: string;
  onReasonFilterChange: (value: string) => void;
}

export const ReportFilters: React.FC<ReportFiltersProps> = ({
  statusFilter,
  onStatusFilterChange,
  reasonFilter,
  onReasonFilterChange,
}) => (
  <div className="flex flex-wrap items-center justify-between gap-3 bg-[#1c1b1b] border border-[#353534] p-3.5 rounded-2xl">
    <div className="flex items-center gap-2">
      <span className="text-xs font-bold text-[#c6c9ab] uppercase flex items-center gap-1">
        <Filter className="w-3.5 h-3.5 text-[#d2f000]" /> Filtrar:
      </span>
      <select
        value={statusFilter}
        onChange={(e) => onStatusFilterChange(e.target.value)}
        className="bg-[#131313] border border-[#353534] text-xs font-bold text-[#e5e2e1] px-3 py-1.5 rounded-lg outline-none cursor-pointer"
      >
        <option value="ALL">Todos los Estados</option>
        <option value="PENDING">Pendientes</option>
        <option value="RESOLVED">Resueltos</option>
        <option value="CLOSED">Cerrados</option>
      </select>

      <select
        value={reasonFilter}
        onChange={(e) => onReasonFilterChange(e.target.value)}
        className="bg-[#131313] border border-[#353534] text-xs font-bold text-[#e5e2e1] px-3 py-1.5 rounded-lg outline-none cursor-pointer"
      >
        <option value="ALL">Todas las Razones</option>
        <option value="TOXIC_CHAT">Chat Tóxico</option>
        <option value="FRAUD">Fraude / Estafa</option>
        <option value="BAD_BEHAVIOR">Mal Comportamiento</option>
        <option value="OTHER">Otras</option>
      </select>
    </div>

  </div>
);