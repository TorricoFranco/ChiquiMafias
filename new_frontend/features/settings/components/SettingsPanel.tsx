"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useUserStore } from "@/store/useUserStore";
import { useSubscriptions } from "@/features/subscriptions/hooks/useSubcriptions";

interface SettingsPanelProps {
    onClose: () => void;
}

export default function SettingsPanel({ onClose }: SettingsPanelProps) {
    const logout = useUserStore((state) => state.logout);
    const userTier = useUserStore((state) => state.tier);

    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    const { cancelSubscription, isCanceling } = useSubscriptions();

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            await logout();
            onClose();
        } catch (error) {
            console.error("Error al cerrar sesión", error);
            setIsLoggingOut(false);
        }
    };

    const handleConfirmCancel = () => {
        cancelSubscription(undefined, {
            onSuccess: () => {
                alert("Suscripción cancelada. Seguirás teniendo tus beneficios hasta fin de mes.");
                setShowCancelModal(false);
                onClose();
            }
        });
    };

    const modalContent = showCancelModal ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div
                role="alertdialog"
                aria-modal="true"
                aria-label="¿Cancelar suscripción?"
                className="bg-[#1e1e1e] border border-gray-700 rounded-xl p-6 w-full max-w-md shadow-2xl"
            >
                <div className="flex items-center gap-3 mb-4 text-red-500">
                    <span aria-hidden="true" className="material-symbols-outlined text-3xl">warning</span>
                    <h3 className="text-xl font-bold text-gray-100">¿Cancelar suscripción?</h3>
                </div>

                <p className="text-sm text-gray-300 mb-4 leading-relaxed">
                    Tené en cuenta que <strong className="text-white">no se realizarán devoluciones ni reembolsos</strong> del dinero abonado.
                </p>
                <p className="text-sm text-gray-300 mb-6 leading-relaxed">
                    Al confirmar, tu plan no se renovará automáticamente en la próxima fecha de cobro. Vas a seguir manteniendo todos tus beneficios y tu rol en el sistema hasta ese día.
                </p>

                <div className="flex gap-3 pt-2 border-t border-gray-700">
                    <button
                        onClick={() => setShowCancelModal(false)}
                        disabled={isCanceling}
                        className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                    >
                        Volver
                    </button>
                    <button
                        onClick={handleConfirmCancel}
                        disabled={isCanceling}
                        className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isCanceling ? (
                            "Cancelando..."
                        ) : (
                            <>
                                Confirmar baja
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    ) : null;

    return (
        <>
            <div
                role="dialog"
                aria-label="Ajustes"
                className="w-80 bg-[#131313] border border-[#454932] rounded-xl shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200 mx-auto"
            >
                <div className="flex items-center justify-between mb-5 pb-3 border-b border-[#454932]/50">
                    <h3 className="font-['Montserrat',sans-serif] font-bold text-[#e5e2e1] uppercase tracking-wide text-sm flex items-center gap-2">
                        <span aria-hidden="true" className="material-symbols-outlined text-[#c6c9ab] text-lg">
                            settings
                        </span>
                        Ajustes
                    </h3>
                    <button
                        onClick={onClose}
                        aria-label="Cerrar ajustes"
                        className="text-[#c6c9ab] hover:text-white transition-colors flex items-center justify-center cursor-pointer"
                    >
                        <span aria-hidden="true" className="material-symbols-outlined text-lg">close</span>
                    </button>
                </div>

                <div className="space-y-4">
                    {userTier !== 'NONE' && (
                        <button
                            onClick={() => setShowCancelModal(true)}
                            className="w-full flex items-center justify-center gap-2 bg-transparent border border-red-400/30 text-red-400 font-bold py-2 px-4 rounded-lg hover:bg-red-500/10 transition-colors uppercase text-xs cursor-pointer"
                        >
                            <span aria-hidden="true" className="material-symbols-outlined text-sm">
                                block
                            </span>
                            Cancelar Suscripción
                        </button>
                    )}

                    <button
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="w-full flex items-center justify-center gap-2 bg-transparent border border-red-500/50 text-red-500 font-bold py-2 px-4 rounded-lg hover:bg-red-500 hover:text-white transition-colors uppercase text-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        <span aria-hidden="true" className="material-symbols-outlined text-sm">
                            logout
                        </span>
                        {isLoggingOut ? "Cerrando..." : "Cerrar Sesión"}
                    </button>
                </div>
            </div>

            {mounted && showCancelModal && createPortal(modalContent, document.body)}
        </>
    );
}