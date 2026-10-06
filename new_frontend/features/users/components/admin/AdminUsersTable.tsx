import React, { useState } from 'react';
import {
    Search,
    Flame,
    Eye,
    Crown,
    Volume2,
    VolumeX,
    UserX,
    UserCheck,
    Coins,
} from 'lucide-react';
import { UserEntity } from '../../types';

import { ROLE_UI_CONFIG, TIER_UI_CONFIG, SubscriptionTier } from '@/features/auth/constants/ROLES_SUBSCRIPTION';
import { AddCoinsModal } from './AdminAddCoinsModal';

const SUBSCRIPTION_TRANSLATIONS: Partial<Record<SubscriptionTier, string>> = {
    [SubscriptionTier.TIER_1]: 'Popular',
    [SubscriptionTier.TIER_2]: 'Plateísta Pro',
    [SubscriptionTier.TIER_3]: 'Palco VIP',
};

interface AdminUsersTableProps {
    users: UserEntity[];
    onOpenProfile: (user: UserEntity) => void;
    onOpenRoleModal: (user: UserEntity) => void;
    onOpenTimeoutModal: (user: UserEntity) => void;
    onUnmuteUser: (userId: string) => void;
    onBanUser: (userId: string) => void;
    onUnbanUser: (userId: string) => void;
}

