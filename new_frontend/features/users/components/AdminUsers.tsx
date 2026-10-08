import React, { useState } from 'react';
import {
  Users,
  VolumeX,
  UserX,
  Activity,
  Coins,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import {
  UserEntity,
  SystemRole,
} from '../types';

import { toast } from 'sonner';

import { AdminUsersTable } from './admin/AdminUsersTable';
import { AdminUsersOnline } from './admin/AdminUsersOnline';
import { AdminUsersMuted } from './admin/AdminUsersMuted';
import { AdminUsersBalances } from './admin/AdminUsersBalances';
import {
  TimeoutModal,
  RoleModal,
  ProfileModal,
} from './admin/AdminUserModals';

import {
  useAdminUsersList,
  useAdminOnlineUsers,
  useAdminMutedUsers,
  useAdminBanUser,
  useAdminUnbanUser,
  useAdminUpdateRole,
  useAdminTimeoutUser,
  useAdminUnmuteUser,
} from '../hooks/useUsers';

export const AdminUsers: React.FC = () => {
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data: usersData, isLoading: isLoadingUsers } = useAdminUsersList(page, limit);
  const { data: onlineUsers = [], isLoading: isLoadingOnline } = useAdminOnlineUsers();
  const { data: mutedUsers = [], isLoading: isLoadingMuted } = useAdminMutedUsers();


  const users: UserEntity[] = usersData?.data || [];
  const totalUsers = usersData?.meta?.total || users.length;

  const banUserMutation = useAdminBanUser();
  const unbanUserMutation = useAdminUnbanUser();
  const updateRoleMutation = useAdminUpdateRole();
  const timeoutUserMutation = useAdminTimeoutUser();
  const unmuteUserMutation = useAdminUnmuteUser();

  const [activeSubTab, setActiveSubTab] = useState<'all' | 'online' | 'muted' | 'balances'>('all');

  const [profileModalUser, setProfileModalUser] = useState<UserEntity | null>(null);
  const [timeoutModalUser, setTimeoutModalUser] = useState<UserEntity | null>(null);
  const [selectedTimeoutDuration, setSelectedTimeoutDuration] = useState<number>(15);

  const [roleModalUser, setRoleModalUser] = useState<UserEntity | null>(null);
  const [selectedNewRole, setSelectedNewRole] = useState<SystemRole>('USER');

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleBanUser = (userId: string) => {
    banUserMutation.mutate(userId, {
      onSuccess: () => showToast('Usuario baneado de la plataforma'),
      onError: (error: any) => toast.error(error.message || 'No se pudo banear al usuario'),
    });
  };

  const handleUnbanUser = (userId: string) => {
    unbanUserMutation.mutate(userId, {
      onSuccess: () => showToast('Baneo revocado. Usuario activo nuevamente'),
      onError: (error: any) => toast.error(error.message || 'No se pudo desbanear al usuario'),
    });
  };

  const handleChangeRole = (userId: string, newRole: SystemRole) => {
    updateRoleMutation.mutate({ userId, role: newRole }, {
      onSuccess: () => {
        toast.success(`Rol del usuario actualizado a [${newRole}]`);
        setRoleModalUser(null);
      },
      onError: (error: any) => {
        toast.error(error.message || 'No se pudo actualizar el rol');
      }
    });
  };

  const handleTimeoutUser = (userId: string, durationMinutes: number) => {
    timeoutUserMutation.mutate({ userId, durationMinutes }, {
      onSuccess: () => showToast(`Usuario silenciado en el chat por ${durationMinutes} minutos`),
      onError: (error: any) => toast.error(error.message || 'No se pudo silenciar al usuario'),
    });
  };

  const handleUnmuteUser = (userId: string) => {
    unmuteUserMutation.mutate(userId, {
      onSuccess: () => showToast('Silencio de chat revocado'),
      onError: (error: any) => toast.error(error.message || 'No se pudo revocar el silencio'),
    });
  };

  const handleOpenRoleModal = (user: UserEntity) => {
    setRoleModalUser(user);
    setSelectedNewRole(user.role);
  };

  const handleOpenTimeoutModal = (user: UserEntity) => {
    setTimeoutModalUser(user);
    setSelectedTimeoutDuration(15);
  };

  const handleTimeoutConfirm = () => {
    if (!timeoutModalUser) return;
    handleTimeoutUser(timeoutModalUser.id, selectedTimeoutDuration);
    setTimeoutModalUser(null);
  };

  const handleRoleConfirm = () => {
    if (!roleModalUser) return;
    handleChangeRole(roleModalUser.id, selectedNewRole);
  };

  if (isLoadingUsers && users.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-[#909378]">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-3 font-bold uppercase text-sm tracking-wider">Cargando usuarios...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#d2f000] text-[#191e00] font-black text-xs px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 border border-black/20 animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-5 h-5" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1c1b1b] border border-[#353534] p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-[#909378]">
              Usuarios Registrados
            </span>
            <div className="text-2xl font-black text-[#e5e2e1] mt-0.5">
              {totalUsers}
            </div>
            <span className="text-[11px] text-[#c6c9ab]">En base de datos</span>
          </div>
          <div className="p-3 bg-[#d2f000]/10 rounded-xl text-[#d2f000]">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#1c1b1b] border border-[#353534] p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-[#909378]">
              Usuarios Conectados
            </span>
            <div className="text-2xl font-black text-emerald-400 font-mono mt-0.5 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              {isLoadingOnline ? '-' : onlineUsers.length}
            </div>
            <span className="text-[11px] text-[#c6c9ab]">Tribuna Chat Live</span>
          </div>
          <div className="p-3 bg-emerald-950/40 rounded-xl text-emerald-400 border border-emerald-900/30">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#1c1b1b] border border-[#353534] p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-[#909378]">
              Usuarios Silenciados
            </span>
            <div className="text-2xl font-black text-amber-400 mt-0.5">
              {isLoadingMuted ? '-' : mutedUsers.length}
            </div>
            <span className="text-[11px] text-[#c6c9ab]">En timeout temporal</span>
          </div>
          <div className="p-3 bg-amber-950/40 rounded-xl text-amber-400 border border-amber-900/30">
            <VolumeX className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#1c1b1b] border border-[#353534] p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-[#909378]">
              Cuentas Baneadas
            </span>
            <div className="text-2xl font-black text-red-400 mt-0.5">
              {users.filter((u) => u.status === 'BANNED').length}
            </div>
            <span className="text-[11px] text-[#c6c9ab]">Acceso restringido</span>
          </div>
          <div className="p-3 bg-red-950/40 rounded-xl text-red-400 border border-red-900/30">
            <UserX className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#353534] pb-3">
        <button
          onClick={() => setActiveSubTab('all')}
          className={`px-4 py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${activeSubTab === 'all'
            ? 'bg-[#d2f000] text-[#191e00] shadow-sm'
            : 'bg-[#1c1b1b] text-[#c6c9ab] hover:text-[#e5e2e1] border border-[#353534]'
            }`}
        >
          <Users className="w-4 h-4" />
          <span>Todos los Usuarios</span>
          <span className="text-[10px] font-mono px-2 py-0.2 rounded-full font-bold bg-[#131313] text-[#d2f000]">
            {totalUsers}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('online')}
          className={`px-4 py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${activeSubTab === 'online'
            ? 'bg-[#d2f000] text-[#191e00] shadow-sm'
            : 'bg-[#1c1b1b] text-[#c6c9ab] hover:text-[#e5e2e1] border border-[#353534]'
            }`}
        >
          <Activity className="w-4 h-4 text-emerald-400" />
          <span>Usuarios Online</span>
          <span className="text-[10px] font-mono px-2 py-0.2 rounded-full font-bold bg-emerald-950 text-emerald-300">
            {onlineUsers.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('muted')}
          className={`px-4 py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${activeSubTab === 'muted'
            ? 'bg-[#d2f000] text-[#191e00] shadow-sm'
            : 'bg-[#1c1b1b] text-[#c6c9ab] hover:text-[#e5e2e1] border border-[#353534]'
            }`}
        >
          <VolumeX className="w-4 h-4 text-amber-400" />
          <span>Muteados ({mutedUsers.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('balances')}
          className={`px-4 py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${activeSubTab === 'balances'
            ? 'bg-[#d2f000] text-[#191e00] shadow-sm'
            : 'bg-[#1c1b1b] text-[#c6c9ab] hover:text-[#e5e2e1] border border-[#353534]'
            }`}
        >
          <Coins className="w-4 h-4 text-[#d2f000]" />
          <span>Saldos de Wallets</span>
        </button>
      </div>

      {/* Vistas (Sub-Tabs) */}
      {activeSubTab === 'all' && (
        <AdminUsersTable
          users={users}
          onOpenProfile={(u) => setProfileModalUser(u)}
          onOpenRoleModal={handleOpenRoleModal}
          onOpenTimeoutModal={handleOpenTimeoutModal}
          onUnmuteUser={handleUnmuteUser}
          onBanUser={handleBanUser}
          onUnbanUser={handleUnbanUser}
        />
      )}

      {activeSubTab === 'online' && (
        <AdminUsersOnline onlineUsers={onlineUsers} />
      )}

      {activeSubTab === 'muted' && (
        <AdminUsersMuted
          mutedUsers={mutedUsers}
          onUnmuteUser={handleUnmuteUser}
        />
      )}

      {activeSubTab === 'balances' && (
        <AdminUsersBalances users={users} />
      )}

      {/* Modales */}
      <TimeoutModal
        user={timeoutModalUser}
        selectedDuration={selectedTimeoutDuration}
        onSelectDuration={setSelectedTimeoutDuration}
        onConfirm={handleTimeoutConfirm}
        onClose={() => setTimeoutModalUser(null)}
        isLoading={timeoutUserMutation.isPending}
      />

      <RoleModal
        user={roleModalUser}
        selectedRole={selectedNewRole}
        onSelectRole={setSelectedNewRole}
        onConfirm={handleRoleConfirm}
        onClose={() => setRoleModalUser(null)}
        isLoading={updateRoleMutation.isPending}
      />

      <ProfileModal
        user={profileModalUser}
        onClose={() => setProfileModalUser(null)}
      />
    </div>
  );
};