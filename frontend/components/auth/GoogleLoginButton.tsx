"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    google: any;
  }
}

export default function GoogleLoginButton({
  onSuccess,
}: {
  onSuccess: () => void;
}) {
  const buttonRef = useRef<HTMLDivElement>(null);
  console.log(process.env.NEXT_PUBLIC_API_URL,process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID)
  useEffect(() => {
    const interval = setInterval(() => {
      if (window.google && buttonRef.current) {
        clearInterval(interval);

        window.google.accounts.id.initialize({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
          callback: async (response: any) => {
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

            const { token } = await res.json();
            localStorage.setItem("token", token);

            onSuccess();
          },
        });

        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: "outline",
          size: "large",
        });
      }
    }, 100);

    return () => clearInterval(interval);
  }, [onSuccess]);

  return <div ref={buttonRef} />;
}
