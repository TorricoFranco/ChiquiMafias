import React from 'react';
import { AdminTicket } from '@/features/supports/types';

interface TicketListItemProps {
    ticket: AdminTicket;
    isSelected: boolean;
    onSelect: (id: string) => void;
}

export const TicketListItem: React.FC<TicketListItemProps> = ({
    ticket,
    isSelected,
    onSelect,
}) => (
    <button
        type="button"
        onClick={() => onSelect(ticket.id)}
        aria-pressed={isSelected}
        aria-label={`${ticket.subject} (@${ticket.user.username}, ${ticket.status})`}
        className={`w-full text-left p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col gap-2 ${isSelected
                ? 'bg-[#2a2a2a] border-[#d2f000] shadow-[0_0_10px_rgba(210,240,0,0.15)]'
                : 'bg-[#1c1b1b] border-[#353534] hover:border-[#454932]'
            }`}
    >
        <span className="flex items-center justify-between w-full">
            <span className="text-[10px] font-bold uppercase text-[#d2f000]">
                @{ticket.user.username}
            </span>

            <span className="flex items-center gap-1.5">
                {ticket.discordThreadId && (
                    <span className="bg-[#5865F2]/20 text-[#5865F2] text-[9px] font-bold px-1.5 py-0.2 rounded uppercase">
                        Discord
                    </span>
                )}
                <span
                    className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${ticket.status === 'OPEN'
                            ? 'bg-amber-500/20 text-amber-300'
                            : ticket.status === 'UNDER_REVIEW'
                                ? 'bg-blue-500/20 text-blue-300'
                                : ticket.status === 'RESOLVED'
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : 'bg-gray-500/20 text-gray-300'
                        }`}
                >
                    {ticket.status}
                </span>
            </span>
        </span>

        <span className="font-bold text-xs text-[#e5e2e1] line-clamp-1">
            {ticket.subject}
        </span>

        <span className="flex items-center justify-between w-full text-[10px] text-[#909378]">
            <span>Cat: {ticket.category}</span>
            <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
        </span>
    </button>
);
