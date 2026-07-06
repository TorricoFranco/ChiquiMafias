import { Trophy } from "lucide-react";
import Link from 'next/link';

export const HeaderLeague = () => {
    return (
        <Link href="/league/liga-profesional" aria-label="Ir a Liga Profesional Argentina 2025">
            <header className="mb-8 hover:underline">
                <h1 className="text-4xl font-extrabold text-white flex items-center mb-2">
                    <Trophy className="w-8 h-8 mr-3 text-yellow-400" /> Clasificación LPF 2026
                </h1>
                <p className="text-gray-400 text-lg">Liga Profecional del Futbol Argentino Campeones del mundo, como te duele qatar, las cronicas de chiqui tapia y sus secuaces</p>
            </header>
        </Link>
    )
}