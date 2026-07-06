"use client";

import { useEffect, useRef } from "react";
import { useUserStore } from "@/store/useUserStore";

declare global {
  interface Window {
    google: any;
  }
}

interface GoogleLoginButtonProps {
  onSuccess: (user: { id: string; name: string; isFirstLogin: boolean }) => void;
}

export default function GoogleLoginButton({ onSuccess }: GoogleLoginButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const { setUserInfo } = useUserStore();

  useEffect(() => {
    const interval = setInterval(() => {
      if (window.google && buttonRef.current) {
        clearInterval(interval);

        window.google.accounts.id.initialize({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
          callback: async (response: any) => {
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
                accessToken: data.access_token,
                team: data.user.team,
              });

              onSuccess(data.user);

            } catch (error) {
              console.error("Error al loguear con Google:", error);
            }
          },
        });

        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: "outline",
          size: "large",
          shape: "pill",
        });
      }
    }, 100);

    return () => clearInterval(interval);
  }, [onSuccess, setUserInfo]);

  return <div ref={buttonRef} className="flex justify-center w-full" />;
}