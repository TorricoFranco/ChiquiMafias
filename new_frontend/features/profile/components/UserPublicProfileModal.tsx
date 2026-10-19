"use client";

import { usePublicProfile } from "@/features/auth/hooks/useAuth";
import { X, Calendar, MessageSquare, Package, Flame, Trophy } from "lucide-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/es";

dayjs.extend(relativeTime);
dayjs.locale("es");

interface UserProfileModalProps {
  userId: string | null;
  onClose: () => void;
}

export default function UserProfileModal({ userId, onClose }: UserProfileModalProps) {
  const { data: profile, isLoading, isError } = usePublicProfile(userId);

  if (!userId) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#161616] border border-white/10 rounded-3xl w-full max-w-sm shadow-2xl shadow-black/70 overflow-hidden relative animate-in zoom-in-95 duration-200">

        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 bg-black/50 hover:bg-black/80 text-white p-1.5 rounded-full transition-colors backdrop-blur-md"
        >
          <X className="w-4 h-4" />
        </button>

        {isLoading ? (
          <div className="h-64 flex items-center justify-center text-gray-400">Cargando perfil...</div>
        ) : isError ? (
          <div className="h-64 flex items-center justify-center text-red-400">Error al cargar el perfil</div>
        ) : (
          <>
            <div className="h-36 sm:h-40 bg-gradient-to-br from-[#2a2a2a] to-[#101010] flex items-end justify-center pb-4 relative">
              {profile.activeBannerId && (
                <img
                  src={`/cosmetics/banners/${profile.activeBannerId}.webp`}
                  alt="Banner"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#161616] via-transparent to-transparent" />

              <div className="relative z-10 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#1e1e1e] border-4 border-[#161616] shadow-[0_0_20px_rgba(0,0,0,0.6)] flex items-center justify-center overflow-hidden translate-y-12">
                {profile.team?.badgeUrl ? (
                  <img src={profile.team.badgeUrl} alt="Escudo" className="w-full h-full object-contain p-2" />
                ) : (
                  <span className="text-2xl text-gray-400 font-bold">?</span>
                )}
              </div>
            </div>

            <div className="pt-14 pb-6 px-5 sm:px-6 text-center">
              <h3 className="text-xl sm:text-2xl font-headline font-bold text-white tracking-wide">{profile.username}</h3>
              {profile.team?.name && (
                <p className="inline-block mt-2 text-[10px] text-[#d2f000] font-bold uppercase tracking-widest bg-[#d2f000]/10 border border-[#d2f000]/20 rounded-full px-3 py-1">
                  Hincha de {profile.team.name}
                </p>
              )}

              {/* Contenedor de Estadísticas */}
              <div className="grid grid-cols-2 gap-3 mt-6">

                {/*  RACHA DE APUESTAS ACTUAL */}
                <div className="bg-emerald-500/5 p-3 rounded-2xl border border-emerald-500/25 flex flex-col items-center col-span-2 transition-colors hover:bg-emerald-500/10">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Trophy className="w-4 h-4 text-emerald-400" />
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                      Racha de Apuestas
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-white">
                      {profile.bettingStats?.currentWinStreak || 0}
                    </span>
                    <span className="text-xs text-gray-400">
                      (Máx: {profile.bettingStats?.longestWinStreak || 0})
                    </span>
                  </div>
                </div>

                {/* RACHA DE LOGIN / CHECK-IN */}
                <div className="bg-[#1e1e1e] p-3 rounded-2xl border border-white/5 flex flex-col items-center transition-colors hover:border-amber-500/30">
                  <Flame className="w-5 h-5 text-amber-500 mb-1" />
                  <span className="text-lg font-black text-white">{profile.currentStreak || 0}</span>
                  <span className="text-[10px] text-gray-400 uppercase">Días al hilo</span>
                </div>

                {/* MENSAJES */}
                <div className="bg-[#1e1e1e] p-3 rounded-2xl border border-white/5 flex flex-col items-center transition-colors hover:border-sky-500/30">
                  <MessageSquare className="w-5 h-5 text-sky-400 mb-1" />
                  <span className="text-lg font-black text-white">{profile.totalMessages || 0}</span>
                  <span className="text-[10px] text-gray-400 uppercase">Mensajes</span>
                </div>

                {/* COSMÉTICOS */}
                <div className="bg-[#1e1e1e] p-3 rounded-2xl border border-white/5 flex flex-col items-center transition-colors hover:border-purple-500/30">
                  <Package className="w-5 h-5 text-purple-400 mb-1" />
                  <span className="text-lg font-black text-white">{profile.cosmeticsCount || 0}</span>
                  <span className="text-[10px] text-gray-400 uppercase">Cosméticos</span>
                </div>

                {/*  ANTIGÜEDAD */}
                <div className="bg-[#1e1e1e] p-3 rounded-2xl border border-white/5 flex flex-col items-center justify-center transition-colors hover:border-green-500/30">
                  <Calendar className="w-5 h-5 text-green-400 mb-1" />
                  <span className="text-sm font-bold text-white capitalize mt-0.5">
                    {dayjs(profile.createdAt).fromNow(true)}
                  </span>
                  <span className="text-[10px] text-gray-400 uppercase">Antigüedad</span>
                </div>

              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}