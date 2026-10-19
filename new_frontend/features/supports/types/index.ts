export type TicketStatus = 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'CLOSED';
export type TicketCategory = 'SUPPORT' | 'APPEAL' | 'OTHER';
export type ReportReason = 'TOXIC_CHAT' | 'FRAUD' | 'BAD_BEHAVIOR' | 'OTHER';


export interface CreateReportPayload {
    reportedId: string;
    reason: ReportReason;
    details: string;
}

export interface CreateTicketPayload {
    category: TicketCategory;
    subject: string;
    message: string;
    screenshotUrl?: string;
}


export interface TicketMessagePayload {
    message: string;
    screenshotUrl?: string;
}

export interface ResolveReportPayload {
    action: 'BAN' | 'MUTE' | 'WARN' | 'UNBAN';
    durationHours?: number;
    reason?: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    meta: {
        total: number;
        page: number;
        limit: number;
        lastPage: number;
    };
}


export interface TicketMessageEntity {
    id: string;
    ticketId: string;
    senderId: string;
    message: string;
    screenshotUrl?: string | null;
    fromDiscord: boolean;
    createdAt: string;
    sender: {
        id: string;
        username: string;
        role: string;
    };
}


export interface AdminTicket {
    id: string;
    userId: string;
    category: TicketCategory;
    subject: string;
    status: TicketStatus;
    discordThreadId?: string | null;
    createdAt: string;
    updatedAt: string;
    user: {
        id: string;
        username: string;
        role: string;
    };
    messages?: TicketMessageEntity[];
}

export type ReportStatus = 'PENDING' | 'RESOLVED' | 'CLOSED';

export interface AdminReport {
    id: string;
    reporterId: string;
    reportedId: string;
    commentId?: string | null;
    pollId?: string | null;
    reason: ReportReason;
    details: string;
    status: ReportStatus;
    discordMessageId?: string | null;
    createdAt: string;
    resolvedById?: string | null;
    reporter: {
        id: string;
        username: string;
        email: string;
    };
    reported: {
        id: string;
        username: string;
        email: string;
    };
    resolvedBy?: {
        id: string;
        username: string;
    } | null;
    comment?: {
        id: string;
        text: string;
        createdAt: string;
    } | null;
    poll?: {
        id: string;
        title: string;
    } | null;
}

export interface MyTicket {
  id: string;
  userId: string;
  category: TicketCategory;
  subject: string;
  status: TicketStatus;
  discordThreadId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MyTicketDetails {
  id: string;
  userId: string;
  category: TicketCategory;
  subject: string;
  status: TicketStatus;
  discordThreadId: string | null;
  createdAt: string;
  updatedAt: string;
  messages: TicketMessageEntity[]; 
}

export interface CreateTicketResponse {
  id: string;
  userId: string;
  category: TicketCategory;
  subject: string;
  status: 'OPEN';
  discordThreadId: string | null;
  createdAt: string;
  updatedAt: string;
  messages: TicketMessageEntity[];
}
