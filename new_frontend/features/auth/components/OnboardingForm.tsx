"use client";

import { useState } from "react";
import { useUserStore } from "@/store/useUserStore";
import { useTeams } from "@/features/teams/hooks/useTeams";
import { authApi } from "@/features/auth/api/authApi";
import TeamSelectorModal from "./TeamSelectorModal";
import TermsCheckbox, { TERMS_REQUIRED_MESSAGE } from "./TermsCheckbox";
import { CURRENT_TERMS_VERSION } from "@/features/auth/constants/terms";

export default function OnboardingForm({ onComplete }: { onComplete: () => void }) {
    const [username, setUsername] = useState("");
    const [selectedTeam, setSelectedTeam] = useState<{ id: string; name: string; badgeUrl: string } | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const { data: teams = [] } = useTeams();

    const { setUserInfo } = useUserStore();

    const handleSubmit = async () => {
        setErrorMessage("");

        if (!username.trim()) {
            setErrorMessage("Por favor, ingresá un nombre de usuario.");
            return;
        }
        if (!selectedTeam) {
            setErrorMessage("Por favor, seleccioná tu cuadro de fútbol.");
            return;
        }
        if (!acceptedTerms) {
            setErrorMessage(TERMS_REQUIRED_MESSAGE);
            return;
        }

        setIsLoading(true);
        try {
            const updatedUser = await authApi.completeProfile({
                username,
                teamId: selectedTeam.id,
                acceptTerms: true,
            });

            const currentState = useUserStore.getState();

            setUserInfo({
                ...currentState,
                username: updatedUser.username,
                team: updatedUser.team,
                isFirstLogin: false,
                termsAcceptedAt: updatedUser.termsAcceptedAt ?? new Date().toISOString(),
                termsVersion: updatedUser.termsVersion ?? CURRENT_TERMS_VERSION,
            });

            onComplete();
        } catch (error: any) {
            setErrorMessage(error.message || "Error de conexión con el servidor.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-4">
            <h2 className="text-white text-xl font-semibold">¡Bienvenido! Danos unos datos</h2>

            {/* INPUT DE USERNAME */}
            <div className="flex flex-col gap-1">
                <label htmlFor="onboarding-username" className="text-xs text-gray-400">Nombre de Usuario</label>
                <input
                    id="onboarding-username"
                    className="p-2.5 rounded-xl bg-gray-800 text-white border border-transparent focus:outline-none focus:border-gray-600 transition text-sm"
                    placeholder="Tu nombre de usuario"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />
            </div>

            {/* SELECTOR DE EQUIPO */}
            <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-400">Tu Equipo</label>
                <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="w-full p-2.5 rounded-xl bg-gray-800 border border-transparent hover:border-gray-600 text-left flex items-center justify-between transition text-white text-sm min-h-[46px]"
                >
                    {selectedTeam ? (
                        <div className="flex items-center space-x-3">
                            <img
                                src={selectedTeam.badgeUrl}
                                alt={selectedTeam.name}
                                className="w-6 h-6 object-contain"
                            />
                            <span className="font-medium text-white">{selectedTeam.name}</span>
                        </div>
                    ) : (
                        <span className="text-gray-500">-- Seleccioná tu club --</span>
                    )}
                    <span className="text-xs text-sky-400 font-bold uppercase tracking-wider pl-2">Buscar</span>
                </button>
            </div>

            <TermsCheckbox checked={acceptedTerms} onChange={setAcceptedTerms} disabled={isLoading} />

            {/* MENSAJE DE ERROR */}
            {errorMessage && (
                <p role="alert" className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-2 rounded-lg">
                    {errorMessage}
                </p>
            )}

            {/* BOTÓN SUBMIT */}
            <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 p-2.5 rounded-xl text-white font-semibold transition mt-2 text-sm"
            >
                {isLoading ? "Guardando..." : "Empezar a chatear"}
            </button>

            <TeamSelectorModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                teams={teams}
                onSelect={(id, name, badgeUrl) => {
                    setSelectedTeam({ id, name, badgeUrl });
                    setIsModalOpen(false);
                }}
            />
        </div>
    );
}