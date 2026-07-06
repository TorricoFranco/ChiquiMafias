'use client';

import { useState } from 'react';
import TicketsTable from './TicketsTable';
import ReportsTable from './ReportsTable';

type Tab = 'TICKETS' | 'REPORTS';

export default function SupportDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('TICKETS');

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Navegación de Pestañas */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('TICKETS')}
          className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'TICKETS' 
              ? 'border-blue-500 text-blue-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Tickets de Usuarios
        </button>
        <button
          onClick={() => setActiveTab('REPORTS')}
          className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'REPORTS' 
              ? 'border-red-500 text-red-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Reportes de Moderación
        </button>
      </div>

      {/* Contenido Dinámico */}
      <div className="p-6">
        {activeTab === 'TICKETS' ? <TicketsTable /> : <ReportsTable />}
      </div>
    </div>
  );
}