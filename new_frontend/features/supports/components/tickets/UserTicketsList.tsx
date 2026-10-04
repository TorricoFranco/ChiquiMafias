import React, { useState } from 'react';
import {
  Search,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Scale,
  MessageSquare,
  ChevronRight,
  ShieldAlert,
  Bot,
  ExternalLink,
} from 'lucide-react';
import { TicketStatus, TicketCategory, MyTicket } from '../../types/';

interface UserTicketsListProps {
  tickets: MyTicket[];
  onSelectTicket: (ticketId: string) => void;
  onOpenCreateModal: (defaultCategory?: TicketCategory) => void;
}

export const UserTicketsList: React.FC<UserTicketsListProps> = ({
  tickets,
  onSelectTicket,
  onOpenCreateModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const filteredTickets = tickets.filter((t) => {
    if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
    if (categoryFilter !== 'ALL' && t.category !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        t.subject.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case 'OPEN':
        return {
          label: 'Abierto / En Espera',
          bg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
          dot: 'bg-amber-400 animate-pulse',
        };
      case 'UNDER_REVIEW':
        return {
          label: 'En Revisión por Staff',
          bg: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
          dot: 'bg-blue-400 animate-pulse',
        };
      case 'RESOLVED':
        return {
          label: 'Resuelto',
          bg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
          dot: 'bg-emerald-400',
        };
      case 'CLOSED':
        return {
          label: 'Cerrado',
          bg: 'bg-neutral-800 text-[#909378] border-neutral-700',
          dot: 'bg-[#909378]',
        };
    }
  };

  const getCategoryBadge = (category: TicketCategory) => {
    switch (category) {
      case 'SUPPORT':
        return {
          label: 'Soporte & Pagos',
          icon: HelpCircle,
          color: 'text-blue-400',
        };
      case 'APPEAL':
        return {
          label: 'Apelación Sanción',
          icon: Scale,
          color: 'text-amber-400',
        };
      case 'OTHER':
        return {
          label: 'Consultas & Sugerencias',
          icon: MessageSquare,
          color: 'text-purple-400',
        };
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Top Banner & Action */}
      <div className="bg-gradient-to-r from-[#1c1b1b] via-[#242423] to-[#1c1b1b] border border-[#353534] p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-[#d2f000] uppercase tracking-wider bg-[#d2f000]/10 px-2 py-0.5 rounded-md border border-[#d2f000]/20">
              Mesa de Ayuda
            </span>
            <span className="text-xs text-[#909378]">Atención 24/7</span>
          </div>
          <h2 className="text-xl font-black text-[#e5e2e1] mt-1 tracking-tight">
            Centro de Soporte & Reclamos
          </h2>
          <p className="text-xs text-[#c6c9ab] mt-0.5">
            Realizá consultas sobre apuestas, notificá errores de pago o solicitá revisión de sanciones en la Tribuna.
          </p>
        </div>

        <button
          onClick={() => onOpenCreateModal()}
          className="bg-[#d2f000] hover:bg-[#b8d300] text-[#191e00] font-black text-xs px-5 py-3 rounded-xl uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(210,240,0,0.2)] cursor-pointer active:scale-95 flex-shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Crear Nuevo Ticket</span>
        </button>
      </div>

      {/* Quick Category Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={() => onOpenCreateModal('SUPPORT')}
          className="bg-[#1c1b1b] hover:bg-[#232222] border border-[#353534] hover:border-blue-500/40 p-3.5 rounded-xl text-left transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg group-hover:scale-105 transition-transform">
              <HelpCircle className="w-4 h-4" />
            </div>
            <span className="text-[10px] text-[#909378] group-hover:text-blue-400 font-mono">
              Reclamar →
            </span>
          </div>
          <h4 className="font-bold text-xs text-[#e5e2e1] mt-2">
            Problema Técnico o Pagos
          </h4>
          <p className="text-[10px] text-[#909378] mt-0.5">
            Acreditación de fichas, Mercado Pago o errores de apuestas.
          </p>
        </button>

        <button
          onClick={() => onOpenCreateModal('APPEAL')}
          className="bg-[#1c1b1b] hover:bg-[#232222] border border-[#353534] hover:border-amber-500/40 p-3.5 rounded-xl text-left transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg group-hover:scale-105 transition-transform">
              <Scale className="w-4 h-4" />
            </div>
            <span className="text-[10px] text-[#909378] group-hover:text-amber-400 font-mono">
              Apelar →
            </span>
          </div>
          <h4 className="font-bold text-xs text-[#e5e2e1] mt-2">
            Apelar Mute o Sanción
          </h4>
          <p className="text-[10px] text-[#909378] mt-0.5">
            Solicitá revisión si fuiste silenciado injustamente en el chat.
          </p>
        </button>

        <button
          onClick={() => onOpenCreateModal('OTHER')}
          className="bg-[#1c1b1b] hover:bg-[#232222] border border-[#353534] hover:border-purple-500/40 p-3.5 rounded-xl text-left transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg group-hover:scale-105 transition-transform">
              <MessageSquare className="w-4 h-4" />
            </div>
            <span className="text-[10px] text-[#909378] group-hover:text-purple-400 font-mono">
              Consultar →
            </span>
          </div>
          <h4 className="font-bold text-xs text-[#e5e2e1] mt-2">
            Consultas & Sugerencias
          </h4>
          <p className="text-[10px] text-[#909378] mt-0.5">
            Propuestas para la comunidad, mejoras o dudas de reglamento.
          </p>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#1c1b1b] border border-[#353534] p-3 rounded-2xl">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#909378]" />
          <input
            type="text"
            placeholder="Buscar en mis tickets por asunto o ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#131313] border border-[#353534] focus:border-[#d2f000] text-xs text-[#e5e2e1] pl-9 pr-3 py-2 rounded-xl outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#131313] border border-[#353534] text-xs font-bold text-[#e5e2e1] px-3 py-2 rounded-xl outline-none cursor-pointer"
          >
            <option value="ALL">Todos los Estados ({tickets.length})</option>
            <option value="OPEN">Abiertos</option>
            <option value="UNDER_REVIEW">En Revisión</option>
            <option value="RESOLVED">Resueltos</option>
            <option value="CLOSED">Cerrados</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-[#131313] border border-[#353534] text-xs font-bold text-[#e5e2e1] px-3 py-2 rounded-xl outline-none cursor-pointer"
          >
            <option value="ALL">Todas las Categorías</option>
            <option value="SUPPORT">Soporte Técnico</option>
            <option value="APPEAL">Apelaciones</option>
            <option value="OTHER">Consultas / Sugerencias</option>
          </select>
        </div>
      </div>

      {/* Tickets List */}
      {filteredTickets.length === 0 ? (
        <div className="bg-[#1c1b1b] border border-[#353534] rounded-2xl p-12 text-center flex flex-col items-center gap-3">
          <div className="p-4 bg-[#2a2a2a] rounded-full text-[#909378]">
            <CheckCircle2 className="w-8 h-8 text-[#d2f000]" />
          </div>
          <h3 className="font-extrabold text-base text-[#e5e2e1]">
            {tickets.length === 0
              ? 'No tenés reclamos activos'
              : 'No se encontraron tickets con esos filtros'}
          </h3>
          <p className="text-xs text-[#c6c9ab] max-w-md">
            {tickets.length === 0
              ? 'Si tuviste algún inconveniente con una apuesta, compra de fichas o chat de la Tribuna, podés abrir un reclamo y nuestro equipo te responderá rápidamente.'
              : 'Probá cambiando la búsqueda o quitando los filtros seleccionados.'}
          </p>
          {tickets.length === 0 && (
            <button
              onClick={() => onOpenCreateModal()}
              className="mt-2 bg-[#d2f000] text-[#191e00] font-black text-xs px-5 py-2.5 rounded-xl uppercase tracking-wider transition-all cursor-pointer"
            >
              Crear mi primer ticket
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filteredTickets.map((ticket) => {
            const statusInfo = getStatusBadge(ticket.status);
            const categoryInfo = getCategoryBadge(ticket.category);
            const CategoryIcon = categoryInfo.icon;

            return (
              <div
                key={ticket.id}
                onClick={() => onSelectTicket(ticket.id)}
                className="bg-[#1c1b1b] hover:bg-[#232323] border border-[#353534] hover:border-[#4d4d4c] p-4 rounded-2xl transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group shadow-sm"
              >
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <div className="p-2.5 bg-[#131313] border border-[#353534] rounded-xl flex-shrink-0 mt-0.5">
                    <CategoryIcon className={`w-5 h-5 ${categoryInfo.color}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      {/* Category Pill */}
                      <span className="text-[10px] font-bold text-[#909378] uppercase">
                        {categoryInfo.label}
                      </span>

                      <span className="text-[10px] text-[#555]">•</span>

                      {/* Ticket ID */}
                      <span className="font-mono text-[10px] text-[#909378]">
                        #{ticket.id.slice(0, 8)}
                      </span>

                      {/* Discord Thread Badge */}
                      {ticket.discordThreadId && (
                        <span className="text-[9px] font-bold bg-[#5865F2]/15 text-[#8aa1ff] border border-[#5865F2]/30 px-2 py-0.2 rounded flex items-center gap-1">
                          <Bot className="w-3 h-3" /> Discord Sync
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-sm text-[#e5e2e1] group-hover:text-[#d2f000] transition-colors truncate">
                      {ticket.subject}
                    </h3>

                    <div className="flex items-center gap-3 text-[11px] text-[#909378] mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(ticket.createdAt).toLocaleDateString('es-AR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Status & Arrow */}
                <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0 border-t sm:border-t-0 border-[#353534]/60 pt-2 sm:pt-0">
                  <span
                    className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${statusInfo.bg}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                    {statusInfo.label}
                  </span>

                  <div className="p-1.5 bg-[#2a2a2a] group-hover:bg-[#d2f000] text-[#c6c9ab] group-hover:text-[#191e00] rounded-xl transition-all">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
