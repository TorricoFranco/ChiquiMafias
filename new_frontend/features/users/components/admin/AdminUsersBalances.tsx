import React from 'react';
import { UserEntity } from '../../types';


interface AdminUsersBalancesProps {
    users: UserEntity[];
}

export const AdminUsersBalances: React.FC<AdminUsersBalancesProps> = ({
    users,
}) => {
    const sortedUsers = [...users].sort(
        (a, b) => (b.wallet?.balance || 0) - (a.wallet?.balance || 0)
    );

    return (
        <div className="bg-[#1c1b1b] border border-[#353534] rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs text-[#e5e2e1]">
                <thead className="bg-[#171717] border-b border-[#353534] text-[10px] uppercase font-bold text-[#909378]">
                    <tr>
                        <th className="py-3 px-4">Usuario</th>
                        <th className="py-3 px-4">Email</th>
                        <th className="py-3 px-4">Saldo de Monedas</th>
                        <th className="py-3 px-4">Estado</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-[#353534]/50">
                    {sortedUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-[#232323] transition-colors">
                            <td className="py-3.5 px-4 font-bold text-[#e5e2e1]">
                                @{user.username || user.name}
                            </td>
                            <td className="py-3.5 px-4 text-[#909378]">{user.email}</td>
                            <td className="py-3.5 px-4 font-mono font-black text-[#d2f000] text-sm">
                                {(user.wallet?.balance || 0).toLocaleString('es-AR')} monedas
                            </td>
                            <td className="py-3.5 px-4 text-[#909378]">
                                <span
                                    className={`px-2 py-1 rounded-full text-[10px] font-bold ${user.status === 'ACTIVE'
                                            ? 'bg-green-500/10 text-green-500'
                                            : 'bg-red-500/10 text-red-500'
                                        }`}
                                >
                                    {user.status}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};