export const AdminUsersTable: React.FC<AdminUsersTableProps> = ({
    users,
    onOpenProfile,
    onOpenRoleModal,
    onOpenTimeoutModal,
    onUnmuteUser,
    onBanUser,
    onUnbanUser,
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('ALL');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [selectedUserForCoins, setSelectedUserForCoins] = useState<UserEntity | null>(null);

    const filteredUsers = users.filter((u) => {
        if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
        if (statusFilter !== 'ALL' && u.status !== statusFilter) return false;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const matchName = u.name?.toLowerCase().includes(q) || false;
            const matchUsername = u.username?.toLowerCase().includes(q) || false;
            const matchEmail = u.email?.toLowerCase().includes(q) || false;
            return matchName || matchUsername || matchEmail;
        }
        return true;
    });

    return (
        <div className="flex flex-col gap-4">
            {/* Search & Filters */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#1c1b1b] border border-[#353534] p-3.5 rounded-2xl">
                <div className="relative flex-1 min-w-[220px]">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#909378]" />
                    <input
                        type="text"
                        aria-label="Buscar usuarios"
                        placeholder="Buscar por usuario, nombre o email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#131313] border border-[#353534] focus:border-[#d2f000] text-xs text-[#e5e2e1] pl-9 pr-3 py-2 rounded-xl outline-none"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <select
                        aria-label="Filtrar usuarios por rol"
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="bg-[#131313] border border-[#353534] text-xs font-bold text-[#e5e2e1] px-3 py-2 rounded-xl outline-none cursor-pointer"
                    >
                        <option value="ALL">Todos los Roles</option>
                        <option value="USER">USER</option>
                        <option value="MODERATOR">MODERATOR</option>
                        <option value="ADMIN">ADMIN</option>
                        <option value="PRESIDENT">PRESIDENT (Dueño)</option>
                    </select>

                    <select
                        aria-label="Filtrar usuarios por estado"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-[#131313] border border-[#353534] text-xs font-bold text-[#e5e2e1] px-3 py-2 rounded-xl outline-none cursor-pointer"
                    >
                        <option value="ALL">Todos los Estados</option>
                        <option value="ACTIVE">Activos</option>
                        <option value="BANNED">Baneados</option>
                    </select>
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-[#1c1b1b] border border-[#353534] rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-[#e5e2e1]">
                        <thead className="bg-[#171717] border-b border-[#353534] text-[10px] uppercase font-bold text-[#909378]">
                            <tr>
                                <th className="py-3 px-4">Usuario</th>
                                <th className="py-3 px-4">Club / Equipo</th>
                                <th className="py-3 px-4">Rol & Nivel</th>
                                <th className="py-3 px-4">Suscripción</th>
                                <th className="py-3 px-4">Racha</th>
                                <th className="py-3 px-4">Estado</th>
                                <th className="py-3 px-4 text-right">Acciones Moderación</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#353534]/50">
                            {filteredUsers.map((user) => {
                                const isMuted = !!user.mutedUntil;

                                return (
                                    <tr
                                        key={user.id}
                                        className="hover:bg-[#232323] transition-colors"
                                    >
                                        {/* User identity */}
                                        <td className="py-3.5 px-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-[#2a2a2a] border border-[#353534] flex items-center justify-center font-bold text-xs text-[#d2f000]">
                                                    {user.username?.slice(0, 2).toUpperCase() || 'US'}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-[#e5e2e1] flex items-center gap-1.5">
                                                        <span>{user.name}</span>
                                                        <span className="text-[#909378] text-[11px]">
                                                            (@{user.username})
                                                        </span>
                                                    </div>
                                                    <span className="text-[10px] text-[#909378] block">
                                                        {user.email}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Team */}
                                        <td className="py-3.5 px-4">
                                            {user.team ? (
                                                <div className="flex items-center gap-2">
                                                    {user.team.badgeUrl ? (
                                                        <img
                                                            src={user.team.badgeUrl}
                                                            alt={user.team.name}
                                                            referrerPolicy="no-referrer"
                                                            className="w-5 h-5 rounded-full object-cover"
                                                        />
                                                    ) : (
                                                        <span className="w-4 h-4 bg-[#353534] rounded-full"></span>
                                                    )}
                                                    <span className="font-semibold text-xs text-[#e5e2e1]">
                                                        {user.team.name}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-[#909378] text-[11px]">Sin equipo</span>
                                            )}
                                        </td>

                                        {/* Columna de Rol */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {user.role && ROLE_UI_CONFIG[user.role] ? (
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${ROLE_UI_CONFIG[user.role].className}`}>
                                                    {ROLE_UI_CONFIG[user.role].badge}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-gray-400 font-medium">
                                                    Hinchada / Usuario
                                                </span>
                                            )}
                                        </td>

                                        {/* Columna de Suscripción */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {user.activeSubscriptionTier && SUBSCRIPTION_TRANSLATIONS[user.activeSubscriptionTier as SubscriptionTier] ? (
                                                <span
                                                    className="px-2.5 py-1 rounded-full text-xs font-bold"
                                                    style={{
                                                        backgroundColor: TIER_UI_CONFIG[user.activeSubscriptionTier]?.badgeColor || '#e5e7eb',
                                                        color: TIER_UI_CONFIG[user.activeSubscriptionTier]?.textColor || '#000000',
                                                    }}
                                                >
                                                    {SUBSCRIPTION_TRANSLATIONS[user.activeSubscriptionTier as SubscriptionTier]}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400 font-medium">-</span>
                                            )}
                                        </td>

                                        {/* Streak */}
                                        <td className="py-3.5 px-4">
                                            <div className="flex items-center gap-1 font-mono font-bold text-[#e5e2e1]">
                                                <Flame className="w-3.5 h-3.5 text-amber-400" />
                                                {user.currentStreak} días
                                            </div>
                                        </td>

                                        {/* Status */}
                                        <td className="py-3.5 px-4">
                                            <div className="flex flex-col gap-1">
                                                <span
                                                    className={`text-[9px] font-black px-2 py-0.5 rounded uppercase w-fit ${user.status === 'ACTIVE'
                                                        ? 'bg-emerald-500/20 text-emerald-300'
                                                        : 'bg-red-500/20 text-red-300'
                                                        }`}
                                                >
                                                    {user.status}
                                                </span>
                                                {isMuted && (
                                                    <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-mono font-bold">
                                                        Muted
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        {/* Actions */}
                                        <td className="py-3.5 px-4 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                {/* Recargar Monedas */}
                                                <button
                                                    onClick={() => setSelectedUserForCoins(user)}
                                                    className="p-1.5 bg-[#2a2a2a] hover:bg-[#353534] text-[#c6c9ab] hover:text-[#d2f000] rounded-lg transition-colors cursor-pointer"
                                                    title="Recargar saldo / monedas"
                                                >
                                                    <Coins className="w-3.5 h-3.5" />
                                                </button>

                                                {/* Public profile */}
                                                <button
                                                    onClick={() => onOpenProfile(user)}
                                                    className="p-1.5 bg-[#2a2a2a] hover:bg-[#353534] text-[#c6c9ab] hover:text-white rounded-lg transition-colors cursor-pointer"
                                                    title="Ver perfil público"
                                                >
                                                    <Eye className="w-3.5 h-3.5" />
                                                </button>

                                                {/* Change role */}
                                                <button
                                                    onClick={() => onOpenRoleModal(user)}
                                                    className="p-1.5 bg-[#2a2a2a] hover:bg-[#353534] text-[#c6c9ab] hover:text-[#d2f000] rounded-lg transition-colors cursor-pointer"
                                                    title="Cambiar rol"
                                                >
                                                    <Crown className="w-3.5 h-3.5" />
                                                </button>

                                                {/* Timeout / Unmute */}
                                                {isMuted ? (
                                                    <button
                                                        onClick={() => onUnmuteUser(user.id)}
                                                        className="p-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg transition-colors cursor-pointer"
                                                        title="Desmutear (POST /moderation/unmute)"
                                                    >
                                                        <Volume2 className="w-3.5 h-3.5" />
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => onOpenTimeoutModal(user)}
                                                        className="p-1.5 bg-[#2a2a2a] hover:bg-amber-950/40 text-[#c6c9ab] hover:text-amber-300 rounded-lg transition-colors cursor-pointer"
                                                        title="Silenciar Chat"
                                                    >
                                                        <VolumeX className="w-3.5 h-3.5" />
                                                    </button>
                                                )}

                                                {/* Ban / Unban */}
                                                {user.status === 'ACTIVE' ? (
                                                    <button
                                                        onClick={() => onBanUser(user.id)}
                                                        className="p-1.5 bg-red-950/30 hover:bg-red-900/50 text-red-400 border border-red-900/30 rounded-lg transition-colors cursor-pointer"
                                                        title="Banear Cuenta"
                                                    >
                                                        <UserX className="w-3.5 h-3.5" />
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => onUnbanUser(user.id)}
                                                        className="p-1.5 bg-emerald-950/30 hover:bg-emerald-900/50 text-emerald-400 border border-emerald-900/30 rounded-lg transition-colors cursor-pointer"
                                                        title="Desbanear Cuenta"
                                                    >
                                                        <UserCheck className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal para Recargar Monedas */}
            <AddCoinsModal
                user={selectedUserForCoins}
                onClose={() => setSelectedUserForCoins(null)}
            />
        </div>
    );
};