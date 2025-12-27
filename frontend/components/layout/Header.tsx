"use client";
import { useEffect, useState } from "react"; // 1. Agrega estos hooks
import Link from "next/link";
import { Zap, ChevronRight } from "lucide-react";
import { useUserStore } from "@/store/useUserStore";

export default function Header() {
  // 2. Agregamos el estado de hidratación
  const [isClient, setIsClient] = useState(false);
  
  // 3. Obtenemos los datos del store
  const username = useUserStore((state) => state.username);
  const team = useUserStore((state) => state.team);

  // 4. Este useEffect se dispara SOLO en el cliente tras el primer render
  useEffect(() => {
    setIsClient(true);
  }, []);

  // 5. Mientras sea el servidor, mostramos un "estado de carga" o nada
  // Esto evita el error de hidratación y el flash de datos nulos
  if (!isClient) {
    return (
      <header className="flex justify-between items-center p-4 bg-[#181818]/90 border-b border-[#2b2b2b] fixed w-full z-10 top-0 h-16">
        <div className="flex items-center space-x-2">
          <Zap className="w-6 h-6 text-lime-400" />
          <span className="text-xl font-bold text-white tracking-wider">Chiqui Mafias</span>
        </div>
        {/* Un placeholder vacío o skeleton para la parte derecha */}
        <div className="w-20 h-8 bg-[#2b2b2b] animate-pulse rounded-full"></div>
      </header>
    );
  }

  // 6. Si ya es el cliente, mostramos el Header real con los datos de Zustand
  return (
    <header className="flex justify-between items-center p-4 bg-[#181818]/90 backdrop-blur-md border-b border-[#2b2b2b] fixed w-full z-10 top-0 h-16">
      <div className="flex items-center space-x-2">
        <Zap className="w-6 h-6 text-lime-400" />
        <Link href="/" className="text-xl font-bold text-white tracking-wider hover:underline cursor-pointer">
          Chiqui Mafias
        </Link>
      </div>

      <nav className="hidden sm:flex space-x-6">
        <Link href="/league/liga-profesional-argentina-2025" className="text-sm font-medium text-lime-400 hover:text-white transition p-2 rounded-lg hover:bg-[#2b2b2b] cursor-pointer">Calendario</Link>
        <Link href="/league/liga-profesional-argentina-2025" className="text-sm font-medium text-gray-400 hover:text-white transition p-2 rounded-lg hover:bg-[#2b2b2b] cursor-pointer">Clasificación</Link>
        <Link href="/" className="text-sm font-medium text-gray-400 hover:text-white transition p-2 rounded-lg hover:bg-[#2b2b2b] cursor-pointer">Votaciones</Link>
      </nav>

      <div className="flex items-center space-x-3 cursor-pointer p-1 rounded-full hover:bg-[#2b2b2b] transition duration-150">
        <div className="w-8 h-8 rounded-full bg-sky-600 flex items-center justify-center text-sm font-semibold text-white">
          {/* Si team es null, mostramos la inicial del username o "?" */}
          {team ? team.substring(0, 1).toUpperCase() : "Barracas Central"}
        </div>
        <span className="text-sm text-white font-medium hidden md:block">
          {username || "Chiqui Tapia"}
        </span>
        <ChevronRight className="w-4 h-4 text-gray-400" />
      </div>
    </header>
  );
}