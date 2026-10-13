"use client";

import { useEffect, useRef } from "react";
import { useUserStore } from "@/store/useUserStore";

const GOOGLE_LOGIN_ERROR = "No pudimos iniciar sesión con Google. Probá de nuevo en un momento.";
const GSI_UNAVAILABLE_ERROR = "No pudimos cargar el acceso con Google. Probá recargar la página.";
const GSI_POLL_MS = 100;
const GSI_TIMEOUT_MS = 5000;

interface GoogleLoginButtonProps {
    onSuccess: (user: { id: string; name: string; isFirstLogin: boolean }) => void;
    /** Recibe el mensaje a mostrar; "" lo limpia. */
    onError?: (message: string) => void;
}

export default function GoogleLoginButton({ onSuccess, onError }: GoogleLoginButtonProps) {
    const buttonRef = useRef<HTMLDivElement>(null);
    // Refs y no estado: sobreviven a los re-runs del efecto, así que el aviso de timeout no se reinicia.
    const gsiWaitedMsRef = useRef(0);
    const gsiUnavailableShownRef = useRef(false);
    const { setUserInfo } = useUserStore();

    useEffect(() => {
        const interval = setInterval(() => {
            if (window.google && buttonRef.current) {
                clearInterval(interval);

                window.google.accounts.id.initialize({
                    client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
                    callback: async (response: { credential: string }) => {
                        try {
                            const res = await fetch(
                                `${process.env.NEXT_PUBLIC_API_URL}/auth/google`,
                                {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    credentials: "include",
                                    body: JSON.stringify({
                                        credential: response.credential,
                                    }),
                                }
                            );

                            const data = await res.json();

                            if (!res.ok) {
                                throw new Error(data.message || "Error en la autenticación");
                            }

                            setUserInfo({
                                id: data.user.id,
                                name: data.user.name,
                                username: data.user.username,
                                role: data.user.role,
                                isFirstLogin: data.user.isFirstLogin,
                                termsAcceptedAt: data.user.termsAcceptedAt ?? null,
                                termsVersion: data.user.termsVersion ?? null,
                                accessToken: data.access_token,
                                team: data.user.team,
                            });

                            onSuccess(data.user);

                        } catch (error) {
                            console.error("Error al loguear con Google:", error);
                            onError?.(GOOGLE_LOGIN_ERROR);
                        }
                    },
                });

                window.google.accounts.id.renderButton(buttonRef.current, {
                    type: "standard",
                    theme: "outline",
                    size: "large",
                    shape: "pill",
                });

                // Google llegó después del aviso: lo sacamos. No toca otros errores (p. ej. un login fallido).
                if (gsiUnavailableShownRef.current) {
                    gsiUnavailableShownRef.current = false;
                    onError?.("");
                }
            } else if (gsiWaitedMsRef.current < GSI_TIMEOUT_MS) {
                // El sondeo sigue: si Google llega más tarde, el botón se dibuja igual.
                gsiWaitedMsRef.current += GSI_POLL_MS;
                if (gsiWaitedMsRef.current >= GSI_TIMEOUT_MS) {
                    gsiUnavailableShownRef.current = true;
                    onError?.(GSI_UNAVAILABLE_ERROR);
                }
            }
        }, GSI_POLL_MS);

        return () => clearInterval(interval);
    }, [onSuccess, onError, setUserInfo]);

    return <div ref={buttonRef} className="flex justify-center w-full" />;
}