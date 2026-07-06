import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supportApi } from '@/services/supportApi';

// 1. OBTENER MIS TICKETS (Lectura -> useQuery)
export const useMyTickets = () => {
  return useQuery({
    queryKey: ['my-tickets'],
    queryFn: supportApi.getMyTickets,
  });
};

// 2. VER EL HILO DE UN TICKET (Lectura -> useQuery)
export const useMyTicketDetails = (ticketId: string) => {
  return useQuery({
    queryKey: ['ticket-details', ticketId],
    queryFn: () => supportApi.getMyTicketDetails(ticketId),
    enabled: !!ticketId, // Solo hace la petición si hay un ID
    refetchInterval: 10000, // Opcional: Hace un "mini-polling" cada 10 segs para ver si el admin respondió
  });
};

export const useReplyTicket = (ticketId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof supportApi.replyToTicket>[1]) => 
      supportApi.replyToTicket(ticketId, data),
    onSuccess: () => {
      // MAGIA ACÁ: Le decimos a React Query que el ticket cambió, 
      // para que vuelva a hacer el GET automáticamente y muestre el nuevo mensaje.
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