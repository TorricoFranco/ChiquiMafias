import React, { useState, useRef } from 'react';
import {
    ArrowLeft,
    Clock,
    CheckCircle2,
    AlertCircle,
    HelpCircle,
    Scale,
    MessageSquare,
    Send,
    Image as ImageIcon,
    Bot,
    ShieldCheck,
    User,
    X,
    RefreshCw,
    Loader2
} from 'lucide-react';
import {
    MyTicketDetails,
    TicketMessagePayload,
    TicketStatus,
    TicketCategory,
} from '../../types';
import { uploadToCloudinary } from "@/lib/uploadHelper";

interface UserTicketDetailProps {
    ticket: MyTicketDetails;
    currentUserId: string;
    onBack: () => void;
    onSendMessage: (ticketId: string, payload: TicketMessagePayload) => void;
    onRefresh?: () => void;
    isRefreshing?: boolean;
}

export const UserTicketDetail: React.FC<UserTicketDetailProps> = ({
    ticket,
    currentUserId,
    onBack,
    onSendMessage,
    onRefresh,
    isRefreshing = false,
}) => {
    const [replyText, setReplyText] = useState('');
    const [screenshotUrl, setScreenshotUrl] = useState('');
    const [showScreenshotInput, setShowScreenshotInput] = useState(false);
    const [previewImageModal, setPreviewImageModal] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isUploading, setIsUploading] = useState(false)
    const canReply = ticket.status !== 'CLOSED';
    const isReplyValid = replyText.trim().length >= 2;
    const isValidUrl =
        !screenshotUrl.trim() ||
        /^https?:\/\/.+\..+/i.test(screenshotUrl.trim());

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                alert("La imagen no puede pesar más de 2MB.");
                return;
            }
            setSelectedFile(file);
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canReply || !isReplyValid || isUploading) return;

        let finalScreenshotUrl = undefined;
        setIsUploading(true);

        if (selectedFile) {
            try {
                finalScreenshotUrl = await uploadToCloudinary(selectedFile);
            } catch (error) {
                alert("No se pudo subir la imagen. Intentá de nuevo.");
                setIsUploading(false);
                return;
            }
        }

        onSendMessage(ticket.id, {
            message: replyText.trim(),
            screenshotUrl: finalScreenshotUrl,
        });

        setReplyText('');
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setIsUploading(false);
    };

    const getStatusBadge = (status: TicketStatus) => {
        switch (status) {
            case 'OPEN':
                return {
                    label: 'Abierto / En Espera',
                    bg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
                };
            case 'UNDER_REVIEW':
                return {
                    label: 'En Revisión por Staff',
                    bg: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
                };
            case 'RESOLVED':
                return {
                    label: 'Resuelto',
                    bg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
                };
            case 'CLOSED':
                return {
                    label: 'Cerrado Definitivamente',
                    bg: 'bg-neutral-800 text-[#909378] border-neutral-700',
                };
        }
    };

    const getCategoryBadge = (category: TicketCategory) => {
        switch (category) {
            case 'SUPPORT':
                return {
                    label: 'Soporte Técnico',
                    icon: HelpCircle,
                    color: 'text-blue-400',
                };
            case 'APPEAL':
                return {
                    label: 'Apelación de Sanción',
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

    const statusInfo = getStatusBadge(ticket.status);
    const categoryInfo = getCategoryBadge(ticket.category);
    const CategoryIcon = categoryInfo.icon;

    return (
        <div className="flex flex-col gap-4">
            {/* Top Header bar with navigation */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#1c1b1b] border border-[#353534] p-4 rounded-2xl">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBack}
                        className="p-2 bg-[#2a2a2a] hover:bg-[#353534] text-[#c6c9ab] hover:text-[#e5e2e1] rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span className="hidden sm:inline">Volver a la lista</span>
                    </button>

                    <div>
                        <div className="flex items-center gap-2">
                            <CategoryIcon className={`w-4 h-4 ${categoryInfo.color}`} />
                            <span className="text-[11px] font-bold text-[#909378] uppercase">
                                {categoryInfo.label}
                            </span>
                            <span className="text-[10px] text-[#555]">•</span>
                            <span className="font-mono text-[11px] text-[#c6c9ab]">
                                ID: #{ticket.id.slice(0, 8)}
                            </span>
                        </div>
                        <h2 className="text-base font-black text-[#e5e2e1] mt-0.5 leading-snug">
                            {ticket.subject}
                        </h2>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {onRefresh && (
                        <button
                            onClick={onRefresh}
                            disabled={isRefreshing}
                            className="p-2 bg-[#2a2a2a] hover:bg-[#353534] text-[#c6c9ab] hover:text-[#d2f000] rounded-xl transition-colors cursor-pointer"
                            title="Refrescar hilo de mensajes"
                        >
                            <RefreshCw
                                className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#d2f000]' : ''}`}
                            />
                        </button>
                    )}

                    <span
                        className={`text-[10px] font-extrabold uppercase px-3 py-1.5 rounded-xl border ${statusInfo.bg}`}
                    >
                        {statusInfo.label}
                    </span>
                </div>
            </div>

            {/* Discord Sync Alert (if linked to bot) */}
            {ticket.discordThreadId && (
                <div className="bg-[#5865F2]/10 border border-[#5865F2]/30 p-3.5 rounded-2xl flex items-center justify-between gap-3 text-xs text-[#8aa1ff]">
                    <div className="flex items-center gap-2.5">
                        <Bot className="w-5 h-5 flex-shrink-0 text-[#8aa1ff]" />
                        <div>
                            <span className="font-bold block">Canal de Discord Vinculado</span>
                            <span className="text-[11px] text-[#8aa1ff]/80">
                                Las respuestas de los administradores y moderadores se sincronizan en vivo desde Discord.
                            </span>
                        </div>
                    </div>
                    <span className="font-mono text-[10px] bg-[#5865F2]/20 px-2 py-1 rounded-lg font-bold hidden sm:inline-block">
                        Thread #{ticket.discordThreadId.slice(0, 8)}
                    </span>
                </div>
            )}

            {/* Conversation Thread */}
            <div className="bg-[#1c1b1b] border border-[#353534] rounded-2xl p-4 sm:p-6 flex flex-col gap-4 min-h-[360px] max-h-[600px] overflow-y-auto">
                <div className="text-center py-2">
                    <span className="text-[10px] font-bold text-[#909378] uppercase tracking-wider bg-[#131313] border border-[#353534] px-3 py-1 rounded-full">
                        Ticket iniciado el {new Date(ticket.createdAt).toLocaleDateString('es-AR', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                        })}
                    </span>
                </div>

                {/* Message items */}
                {ticket.messages.map((msg) => {
                    const isMe = msg.senderId === currentUserId;

                    return (
                        <div
                            key={msg.id}
                            className={`flex flex-col ${isMe ? 'items-end' : 'items-start'
                                } gap-1`}
                        >
                            {/* Sender label & meta */}
                            <div className="flex items-center gap-2 px-1 text-[11px]">
                                {isMe ? (
                                    <>
                                        <span className="text-[#909378] font-mono text-[10px]">
                                            {new Date(msg.createdAt).toLocaleTimeString('es-AR', {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </span>
                                        <span className="font-bold text-[#e5e2e1]">Tú (@{msg.sender.username})</span>
                                        <User className="w-3.5 h-3.5 text-[#d2f000]" />
                                    </>
                                ) : (
                                    <>
                                        <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                                        <span className="font-bold text-blue-300">
                                            {msg.sender.username}
                                        </span>
                                        {msg.fromDiscord && (
                                            <span className="bg-[#5865F2]/20 border border-[#5865F2]/40 text-[#8aa1ff] text-[9px] font-bold px-1.5 py-0.2 rounded flex items-center gap-0.5">
                                                <Bot className="w-2.5 h-2.5" /> Discord
                                            </span>
                                        )}
                                        <span className="text-[#909378] font-mono text-[10px]">
                                            {new Date(msg.createdAt).toLocaleTimeString('es-AR', {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </span>
                                    </>
                                )}
                            </div>

                            {/* Message Bubble */}
                            <div
                                className={`max-w-[85%] sm:max-w-[75%] p-3.5 rounded-2xl text-xs leading-relaxed ${isMe
                                    ? 'bg-[#2a2a29] border border-[#444443] text-[#f0ede6] rounded-tr-none'
                                    : 'bg-[#151a24] border border-blue-500/30 text-[#e5e2e1] rounded-tl-none shadow-sm'
                                    }`}
                            >
                                <p className="whitespace-pre-wrap break-words">{msg.message}</p>

                                {/* Screenshot Attachment */}
                                {msg.screenshotUrl && (
                                    <div className="mt-2.5 pt-2 border-t border-white/10">
                                        <button
                                            type="button"
                                            onClick={() => setPreviewImageModal(msg.screenshotUrl ?? null)}
                                            className="group relative block overflow-hidden rounded-xl border border-white/10 hover:border-[#d2f000] transition-colors cursor-pointer"
                                        >
                                            <img
                                                src={msg.screenshotUrl}
                                                alt="Comprobante adjunto"
                                                referrerPolicy="no-referrer"
                                                className="max-h-48 w-auto rounded-lg object-cover group-hover:scale-105 transition-transform"
                                            />
                                            <span className="absolute bottom-1.5 right-1.5 bg-black/80 text-[10px] text-white px-2 py-0.5 rounded-md backdrop-blur-sm flex items-center gap-1 font-mono">
                                                <ImageIcon className="w-3 h-3" /> Ver comprobante
                                            </span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Reply Section */}
            {canReply ? (
                <form
                    onSubmit={handleSend}
                    className="bg-[#1c1b1b] border border-[#353534] p-4 rounded-2xl flex flex-col gap-3 shadow-md"
                >
                    <div className="flex justify-between items-center text-[11px] text-[#c6c9ab]">
                        <span className="font-bold uppercase tracking-wider flex items-center gap-1.5 text-[#e5e2e1]">
                            <MessageSquare className="w-3.5 h-3.5 text-[#d2f000]" />
                            Escribir Respuesta
                        </span>

                        {/* Botón disparador del input de archivos */}
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="text-[#d2f000] hover:underline flex items-center gap-1 cursor-pointer font-semibold"
                        >
                            <ImageIcon className="w-3.5 h-3.5" />
                            {selectedFile ? 'Cambiar imagen' : '+ Adjuntar imagen'}
                        </button>
                    </div>

                    <input
                        type="file"
                        accept="image/png, image/jpeg, image/webp"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                    />

                    {selectedFile && (
                        <div className="bg-[#131313] border border-[#353534] p-2.5 rounded-xl flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                                <img
                                    src={URL.createObjectURL(selectedFile)}
                                    alt="Vista previa"
                                    className="w-10 h-10 object-cover rounded-lg border border-[#353534]"
                                />
                                <div className="text-[11px] text-[#c6c9ab] overflow-hidden">
                                    <span className="font-bold block text-[#e5e2e1] truncate max-w-[200px]">{selectedFile.name}</span>
                                    <span className="text-[10px] text-[#909378]">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedFile(null);
                                    if (fileInputRef.current) fileInputRef.current.value = '';
                                }}
                                className="text-red-400 hover:text-red-300 text-xs font-bold px-2 py-1"
                            >
                                Quitar
                            </button>
                        </div>
                    )}

                    <textarea
                        rows={3}
                        placeholder="Escribe tu mensaje o aclaración..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="w-full bg-[#131313] border border-[#353534] focus:border-[#d2f000] text-xs text-[#e5e2e1] p-3 rounded-xl outline-none resize-none transition-colors"
                    />

                    <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[#909378]">{replyText.length} caracteres</span>
                        <button
                            type="submit"
                            disabled={!isReplyValid || isUploading}
                            className="bg-[#d2f000] text-[#191e00] hover:bg-[#b8d300] font-black text-xs px-6 py-2.5 rounded-xl uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {isUploading ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Subiendo...
                                </>
                            ) : (
                                <>
                                    <Send className="w-3.5 h-3.5" />
                                    <span>Enviar Mensaje</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            ) : (
                /* Closed Ticket Notice */
                <div className="bg-[#1c1b1b] border border-[#353534] p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-center sm:text-left">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-neutral-800 rounded-xl text-[#909378] mx-auto sm:mx-0">
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="font-bold text-xs text-[#e5e2e1]">
                                Ticket Cerrado Definitivamente
                            </h4>
                            <p className="text-[11px] text-[#909378] mt-0.5">
                                Este caso ya concluyó y no acepta nuevas respuestas. Si tenés otra consulta, podés abrir un nuevo ticket.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onBack}
                        className="bg-[#2a2a2a] hover:bg-[#353534] text-[#e5e2e1] font-bold text-xs px-4 py-2.5 rounded-xl uppercase transition-colors cursor-pointer"
                    >
                        Volver a la lista
                    </button>
                </div>
            )}

            {/* Image Lightbox Modal */}
            {previewImageModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
                    onClick={() => setPreviewImageModal(null)}
                >
                    <div className="relative max-w-3xl w-full max-h-[90vh] flex flex-col items-center">
                        <button
                            onClick={() => setPreviewImageModal(null)}
                            className="absolute -top-10 right-0 bg-black/60 text-white p-2 rounded-full hover:bg-black"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <img
                            src={previewImageModal}
                            alt="Comprobante ampliado"
                            referrerPolicy="no-referrer"
                            className="max-w-full max-h-[80vh] object-contain rounded-xl border border-[#353534]"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
