import React, { useState, useEffect } from 'react';
import {
  CreateTicketPayload,
  TicketMessagePayload,
  TicketCategory,
} from '../../types';
import { UserTicketsList } from './UserTicketsList';
import { UserTicketDetail } from './UserTicketDetail';
import { CreateTicketModal } from './CreateTicketModal';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useUserStore } from '@/store/useUserStore';

import { 
  useMyTickets, 
  useMyTicketDetails, 
  useCreateTicket, 
  useReplyTicket 
} from '../../hooks/useSupports'; 

interface UserSupportViewProps {
  initialTicketId?: string | null;
  onOpenTienda?: () => void;
  defaultCategory?: TicketCategory;
}

export const UserSupportView: React.FC<UserSupportViewProps> = ({
  initialTicketId = null,
  defaultCategory,
}) => {
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(initialTicketId);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createDefaultCategory, setCreateDefaultCategory] = useState<TicketCategory>(
    defaultCategory || 'SUPPORT'
  );

  const userId = useUserStore((state) => state.id) as string;

  const { data: tickets = [], isLoading: isLoadingTickets } = useMyTickets();
  const { 
    data: selectedTicket, 
    isFetching: isRefreshing, 
    refetch: refetchTicket 
  } = useMyTicketDetails(selectedTicketId || '');

  const createTicketMutation = useCreateTicket();
  const replyTicketMutation = useReplyTicket(selectedTicketId || '');

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    if (defaultCategory) {
      setCreateDefaultCategory(defaultCategory);
      setIsCreateModalOpen(true);
    }
  }, [defaultCategory]);

  const handleCreateTicket = (payload: CreateTicketPayload) => {
    createTicketMutation.mutate(payload, {
      onSuccess: (newTicket) => {
        showToast('Reclamo registrado con éxito. Estado: Abierto');
        setIsCreateModalOpen(false);
        if (newTicket && newTicket.id) {
          setSelectedTicketId(newTicket.id);
        }
      },
      onError: () => {
        showToast('Hubo un error al crear el reclamo.');
      }
    });
  };

  const handleSendMessage = (ticketId: string, payload: TicketMessagePayload) => {
    replyTicketMutation.mutate(payload, {
      onSuccess: () => {
        showToast('Mensaje enviado al hilo de soporte');
      },
      onError: () => {
        showToast('Hubo un error al enviar el mensaje.');
      }
    });
  };

  const handleRefresh = () => {
    refetchTicket();
  };

  const handleOpenCreateModalWithCategory = (cat?: TicketCategory) => {
    setCreateDefaultCategory(cat || 'SUPPORT');
    setIsCreateModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[100] bg-[#d2f000] text-[#191e00] font-black text-xs px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 border border-black/20 animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-5 h-5" />
          <span>{toastMessage}</span>
        </div>
      )}

      {selectedTicketId ? (
        !selectedTicket ? (
          <div className="flex justify-center items-center py-20 text-[#d2f000]">
            <Loader2 className="w-10 h-10 animate-spin" />
          </div>
        ) : (
          <UserTicketDetail
            ticket={selectedTicket}
            currentUserId={userId}
            onBack={() => setSelectedTicketId(null)}
            onSendMessage={handleSendMessage}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
          />
        )
      ) : (
        isLoadingTickets ? (
          <div className="flex justify-center items-center py-20 text-[#d2f000]">
            <Loader2 className="w-10 h-10 animate-spin" />
          </div>
        ) : (
          <UserTicketsList
            tickets={tickets}
            onSelectTicket={(id) => setSelectedTicketId(id)}
            onOpenCreateModal={handleOpenCreateModalWithCategory}
          />
        )
      )}

      <CreateTicketModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateTicket}
        initialCategory={createDefaultCategory}
      />
    </div>
  );
};