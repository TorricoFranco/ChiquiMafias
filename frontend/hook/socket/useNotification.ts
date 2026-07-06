// hooks/useNotifications.ts
import { useEffect, useState, useCallback } from "react";
import { useGlobalSocket } from "@/context/SocketContext";
import { useUserStore } from "@/store/useUserStore";
import { NotificationItem, notificationService } from "@/services/notification";

export function useNotifications() {
    const socket = useGlobalSocket();
    const { id: userId } = useUserStore();

    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [unreadCount, setUnreadCount] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(false);
    const [page, setPage] = useState<number>(1);
    const [hasMore, setHasMore] = useState<boolean>(true);

    // 1. Carga inicial (Buzón + Contador)
    const loadInitialData = useCallback(async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const [inbox, countRes] = await Promise.all([
                notificationService.getInbox(1, 15),
                notificationService.getUnreadCount(),
            ]);
            setNotifications(inbox);
            setUnreadCount(countRes.unreadCount);
            setPage(1);
            setHasMore(inbox.length === 15);
        } catch (error) {
            console.error("Error cargando notificaciones:", error);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    // Cargar más para paginación infinita/scroll
    const loadMore = useCallback(async () => {
        if (loading || !hasMore || !userId) return;
        setLoading(true);
        try {
            const nextPage = page + 1;
            const moreNotifs = await notificationService.getInbox(nextPage, 15);

            if (moreNotifs.length < 15) setHasMore(false);

            setNotifications((prev) => [...prev, ...moreNotifs]);
            setPage(nextPage);
        } catch (error) {
            console.error("Error cargando más notificaciones:", error);
        } finally {
            setLoading(false);
        }
    }, [page, loading, hasMore, userId]);

    // 2. Marcar lote como leído
    const markAsRead = useCallback(async (ids: string[]) => {
        if (ids.length === 0 || !userId) return;
        try {
            await notificationService.markAsRead(ids);

            // Actualizamos estado local de forma reactiva
            setNotifications((prev) =>
                prev.map((n) => (ids.includes(n.id) ? { ...n, readAt: new Date().toISOString() } : n))
            );

            setUnreadCount((prev) => Math.max(0, prev - ids.length));
        } catch (error) {
            console.error("Error al marcar como leído:", error);
        }
    }, [userId]);

    // 3. Escuchar Sockets en Tiempo Real
    useEffect(() => {
        if (!socket || !userId) {
            // Limpiamos estado si se desloguea
            setNotifications([]);
            setUnreadCount(0);
            return;
        }

        // Carga inicial al conectar/cambiar usuario
        loadInitialData();

        const handleIncomingNotification = (newNotif: NotificationItem) => {
            // Inyectamos al principio de la lista
            setNotifications((prev) => [newNotif, ...prev]);
            setUnreadCount((prev) => prev + 1);

            // 🧠 TIP DE DOPAMINA: Podés clavar un sonido de alerta acá si querés
            // new Audio('/sounds/notification.mp3').play().catch(() => {});
        };

        // Escuchamos el evento que emite el backend
        socket.on("notification", handleIncomingNotification);

        return () => {
            socket.off("notification", handleIncomingNotification);
        };
    }, [socket, userId, loadInitialData]);

    return {
        notifications,
        unreadCount,
        loading,
        hasMore,
        loadMore,
        markAsRead,
        refresh: loadInitialData,
    };
}