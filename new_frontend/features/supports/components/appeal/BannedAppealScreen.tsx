"use client";

import { useState } from "react";
import { Ban, Loader2, LogOut, Send, ShieldCheck, User } from "lucide-react";
import { useUserStore } from "@/store/useUserStore";
import { useCreateTicket, useMyTicketDetails, useMyTickets, useReplyTicket } from "../../hooks/useSupports";
import { MyTicket, MyTicketDetails, TicketStatus } from "../../types";
import { TICKET_MESSAGE_MAX_LENGTH } from "../../constants";

const APPEAL_SUBJECT = "Apelación de suspensión de cuenta";
const MIN_MESSAGE_LENGTH = 10;

const STATUS_LABEL: Record<TicketStatus, string> = {
    OPEN: "Enviada, esperando revisión",
    UNDER_REVIEW: "En revisión por el staff",
    RESOLVED: "Resuelta",
    CLOSED: "Cerrada",
};

const isInProgress = (ticket: MyTicket) => ticket.status === "OPEN" || ticket.status === "UNDER_REVIEW";

export default function BannedAppealScreen() {
    const logout = useUserStore((state) => state.logout);
    const currentUserId = useUserStore((state) => state.id);

    const { data: tickets = [], isLoading } = useMyTickets();
    const appeals = tickets.filter((ticket: MyTicket) => ticket.category === "APPEAL");
    const activeAppeal = appeals.find(isInProgress);
    const lastAppeal = appeals[0];

    return (
        <main className="flex min-h-screen w-full items-center justify-center bg-[#050505] px-4 py-10 text-[#e5e2e1]">
            <div className="flex w-full max-w-xl flex-col gap-6">
                <header className="flex flex-col items-center gap-4 text-center">
                    <div className="rounded-full border border-[#FFB4AB]/30 bg-[#D30017]/15 p-4 text-[#FFB4AB]">
                        <Ban className="h-10 w-10" />
                    </div>
                    <h1 className="font-headline text-3xl font-black uppercase tracking-tight text-[#FFB4AB]">
                        Acceso Suspendido
                    </h1>
                    <p className="max-w-md text-sm leading-relaxed text-[#C6C9AB]">
                        Tu cuenta fue suspendida por irregularidades con los métodos de pago o por comportamiento indebido en la tribuna.
                        Si creés que es un error, podés apelar y el staff va a revisar tu caso.
                    </p>
                </header>

                <section aria-label="Apelación" className="rounded-2xl border border-[#353534] bg-[#131313] p-5">
                    {isLoading ? (
                        <div className="flex justify-center py-8 text-[#D2F000]">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : activeAppeal ? (
                        <AppealThread ticket={activeAppeal} currentUserId={currentUserId} />
                    ) : (
                        <AppealForm previousAppealClosed={Boolean(lastAppeal)} />
                    )}
                </section>

                <button
                    onClick={() => logout()}
                    className="mx-auto flex items-center gap-2 rounded-xl border border-[#353534] bg-[#1C1B1B] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-[#C6C9AB] transition-colors hover:bg-[#2A2A2A] hover:text-[#E5E2E1]"
                >
                    <LogOut className="h-4 w-4" />
                    Salir de la cuenta
                </button>
            </div>
        </main>
    );
}

function AppealForm({ previousAppealClosed }: { previousAppealClosed: boolean }) {
    const [message, setMessage] = useState("");
    const createTicket = useCreateTicket();
    const isValid = message.trim().length >= MIN_MESSAGE_LENGTH;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValid || createTicket.isPending) return;
        createTicket.mutate({ category: "APPEAL", subject: APPEAL_SUBJECT, message: message.trim() });
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <h2 className="text-sm font-black uppercase tracking-wider text-[#E5E2E1]">Apelar la suspensión</h2>
            {previousAppealClosed && (
                <p className="text-xs text-[#909378]">Tu apelación anterior ya fue cerrada por el staff. Podés enviar una nueva.</p>
            )}
            <label htmlFor="appeal-message" className="text-xs font-bold text-[#C6C9AB]">
                Contanos por qué creés que la suspensión es un error
            </label>
            <textarea
                id="appeal-message"
                rows={5}
                maxLength={TICKET_MESSAGE_MAX_LENGTH}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full resize-none rounded-xl border border-[#353534] bg-[#1C1B1B] p-3 text-xs text-[#E5E2E1] outline-none transition-colors focus:border-[#D2F000]"
            />
            <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] text-[#909378]">Mínimo {MIN_MESSAGE_LENGTH} caracteres</span>
                <button
                    type="submit"
                    disabled={!isValid || createTicket.isPending}
                    className="flex items-center gap-1.5 rounded-xl bg-[#D2F000] px-5 py-2.5 text-xs font-black uppercase tracking-wider text-[#191E00] transition-all hover:bg-[#B8D300] disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {createTicket.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Enviar apelación
                </button>
            </div>
            {createTicket.isError && (
                <p role="alert" className="text-xs text-[#FFB4AB]">
                    No pudimos enviar tu apelación. Probá de nuevo en unos minutos.
                </p>
            )}
        </form>
    );
}

