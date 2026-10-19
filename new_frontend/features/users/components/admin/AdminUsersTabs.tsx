import React from 'react';
import { Users, Activity, VolumeX, Coins } from 'lucide-react';

export type UserSubTab = 'all' | 'online' | 'muted' | 'balances';

interface AdminUsersTabsProps {
    activeTab: UserSubTab;
    onTabChange: (tab: UserSubTab) => void;
    counts: {
        total: number;
        online: number;
        muted: number;
    };
}

export const AdminUsersTabs: React.FC<AdminUsersTabsProps> = ({
    activeTab,
    onTabChange,
    counts,
}) => {
    const getTabClass = (tab: UserSubTab) =>
        `px-4 py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${activeTab === tab
            ? 'bg-[#d2f000] text-[#191e00] shadow-sm'
            : 'bg-[#1c1b1b] text-[#c6c9ab] hover:text-[#e5e2e1] border border-[#353534]'
        }`;

    return (
        <div className="flex flex-wrap items-center gap-2 border-b border-[#353534] pb-3">
            <button onClick={() => onTabChange('all')} className={getTabClass('all')}>
                <Users className="w-4 h-4" />
                <span>Todos los Usuarios</span>
                <span className="text-[10px] font-mono px-2 py-0.2 rounded-full font-bold bg-[#131313] text-[#d2f000]">
                    {counts.total}
                </span>
            </button>

            <button onClick={() => onTabChange('online')} className={getTabClass('online')}>
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>Usuarios Online</span>
                <span className="text-[10px] font-mono px-2 py-0.2 rounded-full font-bold bg-emerald-950 text-emerald-300">
                    {counts.online}
                </span>
            </button>

            <button onClick={() => onTabChange('muted')} className={getTabClass('muted')}>
                <VolumeX className="w-4 h-4 text-amber-400" />
                <span>Muteados ({counts.muted})</span>
            </button>

            <button onClick={() => onTabChange('balances')} className={getTabClass('balances')}>
                <Coins className="w-4 h-4 text-[#d2f000]" />
                <span>Saldos de Wallets</span>
            </button>
        </div>
    );
};