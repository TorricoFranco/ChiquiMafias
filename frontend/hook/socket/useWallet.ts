// src/hooks/useWallet.ts
import { useEffect, useState, useCallback } from "react";
import { useGlobalSocket } from "@/context/SocketContext";
import { useUserStore } from "@/store/useUserStore";
import { walletApi } from "@/services/wallet";

export function useWallet() {
    const socket = useGlobalSocket();
    const { id: userId, balance, setBalance } = useUserStore();
    const [loading, setLoading] = useState<boolean>(false);

    // 1. Carga inicial del saldo desde tu endpoint seguro
    const loadInitialBalance = useCallback(async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const currentBalance = await walletApi.getMyBalance();
            setBalance(currentBalance); // Guardamos en Zustand
        } catch (error) {
            console.error("Error cargando saldo inicial:", error);
        } finally {
            setLoading(false);
        }
    }, [userId, setBalance]);

    // 2. Escuchar Sockets en Tiempo Real
    useEffect(() => {
        if (!socket || !userId) return;

        // Gatillamos la carga inicial apenas engancha el usuario
        loadInitialBalance();

        // Escuchamos el evento que configuramos en el gateway de NestJS
        const handleBalanceUpdate = (data: { balance: number }) => {
            setBalance(data.balance); // Sincroniza Zustand globalmente al toque
        };

        socket.on("wallet:balance_updated", handleBalanceUpdate);

        return () => {
            socket.off("wallet:balance_updated", handleBalanceUpdate);
        };
    }, [socket, userId, loadInitialBalance, setBalance]);

    return {
        balance,
        loading,
        refreshBalance: loadInitialBalance
    };
}