function AppealThread({ ticket, currentUserId }: { ticket: MyTicket; currentUserId: string | null }) {
    const [reply, setReply] = useState("");
    const { data } = useMyTicketDetails(ticket.id);
    const details = data as MyTicketDetails | undefined;
    const replyTicket = useReplyTicket(ticket.id);
    const canSend = reply.trim().length >= 2 && !replyTicket.isPending;

    const handleReply = (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSend) return;
        replyTicket.mutate({ message: reply.trim() }, { onSuccess: () => setReply("") });
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-black uppercase tracking-wider text-[#E5E2E1]">Tu apelación</h2>
                <span className="rounded-full border border-[#D2F000]/30 bg-[#D2F000]/10 px-3 py-1 text-[10px] font-extrabold uppercase text-[#D2F000]">
                    {STATUS_LABEL[ticket.status]}
                </span>
            </div>

            <ol aria-label="Conversación con el staff" className="flex max-h-80 flex-col gap-3 overflow-y-auto">
                {details?.messages.map((msg) => {
                    const isMe = msg.senderId === currentUserId;
                    return (
                        <li key={msg.id} className={`flex flex-col gap-1 ${isMe ? "items-end" : "items-start"}`}>
                            <span className="flex items-center gap-1 text-[10px] font-bold text-[#909378]">
                                {isMe ? <User className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3 text-[#D2F000]" />}
                                {isMe ? "Vos" : `Staff (@${msg.sender.username})`}
                            </span>
                            <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl border border-[#353534] bg-[#1C1B1B] p-3 text-xs leading-relaxed">
                                {msg.message}
                            </p>
                        </li>
                    );
                })}
            </ol>

            <form onSubmit={handleReply} className="flex flex-col gap-2 border-t border-[#353534] pt-3">
                <label htmlFor="appeal-reply" className="text-xs font-bold text-[#C6C9AB]">
                    Agregar información a tu apelación
                </label>
                <textarea
                    id="appeal-reply"
                    rows={3}
                    maxLength={TICKET_MESSAGE_MAX_LENGTH}
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    className="w-full resize-none rounded-xl border border-[#353534] bg-[#1C1B1B] p-3 text-xs text-[#E5E2E1] outline-none transition-colors focus:border-[#D2F000]"
                />
                <button
                    type="submit"
                    disabled={!canSend}
                    className="ml-auto flex items-center gap-1.5 rounded-xl bg-[#D2F000] px-5 py-2.5 text-xs font-black uppercase tracking-wider text-[#191E00] transition-all hover:bg-[#B8D300] disabled:cursor-not-allowed disabled:opacity-40"
                >
                    <Send className="h-4 w-4" />
                    Enviar respuesta
                </button>
                {replyTicket.isError && (
                    <p role="alert" className="text-xs text-[#FFB4AB]">
                        No pudimos enviar tu mensaje. Probá de nuevo.
                    </p>
                )}
            </form>
        </div>
    );
}
