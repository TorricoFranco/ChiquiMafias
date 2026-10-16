"use client";

import React from "react";
import { SidebarNav } from "@/components/Social/SidebarNav";
import { ChatPanel } from "@/features/chat/components/ChatPanel";
import { ProfilePanel } from "@/features/profile/components/ProfilePanel";
import { RightSidebar } from "@/components/Social/RightSidebar";
import { StoreView } from "@/features/store/components/StoreView";
import { SidebarPolls } from "@/features/polls/components/SidebaPolls";
import { TicketActive } from "../../features/bets/components/TicketActive";
import { BetsCards } from "../../features/bets/components/BetsCards";
import { ClaimRewardsBanner, ClaimRewardsNotice } from "./ClaimewardsBanner";
import { AdminView } from "@/features/admin/components/AdminView";
import { UserSupportView } from "@/features/supports/components/tickets/UserSupportView";
import { useNavigationStore } from "@/store/useNavigationStore";
import { useUserStore } from "@/store/useUserStore";
import { LoginPrompt } from "@/features/auth/components/LoginPrompt";
import { SocialStatsView } from "@/features/stats/components/SocialStatsView";
import { SidebarFixtureList } from "@/components/widgets/SidebarFixtureList";


export const SocialView = () => {
  const activeTab = useNavigationStore((state) => state.activeTab);
  const userId = useUserStore((state) => state.id);

  const showRightSidebar = ["Chat", "Mi Perfil",].includes(activeTab);

  return (
    <div className="flex flex-1 overflow-hidden h-full">
      <div className="hidden lg:block h-full w-[240px] flex-shrink-0">
        <SidebarNav />
      </div>

      <main className="flex-1 bg-[#131313] flex flex-col min-w-0 border-r border-[#353534] relative overflow-y-auto">

        {/* h-0: el aviso flota sobre el contenido sin empujarlo; sticky lo deja visible al scrollear */}
        {activeTab !== "Comunidad" && (
          <div className="sticky top-3 z-20 h-0 overflow-visible flex justify-center pointer-events-none">
            <ClaimRewardsNotice />
          </div>
        )}
        
        <div className={activeTab === "Chat" ? "flex flex-1 overflow-hidden" : "hidden"}>
          <ChatPanel className="flex-1 overflow-hidden p-0 bg-[#131313]" />
        </div>

        {activeTab === "Mi Perfil" && (
          userId ? (
            <ProfilePanel />
          ) : (
            <LoginPrompt
              title="Entrá para ver tu perfil"
              description="Tu usuario, tu cuadro, tus cosméticos y tu inventario te esperan del otro lado."
              reason="profile"
            />
          )
        )}

        {activeTab === "Tienda" && (
          <div className="p-6 w-full max-w-7xl mx-auto">
            <StoreView />
          </div>
        )}

        {activeTab === "Vivo" && (
          <div className="w-full max-w-2xl mx-auto">
            <SidebarFixtureList season="2026" leagueId="1" />
          </div>
        )}

        {activeTab === "Comunidad" && (
          <div className="p-6 pb-20 lg:pb-6 w-full max-w-[1350px] mx-auto transition-all duration-300">
            <div className="flex flex-col gap-6 w-full min-w-0">
              <ClaimRewardsBanner key={userId} />
              <SidebarPolls />
            </div>
          </div>
        )}

        {activeTab === "Apuestas" && (
          <div className="p-6 pb-20 lg:pb-6 w-full max-w-[1350px] mx-auto transition-all duration-300">
            <div className="flex flex-col lg:flex-row gap-6 items-start relative transition-all duration-300">
              <div className="flex-1 flex flex-col gap-6 w-full min-w-0 transition-all duration-300">
                <BetsCards />
              </div>
              <TicketActive />
            </div>
          </div>
        )}

        {activeTab === "Stats" && (
          <div className="p-6 w-full max-w-7xl mx-auto">
            <SocialStatsView/>
          </div>
        )}

        {activeTab === "Admin" && (
          <div className="p-6 w-full max-w-7xl mx-auto">
            <AdminView />
          </div>
        )}

        {activeTab === "Soporte" && (
          userId ? (
            <div className="p-6 w-full max-w-7xl mx-auto flex flex-col h-full">
              <UserSupportView />
            </div>
          ) : (
            <LoginPrompt
              title="Entrá para abrir un reclamo"
              description="Necesitamos saber quién sos para seguir tu ticket y responderte."
              reason="profile"
            />
          )
        )}

      </main>

      {showRightSidebar && (
        <div className="hidden lg:flex h-full">
          <RightSidebar currentTab={activeTab} />
        </div>
      )}
    </div>
  );
};