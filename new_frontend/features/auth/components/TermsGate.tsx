"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useUserStore } from "@/store/useUserStore";
import { authApi } from "@/features/auth/api/authApi";
import TermsCheckbox, { TERMS_REQUIRED_MESSAGE } from "./TermsCheckbox";
import { CURRENT_TERMS_VERSION } from "@/features/auth/constants/terms";

const ACCEPT_ERROR_MESSAGE = "No se pudo registrar la aceptación en este momento. Probá de nuevo más tarde.";

/**
 * Pide la aceptación de Términos y Privacidad a los usuarios que ya tenían cuenta antes de que existiera
 * y a los que aceptaron una versión anterior a la vigente.
 * Los usuarios nuevos la dan en el onboarding (isFirstLogin), por eso acá se ignoran.
 */
export default function TermsGate() {
    const id = useUserStore((state) => state.id);
    const isFirstLogin = useUserStore((state) => state.isFirstLogin);
    const termsAcceptedAt = useUserStore((state) => state.termsAcceptedAt);
    const termsVersion = useUserStore((state) => state.termsVersion);
    const setUserInfo = useUserStore((state) => state.setUserInfo);
    const logout = useUserStore((state) => state.logout);

    const [accepted, setAccepted] = useState(false);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const dialogRef = useRef<HTMLDivElement>(null);

    const isOpen = !!id && !isFirstLogin && (!termsAcceptedAt || termsVersion !== CURRENT_TERMS_VERSION);

    useEffect(() => {
        if (!isOpen) return;

        dialogRef.current?.querySelector<HTMLInputElement>("input[type=checkbox]")?.focus();

        // Es un gate obligatorio: Tab no puede salir del diálogo hacia la app que está detrás.
        const trapFocus = (e: KeyboardEvent) => {
            if (e.key !== "Tab" || !dialogRef.current) return;

            const focusable = Array.from(
                dialogRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input:not([disabled])"),
            );
            if (focusable.length === 0) return;

            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            const active = document.activeElement;

            if (!dialogRef.current.contains(active)) {
                e.preventDefault();
                first.focus();
            } else if (e.shiftKey && active === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && active === last) {
                e.preventDefault();
                first.focus();
            }
        };

        document.addEventListener("keydown", trapFocus);
        return () => document.removeEventListener("keydown", trapFocus);
    }, [isOpen]);

    if (!isOpen) return null;

    const handleAccept = async () => {
        if (isLoading) return;
        if (!accepted) {
            setError(TERMS_REQUIRED_MESSAGE);
            return;
        }

        setError("");
        setIsLoading(true);
        try {
            const result = await authApi.acceptTerms();
            setUserInfo({ termsAcceptedAt: result.termsAcceptedAt, termsVersion: result.termsVersion });
        } catch {
            setError(ACCEPT_ERROR_MESSAGE);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="terms-gate-title"
                aria-describedby="terms-gate-description"
                className="w-full max-w-md rounded-2xl border border-[#353534] bg-[#131313] p-5 shadow-2xl sm:p-8"
            >
                <h2 id="terms-gate-title" className="font-headline text-lg font-black uppercase tracking-wide text-[#E5E2E1]">
                    Actualizamos nuestros términos
                </h2>
                <p id="terms-gate-description" className="mt-2 text-sm text-[#C6C9AB]">
                    Para seguir usando Estadio Digital necesitamos que aceptes los Términos y la Política de Privacidad.
                </p>

                <div className="mt-5">
                    <TermsCheckbox checked={accepted} onChange={setAccepted} disabled={isLoading} />
                </div>

                {error && (
                    <p role="alert" className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 p-2 text-xs text-[#FFB4AB]">
                        {error}
                    </p>
                )}

                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={() => logout()}
                        disabled={isLoading}
                        className="rounded-lg px-4 py-2.5 text-sm font-semibold text-[#C6C9AB] transition-colors hover:text-[#E5E2E1] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D2F000]"
                    >
                        Cerrar sesión
                    </button>
                    <button
                        type="button"
                        onClick={handleAccept}
                        disabled={isLoading}
                        className="flex items-center justify-center gap-2 rounded-lg bg-[#D2F000] px-4 py-2.5 text-sm font-bold text-[#191E00] transition-colors hover:bg-[#B8D300] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D2F000]"
                    >
                        {isLoading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                        Aceptar y continuar
                    </button>
                </div>
            </div>
        </div>
    );
}
