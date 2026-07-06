// src/components/header/HeaderNavigation.tsx
import Link from "next/link";
import { ShoppingBag } from "lucide-react";

interface HeaderNavigationProps {
    onOpenStore: () => void;
    isUserLoggedIn: boolean;
}

export default function HeaderNavigation({ onOpenStore, isUserLoggedIn }: HeaderNavigationProps) {
    return (
        <nav className="hidden sm:flex items-center space-x-6">
            <Link href="/league/calendario" className="text-sm font-medium text-gray-400 hover:text-white transition">
                Calendario
            </Link>
            <Link href="/league/liga-profesional" className="text-sm font-medium text-gray-400 hover:text-white transition">
                Clasificación
            </Link>

            {/* Botón directo al Mercado visible desde la barra */}
            {isUserLoggedIn && (
                <button
                    onClick={onOpenStore}
                    className="flex items-center space-x-1.5 text-sm font-semibold text-amber-400 hover:text-amber-300 transition group"
                >
                    <ShoppingBag className="w-4 h-4 group-hover:animate-bounce" />
                    <span>Club Chiqui</span>
                    <span className="bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-black text-[9px] px-1 py-0.2 rounded uppercase tracking-wide">
                        PRO
                    </span>
                </button>
            )}
        </nav>
    );
}