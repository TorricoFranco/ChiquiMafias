"use client";

import { useEffect, useRef } from "react";
import { useUserStore } from "@/store/useUserStore";


declare global {
  interface Window {
    google: any;
  }
}

// Definimos la interfaz para recibir los datos del usuario
interface GoogleLoginButtonProps {
  onSuccess: (user: any) => void;
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
                  body: JSON.stringify({
                    credential: response.credential,
                  }),
                }
              );

              if (!res.ok) throw new Error("Error en la autenticación");


              const { token } = await res.json();
              localStorage.setItem("token", token.access_token);
              setUserInfo({
                id: token.user.id,
                username: token.user.username ?? token.user.name,
                isFirstLogin: token.user.isFirstLogin
              });

                // Ejecutamos la función pasando el objeto user completo { id, name, isFirstLogin }
                onSuccess(token.user);
              
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
  }, [onSuccess]);

  return <div ref={buttonRef} className="flex justify-center w-full" />;
}