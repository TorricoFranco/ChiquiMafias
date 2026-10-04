import React, { useEffect, useRef } from 'react';
import { Eye } from 'lucide-react';
import { AdminTicket } from '@/features/supports/types';

interface TicketMessagesThreadProps {
  messages: AdminTicket['messages'];
  onZoomImage: (url: string) => void;
}

export const TicketMessagesThread: React.FC<TicketMessagesThreadProps> = ({
  messages,
  onZoomImage,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!messages || messages.length === 0) {
    return (
      <div className="text-center text-xs text-[#909378] py-10">
        No hay mensajes previos en este ticket.
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-4 bg-[#131313]/60 
      [&::-webkit-scrollbar]:w-1.5 
      [&::-webkit-scrollbar-track]:bg-transparent 
      [&::-webkit-scrollbar-thumb]:bg-[#353534] 
      [&::-webkit-scrollbar-thumb]:rounded-full 
      hover:[&::-webkit-scrollbar-thumb]:bg-[#4a4a49]"
    >
      {messages.map((msg) => {
        const staffRoles = ['ADMIN', 'MODERATOR', 'PRESIDENT'];
        const isStaff = staffRoles.includes(msg.sender.role) || msg.fromDiscord;

        return (
          <div
            key={msg.id}
            className={`flex flex-col max-w-[85%] ${isStaff ? 'self-end items-end' : 'self-start items-start'
              }`}
          >
            <div className="flex items-center gap-2 mb-1">
              {isStaff ? (
                <>
                  <span className="text-[9px] text-[#909378]">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {msg.fromDiscord && (
                    <span className="text-[9px] bg-[#5865F2] text-white px-1.5 py-0.2 rounded font-bold">
                      VÍA DISCORD
                    </span>
                  )}
                  <span className="text-[9px] bg-[#d2f000]/20 text-[#d2f000] px-1.5 py-0.2 rounded font-bold uppercase">
                    {msg.sender.role}
                  </span>
                  <span className="text-[10px] font-bold text-[#c6c9ab]">
                    @{msg.sender.username}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-[10px] font-bold text-[#c6c9ab]">
                    @{msg.sender.username}
                  </span>
                  <span className="text-[9px] text-[#909378]">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </>
              )}
            </div>

            <div
              className={`p-3.5 rounded-2xl text-xs leading-relaxed flex flex-col gap-2 ${isStaff
                ? 'bg-[#d2f000] text-[#191e00] font-semibold rounded-tr-none shadow-sm'
                : 'bg-[#222] text-[#e5e2e1] border border-[#353534] rounded-tl-none'
                }`}
            >
              <p>{msg.message}</p>
              {msg.screenshotUrl && (
                <div className="mt-1">
                  <span className="text-[9px] uppercase font-bold opacity-75 block mb-1">
                    Captura de pantalla adjunta:
                  </span>
                  <div
                    onClick={() => onZoomImage(msg.screenshotUrl!)}
                    className="relative group cursor-pointer overflow-hidden rounded-xl border border-black/20 max-h-48"
                  >
                    <img
                      src={msg.screenshotUrl}
                      alt="Comprobante"
                      referrerPolicy="no-referrer"
                      className="w-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-bold gap-1">
                      <Eye className="w-4 h-4" /> Click para ampliar
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}

      <div ref={messagesEndRef} />
    </div>
  );
};