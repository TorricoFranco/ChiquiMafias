"use client";

import { useEffect, useState } from 'react';
import { betsApi, BetHistoryItem } from '@/services/betsApi';
import Link from 'next/link';

export default function HistorialApuestasPage() {
  const [history, setHistory] = useState<BetHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const data = await betsApi.getMyHistory();
      setHistory(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar el historial.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  // Helper para pintar los badges de estado con los colores correctos
  const getStatusBadge = (status: BetHistoryItem['status']) => {
    const styles = {
      PENDING: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      WON: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      LOST: 'bg-zinc-800 text-zinc-400 border-zinc-700',
      REFUNDED: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    };

    const labels = {
      PENDING: 'Pendiente ⏳',
      WON: 'Ganada 💎',
      LOST: 'Perdida ❌',
      REFUNDED: 'Reembolsada 🔄',
    };

    return (
      <span className={`text-xs px-2.5 py-1 rounded-full border ${styles[status]} font-medium`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <div className="p-6 max-w-5xl mx-auto dark:bg-zinc-950 min-h-screen text-white">
      {/* Botón Volver */}
      <div className="mb-4">
        <Link href="/apuestas" className="text-sm text-zinc-400 hover:text-zinc-200 transition">
          ← Volver al Dashboard
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-6 text-zinc-100">Mi Historial de Apuestas</h1>

      {loading && <div className="text-zinc-400 text-center py-8 animate-pulse">Cargando tus apuestas...</div>}
      
      {error && <div className="bg-red-500/10 border border-red-500 text-red-400 p-4 rounded-xl text-center mb-4">{error}</div>}

      {!loading && !error && history.length === 0 && (
        <div className="text-center py-12 text-zinc-500 bg-zinc-900/40 rounded-xl border border-zinc-800">
          Todavía no realizaste ninguna apuesta. ¡Probá suerte en el panel principal!
        </div>
      )}

      {!loading && !error && history.length > 0 && (
        <div className="overflow-x-auto bg-zinc-900 border border-zinc-800 rounded-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400 text-xs font-semibold uppercase tracking-wider bg-zinc-900/80">
                <th className="p-4">Mercado / Partido</th>
                <th className="p-4">Tu Selección</th>
                <th className="p-4 font-mono">Monto</th>
                <th className="p-4">Estado</th>
                <th className="p-4">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 text-sm">
              {history.map((bet) => (
                <tr key={bet.id} className="hover:bg-zinc-800/30 transition">
                  <td className="p-4">
                    <p className="font-bold text-zinc-200">{bet.option.market.title}</p>
                  </td>
                  <td className="p-4">
                    <span className="bg-zinc-950 border border-zinc-800 px-2 py-1 rounded text-zinc-300 font-medium">
                      {bet.option.name}
                    </span>
                  </td>
                  <td className="p-4 font-mono font-bold text-zinc-100">
                    {bet.stake} pts
                  </td>
                  <td className="p-4">
                    {getStatusBadge(bet.status)}
                  </td>
                  <td className="p-4 text-xs text-zinc-500 font-mono">
                    {new Date(bet.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}