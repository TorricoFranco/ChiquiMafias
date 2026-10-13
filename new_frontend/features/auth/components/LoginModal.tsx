"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Coins, Flame, MessageCircle, Vote, X } from "lucide-react";
import GoogleLoginButton from "./GoogleLoginButton";
import OnboardingForm from "./OnboardingForm";
import type { LoginModalReason } from "@/types/user";

const BENEFITS = [
    { icon: MessageCircle, text: "Chateá con la hinchada mientras se juega" },
    { icon: Coins, text: "Apostá tus Chiqui Coins en los mercados abiertos" },
    { icon: Vote, text: "Votá las encuestas de la comunidad" },
    { icon: Flame, text: "Racha diaria: juntá Chiqui Coins entrando todos los días" },
];

const FOCUSABLE = "a[href], button:not([disabled]), input:not([disabled])";

// Textos que no prometen nada después del login: el envío de stickers no reenvía nada solo, y el voto no se repite.
const REASON_COPY: Record<LoginModalReason, string> = {
    chat: "Entrá para participar en el chat.",
    poll: "Entrá para votar la encuesta.",
};

export default function LoginModal({
    onClose,
    onSuccess,
    reason,
}: {
    onClose: () => void
    onSuccess: () => void;
    reason?: LoginModalReason;
}) {
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [error, setError] = useState("");
    const dialogRef = useRef<HTMLDivElement>(null);

    // Memoizados: los cambios propios del modal (error, paso) no redibujan el botón de Google. Si el padre pasa un onSuccess nuevo, sí lo redibuja (ver GoogleLoginButton).
    const handleGoogleSuccess = useCallback((user: { isFirstLogin?: boolean }) => {
        if (user.isFirstLogin) {
            setShowOnboarding(true);
        } else {
            onSuccess();
        }
    }, [onSuccess]);

    const handleGoogleError = useCallback((message: string) => setError(message), []);

    // Al abrir: el foco entra al diálogo y la página de atrás no scrollea. Al cerrar, el foco vuelve al disparador.
    useEffect(() => {
        const previouslyFocused = document.activeElement as HTMLElement | null;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        dialogRef.current?.focus();

        return () => {
            document.body.style.overflow = previousOverflow;
            previouslyFocused?.focus();
        };
    }, []);

    // Al pasar del login al onboarding se desmonta el botón de Google y el foco caía al body: lo llevamos al diálogo.
    useEffect(() => {
        if (showOnboarding) dialogRef.current?.focus();
    }, [showOnboarding]);

    // Escape cierra solo el paso de login: en el onboarding el usuario ya inició sesión y cerrarlo lo deja a medias.
    // Tab no sale del diálogo mientras está abierto.
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && !showOnboarding) {
                onClose();
                return;
            }
            if (e.key !== "Tab" || !dialogRef.current) return;

            // Con el selector de club abierto (diálogo anidado) el foco se queda dentro de él.
            const scope = dialogRef.current.querySelector<HTMLElement>('[aria-modal="true"]') ?? dialogRef.current;
            const focusable = Array.from(scope.querySelectorAll<HTMLElement>(FOCUSABLE));
            if (focusable.length === 0) return;

            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            const active = document.activeElement;

            if (!scope.contains(active)) {
                e.preventDefault();
                (e.shiftKey ? last : first).focus();
            } else if (e.shiftKey && (active === first || active === scope)) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && active === last) {
                e.preventDefault();
                first.focus();
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [showOnboarding, onClose]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => {
                if (e.target === e.currentTarget && !showOnboarding) onClose();
            }}
            className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
        >
            <motion.div
                ref={dialogRef}
                role="dialog"
                tabIndex={-1}
                aria-modal="true"
                aria-label={showOnboarding ? "Completá tu perfil" : "Iniciá sesión o registrate"}
                initial={{ opacity: 0, y: 32 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="relative max-h-[90dvh] w-full overflow-y-auto rounded-t-3xl border border-[#353534] bg-[#131313] p-6 shadow-2xl outline-none sm:max-w-md sm:rounded-2xl sm:p-8"
            >
                {!showOnboarding ? (
                    <>
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Cerrar"
                            className="absolute right-4 top-4 rounded-full p-2 text-[#909378] transition-colors hover:bg-[#2A2A2A] hover:text-[#E5E2E1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D2F000]"
                        >
                            <X className="h-5 w-5" aria-hidden="true" />
                        </button>

                        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#D2F000]">
                            <span className="live-pulse h-2 w-2 rounded-full bg-[#D2F000]" aria-hidden="true" />
                            La tribuna está abierta
                        </p>

                        <h2 className="mt-3 font-headline text-4xl font-black uppercase leading-[0.95] tracking-tight text-[#E5E2E1]">
                            No te quedes <span className="text-[#D2F000]">afuera</span>
                        </h2>
                        <p className="mt-3 text-sm text-[#C6C9AB]">
                            {reason ? REASON_COPY[reason] : "Entrá con Google y sumate a la conversación de la fecha."}
                        </p>

                        <ul className="mt-6 space-y-3 border-l-2 border-[#D2F000]/40 pl-4">
                            {BENEFITS.map(({ icon: Icon, text }) => (
                                <li key={text} className="flex items-start gap-3 text-sm text-[#E5E2E1]">
                                    <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#D2F000]" aria-hidden="true" />
                                    <span>{text}</span>
                                </li>
                            ))}
                        </ul>

                        <div className="mt-6">
                            {error && (
                                <p role="alert" className="mb-3 rounded-lg border border-[#D30017]/30 bg-[#D30017]/10 p-2 text-xs text-[#FFB4AB]">
                                    {error}
                                </p>
                            )}
                            <GoogleLoginButton onSuccess={handleGoogleSuccess} onError={handleGoogleError} />
                        </div>

                        <p className="mt-4 text-center text-xs text-[#909378]">
                            Si es tu primera vez, después elegís tu usuario y tu cuadro.
                        </p>
                        <button
                            type="button"
                            onClick={onClose}
                            className="mt-2 block w-full rounded-lg py-2.5 text-sm font-semibold text-[#C6C9AB] transition-colors hover:text-[#E5E2E1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D2F000]"
                        >
                            Ahora no
                        </button>
                    </>
                ) : (
                    <OnboardingForm onComplete={onSuccess} />
                )}
            </motion.div>
        </motion.div>
    );
}
