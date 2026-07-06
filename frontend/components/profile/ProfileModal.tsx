"use client";
import { useState, useEffect } from "react";
import { useUserStore } from "@/store/useUserStore";
import { apiFetch } from "@/lib/apiFetch";
import TeamSelectorModal from "../ui/TeamSelectorModal";
import { X, User, Shield, Edit2 } from "lucide-react";

interface Team {
    id: string;
    name: string;
    badgeUrl: string;
    tier: number;
}

export default function ProfileModal({ onClose }: { onClose: () => void }) {
    const { username: currentUsername, team: currentTeam, setUserInfo } = useUserStore();

    const [username, setUsername] = useState(currentUsername || "");
    const [selectedTeam, setSelectedTeam] = useState<{ id: string; name: string; badgeUrl: string } | null>(
        currentTeam ? { id: currentTeam.id, name: currentTeam.name, badgeUrl: currentTeam.badgeUrl } : null
    );

    const [teams, setTeams] = useState<Team[]>([]);
    const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    useEffect(() => {
        async function loadTeams() {
            try {
                const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/teams`);
                if (res.ok) {
                    const data = await res.json();
                    setTeams(data);
                }
            } catch (err) {
                console.error("Error al cargar equipos:", err);
            }
        }
        loadTeams();
    }, []);

    const handleUpdate = async () => {
        setErrorMessage("");
        setSuccessMessage("");

        if (!username.trim() || !selectedTeam) {
            setErrorMessage("Los campos no pueden quedar vacíos.");
            return;
        }

        setLoading(true);
        try {
            const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/users/update-profile`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include", 
                body: JSON.stringify({ username, teamId: selectedTeam.id }),
            });

            if (res.ok) {
                const updatedUser = await res.json();

                // Actualizamos Zustand inmediatamente (esto cambia el Header en tiempo real)
                setUserInfo({
                    username: updatedUser.username,
                    team: updatedUser.team,
                    isFirstLogin: false
                });

                setSuccessMessage("¡Perfil actualizado correctamente!");
                setTimeout(() => onClose(), 1500); // Se cierra solo después del éxito
            } else {
                const errData = await res.json().catch(() => ({}));
                setErrorMessage(errData.message || "Error al actualizar el perfil.");
            }
        } catch (error) {
            setErrorMessage("Error de conexión.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-[#181818] border border-[#2b2b2b] p-6 rounded-2xl w-full max-w-md shadow-2xl relative">

                {/* BOTÓN CERRAR */}
                <button onClick={onClose} className="absolute right-4 top-4 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition">
                    <X className="w-5 h-5" />
                </button>

                <h2 className="text-white text-xl font-bold mb-5 flex items-center gap-2">
                    <User className="w-5 h-5 text-sky-400" /> Mi Perfil
                </h2>

                <div className="flex flex-col gap-4">
                    {/* CAMPO USERNAME */}
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-400">Nombre de Usuario</label>
                        <input
                            type="text"
                            className="p-2.5 rounded-xl bg-[#222] text-white border border-[#333] focus:outline-none focus:border-gray-500 transition text-sm"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </div>

                    {/* CAMPO EQUIPO CON ESCUDO */}
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-400">Tu Club</label>
                        <button
                            type="button"
                            onClick={() => setIsTeamModalOpen(true)}
                            className="w-full p-2.5 rounded-xl bg-[#222] border border-[#333] hover:border-gray-500 text-left flex items-center justify-between transition text-white text-sm min-h-[46px]"
                        >
                            {selectedTeam ? (
                                <div className="flex items-center space-x-3">
                                    <img src={selectedTeam.badgeUrl} alt={selectedTeam.name} className="w-6 h-6 object-contain" />
                                    <span className="font-medium text-white">{selectedTeam.name}</span>
                                </div>
                            ) : (
                                <span className="text-gray-500">Seleccionar cuadro</span>
                            )}
                            <Edit2 className="w-4 h-4 text-sky-400" />
                        </button>
                    </div>

                    {/* MENSAJES DE FEEDBACK */}
                    {errorMessage && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-2 rounded-lg">{errorMessage}</p>}
                    {successMessage && <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-lg">{successMessage}</p>}

                    {/* BOTONES ACCIÓN */}
                    <div className="flex gap-2 mt-2">
                        <button
                            onClick={onClose}
                            className="flex-1 bg-transparent hover:bg-gray-800 border border-[#333] p-2.5 rounded-xl text-gray-400 hover:text-white font-medium transition text-sm"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleUpdate}
                            disabled={loading}
                            className="flex-1 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-800 p-2.5 rounded-xl text-white font-semibold transition text-sm"
                        >
                            {loading ? "Guardando..." : "Guardar Cambios"}
                        </button>
                    </div>
                </div>
            </div>

            {/* MODAL REUTILIZADO PARA CAMBIAR ESCUDOS */}
            <TeamSelectorModal
                isOpen={isTeamModalOpen}
                onClose={() => setIsTeamModalOpen(false)}
                teams={teams}
                onSelect={(id, name, badgeUrl) => {
                    setSelectedTeam({ id, name, badgeUrl });
                    setIsTeamModalOpen(false);
                }}
            />
        </div>
    );
}