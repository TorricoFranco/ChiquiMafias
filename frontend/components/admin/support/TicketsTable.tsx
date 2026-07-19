'use client';

import { useState } from 'react';
import { useAdminTickets } from '@/hook/react-query/useAdminSupport';
import { TicketStatus, TicketCategory } from '@/services/supportApi';
import TicketDetailsDrawer from './TicketDetailsDrawer';

interface TicketsResponse {
  data: any[]; // Aquí podrías poner Ticket[]
  meta: {
    lastPage: number;
  };
}

export default function TicketsTable() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | undefined>();
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null); // <-- Estado para el Drawer
  const limit = 10;

  const { data: rawData, isLoading, isError } = useAdminTickets(page, limit, statusFilter);

  const data = rawData as TicketsResponse | undefined;

  if (isLoading) return <div className="p-4 text-center text-gray-500">Cargando tickets...</div>;
  if (isError) return <div className="p-4 text-red-500 text-center">Error al cargar los tickets.</div>;

  return (
    <div className="relative">
      {/* Filtros */}
      <div className="mb-4 flex gap-4">
        <select
          className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={statusFilter || ''}
          onChange={(e) => {
            setStatusFilter(e.target.value ? e.target.value as TicketStatus : undefined);
            setPage(1);
          }}
        >
          <option value="">Todos los estados</option>
          <option value="OPEN">Abiertos</option>
          <option value="UNDER_REVIEW">En Revisión</option>
          <option value="RESOLVED">Resueltos</option>
          <option value="CLOSED">Cerrados</option>
        </select>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50 text-gray-700 uppercase text-xs font-semibold">
            <tr>
              <th className="px-6 py-3 border-b">Asunto</th>
              <th className="px-6 py-3 border-b">Categoría</th>
              <th className="px-6 py-3 border-b">Estado</th>
              <th className="px-6 py-3 border-b">Fecha</th>
              <th className="px-6 py-3 border-b text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {data?.data.map((ticket) => (
              <tr key={ticket.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-medium text-gray-900">{ticket.subject}</td>
                <td className="px-6 py-4">{ticket.category}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium
                    ${ticket.status === 'OPEN' ? 'bg-green-100 text-green-800' :
                      ticket.status === 'CLOSED' ? 'bg-gray-100 text-gray-800' :
                        ticket.status === 'UNDER_REVIEW' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'}`}>
                    {ticket.status}
                  </span>
                </td>
                <td className="px-6 py-4">{new Date(ticket.createdAt).toLocaleDateString()}</td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => setSelectedTicketId(ticket.id)} // <-- Abrimos el Drawer
                    className="text-blue-600 hover:text-blue-900 font-semibold text-sm transition-colors"
                  >
                    Ver detalles
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Mostrando página {page} de {data?.meta.lastPage || 1}
        </p>
        <div className="flex gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Anterior
          </button>
          <button
            disabled={page >= (data?.meta.lastPage || 1)}
            onClick={() => setPage(p => p + 1)}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Siguiente
          </button>
        </div>
      </div>

      {/* COMPONENTE DRAWER */}
      {selectedTicketId && (
        <TicketDetailsDrawer
          ticketId={selectedTicketId}
          onClose={() => setSelectedTicketId(null)}
        />
      )}
    </div>
  );
}