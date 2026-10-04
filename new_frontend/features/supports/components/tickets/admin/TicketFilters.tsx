import React from 'react';
import { Search } from 'lucide-react';

interface TicketFiltersProps {
    search: string;
    onSearchChange: (value: string) => void;
    statusFilter: string;
    onStatusFilterChange: (value: string) => void;
    categoryFilter: string;
    onCategoryFilterChange: (value: string) => void;
}

export const TicketFilters: React.FC<TicketFiltersProps> = ({
    search,
    onSearchChange,
    statusFilter,
    onStatusFilterChange,
    categoryFilter,
    onCategoryFilterChange,
}) => (
    <div className="bg-[#1c1b1b] border border-[#353534] p-3 rounded-2xl flex flex-col gap-2.5">
        <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#909378]" />
            <input
                type="text"
                placeholder="Buscar por usuario o asunto..."
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full bg-[#131313] border border-[#353534] focus:border-[#d2f000] text-xs text-[#e5e2e1] pl-9 pr-3 py-2 rounded-xl outline-none"
            />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
            <select
                value={statusFilter}
                onChange={(e) => onStatusFilterChange(e.target.value)}
                className="bg-[#131313] border border-[#353534] text-[11px] font-bold text-[#c6c9ab] px-2.5 py-1.5 rounded-lg outline-none cursor-pointer"
            >
                <option value="ALL">Todos los Estados</option>
                <option value="OPEN">Abierto (OPEN)</option>
                <option value="UNDER_REVIEW">En Revisión</option>
                <option value="RESOLVED">Resuelto</option>
                <option value="CLOSED">Cerrado</option>
            </select>

            <select
                value={categoryFilter}
                onChange={(e) => onCategoryFilterChange(e.target.value)}
                className="bg-[#131313] border border-[#353534] text-[11px] font-bold text-[#c6c9ab] px-2.5 py-1.5 rounded-lg outline-none cursor-pointer"
            >
                <option value="ALL">Todas las Categorías</option>
                <option value="SUPPORT">Soporte General</option>
                <option value="APPEAL">Apelación de Baneo</option>
                <option value="OTHER">Otros</option>
            </select>
        </div>
    </div>
);