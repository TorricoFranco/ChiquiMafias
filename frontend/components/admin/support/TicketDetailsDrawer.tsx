'use client';

import { useState } from 'react';
import { useReplyTicket } from '@/hook/react-query/useSupport';
import { useUpdateTicketStatus, useAdminTicketDetails } from '@/hook/react-query/useAdminSupport';
import { TicketStatus } from '@/services/supportApi';
import { Loader2 } from 'lucide-react'; // Ideal si usás lucide-react para los íconos

interface TicketDetailsDrawerProps {
    ticketId: string;
    onClose: () => void;
}

export default function TicketDetailsDrawer({ ticketId, onClose }: TicketDetailsDrawerProps) {
    const [replyText, setReplyText] = useState('');

    // Queries y Mutations
    const { data: ticket, isLoading, isError } = useAdminTicketDetails(ticketId);
    const replyMutation = useReplyTicket(ticketId);
    const updateStatusMutation = useUpdateTicketStatus();

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyText.trim()) return;

        replyMutation.mutate(
            { message: replyText },
            {
                onSuccess: () => setReplyText(''),
            }
        );
    };

    const handleStatusChange = (newStatus: TicketStatus) => {
        updateStatusMutation.mutate({ ticketId, status: newStatus });
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            {/* Fondo oscuro (Overlay) */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Contenedor del Panel Lateral - Diseño Dark */}
            <div className="relative w-full max-w-xl bg-[#1e1e1e] h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">

                {isLoading ? (
                    // 1. ESTADO DE CARGA FLUIDO
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                        <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
                        <p>Cargando información del ticket...</p>
                    </div>
                ) : isError || !ticket ? (
                    // 2. ESTADO DE ERROR
                    <div className="flex-1 flex flex-col items-center justify-center text-red-400">
                        <p>Ocurrió un error al cargar el ticket.</p>
                        <button onClick={onClose} className="mt-4 text-blue-500 hover:underline">Cerrar panel</button>
                    </div>
                ) : (
                    // 3. CONTENIDO REAL
                    <>
                        {/* Cabecera del Drawer */}
                        <div className="p-6 border-b border-gray-800 flex items-center justify-between bg-[#151515]">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        Creado por: <span className="text-blue-400">{ticket.user?.username || 'Usuario Desconocido'}</span>
                                    </span>
                                </div>
                                <h2 className="text-xl font-bold text-white mt-0.5">{ticket.subject}</h2>
                                <p className="text-[10px] text-gray-600 font-mono mt-1 bg-black/20 p-1 rounded inline-block">
                                    ID Usuario: {ticket.userId}
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-800 transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Barra de Control de Estado */}
                        <div className="px-6 py-3 bg-[#1a2332] border-b border-blue-900/50 flex items-center justify-between gap-4">
                            <span className="text-sm font-medium text-blue-400">Estado del Ticket:</span>
                            <select
                                value={ticket.status}
                                disabled={updateStatusMutation.isPending}
                                onChange={(e) => handleStatusChange(e.target.value as TicketStatus)}
                                className="border border-gray-700 rounded-md px-3 py-1.5 text-sm bg-[#151515] font-semibold text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                            >
                                <option value="OPEN">Abierto (OPEN)</option>
                                <option value="UNDER_REVIEW">En Revisión (UNDER_REVIEW)</option>
                                <option value="RESOLVED">Resuelto (RESOLVED)</option>
                                <option value="CLOSED">Cerrado (CLOSED)</option>
                            </select>
                        </div>

                        {/* Hilo de Conversación */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#151515]">
                            {ticket.messages?.map((msg: any) => {
                                const isUser = msg.senderId === ticket.userId;

                                return (
                                    <div
                                        key={msg.id}
                                        className={`flex flex-col max-w-[85%] ${isUser ? 'mr-auto items-start' : 'ml-auto items-end'}`}
                                    >
                                        <div className={`p-4 rounded-2xl text-sm ${isUser
                                            ? 'bg-[#252525] border border-gray-800 text-gray-200 rounded-tl-none'
                                            : 'bg-blue-600 text-white rounded-tr-none'
                                            }`}>

                                            <p className="whitespace-pre-wrap break-words">{msg.message}</p>

                                            {/* RENDERIZADO DE LA IMAGEN */}
                                            {msg.screenshotUrl && (
                                                <div className="mt-3">
                                                    <a
                                                        href={msg.screenshotUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        title="Abrir imagen en tamaño completo"
                                                        className="block"
                                                    >
                                                        <img
                                                            src={msg.screenshotUrl}
                                                            alt="Captura adjunta del usuario"
                                                            className="max-w-full h-auto max-h-[300px] rounded-lg border border-white/10 hover:opacity-80 transition-opacity object-contain bg-black/20"
                                                            loading="lazy"
                                                        />
                                                    </a>
                                                </div>
                                            )}
                                        </div>

                                        <span className="text-[11px] text-gray-500 mt-1 px-1">
                                            {isUser ? ticket.user?.username : 'Soporte Técnico'} • {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Formulario de Respuesta */}
                        <div className="p-4 border-t border-gray-800 bg-[#1e1e1e]">
                            {ticket.status === 'CLOSED' ? (
                                <div className="p-3 bg-gray-800 rounded-lg text-center text-sm text-gray-400 font-medium">
                                    El ticket está cerrado. Cambiá el estado arriba para poder responder.
                                </div>
                            ) : (
                                <form onSubmit={handleSendMessage} className="flex gap-2">
                                    <input
                                        type="text"
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        placeholder="Escribí una respuesta oficial..."
                                        disabled={replyMutation.isPending}
                                        className="flex-1 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-[#2a2a2a] text-white transition-all disabled:opacity-60 placeholder-gray-500"
                                    />
                                    <button
                                        type="submit"
                                        disabled={replyMutation.isPending || !replyText.trim()}
                                        className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-5 py-3 rounded-xl text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[100px]"
                                    >
                                        {replyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Responder'}
                                    </button>
                                </form>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}