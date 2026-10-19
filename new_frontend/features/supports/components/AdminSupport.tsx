import React, { useState } from 'react';
import { LifeBuoy, ShieldAlert } from 'lucide-react';
import { AdminTickets } from './tickets/AdminTickets';
import { AdminReports } from './reports/AdminReports';
import { useAdminSupportStats } from '../hooks/useSupports';

export const AdminSupport: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'tickets' | 'reports'>('tickets');
    const { data: stats } = useAdminSupportStats();

    return (
        <div className="flex flex-col gap-6">
            {/* Header Banner */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#1c1b1b] border border-[#353534] p-5 rounded-2xl">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <span className="bg-[#d2f000]/15 text-[#d2f000] text-[10px] font-black px-2.5 py-0.5 rounded uppercase tracking-wider">
                            CENTRO DE ATENCIÓN Y MODERACIÓN
                        </span>
                        <span className="text-xs text-[#909378] font-mono">
                            /support (Tickets & Discord Webhook)
                        </span>
                    </div>
                    <h2 className="text-xl md:text-2xl font-black text-[#e5e2e1] uppercase tracking-tight">
                        SOPORTE AL USUARIO & DENUNCIAS
                    </h2>
                    <p className="text-xs text-[#c6c9ab]">
                        Resolvé consultas, apelaciones y aplicá sanciones inmediatas (Ban, Mute, Warn) a usuarios reportados por la comunidad.
                    </p>
                </div>

                <div className="flex items-center gap-2 bg-[#131313] p-1.5 rounded-xl border border-[#353534]">
                    <button
                        onClick={() => setActiveTab('tickets')}
                        className={`px-4 py-2 rounded-lg font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${activeTab === 'tickets'
                            ? 'bg-[#d2f000] text-[#191e00] shadow-sm'
                            : 'text-[#c6c9ab] hover:text-[#e5e2e1]'
                            }`}
                    >
                        <LifeBuoy className="w-4 h-4" />
                        <span>Tickets ({stats?.openTickets ?? 0})</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('reports')}
                        className={`px-4 py-2 rounded-lg font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${activeTab === 'reports'
                            ? 'bg-[#d2f000] text-[#191e00] shadow-sm'
                            : 'text-[#c6c9ab] hover:text-[#e5e2e1]'
                            }`}
                    >
                        <ShieldAlert className="w-4 h-4" />
                        <span>Reportes ({stats?.pendingReports ?? 0})</span>
                    </button>
                </div>
            </div>

            {activeTab === 'tickets' && <AdminTickets />}
            {activeTab === 'reports' && <AdminReports />}
        </div>
    );
};
