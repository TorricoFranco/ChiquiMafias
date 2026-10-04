import { useEffect } from "react";
import { 
    useQuery, 
    useInfiniteQuery, 
    useMutation, 
    useQueryClient 
} from "@tanstack/react-query";
import { useGlobalSocket } from "@/context/SocketContext";
import { useUserStore } from "@/store/useUserStore";
import { notificationService } from "@/features/notifications/api/notificationsApi";
import { NotificationItem } from "../type";

export function useNotifications() {
    const socket = useGlobalSocket();
    const { id: userId } = useUserStore();
    const queryClient = useQueryClient();

    const { data: unreadCount = 0 } = useQuery({
        queryKey: ["notifications", "unreadCount", userId],
        queryFn: async () => {
            const res = await notificationService.getUnreadCount();
            return res.unreadCount;
        },
        enabled: !!userId,
    });

    const {
        data: inboxData,
        fetchNextPage,
        hasNextPage,
        isFetching,
    } = useInfiniteQuery({
        queryKey: ["notifications", "inbox", userId],
        initialPageParam: 1,
        queryFn: ({ pageParam = 1 }) => notificationService.getInbox(pageParam, 15),
        getNextPageParam: (lastPage, allPages) => {
            return lastPage.length === 15 ? allPages.length + 1 : undefined;
        },
        enabled: !!userId,
    });

    const notifications = inboxData?.pages.flat() || [];

    const markAsReadMutation = useMutation({
        mutationFn: (ids: string[]) => notificationService.markAsRead(ids),
        onMutate: async (ids) => {
            
            queryClient.setQueryData(["notifications", "unreadCount", userId], (old: number = 0) => 
                Math.max(0, old - ids.length)
            );

            queryClient.setQueryData(["notifications", "inbox", userId], (oldData: any) => {
                if (!oldData) return oldData;
                return {
                    ...oldData,
                    pages: oldData.pages.map((page: NotificationItem[]) =>
                        page.map((n) => ids.includes(n.id) ? { ...n, readAt: new Date().toISOString() } : n)
                    )
                };
            });
        },
    });

    useEffect(() => {
        if (!socket || !userId) return;

        const handleIncomingNotification = (newNotif: NotificationItem) => {
            queryClient.setQueryData(["notifications", "unreadCount", userId], (old: number = 0) => old + 1);
            
            queryClient.setQueryData(["notifications", "inbox", userId], (oldData: any) => {
                if (!oldData) return oldData;
                const newPages = [...oldData.pages];
                newPages[0] = [newNotif, ...newPages[0]];
                return { ...oldData, pages: newPages };
            });
        };

        socket.on("notification", handleIncomingNotification);

        return () => {
            socket.off("notification", handleIncomingNotification);
        };
    }, [socket, userId, queryClient]);

    return {
        notifications,
        unreadCount,
        loading: isFetching,
        hasMore: !!hasNextPage,
        loadMore: fetchNextPage,
        markAsRead: markAsReadMutation.mutate,
        refresh: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
        }
    };
}