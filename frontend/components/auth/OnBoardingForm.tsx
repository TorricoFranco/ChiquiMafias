"use client";

import { useState, useEffect } from "react";
import { useUserStore } from "@/store/useUserStore";
import { apiFetch } from "@/lib/apiFetch";
import TeamSelectorModal from "../ui/TeamSelectorModal";

interface FootballTeam {
  id: string;
  name: string;
  badgeUrl: string;
  tier: number;
}

export default function OnboardingForm({ onComplete }: { onComplete: () => void }) {
  const [username, setUsername] = useState("");

  const [teams, setTeams] = useState<FootballTeam[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<{ id: string; name: string; badgeUrl: string } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const { setUserInfo } = useUserStore();

  useEffect(() => {
    async function loadTeams() {
      try {
        const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/teams`);
        if (res.ok) {
          const data = await res.json();
          setTeams(data); // El backend ya los manda ordenados por Tier gracias al orderBy
        }
      } catch (error) {
        console.error("Error al cargar los clubes en el onboarding:", error);
      }
    }
    loadTeams();
  }, []);

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

    try {
      const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/users/complete-profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, teamId: selectedTeam.id }),
      });

      if (res.ok) {
        const updatedUser = await res.json();

        const currentState = useUserStore.getState();

        setUserInfo({
          ...currentState,               
          username: updatedUser.username,
          team: updatedUser.team,
          isFirstLogin: false
        });

        onComplete();
      } else {
        const errorData = await res.json().catch(() => ({}));
        setErrorMessage(errorData.message || "El nombre de usuario ya existe o hubo un error.");
      }
    } catch (error) {
      setErrorMessage("Error de conexión con el servidor.");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-white text-xl font-semibold">¡Bienvenido! Danos unos datos</h2>

      {/* INPUT DE USERNAME */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-400">Nombre de Usuario</label>
        <input
          className="p-2.5 rounded-xl bg-gray-800 text-white border border-transparent focus:outline-none focus:border-gray-600 transition text-sm"
          placeholder="Tu nombre de usuario"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </div>


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

      {/* MENSAJES DE ERROR VISUALES */}
      {errorMessage && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-2 rounded-lg">
          {errorMessage}
        </p>
      )}

      {/* BOTÓN SUBMIT */}
      <button
        onClick={handleSubmit}
        className="bg-blue-600 hover:bg-blue-700 p-2.5 rounded-xl text-white font-semibold transition mt-2 text-sm"
      >
        Empezar a chatear
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