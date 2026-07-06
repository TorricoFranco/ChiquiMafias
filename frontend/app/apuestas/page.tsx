"use client";

import { useEffect, useState } from 'react';
import { betsApi, Market, MarketOption } from '@/services/betsApi';
import Link from 'next/link';
import PlaceBetDrawer from '@/components/bets/PlaceBetDrawer';
import AdminBetsPanel from '@/components/bets/AdminBetsPanel';
import { useBetsSocket } from '@/hook/socket/useBetSocket';
import { useUserStore } from "@/store/useUserStore"; 

export default function ApuestasPage() {
    const [markets, setMarkets] = useState<Market[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
    const [selectedOption, setSelectedOption] = useState<MarketOption | null>(null);

    // Estado local para controlar resoluciones desde la tarjeta
    const [settleLoading, setSettleLoading] = useState<string | null>(null);

    // 👤 CAPTURAMOS EL ROL DEL USUARIO CONECTADO
    const { role } = useUserStore();
    const isAdmin = role === 'ADMIN';

    const { connected: isWsConnected } = useBetsSocket(setMarkets);

    const loadMarkets = async () => {
        try {
            setLoading(true);
            const data = await betsApi.getMarkets();
            setMarkets(data);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'No se pudieron cargar los mercados.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadMarkets();
    }, []);

    const handleOpenBetDrawer = (market: Market, option: MarketOption) => {
        setSelectedMarket(market);
        setSelectedOption(option);
        setIsDrawerOpen(true);
    };

    // 🧠 GESTIONAR LA RESOLUCIÓN DE UN MERCADO DESDE EL FRONT
    const handleSettleMarket = async (marketId: string, status: 'SETTLED' | 'REFUNDED', winningOptionId?: string) => {
        if (!confirm(`¿Estás seguro de que querés liquidar este mercado como ${status}?`)) return;

        try {
            setSettleLoading(marketId);
            await betsApi.settleMarket(marketId, { status, winningOptionId });
            await loadMarkets(); // Refresca grilla local
        } catch (err: any) {
            alert(err.message || "Error al liquidar el mercado");
        } finally {
            setSettleLoading(null);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto dark:bg-zinc-950 min-h-screen text-white">
            {/* Encabezado */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-zinc-100 flex items-center gap-2">
                        🎰 Panel de Apuestas Pari-Mutuel
                        <span className={`inline-block w-2 h-2 rounded-full ml-2 ${isWsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} title={isWsConnected ? 'Conectado en vivo' : 'Conectando...'} />
                    </h1>
                    <p className="text-zinc-400 text-sm mt-1">
                        El pozo total se divide entre los ganadores. ¡Las cuotas se actualizan en vivo!
                    </p>
                </div>

                <Link
                    href="/apuestas/historial"
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-4 py-2 rounded-lg text-sm font-semibold transition"
                >
                    📋 Ver Mis Apuestas
                </Link>
            </div>

            {/* 🔨 SECCIÓN DE ADMIN CONDICIONAL */}
            {isAdmin && <AdminBetsPanel onMarketCreated={loadMarkets} />}

            {/* Estados de Carga y Error */}
            {loading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((n) => (
                        <div key={n} className="bg-zinc-900 border border-zinc-800 h-48 rounded-xl animate-pulse" />
                    ))}
                </div>
            )}

            {error && (
                <div className="bg-red-500/10 border border-red-500 text-red-400 p-4 rounded-xl text-center">
                    <p>{error}</p>
                    <button onClick={loadMarkets} className="mt-2 text-sm underline font-bold hover:text-red-300">
                        Reintentar conectar
                    </button>
                </div>
            )}

            {/* Grilla de Mercados */}
            {!loading && !error && markets.length === 0 && (
                <div className="text-center py-12 text-zinc-500 bg-zinc-900/50 rounded-xl border border-dashed border-zinc-800">
                    No hay mercados activos en este momento. Volvé más tarde ⚽
                </div>
            )}

            {!loading && !error && markets.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {markets.map((market) => {
                        const totalPool = market.options.reduce((acc, opt) => acc + opt.totalStaked, 0);

                        return (
                            <div
                                key={market.id}
                                className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition flex flex-col justify-between"
                            >
                                <div>
                                    <div className="flex justify-between items-start mb-3">
                                        <h3 className="font-bold text-lg text-zinc-100">{market.title}</h3>
                                        <span className={`text-xs px-2 py-1 rounded font-mono font-bold ${market.status === 'OPEN' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                                            }`}>
                                            {market.status}
                                        </span>
                                    </div>

                                    <p className="text-xs text-zinc-400 mb-4">
                                        Cierra: {new Date(market.closesAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} hs
                                    </p>

                                    <div className="space-y-2 mb-6">
                                        {market.options.map((option) => {
                                            const cuota = totalPool > 0 && option.totalStaked > 0
                                                ? (totalPool / option.totalStaked).toFixed(2)
                                                : (100 / option.initialProb).toFixed(2);

                                            return (
                                                <div key={option.id} className="relative group/opt">
                                                    <button
                                                        disabled={market.status !== 'OPEN'}
                                                        onClick={() => handleOpenBetDrawer(market, option)}
                                                        className="w-full bg-zinc-950 hover:bg-zinc-800 disabled:opacity-50 disabled:hover:bg-zinc-950 border border-zinc-800 p-3 rounded-lg flex justify-between items-center transition text-left"
                                                    >
                                                        <span className="text-sm font-medium text-zinc-300 group-hover/opt:text-white">
                                                            {option.name}
                                                        </span>
                                                        <div className="text-right">
                                                            <span className="text-sm font-mono font-bold text-emerald-400">
                                                                x{cuota}
                                                            </span>
                                                            <p className="text-[10px] text-zinc-500 font-mono">
                                                                {option.totalStaked} pts
                                                            </p>
                                                        </div>
                                                    </button>

                                                    {/* 👑 ACCIÓN ADMIN: Resolver este mercado dándole la victoria a ESTA opción */}
                                                    {isAdmin && market.status !== 'SETTLED' && market.status !== 'REFUNDED' && (
                                                        <button
                                                            disabled={settleLoading !== null}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleSettleMarket(market.id, 'SETTLED', option.id);
                                                            }}
                                                            className="absolute right-24 top-1/2 -translate-y-1/2 opacity-0 group-hover/opt:opacity-100 bg-amber-500 hover:bg-amber-400 text-zinc-950 text-[10px] font-bold px-2 py-1 rounded transition z-10"
                                                        >
                                                            🏆 Marcar Ganador
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="border-t border-zinc-800 pt-3 space-y-3">
                                    <div className="flex justify-between items-center text-xs text-zinc-400">
                                        <span>Pozo Acumulado:</span>
                                        <span className="font-bold font-mono text-zinc-200 text-sm">
                                            {totalPool} monedas
                                        </span>
                                    </div>

                                    {/* 👑 ACCIÓN ADMIN EXTRA: Botón general para dar Reembolso Completo a la tarjeta */}
                                    {isAdmin && market.status !== 'SETTLED' && market.status !== 'REFUNDED' && (
                                        <div className="pt-2 border-t border-zinc-800/50 flex gap-2">
                                            <button
                                                disabled={settleLoading !== null}
                                                onClick={() => handleSettleMarket(market.id, 'REFUNDED')}
                                                className="w-full bg-red-950/40 hover:bg-red-900/60 border border-red-800 text-red-400 text-xs py-1.5 rounded font-medium transition"
                                            >
                                                🚨 Anular y Reembolsar Todo
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <PlaceBetDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                market={selectedMarket}
                option={selectedOption}
                onBetSuccess={loadMarkets}
            />
        </div>
    );
}