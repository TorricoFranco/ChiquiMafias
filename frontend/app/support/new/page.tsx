"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCreateTicket } from "@/hook/react-query/useSupport";
import Link from "next/link";
import { ArrowLeft, Send, Loader2, ImagePlus, X } from "lucide-react";
import { TicketCategory } from "@/services/supportApi";
import { uploadToCloudinary } from "@/lib/uploadHelper";

export default function NewTicketPage() {
    const router = useRouter();
    const createTicket = useCreateTicket();

    const [subject, setSubject] = useState("");
    const [category, setCategory] = useState<TicketCategory>("SUPPORT");
    const [message, setMessage] = useState("");

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!subject.trim() || !message.trim()) return;

        let screenshotUrl = undefined;
        setIsUploading(true);

        if (selectedFile) {
            try {
                screenshotUrl = await uploadToCloudinary(selectedFile);
            } catch (error) {
                alert("No se pudo subir la imagen adjunta. Intentá de nuevo.");
                setIsUploading(false);
                return; 
            }
        }

        createTicket.mutate(
            { subject, category, message, screenshotUrl },
            {
                onSuccess: () => {
                    setIsUploading(false);
                    router.push("/support");
                },
                onError: () => {
                    setIsUploading(false);
                    alert("Hubo un error al crear el ticket.");
                }
            }
        );
    };

    return (
        <div className="max-w-2xl mx-auto p-6">
            <Link href="/support" className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 w-fit transition-colors">
                <ArrowLeft className="w-4 h-4" />
                Volver a mis tickets
            </Link>

            <div className="bg-[#1e1e1e] border border-gray-800 rounded-xl p-6 shadow-lg">
                <h1 className="text-2xl font-bold text-white mb-2">Abrir nuevo ticket</h1>
                <p className="text-sm text-gray-400 mb-6">Describí tu problema con el mayor detalle posible e incluí una captura si es necesario.</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Select de Categoría */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Categoría</label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value as TicketCategory)}
                            className="w-full bg-[#2a2a2a] border border-gray-700 text-white rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        >
                            <option value="SUPPORT">Soporte General / Bug</option>
                            <option value="APPEAL">Apelar una Sanción (Ban/Mute)</option>
                            <option value="OTHER">Otro</option>
                        </select>
                    </div>

                    {/* Input de Asunto */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Asunto</label>
                        <input
                            type="text"
                            required
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="Ej: Problema al comprar..."
                            className="w-full bg-[#2a2a2a] border border-gray-700 text-white rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                    </div>

                    {/* Textarea de Mensaje */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Mensaje Inicial</label>
                        <textarea
                            required
                            rows={5}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Explicá tu situación detalladamente..."
                            className="w-full bg-[#2a2a2a] border border-gray-700 text-white rounded-lg px-4 py-2.5 resize-none focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                    </div>

                    {/* Zona de Adjuntos */}
                    <div className="bg-[#151515] border border-gray-800 p-4 rounded-lg">
                        <label className="block text-sm font-medium text-gray-300 mb-2">Captura de pantalla (Opcional)</label>

                        <input
                            type="file"
                            accept="image/png, image/jpeg, image/webp"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                        />

                        {selectedFile ? (
                            <div className="flex items-center justify-between bg-[#2a2a2a] border border-gray-700 p-3 rounded-lg text-sm text-gray-300">
                                <span className="truncate flex-1">{selectedFile.name}</span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedFile(null);
                                        if (fileInputRef.current) fileInputRef.current.value = "";
                                    }}
                                    className="text-gray-400 hover:text-red-400 ml-4 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white bg-[#2a2a2a] hover:bg-[#333] border border-gray-700 px-4 py-2 rounded-lg transition-colors w-fit"
                            >
                                <ImagePlus className="w-4 h-4" />
                                Adjuntar imagen
                            </button>
                        )}
                    </div>

                    {/* Botón de Submit */}
                    <div className="pt-4 border-t border-gray-800 flex justify-end">
                        <button
                            type="submit"
                            disabled={createTicket.isPending || isUploading}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {(createTicket.isPending || isUploading) ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Send className="w-5 h-5" />
                            )}
                            {isUploading ? "Subiendo imagen..." : createTicket.isPending ? "Enviando..." : "Enviar Ticket"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}