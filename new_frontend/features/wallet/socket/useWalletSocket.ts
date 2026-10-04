import { useEffect, useState, useCallback } from "react";
import { useGlobalSocket } from "@/context/SocketContext";
import { useUserStore } from "@/store/useUserStore";
import { walletApi } from "../api/walletApi";

export function useWallet() {
    const socket = useGlobalSocket();
    const { id: userId, balance, setBalance } = useUserStore();
    const [loading, setLoading] = useState<boolean>(false);

    const loadInitialBalance = useCallback(async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const currentBalance = await walletApi.getMyBalance();
            setBalance(currentBalance);
        } catch (error) {
            console.error("Error cargando saldo inicial:", error);
        } finally {
            setLoading(false);
        }
    }, [userId, setBalance]);

    useEffect(() => {
        if (!socket || !userId) return;

        loadInitialBalance();

        const handleBalanceUpdate = (data: { balance: number }) => {
            setBalance(data.balance);
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