"use client";

import { useUserStore } from "@/store/useUserStore";
import { useRouter } from "next/navigation";

export default function BannedScreen() {
    const logout = useUserStore((state) => state.logout);

    const router = useRouter();

    return (
        <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#0d0d0d] px-4 text-center text-white">
            <div className="mb-6 rounded-full bg-red-500/10 p-4 text-red-500 border border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.1)]">
                {/* Ícono de Alerta / Bloqueo */}
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-red-500 sm:text-4xl">
                Acceso Suspendido
            </h1>

            <p className="mt-4 max-w-md text-gray-400 text-sm sm:text-base leading-relaxed">
                Tu cuenta fue desactivada permanentemente debido a irregularidades detectadas con los métodos de pago (Mercado Pago) o comportamiento indebido en los chats de la tribuna.
            </p>

            <div className="mt-8 p-4 rounded-lg bg-[#141414] border border-gray-800 text-left w-full max-w-sm">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">¿Qué puedo hacer?</span>
                <p className="text-xs text-gray-400 mt-1">
                    Si considerás que esto se trata de un error de nuestro sistema, ponete en contacto con soporte técnico adjuntando tus comprobantes de operación.
                </p>
            </div>

            <button
                onClick={() => logout()}
                className="mt-8 rounded-md bg-zinc-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700 transition-colors duration-200"
            >
                Salir de la cuenta
            </button>

            <button
                onClick={() => router.push('/support')}
                className="mt-8 rounded-md bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-500 transition-colors duration-200"
            >
                Ir a Soporte y Apelar
            </button>
        </div>
    );
}