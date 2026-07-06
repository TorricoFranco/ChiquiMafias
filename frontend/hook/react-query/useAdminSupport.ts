
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supportApi, TicketStatus, TicketCategory } from '@/services/supportApi';

// 1. LISTA PAGINADA DE TICKETS
export const useAdminTickets = (page: number, limit: number, status?: TicketStatus, category?: TicketCategory) => {
  return useQuery({
    queryKey: ['admin-tickets', page, limit, status, category],
    queryFn: () => supportApi.adminGetTickets(page, limit, status, category),
    keepPreviousData: true, 
  });
};

// 2. LISTA DE REPORTES
export const useAdminReports = () => {
  return useQuery({
    queryKey: ['admin-reports'],
    queryFn: supportApi.adminGetReports,
  });
};

// 3. CAMBIAR ESTADO DE TICKET
export const useUpdateTicketStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ticketId, status }: { ticketId: string, status: TicketStatus }) =>
      supportApi.adminUpdateTicketStatus(ticketId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket-details'] });
    },
  });
};

// 4. RESOLVER REPORTE
export const useResolveReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reportId, data }: { reportId: string, data: import('@/services/supportApi').ResolveReportPayload }) =>
      supportApi.adminResolveReport(reportId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
    },
  });
};

// 5. OBTENER DETALLES DEL TICKET PARA EL ADMIN
export const useAdminTicketDetails = (ticketId: string) => {
  return useQuery({
    queryKey: ['admin-ticket-details', ticketId],
    queryFn: () => supportApi.adminGetTicketDetails(ticketId),
    enabled: !!ticketId,
  });
};