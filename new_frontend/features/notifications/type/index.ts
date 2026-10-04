export interface NotificationItem {
    id: string;
    title: string;
    message: string;
    type: string;
    isGlobal: boolean;
    readAt: string | null;
    createdAt: string;
    referenceId?: string | null;
    metadata?: {
        coins?: number;
        multiplier?: number;
        slug?: string;
        teamBadge?: string;
        [key: string]: any;
    } | null;
}

export interface UnreadCountResponse {
    unreadCount: number;
}

export interface MarkAsReadResponse {
    success: boolean;
}