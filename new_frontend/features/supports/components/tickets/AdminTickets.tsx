import React, { useState } from 'react';
import { AdminTicket, TicketStatus } from '../../types';
import { TicketFilters } from './admin/TicketFilters';
import { TicketListItem } from './admin/TicketListItem';
import { TicketMessagesThread } from './admin/TicketMessagesThread';
import { TicketReplyForm } from './admin/TicketReplyForm';
import { ImageModal } from './admin/ImageModal';
import { Pagination } from '../Pagination';

import {
    useAdminTickets,
    useAdminTicketDetails,
    useAdminUpdateTicketStatus,
    useAdminReplyTicket
} from '../../hooks/useSupports';

export const AdminTickets: React.FC = () => {
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [categoryFilter, setCategoryFilter] = useState('ALL');
    const [search, setSearch] = useState('');
    const [selectedTicketId, setSelectedTicketId] = useState<string>('');
    const [zoomImage, setZoomImage] = useState<string | null>(null);

    const [page, setPage] = useState(1);
    const LIMIT = 10;

    const { mutate: updateTicketStatus } = useAdminUpdateTicketStatus();
    const { mutate: replyTicket, isPending: isReplying } = useAdminReplyTicket();

    const apiStatus = statusFilter === 'ALL' ? undefined : (statusFilter as TicketStatus);
    const apiCategory = categoryFilter === 'ALL' ? undefined : (categoryFilter as any);

    const { data: response, isLoading, isFetching } = useAdminTickets(page, LIMIT, apiStatus, apiCategory);

    const tickets: AdminTicket[] = response?.data || [];
    const meta = response?.meta;

    const activeTicketId = selectedTicketId || tickets[0]?.id;

    const { data: detailedTicket, isLoading: isLoadingDetails } = useAdminTicketDetails(activeTicketId);

    const filteredTickets = tickets.filter((t: AdminTicket) => {
        if (search.trim()) {
            const q = search.toLowerCase();
            return (
                t.subject.toLowerCase().includes(q) ||
                t.user.username.toLowerCase().includes(q) ||
                t.id.toLowerCase().includes(q)
            );
        }
        return true;
    });

    if (isLoading && page === 1) {
        return <div className="flex justify-center items-center h-64 text-[#d2f000]">Cargando tickets...</div>;
    }

    return (
        <>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <div className="lg:col-span-5 flex flex-col gap-3">
                    <TicketFilters
                        search={search}
                        onSearchChange={setSearch}
                        statusFilter={statusFilter}
                        onStatusFilterChange={(s) => { setStatusFilter(s); setPage(1); }}
                        categoryFilter={categoryFilter}
                        onCategoryFilterChange={(c) => { setCategoryFilter(c); setPage(1); }}
                    />
                    <div className={`flex flex-col gap-2 flex-grow overflow-y-auto pr-1 transition-opacity ${isFetching ? 'opacity-50' : 'opacity-100'}`}>
                        {filteredTickets.length === 0 ? (
                            <div className="bg-[#1c1b1b] border border-[#353534] rounded-2xl p-8 text-center text-xs text-[#c6c9ab]">
                                No se encontraron tickets.
                            </div>
                        ) : (
                            filteredTickets.map((ticket: AdminTicket) => (
                                <TicketListItem
                                    key={ticket.id}
                                    ticket={ticket}
                                    isSelected={ticket.id === activeTicketId}
                                    onSelect={setSelectedTicketId}
                                />
                            ))
                        )}
                    </div>
                    {meta && (
                        <div className="mt-auto">
                            <Pagination
                                currentPage={meta.page}
                                lastPage={meta.lastPage}
                                onPageChange={setPage}
                                isFetching={isFetching}
                            />
                        </div>
                    )}
                </div>

                <div className="lg:col-span-7 bg-[#1c1b1b] border border-[#353534] rounded-2xl flex flex-col h-[680px]">
                    {detailedTicket ? (
                        <>
                            <div className="p-4 border-b border-[#353534] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#171717] rounded-t-2xl">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] bg-[#d2f000]/15 text-[#d2f000] font-mono px-2 py-0.5 rounded font-bold">
                                            {detailedTicket.category}
                                        </span>
                                        <span className="text-xs text-[#909378] font-mono">
                                            Ticket #{detailedTicket.id.slice(0, 8)}
                                        </span>
                                    </div>
                                    <h3 className="font-extrabold text-sm text-[#e5e2e1] mt-1">
                                        {detailedTicket.subject}
                                    </h3>
                                    <span className="text-xs text-[#c6c9ab]">
                                        Usuario: <strong>@{detailedTicket.user.username}</strong>
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-[#909378] uppercase">
                                        Estado:
                                    </span>
                                    <select
                                        aria-label="Estado del ticket"
                                        value={detailedTicket.status}
                                        onChange={(e) =>
                                            updateTicketStatus({
                                                ticketId: detailedTicket.id,
                                                status: e.target.value as TicketStatus
                                            })
                                        }
                                        className="bg-[#131313] border border-[#353534] focus:border-[#d2f000] text-xs font-bold text-[#e5e2e1] px-3 py-1.5 rounded-xl outline-none cursor-pointer"
                                    >
                                        <option value="OPEN">🟢 OPEN (Abierto)</option>
                                        <option value="UNDER_REVIEW">🟡 UNDER_REVIEW (En Revisión)</option>
                                        <option value="RESOLVED">🔵 RESOLVED (Resuelto)</option>
                                        <option value="CLOSED">⚫ CLOSED (Cerrado)</option>
                                    </select>
                                </div>
                            </div>

                            {isLoadingDetails ? (
                                <div className="flex items-center justify-center flex-grow text-xs text-[#909378]">
                                    Cargando mensajes...
                                </div>
                            ) : (
                                <TicketMessagesThread
                                    messages={detailedTicket.messages || []}
                                    onZoomImage={setZoomImage}
                                />
                            )}

                            <TicketReplyForm
                                disabled={isReplying}
                                onSendReply={(msg, img) =>
                                    replyTicket({
                                        ticketId: detailedTicket.id,
                                        data: {
                                            message: msg,
                                            screenshotUrl: img || undefined
                                        }
                                    })
                                }
                            />
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-xs text-[#909378]">
                            Seleccioná un ticket de la lista para ver la conversación.
                        </div>
                    )}
                </div>
            </div>

            {zoomImage && (
                <ImageModal imageUrl={zoomImage} onClose={() => setZoomImage(null)} />
            )}
        </>
    );
};