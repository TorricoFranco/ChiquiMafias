import React from 'react';
import { VolumeX, Crown, X } from 'lucide-react';
import { UserEntity, SystemRole } from '../../types';


interface TimeoutModalProps {
  user: UserEntity | null;
  selectedDuration: number;
  onSelectDuration: (duration: number) => void;
  onConfirm: () => void;
  onClose: () => void;
  isLoading?: boolean;
}

export const TimeoutModal: React.FC<TimeoutModalProps> = ({
  user,
  selectedDuration,
  onSelectDuration,
  onConfirm,
  onClose,
  isLoading = false,
}) => {
  if (!user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        onClick={!isLoading ? onClose : undefined}
      ></div>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="timeout-modal-title"
        className="relative bg-[#1c1b1b] border border-amber-500/50 rounded-2xl max-w-md w-full p-6 z-10 shadow-2xl animate-in zoom-in-95"
      >
        <div className="flex justify-between items-center border-b border-[#353534] pb-3 mb-4">
          <div className="flex items-center gap-2 text-amber-400">
            <VolumeX className="w-5 h-5" />
            <h3 id="timeout-modal-title" className="font-extrabold text-base text-[#e5e2e1] uppercase">
              Silenciar Usuario en Tribuna
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="text-[#c6c9ab] hover:text-[#e5e2e1]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <p className="text-xs text-[#c6c9ab]">
            El usuario <strong>@{user.username}</strong> no podrá enviar mensajes en el chat de la Tribuna Virtual durante el periodo seleccionado.
          </p>

          <div>
            <span id="timeout-modal-duration" className="block text-[10px] font-bold uppercase text-[#c6c9ab] mb-2">
              Seleccionar Tiempo de Timeout:
            </span>
            <div role="group" aria-labelledby="timeout-modal-duration" className="grid grid-cols-2 gap-2">
              {[
                { label: '5 Minutos', val: 5 },
                { label: '15 Minutos', val: 15 },
                { label: '1 Hora', val: 60 },
                { label: '24 Horas', val: 1440 },
              ].map((dur) => (
                <button
                  key={dur.val}
                  type="button"
                  aria-pressed={selectedDuration === dur.val}
                  onClick={() => onSelectDuration(dur.val)}
                  className={`p-3 rounded-xl border font-bold text-xs transition-all cursor-pointer ${selectedDuration === dur.val
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-[#131313] border-[#353534] text-[#c6c9ab]'
                    }`}
                >
                  {dur.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4 mt-2 border-t border-[#353534]">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className={`text-xs font-bold px-4 py-2 ${isLoading ? 'text-[#c6c9ab]/50 cursor-not-allowed' : 'text-[#c6c9ab] hover:text-[#e5e2e1]'
              }`}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`font-black text-xs px-6 py-2.5 rounded-xl uppercase transition-all shadow-md active:scale-95 flex items-center gap-2 ${isLoading
              ? 'bg-amber-500/50 text-[#191e00]/50 cursor-not-allowed'
              : 'bg-amber-500 hover:bg-amber-400 text-[#191e00] cursor-pointer'
              }`}
          >
            {isLoading ? 'Aplicando...' : 'Aplicar Silencio'}
          </button>
        </div>
      </div>
    </div>
  );
};

interface RoleModalProps {
  user: UserEntity | null;
  selectedRole: SystemRole;
  onSelectRole: (role: SystemRole) => void;
  onConfirm: () => void;
  onClose: () => void;
  isLoading?: boolean;
}

export const RoleModal: React.FC<RoleModalProps> = ({
  user,
  selectedRole,
  onSelectRole,
  onConfirm,
  onClose,
  isLoading = false,
}) => {
  if (!user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        onClick={!isLoading ? onClose : undefined}
      ></div>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="role-modal-title"
        className="relative bg-[#1c1b1b] border border-[#d2f000]/60 rounded-2xl max-w-md w-full p-6 z-10 shadow-2xl animate-in zoom-in-95"
      >
        <div className="flex justify-between items-center border-b border-[#353534] pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-[#d2f000]" />
            <h3 id="role-modal-title" className="font-extrabold text-base text-[#e5e2e1] uppercase">
              Cambiar Rol de Sistema
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="text-[#c6c9ab] hover:text-[#e5e2e1]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <p className="text-xs text-[#c6c9ab]">
            Asigná los permisos de moderación o administración para <strong>@{user.username}</strong>:
          </p>

          <div className="flex flex-col gap-2">
            {(['USER', 'MODERATOR', 'ADMIN', 'PRESIDENT'] as SystemRole[]).map(
              (role) => (
                <label
                  key={role}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${selectedRole === role
                    ? 'bg-[#d2f000]/15 border-[#d2f000] text-[#e5e2e1]'
                    : 'bg-[#131313] border-[#353534] text-[#c6c9ab]'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="systemRole"
                      value={role}
                      checked={selectedRole === role}
                      onChange={() => onSelectRole(role)}
                      className="accent-[#d2f000]"
                    />
                    <div>
                      <span className="font-bold text-xs block">{role}</span>
                      <span className="text-[10px] text-[#909378]">
                        {role === 'PRESIDENT'
                          ? 'Dueño absoluto con bypass de balance y permisos totales'
                          : role === 'ADMIN'
                            ? 'Acceso total al Panel Admin, apuestas y moderación'
                            : role === 'MODERATOR'
                              ? 'Manejo de chat, muteos y resolución de reportes'
                              : 'Usuario estándar de la comunidad'}
                      </span>
                    </div>
                  </div>
                </label>
              )
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 mt-2 border-t border-[#353534]">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className={`text-xs font-bold px-4 py-2 ${isLoading ? 'text-[#c6c9ab]/50 cursor-not-allowed' : 'text-[#c6c9ab] hover:text-[#e5e2e1]'
              }`}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`font-black text-xs px-6 py-2.5 rounded-xl uppercase transition-all shadow-md active:scale-95 flex items-center gap-2 ${isLoading
              ? 'bg-[#d2f000]/50 text-[#191e00]/50 cursor-not-allowed'
              : 'bg-[#d2f000] text-[#191e00] hover:bg-[#b8d300] cursor-pointer'
              }`}
          >
            {isLoading ? 'Guardando...' : 'Guardar Rol'}
          </button>
        </div>
      </div>
    </div>
  );
};

interface ProfileModalProps {
  user: UserEntity | null;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ user, onClose }) => {
  if (!user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      ></div>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Perfil de @${user.username}`}
        className="relative bg-[#1c1b1b] border border-[#353534] rounded-3xl max-w-md w-full overflow-hidden z-10 shadow-2xl animate-in zoom-in-95"
      >
        {/* Profile Cover Banner */}
        <div className="h-28 bg-gradient-to-r from-blue-900 via-indigo-950 to-neutral-900 relative">
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="absolute top-3 right-3 bg-black/60 hover:bg-black text-white p-1.5 rounded-full backdrop-blur-sm"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 pt-0 relative">
          {/* Avatar */}
          <div className="-mt-12 mb-3 flex justify-between items-end">
            <div className="w-20 h-20 rounded-2xl bg-[#131313] border-4 border-[#1c1b1b] flex items-center justify-center font-black text-2xl text-[#d2f000] shadow-lg">
              {user.username?.slice(0, 2).toUpperCase()}
            </div>
            <span className="bg-[#d2f000] text-[#191e00] font-black text-[10px] px-3 py-1 rounded-full uppercase tracking-wider">
              {user.role}
            </span>
          </div>

          {/* User details */}
          <h3 className="font-black text-lg text-[#e5e2e1]">{user.name}</h3>
          <p className="text-xs text-[#d2f000] font-semibold">
            @{user.username}
          </p>

          {user.team && (
            <div className="mt-3 flex items-center gap-2 bg-[#131313] p-2.5 rounded-xl border border-[#353534]">
              {user.team.badgeUrl && (
                <img
                  src={user.team.badgeUrl}
                  alt={user.team.name}
                  referrerPolicy="no-referrer"
                  className="w-6 h-6 rounded-full object-cover"
                />
              )}
              <span className="font-bold text-xs text-[#e5e2e1]">
                Hincha de {user.team.name}
              </span>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-[#131313] p-3 rounded-xl border border-[#353534] text-center">
              <span className="text-[10px] text-[#909378] font-bold uppercase block">
                Racha de Check-in
              </span>
              <span className="font-mono font-black text-amber-400 text-base">
                🔥 {user.currentStreak} días
              </span>
            </div>

            <div className="bg-[#131313] p-3 rounded-xl border border-[#353534] text-center">
              <span className="text-[10px] text-[#909378] font-bold uppercase block">
                Suscripción
              </span>
              <span className="font-bold text-[#d2f000] text-xs">
                {user.activeSubscriptionTier || 'Estándar Gratis'}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-[#353534] text-[11px] text-[#909378] flex justify-between">
            <span>Miembro desde:</span>
            <span className="text-[#e5e2e1] font-mono">
              {new Date(user.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
