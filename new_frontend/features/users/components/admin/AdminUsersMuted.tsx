import React from 'react';
import { Volume2, CheckCircle2 } from 'lucide-react';
import { MutedUser } from '../../types/';

interface AdminUsersMutedProps {
    mutedUsers: MutedUser[];
    onUnmuteUser: (userId: string) => void;
}

export const AdminUsersMuted: React.FC<AdminUsersMutedProps> = ({
    mutedUsers,
    onUnmuteUser,
}) => {
    if (mutedUsers.length === 0) {
        return (
            <div className="bg-[#1c1b1b] border border-[#353534] rounded-2xl p-10 text-center flex flex-col items-center gap-3">
                <CheckCircle2 className="w-12 h-12 text-[#d2f000]" />
                <h3 className="font-extrabold text-base text-[#e5e2e1]">
                    ¡No hay usuarios silenciados actualmente!
                </h3>
                <p className="text-xs text-[#c6c9ab]">
                    El chat de la Tribuna Virtual se encuentra en sana convivencia.
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {mutedUsers.map((muted) => (
                <div
                    key={muted.id}
                    className="bg-[#1c1b1b] border border-amber-500/30 p-4 rounded-2xl flex flex-col justify-between gap-3"
                >
                    <div>
                        <div className="flex justify-between items-start">
                            <span className="font-bold text-xs text-[#e5e2e1]">
                                @{muted.username}
                            </span>
                            <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded">
                                {muted.remainingMinutes} min restantes
                            </span>
                        </div>
                        <span className="text-[10px] text-[#909378] block mt-0.5">
                            {muted.email}
                        </span>
                        <span className="text-[10px] text-[#c6c9ab] block mt-2">
                            Silenciado hasta: {new Date(muted.mutedUntil).toLocaleString()}
                        </span>
                    </div>

                    <button
                        onClick={() => onUnmuteUser(muted.id)}
                        className="w-full bg-amber-500 hover:bg-amber-400 text-[#191e00] font-black text-xs py-2 rounded-xl uppercase transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>Desmutear de Inmediato</span>
                    </button>
                </div>
            ))}
        </div>
    );
};
