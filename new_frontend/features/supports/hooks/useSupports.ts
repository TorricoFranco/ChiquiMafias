import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supportApi } from '../api/supportsApi';
import { ReportStatus, TicketStatus, TicketCategory, ResolveReportPayload, TicketMessagePayload } from '../types';

export const useMyTickets = () => {
    return useQuery({
        queryKey: ['my-tickets'],
        queryFn: supportApi.getMyTickets,
    });
};

export const useMyTicketDetails = (ticketId: string) => {
    return useQuery({
        queryKey: ['ticket-details', ticketId],
        queryFn: () => supportApi.getMyTicketDetails(ticketId),
        enabled: !!ticketId,
        refetchInterval: 10000,
    });
};

export const useReplyTicket = (ticketId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: Parameters<typeof supportApi.replyToTicket>[1]) =>
            supportApi.replyToTicket(ticketId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ticket-details', ticketId] });
        },
    });
};


export const useCreateTicket = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: supportApi.createTicket,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-tickets'] }),
    });
};

export const useCreateReport = () => {
    return useMutation({ mutationFn: supportApi.createReport });
};

// ADMIN 

export const useAdminTickets = (page = 1, limit = 10, status?: TicketStatus, category?: TicketCategory) => {
    return useQuery({
        queryKey: ['admin-tickets', { page, limit, status, category }],
        queryFn: () => supportApi.adminGetTickets(page, limit, status, category),
    });
};

export const useAdminReports = (page = 1, limit = 10, status?: ReportStatus) => {
    return useQuery({
        queryKey: ['admin-reports', { page, limit, status }],
        queryFn: () => supportApi.adminGetReports(page, limit, status),
    });
};

export const useAdminUpdateTicketStatus = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ ticketId, status }: { ticketId: string; status: TicketStatus }) =>
            supportApi.adminUpdateTicketStatus(ticketId, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
        },
    });
};

export const useAdminResolveReport = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ reportId, data }: { reportId: string; data: ResolveReportPayload }) =>
            supportApi.adminResolveReport(reportId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
        },
    });
};


export const useAdminReplyTicket = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ ticketId, data }: { ticketId: string; data: TicketMessagePayload }) =>
            supportApi.replyToTicket(ticketId, data),
        onMutate: async ({ ticketId, data }) => {
            await queryClient.cancelQueries({ queryKey: ['admin-ticket-details', ticketId] });
            const previousTicket = queryClient.getQueryData(['admin-ticket-details', ticketId]);

            queryClient.setQueryData(['admin-ticket-details', ticketId], (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    messages: [
                        ...(old.messages || []),
                        {
                            id: 'temp-' + Date.now(),
                            message: data.message,
                            screenshotUrl: data.screenshotUrl,
                            createdAt: new Date().toISOString(),
                            sender: {
                                username: 'Admin',
                            },
                            fromDiscord: false
                        }
                    ],
                };
            });

            return { previousTicket };
        },
        onError: (_err, { ticketId }, context) => {
            if (context?.previousTicket) {
                queryClient.setQueryData(['admin-ticket-details', ticketId], context.previousTicket);
            }
        },
        onSettled: (_data, _error, { ticketId }) => {
            queryClient.invalidateQueries({ queryKey: ['admin-ticket-details', ticketId] });
            queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
        },
    });
};

export const useAdminSupportStats = () => {
    return useQuery({
        queryKey: ['admin-support-stats'],
        queryFn: () => supportApi.getSupportStats(),
        refetchInterval: 30000,
    });
};

export const useAdminTicketDetails = (ticketId: string) => {
    return useQuery({
        queryKey: ['admin-ticket-details', ticketId],
        queryFn: () => supportApi.adminGetTicketDetails(ticketId),
        enabled: !!ticketId,
        refetchInterval: 10000,
    });
};