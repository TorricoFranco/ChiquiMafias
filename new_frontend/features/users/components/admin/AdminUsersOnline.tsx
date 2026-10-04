import React from 'react';
import { ChatClient } from '../../types/';

interface AdminUsersOnlineProps {
    onlineUsers: ChatClient[];
}

export const AdminUsersOnline: React.FC<AdminUsersOnlineProps> = ({
    onlineUsers,
}) => {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {onlineUsers.map((client) => (
                <div
                    key={client.socketId}
                    className="bg-[#1c1b1b] border border-[#353534] p-4 rounded-2xl flex i..."
                >
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-[#2a2a2a] border border-[#353534] flex items-center justify-center font-bold text-xs text-[#d2f000]">
                                {client.username?.slice(0, 2).toUpperCase()}
                            </div>
                            <span className="w-3 h-3 bg-emerald-400 border-2 border-[#1c1b1b] rounded-full absolute bottom-0 right-0"></span>
                        </div>
                        <div>
                            <h4 className="font-bold text-xs text-[#e5e2e1]">
                                @{client.username}
                            </h4>
                            <span className="text-[10px] text-[#909378]">
                                {client.teamName || 'Hincha Neutral'}
                            </span>
                        </div>
                    </div>

                    {client.badgeUrl && (
                        <img
                            src={client.badgeUrl}
                            alt={client.teamName || ''}
                            referrerPolicy="no-referrer"
                            className="w-6 h-6 rounded-full object-cover"
                        />
                    )}
                </div>
            ))}
        </div>
    );
};
