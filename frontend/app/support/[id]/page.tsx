"use client";

import { useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useMyTicketDetails, useReplyTicket } from "@/hook/react-query/useSupport";
import { ArrowLeft, Send, Loader2, Clock, User, ShieldAlert, ImagePlus, X } from "lucide-react";
import clsx from "clsx";
import { uploadToCloudinary } from "@/lib/uploadHelper";

export default function TicketDetailsPage() {
    const params = useParams();
    const ticketId = params.id as string;

    const { data: ticket, isLoading, isError } = useMyTicketDetails(ticketId);
    const replyMutation = useReplyTicket(ticketId);

    const [newMessage, setNewMessage] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    const handleReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() && !selectedFile) return;

        let screenshotUrl = undefined;
        setIsUploading(true); 

        if (selectedFile) {
            try {
                // Llamamos a la función modularizada
                screenshotUrl = await uploadToCloudinary(selectedFile);
            } catch (error) {
                alert("No se pudo subir la imagen. Intentá de nuevo.");
                setIsUploading(false);
                return;
            }
        }

        replyMutation.mutate(
            { message: newMessage, screenshotUrl },
            {
                onSuccess: () => {
                    setNewMessage("");
                    setSelectedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                    setIsUploading(false);
                },
                onError: () => {
                    setIsUploading(false);
                    alert("Error al enviar la respuesta.");
                }
            }
        );
    };

    if (isLoading) return <div className="text-center py-20 text-gray-400">Cargando ticket...</div>;
    if (isError || !ticket) return <div className="text-center py-20 text-red-400">Error al cargar el ticket.</div>;

    const isClosed = ticket.status === "CLOSED" || ticket.status === "RESOLVED";

    return (
        <div className="max-w-3xl mx-auto p-6 h-[calc(100vh-100px)] flex flex-col">
            <Link href="/support" className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 w-fit transition-colors">
                <ArrowLeft className="w-4 h-4" /> Volver
            </Link>

            {/* HEADER DEL TICKET */}
            <div className="bg-[#1e1e1e] border border-gray-800 rounded-t-xl p-5 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                    <h1 className="text-xl font-bold text-white">{ticket.subject}</h1>
                    <span className={clsx(
                        "text-xs font-bold px-3 py-1 rounded-full",
                        ticket.status === 'OPEN' ? 'bg-green-500/10 text-green-400' :
                            ticket.status === 'UNDER_REVIEW' ? 'bg-yellow-500/10 text-yellow-400' :
                                ticket.status === 'RESOLVED' ? 'bg-blue-500/10 text-blue-400' :
                                    'bg-gray-500/10 text-gray-400'
                    )}>
                        {ticket.status}
                    </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {new Date(ticket.createdAt).toLocaleString()}</span>
                    <span className="uppercase font-semibold tracking-wider">{ticket.category}</span>
                </div>
            </div>

            {/* HILO DE MENSAJES */}
            <div className="flex-1 bg-[#151515] border-x border-gray-800 overflow-y-auto p-4 space-y-4">
                {ticket.messages?.map((msg: any) => {
                    const isStaff = msg.senderId !== ticket.userId;

                    return (
                        <div key={msg.id} className={clsx("flex flex-col max-w-[85%]", isStaff ? "mr-auto items-start" : "ml-auto items-end")}>
                            <div className="flex items-center gap-2 mb-1">
                                <span className={clsx("text-xs font-bold flex items-center gap-1", isStaff ? "text-yellow-500" : "text-gray-400")}>
                                    {isStaff ? <ShieldAlert className="w-3 h-3" /> : <User className="w-3 h-3" />}
                                    {isStaff ? "Soporte" : "Vos"}
                                </span>
                                <span className="text-[10px] text-gray-600">
                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            <div className={clsx(
                                "p-3 rounded-xl text-sm whitespace-pre-wrap break-words",
                                isStaff ? "bg-[#252525] text-gray-200 rounded-tl-none border border-gray-700/50" : "bg-blue-600 text-white rounded-tr-none"
                            )}>
                                {msg.message}
                                {/* Renderizado condicional de la imagen adjunta */}
                                {msg.screenshotUrl && (
                                    <div className="mt-2">
                                        <img
                                            src={msg.screenshotUrl}
                                            alt="Evidencia adjunta"
                                            className="max-w-full h-auto rounded-lg border border-white/10"
                                            loading="lazy"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ZONA DE RESPUESTA */}
            <div className="bg-[#1e1e1e] border border-gray-800 rounded-b-xl p-4">
                {isClosed ? (
                    <div className="text-center p-3 bg-gray-800/50 text-gray-400 rounded-lg text-sm border border-gray-700/50">
                        Este ticket fue marcado como <strong>{ticket.status}</strong> y no admite nuevas respuestas.
                    </div>
                ) : (
                    <form onSubmit={handleReply} className="flex flex-col gap-2">
                        {/* Vista previa del archivo seleccionado */}
                        {selectedFile && (
                            <div className="flex items-center justify-between bg-[#2a2a2a] border border-gray-700 p-2 rounded-lg text-sm text-gray-300">
                                <span className="truncate max-w-[200px]">{selectedFile.name}</span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedFile(null);
                                        if (fileInputRef.current) fileInputRef.current.value = "";
                                    }}
                                    className="text-gray-400 hover:text-red-400"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}

                        <div className="flex gap-2 items-end">
                            {/* Input oculto para subir archivos */}
                            <input
                                type="file"
                                accept="image/png, image/jpeg, image/webp"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                            />

                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="bg-[#2a2a2a] hover:bg-[#333] border border-gray-700 text-gray-400 hover:text-white px-3 py-2 rounded-lg transition-colors h-auto aspect-square flex items-center justify-center"
                                title="Adjuntar imagen"
                            >
                                <ImagePlus className="w-5 h-5" />
                            </button>

                            <textarea
                                rows={2}
                                required={!selectedFile} // No es requerido si hay una imagen adjunta
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Escribí tu respuesta acá..."
                                className="flex-1 bg-[#2a2a2a] border border-gray-700 text-white rounded-lg px-4 py-2 resize-none focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
                            />

                            <button
                                type="submit"
                                disabled={replyMutation.isPending || isUploading || (!newMessage.trim() && !selectedFile)}
                                className="bg-blue-600 hover:bg-blue-500 text-white px-4 rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center h-auto aspect-square"
                            >
                                {(replyMutation.isPending || isUploading) ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}