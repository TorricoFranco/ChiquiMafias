"use client";
import { useState } from "react";

export default function OnboardingForm({ onComplete }: { onComplete: () => void }) {
  const [username, setUsername] = useState("");
  const [team, setTeam] = useState("");

  const handleSubmit = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/complete-profile`, {
      method: "PATCH",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}` 
      },
      body: JSON.stringify({ username, team }),
    });

    if (res.ok) {
      onComplete(); // Cerramos todo y vamos al chat
    } else {
      alert("Error al guardar. Quizás el username ya existe.");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-white text-xl">¡Bienvenido! Danos unos datos</h2>
      <input 
        className="p-2 rounded bg-gray-800 text-white" 
        placeholder="Tu nombre de usuario" 
        onChange={(e) => setUsername(e.target.value)} 
      />
      <input 
        className="p-2 rounded bg-gray-800 text-white" 
        placeholder="Tu equipo" 
        onChange={(e) => setTeam(e.target.value)} 
      />
      <button onClick={handleSubmit} className="bg-blue-600 p-2 rounded text-white">
        Empezar a chatear
      </button>
    </div>
  );
}