"use client";

import React, { useState } from 'react';
import {
  ShieldAlert,
  BarChart2,
  Coins,
  LifeBuoy,
  Users,
  Lock,
} from 'lucide-react';

import { AdminPolls } from '@/features/polls/components/AdminPolls';
import { AdminBets } from '@/features/bets/components/AdminBets';
import { AdminSupport } from '@/features/supports/components/AdminSupport';
import { AdminUsers } from '@/features/users/components/AdminUsers';
import { useAdminStats } from '@/features/users/hooks/useUsers';
import { useUserStore } from '@/store/useUserStore';

export const AdminView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'polls' | 'bets' | 'support' | 'users'>('polls');

  const { data: stats } = useAdminStats();

  const userRole = useUserStore((state) => state.role);

  const isSuperAdmin = userRole === 'ADMIN' || userRole === 'PRESIDENT';

  const metrics = {
    pendingPolls: stats?.pendingPolls || 0,
    openMarkets: stats?.openMarkets || 0,
    openTickets: stats?.openTickets || 0,
    onlineUsers: stats?.onlineUsers || 0,
  };

  const TABS = [
    {
      id: 'polls',
      label: '1. Encuestas',
      sub: 'Moderación & Creación',
      icon: BarChart2,
      badge: metrics.pendingPolls > 0 ? `${metrics.pendingPolls} PEND` : undefined,
      badgeColor: 'bg-amber-500 text-black',
      requiresSuperAdmin: false,
    },
    {
      id: 'bets',
      label: '2. Apuestas',
      sub: 'Mercados & Liquidación',
      icon: Coins,
      badge: `${metrics.openMarkets} OPEN`,
      badgeColor: 'bg-[#d2f000] text-[#191e00]',
      requiresSuperAdmin: true,
    },
    {
      id: 'support',
      label: '3. Soporte',
      sub: 'Tickets & Reportes',
      icon: LifeBuoy,
      badge: metrics.openTickets > 0 ? `${metrics.openTickets} URG` : undefined,
      badgeColor: 'bg-red-500 text-white',
      requiresSuperAdmin: false,
    },
    {
      id: 'users',
      label: '4. Usuarios',
      sub: 'Roles, Mute & Bans',
      icon: Users,
      badge: `${metrics.onlineUsers} ON`,
      badgeColor: 'bg-emerald-500 text-black',
      requiresSuperAdmin: true,
    },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-16">

      <div className="bg-gradient-to-r from-[#1c1b1b] via-[#222120] to-[#1c1b1b] border border-[#d2f000]/30 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#d2f000]/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#d2f000] text-[#191e00] flex items-center justify-center shadow-[0_0_25px_rgba(210,240,0,0.35)] shrink-0">
              <ShieldAlert className="w-9 h-9" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-[#d2f000] text-[#191e00] text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  SISTEMA ROOT / ADMIN
                </span>
                <span className="text-xs font-mono text-[#c6c9ab]">v2.5.0</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#e5e2e1] uppercase tracking-tight mt-1">
                PANEL DE ADMINISTRACIÓN Y CONTROL
              </h1>
              <p className="text-xs text-[#c6c9ab] mt-0.5">
                Módulo para moderación de encuestas, control de apuestas, atención de tickets y roles.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto bg-[#131313]/90 border border-[#353534] p-3 rounded-2xl">
            <div className="text-center px-3 border-r border-[#353534]">
              <span className="text-[9px] uppercase font-bold text-[#909378] block">
                Encuestas Pend.
              </span>
              <span className="font-mono font-black text-amber-400 text-sm">
                {metrics.pendingPolls}
              </span>
            </div>
            <div className="text-center px-3 border-r border-[#353534]">
              <span className="text-[9px] uppercase font-bold text-[#909378] block">
                Mercados Open
              </span>
              <span className="font-mono font-black text-[#d2f000] text-sm">
                {metrics.openMarkets}
              </span>
            </div>
            <div className="text-center px-3">
              <span className="text-[9px] uppercase font-bold text-[#909378] block">
                Tickets Open
              </span>
              <span className="font-mono font-black text-emerald-400 text-sm">
                {metrics.openTickets}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          const isLocked = tab.requiresSuperAdmin && !isSuperAdmin;

          return (
            <button
              key={tab.id}
              onClick={() => {
                if (!isLocked) setActiveTab(tab.id as any);
              }}
              disabled={isLocked}
              className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between gap-2 relative overflow-hidden ${isLocked
                ? 'bg-[#1c1b1b]/50 border-red-500/20 opacity-75 cursor-not-allowed grayscale-[30%]'
                : isActive
                  ? 'bg-[#d2f000] border-[#d2f000] shadow-[0_0_20px_rgba(210,240,0,0.2)] cursor-pointer'
                  : 'bg-[#1c1b1b] border-[#353534] hover:border-[#454932] hover:bg-[#222120] cursor-pointer'
                }`}
            >
              <div className="flex items-center justify-between w-full">
                <div
                  className={`p-2.5 rounded-xl ${isLocked
                    ? 'bg-red-500/10 text-red-500/70'
                    : isActive
                      ? 'bg-[#191e00] text-[#d2f000]'
                      : 'bg-[#2a2a2a] text-[#c6c9ab]'
                    }`}
                >
                  {isLocked ? <Lock className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                </div>

                {isLocked ? (
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/20">
                    Solo Admin
                  </span>
                ) : tab.badge && (
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${isActive ? 'bg-[#191e00] text-[#d2f000]' : tab.badgeColor
                      }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </div>

              <div>
                <h3
                  className={`font-black text-sm uppercase tracking-tight ${isLocked
                    ? 'text-[#e5e2e1]/50'
                    : isActive
                      ? 'text-[#191e00]'
                      : 'text-[#e5e2e1]'
                    }`}
                >
                  {tab.label}
                </h3>
                <span
                  className={`text-[11px] block ${isLocked
                    ? 'text-red-400/70 font-medium'
                    : isActive
                      ? 'text-[#191e00]/80 font-semibold'
                      : 'text-[#909378] font-medium'
                    }`}
                >
                  {isLocked ? 'Requiere permisos superiores' : tab.sub}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-2">
        {activeTab === 'polls' && <AdminPolls />}
        {activeTab === 'bets' && isSuperAdmin && <AdminBets />}
        {activeTab === 'support' && <AdminSupport />}
        {activeTab === 'users' && isSuperAdmin && <AdminUsers />}
      </div>

    </div>
  );
};