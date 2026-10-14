"use client";

import { LogIn } from "lucide-react";
import { useUserStore } from "@/store/useUserStore";
import type { LoginModalReason } from "@/types/user";

/** Reemplazo de una sección que necesita sesión: explica qué hay del otro lado y abre el login. */
export function LoginPrompt({
    title,
    description,
    reason,
}: {
    title: string;
    description: string;
    reason?: LoginModalReason;
}) {
    const setLoginModalOpen = useUserStore((state) => state.setLoginModalOpen);

    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <div className="w-full max-w-md rounded-2xl border border-[#353534] bg-[#1C1B1B] p-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[#D2F000]/30 bg-[#D2F000]/10">
                    <LogIn className="h-5 w-5 text-[#D2F000]" aria-hidden="true" />
                </div>

                <h2 className="mt-4 font-headline text-2xl font-black uppercase tracking-tight text-[#E5E2E1]">
                    {title}
                </h2>
                <p className="mt-2 text-sm text-[#C6C9AB]">{description}</p>

                <button
                    type="button"
                    onClick={() => setLoginModalOpen(true, reason)}
                    className="mt-6 w-full rounded-xl bg-[#D2F000] px-4 py-3 text-sm font-bold uppercase tracking-wide text-[#191E00] transition-colors hover:bg-[#B8D300] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D2F000]"
                >
                    Iniciar sesión
                </button>
            </div>
        </div>
    );
}
