import React from 'react';

interface AdminBetsFilterProps {
    filterStatus: string;
    setFilterStatus: (status: string) => void;
}

export const AdminBetsFilter: React.FC<AdminBetsFilterProps> = ({
    filterStatus,
    setFilterStatus,
}) => {
    const statuses = ['ALL', 'OPEN', 'LOCKED', 'SETTLED', 'REFUNDED'];

    return (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#1c1b1b] border border-[#353534] p-3 rounded-2xl">
            <div className="flex items-center gap-1.5 overflow-x-auto">
                {statuses.map((st) => (
                    <button
                        key={st}
                        onClick={() => setFilterStatus(st)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer ${filterStatus === st
                                ? 'bg-[#d2f000] text-[#191e00]'
                                : 'text-[#c6c9ab] hover:text-[#e5e2e1] hover:bg-[#2a2a2a]'
                            }`}
                    >
                        {st === 'ALL'
                            ? 'Todos'
                            : st === 'OPEN'
                                ? 'Abiertos'
                                : st === 'LOCKED'
                                    ? 'Bloqueados'
                                    : st === 'SETTLED'
                                        ? 'Liquidados'
                                        : 'Reembolsados'}
                    </button>
                ))}
            </div>

            <span className="text-xs text-[#909378] font-mono">
                Endpoint: <code className="text-[#d2f000]">POST /bets/admin/markets</code>
            </span>
        </div>
    );
};