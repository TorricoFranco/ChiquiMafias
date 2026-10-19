"use client";

import { LogIn } from "lucide-react";
import { useUserStore } from "@/store/useUserStore";

/**
 * Reemplaza la barra de escritura cuando no hay sesión: la tribuna se lee sin cuenta,
 * pero escribir, mandar stickers y usar el megáfono piden estar autenticado.
 */
export function ChatLoginBar() {
    const setLoginModalOpen = useUserStore((state) => state.setLoginModalOpen);

    return (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-[#353534] bg-[#1C1B1B] px-4 py-3">
            <p className="text-xs text-[#C6C9AB]">
                Estás mirando la tribuna. Entrá para escribir.
            </p>
            <button
                type="button"
                onClick={() => setLoginModalOpen(true, "chat")}
                aria-label="Entrar para escribir en el chat"
                className="flex flex-shrink-0 items-center gap-1.5 rounded-xl bg-[#D2F000] px-3.5 py-2 text-[10px] font-black uppercase tracking-tighter text-[#191E00] transition-colors hover:bg-[#B8D300] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D2F000]"
            >
                <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
                Entrar
            </button>
        </div>
    );
}
