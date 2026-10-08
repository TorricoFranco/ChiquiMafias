import React, { useState } from 'react';
import { PlusCircle, Clock, BarChart2, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import {
    usePendingPolls,
    useActivePolls,
    useCreatePoll,
    useApprovePoll,
    useRejectPoll,
    useClosePollManually
} from '../hooks/usePolls';

import { AdminPollItem } from '../types';

import { CreatePollModal } from './admin/CreatePollModal';
import { ApprovePollModal } from './admin/ApprovePollModal';
import { PendingPollCard } from './admin/PendingPollCard';
import { ActivePollCard } from './admin/ActivePollCard';

export const AdminPolls: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'pending' | 'active'>('pending');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [approveModalPoll, setApproveModalPoll] = useState<AdminPollItem | null>(null);


    const { data: pendingPolls = [], isLoading: isLoadingPending } = usePendingPolls();
    const { data: activePolls = [], isLoading: isLoadingActive } = useActivePolls();

    const createPoll = useCreatePoll();
    const approvePoll = useApprovePoll();
    const rejectPoll = useRejectPoll();
    const closePoll = useClosePollManually();

    const handleCreateOfficialPoll = (
        title: string, desc: string, options: any[], start: string, end: string, icon: string
    ) => {
        createPoll.mutate(
            { title, description: desc, options, startsAt: start, endsAt: end, icon },
            {
                onSuccess: () => {
                    toast.success('Encuesta oficial creada y publicada con éxito');
                    setIsCreateModalOpen(false);
                },
                onError: (err: any) => toast.error(err.message || 'Error al crear la encuesta'),
            }
        );
    };

    const handleApprovePoll = (pollId: string, startsAt: string, endsAt: string) => {
        approvePoll.mutate(
            { pollId, dto: { startsAt, endsAt } },
            {
                onSuccess: () => {
                    toast.success('Encuesta aprobada exitosamente');
                    setApproveModalPoll(null);
                },
                onError: () => toast.error('Ocurrió un error al aprobar la encuesta'),
            }
        );
    };

    const handleRejectPoll = (pollId: string) => {
        rejectPoll.mutate(pollId, {
            onSuccess: () => toast.success('Encuesta rechazada. Se reembolsará al usuario.'),
            onError: () => toast.error('Error al rechazar la encuesta'),
        });
    };

    const handleClosePoll = (pollId: string) => {
        closePoll.mutate(pollId, {
            onSuccess: () => toast.success('Encuesta cerrada anticipadamente'),
            onError: () => toast.error('No se pudo cerrar la encuesta'),
        });
    };

    return (
        <div className="flex flex-col gap-6">
            {/* HEADER */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#1c1b1b] border border-[#353534] p-5 rounded-2xl">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <span className="bg-[#d2f000]/15 text-[#d2f000] text-[10px] font-black px-2.5 py-0.5 rounded uppercase">MÓDULO DE ENCUESTAS</span>
                    </div>
                    <h2 className="text-xl md:text-2xl font-black text-[#e5e2e1] uppercase">Gestión de Encuestas</h2>
                </div>
                <button onClick={() => setIsCreateModalOpen(true)} className="bg-[#d2f000] text-[#191e00] font-black text-xs px-5 py-3 rounded-xl flex items-center gap-2 hover:bg-[#b8d100] transition-colors">
                    <PlusCircle className="w-4 h-4" /> NUEVA ENCUESTA OFICIAL
                </button>
            </div>

            {/* TABS */}
            <div className="flex items-center gap-3 border-b border-[#353534] pb-3">
                <button onClick={() => setActiveTab('pending')} className={`px-4 py-2.5 rounded-xl font-extrabold text-xs uppercase flex items-center gap-2 ${activeTab === 'pending' ? 'bg-[#d2f000] text-[#191e00]' : 'bg-[#1c1b1b] text-[#c6c9ab] hover:bg-[#222120]'}`}>
                    <Clock className="w-4 h-4" /> Pendientes ({pendingPolls.length})
                </button>
                <button onClick={() => setActiveTab('active')} className={`px-4 py-2.5 rounded-xl font-extrabold text-xs uppercase flex items-center gap-2 ${activeTab === 'active' ? 'bg-[#d2f000] text-[#191e00]' : 'bg-[#1c1b1b] text-[#c6c9ab] hover:bg-[#222120]'}`}>
                    <BarChart2 className="w-4 h-4" /> Activas ({activePolls.length})
                </button>
            </div>

            {/* TAB CONTENT - PENDIENTES */}
            {activeTab === 'pending' && (
                isLoadingPending ? (
                    <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 text-[#d2f000] animate-spin" /></div>
                ) : pendingPolls.length === 0 ? (
                    <div className="bg-[#1c1b1b] border border-[#353534] rounded-2xl p-10 text-center flex flex-col items-center gap-3">
                        <CheckCircle2 className="w-12 h-12 text-[#d2f000]" />
                        <h3 className="font-extrabold text-[#e5e2e1]">¡No hay encuestas pendientes!</h3>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {pendingPolls.map((poll: AdminPollItem) => (
                            <PendingPollCard key={poll.id} poll={poll} onReject={handleRejectPoll} onApprove={(p) => setApproveModalPoll(p)} />
                        ))}
                    </div>
                )
            )}

            {/* TAB CONTENT - ACTIVAS */}
            {activeTab === 'active' && (
                isLoadingActive ? (
                    <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 text-[#d2f000] animate-spin" /></div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {activePolls.map((poll: AdminPollItem) => (
                            <ActivePollCard key={poll.id} poll={poll} onClosePoll={handleClosePoll} />
                        ))}
                    </div>
                )
            )}

            {/* MODALS */}
            {isCreateModalOpen && (
                <CreatePollModal
                    onClose={() => setIsCreateModalOpen(false)}
                    onSubmit={handleCreateOfficialPoll}
                />
            )}

            {approveModalPoll && (
                <ApprovePollModal
                    poll={approveModalPoll}
                    onClose={() => setApproveModalPoll(null)}
                    onConfirm={handleApprovePoll}
                />
            )}
        </div>
    );
};