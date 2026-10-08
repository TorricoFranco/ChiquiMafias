import React, { useState } from 'react';
import clsx from 'clsx';
import { NAME_COLORS } from '@/features/chat/config/ColorsRegistry';
import {
  LeaderboardUserStats,
  TopActiveStreakUser,
  TopChatterUser,
} from '../types';
import {
  X,
  Trophy,
  Flame,
  Rocket,
  Coins,
  Shield,
  MessageSquare,
  Swords,
  Zap,
} from 'lucide-react';

interface UserProfileModalProps {
  user: LeaderboardUserStats | TopActiveStreakUser | TopChatterUser | null;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ user, onClose }) => {
  const [hasChallenged, setHasChallenged] = useState(false);

  if (!user) return null;

  let username = 'usuario';
  let activeNameColorId: string | null | undefined = null;
  let teamBadge: string | null | undefined = null;

  if ('user' in user) {
    username = user.user.username || 'anonimo';
    activeNameColorId = user.user.activeNameColorId;
    teamBadge = user.user.team?.badgeUrl;
  } else {
    username = user.username || 'anonimo';
    activeNameColorId = (user as any).activeNameColorId;
    teamBadge = user.team?.badgeUrl;
  }

  const avatarUrl = teamBadge || '/escudos/default.webp';
  const activeColor = NAME_COLORS[activeNameColorId || "default"] || NAME_COLORS.default;

  const handleChallenge = () => {
    setHasChallenged(true);
  };

  const betUser = 'totalCoinsWon' in user ? (user as LeaderboardUserStats) : null;
  const streakUser = 'currentStreak' in user ? (user as TopActiveStreakUser) : null;
  const chatterUser = 'messageCount' in user ? (user as TopChatterUser) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#181817] border border-[#353534] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200">
        {/* Modal Banner */}
        <div className="h-28 bg-gradient-to-r from-[#21270b] via-[#1a2215] to-[#121c24] relative p-4 flex justify-between items-start">
          <div className="flex items-center gap-1.5 bg-[#131313]/80 px-2.5 py-1 rounded-full border border-[#d2f000]/30 text-[#d2f000] text-[10px] font-bold uppercase tracking-wider">
            <Shield className="w-3 h-3 text-[#d2f000]" />
            Jugador Registrado
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 text-[#c6c9ab] hover:text-[#e5e2e1] flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User Card Content */}
        <div className="px-6 pb-6 pt-0 relative">
          {/* Avatar Header */}
          <div className="flex items-end justify-between -mt-10 mb-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-[#1c1b1b] border-2 border-[#d2f000] p-1 overflow-hidden shadow-xl flex items-center justify-center">
                <img
                  src={avatarUrl}
                  alt={username}
                  className="w-full h-full object-contain rounded-xl"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = '/escudos/default.webp';
                  }}
                />
              </div>
            </div>
          </div>

          {/* User Info */}
          <div className="mb-4">
            <h3 className={clsx("text-xl font-black truncate", activeColor.textClass)}>
              @{username}
            </h3>
          </div>

          {/* Detailed Stats Grid */}
          <div className="grid grid-cols-2 gap-2.5 mb-5">
            {betUser && (
              <>
                <div className="bg-[#1c1b1b] border border-[#353534] p-3 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-[#c6c9ab] flex items-center gap-1 mb-1">
                    <Coins className="w-3 h-3 text-[#d2f000]" />
                    Ganancias Totales
                  </span>
                  <div className="text-base font-black text-[#d2f000] font-mono flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0">
                      <img src="/icons/chiqui-coin-icon.png" alt="Chiqui Coin" className="w-full h-full object-cover" />
                    </div>
                    <span>{new Intl.NumberFormat('es-AR').format(betUser.totalCoinsWon)}</span>
                  </div>
                </div>

                <div className="bg-[#1c1b1b] border border-[#353534] p-3 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-[#c6c9ab] flex items-center gap-1 mb-1">
                    <Rocket className="w-3 h-3 text-cyan-400" />
                    Mayor Multiplicador
                  </span>
                  <div className="text-base font-black text-cyan-400 font-mono">
                    {betUser.highestMultiplier.toFixed(1)}x
                  </div>
                </div>

                <div className="bg-[#1c1b1b] border border-[#353534] p-3 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-[#c6c9ab] flex items-center gap-1 mb-1">
                    <Zap className="w-3 h-3 text-cyan-400 fill-cyan-400" />
                    Aciertos al Hilo
                  </span>
                  <div className="text-base font-black text-cyan-400 font-mono">
                    {betUser.longestWinStreak} aciertos
                  </div>
                </div>

                <div className="bg-[#1c1b1b] border border-[#353534] p-3 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-[#c6c9ab] flex items-center gap-1 mb-1">
                    <Trophy className="w-3 h-3 text-yellow-400" />
                    Apuestas Ganadas
                  </span>
                  <div className="text-base font-black text-emerald-400 font-mono">
                    {betUser.totalBetsWon} / {betUser.totalBetsPlaced}
                  </div>
                </div>
              </>
            )}

            {streakUser && (
              <div className="col-span-2 bg-[#1c1b1b] border border-[#353534] p-3.5 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                    <Flame className="w-5 h-5 text-amber-500 fill-amber-500" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-[#c6c9ab] uppercase block">
                      Racha Diaria (Check-in)
                    </span>
                    <span className="text-lg font-black text-amber-400 font-mono">
                      {streakUser.currentStreak} días consecutivos
                    </span>
                  </div>
                </div>
              </div>
            )}

            {chatterUser && (
              <div className="col-span-2 bg-[#1c1b1b] border border-[#353534] p-3.5 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-[#c6c9ab] uppercase block">
                      Mensajes en la Tribuna
                    </span>
                    <span className="text-lg font-black text-cyan-400 font-mono">
                      {new Intl.NumberFormat('es-AR').format(chatterUser.messageCount)} mensajes
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Challenge Button */}
          <button
            onClick={handleChallenge}
            disabled={hasChallenged}
            className={`w-full py-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all ${
              hasChallenged
                ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
                : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/20'
            }`}
          >
            <Swords className="w-4 h-4" />
            <span>
              {hasChallenged
                ? '¡Desafío Enviado para la Próxima Fecha!'
                : `Desafiar a @${username}`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

