import React from 'react';
import { Users, Activity, VolumeX, UserX } from 'lucide-react';

interface AdminUsersStatsProps {
    totalUsers: number;
    onlineUsers: number;
    mutedUsers: number;
    bannedUsers: number;
}

export const AdminUsersStats: React.FC<AdminUsersStatsProps> = ({
    totalUsers,
    onlineUsers,
    mutedUsers,
    bannedUsers,
}) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1c1b1b] border border-[#353534] p-4 rounded-2xl flex items-center justify-between">
            <div>
                <span className="text-[10px] uppercase font-bold text-[#909378]">Usuarios Registrados</span>
                <div className="text-2xl font-black text-[#e5e2e1] mt-0.5">{totalUsers}</div>
                <span className="text-[11px] text-[#c6c9ab]">En base de datos</span>
            </div>
            <div className="p-3 bg-[#d2f000]/10 rounded-xl text-[#d2f000]">
                <Users className="w-6 h-6" />
            </div>
        </div>

        <div className="bg-[#1c1b1b] border border-[#353534] p-4 rounded-2xl flex items-center justify-between">
            <div>
                <span className="text-[10px] uppercase font-bold text-[#909378]">Usuarios Conectados</span>
                <div className="text-2xl font-black text-emerald-400 font-mono mt-0.5 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    {onlineUsers}
                </div>
                <span className="text-[11px] text-[#c6c9ab]">Tribuna Chat Live</span>
            </div>
            <div className="p-3 bg-emerald-950/40 rounded-xl text-emerald-400 border border-emerald-900/30">
                <Activity className="w-6 h-6" />
            </div>
        </div>

        <div className="bg-[#1c1b1b] border border-[#353534] p-4 rounded-2xl flex items-center justify-between">
            <div>
                <span className="text-[10px] uppercase font-bold text-[#909378]">Usuarios Silenciados</span>
                <div className="text-2xl font-black text-amber-400 mt-0.5">{mutedUsers}</div>
                <span className="text-[11px] text-[#c6c9ab]">En timeout temporal</span>
            </div>
            <div className="p-3 bg-amber-950/40 rounded-xl text-amber-400 border border-amber-900/30">
                <VolumeX className="w-6 h-6" />
            </div>
        </div>

        <div className="bg-[#1c1b1b] border border-[#353534] p-4 rounded-2xl flex items-center justify-between">
            <div>
                <span className="text-[10px] uppercase font-bold text-[#909378]">Cuentas Baneadas</span>
                <div className="text-2xl font-black text-red-400 mt-0.5">{bannedUsers}</div>
                <span className="text-[11px] text-[#c6c9ab]">Acceso restringido</span>
            </div>
            <div className="p-3 bg-red-950/40 rounded-xl text-red-400 border border-red-900/30">
                <UserX className="w-6 h-6" />
            </div>
        </div>
    </div>
);