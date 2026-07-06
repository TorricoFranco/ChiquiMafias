"use client";

import { useState } from "react";
import { betsApi } from "@/services/betsApi";
import { Plus, Trash2, ShieldAlert } from "lucide-react";

export default function AdminBetsPanel({ onMarketCreated }: { onMarketCreated: () => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [title, setTitle] = useState("");
    const [closesAt, setClosesAt] = useState("");
    const [options, setOptions] = useState<{ name: string; initialProb: number }[]>([
        { name: "Local", initialProb: 50 },
        { name: "Visitante", initialProb: 50 },
    ]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAddOption = () => {
        setOptions([...options, { name: "", initialProb: 0 }]);
    };

    const handleRemoveOption = (index: number) => {
        if (options.length <= 2) return; // Mínimo 2 opciones para apostar
        setOptions(options.filter((_, i) => i !== index));
    };

    const handleOptionChange = (index: number, field: "name" | "initialProb", value: any) => {
        const updated = [...options];
        updated[index] = {
            ...updated[index],
            [field]: field === "initialProb" ? Number(value) : value,
        };
        setOptions(updated);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!title || !closesAt) {
            setError("Por favor completa el título y la fecha de cierre.");
            return;
        }

        // Validación básica de probabilidades (opcional en backend, pero buena UX)
        const totalProb = options.reduce((sum, opt) => sum + opt.initialProb, 0);
        if (totalProb !== 100) {
            setError(`La suma de probabilidades iniciales debe ser 100% (Actual: ${totalProb}%)`);
            return;
        }

        try {
            setLoading(true);
            await betsApi.createManualMarket({
                title,
                closesAt: new Date(closesAt).toISOString(),
                options,
            });

            // Resetear formulario
            setTitle("");
            setClosesAt("");
            setOptions([
                { name: "Local", initialProb: 50 },
                { name: "Visitante", initialProb: 50 },
            ]);
            setIsOpen(false);
            onMarketCreated(); // Recarga la grilla principal
        } catch (err: any) {
            setError(err.message || "Error al crear el mercado");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-zinc-900 border border-amber-500/30 rounded-xl p-4 mb-8">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-amber-400">
                    <ShieldAlert className="w-5 h-5" />
                    <h2 className="font-bold text-lg">Panel de Control de Admin</h2>
                </div>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold px-4 py-2 rounded-lg text-sm transition"
                >
                    {isOpen ? "✕ Cerrar Panel" : "🔨 Crear Mercado Manual"}
                </button>
            </div>

            {isOpen && (
                <form onSubmit={handleSubmit} className="mt-4 space-y-4 border-t border-zinc-800 pt-4 text-zinc-200">
                    {error && <div className="p-3 bg-red-500/10 border border-red-500 text-red-400 text-sm rounded-lg">{error}</div>}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-zinc-400 mb-1 font-semibold uppercase">Título del Mercado</label>
                            <input
                                type="text"
                                placeholder="Ej: ¿Quién gana el superclásico?"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 focus:outline-none focus:border-amber-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-zinc-400 mb-1 font-semibold uppercase">Fecha y Hora de Cierre</label>
                            <input
                                type="datetime-local"
                                value={closesAt}
                                onChange={(e) => setClosesAt(e.target.value)}
                                className="w-full p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 focus:outline-none focus:border-amber-500 text-zinc-300"
                            />
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-xs text-zinc-400 font-semibold uppercase">Opciones de Apuesta</label>
                            <button
                                type="button"
                                onClick={handleAddOption}
                                className="text-xs text-amber-400 hover:underline flex items-center gap-1"
                            >
                                <Plus className="w-3 h-3" /> Añadir Opción
                            </button>
                        </div>

                        <div className="space-y-2">
                            {options.map((option, idx) => (
                                <div key={idx} className="flex gap-2 items-center">
                                    <input
                                        type="text"
                                        placeholder={`Opción ${idx + 1}`}
                                        value={option.name}
                                        required
                                        onChange={(e) => handleOptionChange(idx, "name", e.target.value)}
                                        className="flex-1 p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-sm"
                                    />
                                    <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-lg px-2 w-28">
                                        <input
                                            type="number"
                                            placeholder="Prob %"
                                            value={option.initialProb || ""}
                                            required
                                            min="0"
                                            max="100"
                                            onChange={(e) => handleOptionChange(idx, "initialProb", e.target.value)}
                                            className="w-full bg-transparent p-2 text-sm text-right outline-none"
                                        />
                                        <span className="text-zinc-500 text-xs ml-1">%</span>
                                    </div>
                                    <button
                                        type="button"
                                        disabled={options.length <= 2}
                                        onClick={() => handleRemoveOption(idx)}
                                        className="p-2 text-zinc-500 hover:text-red-400 disabled:opacity-30 transition"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-lg text-sm transition"
                        >
                            {loading ? "Guardando..." : "🚀 Publicar Mercado en Vivo"}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}