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
import { ClaimRewardsBanner } from "./ClaimewardsBanner";
import { AdminView } from "@/features/admin/components/AdminView";
import { UserSupportView } from "@/features/supports/components/tickets/UserSupportView";
import { useNavigationStore } from "@/store/useNavigationStore";
import { SocialStatsView } from "@/features/stats/components/SocialStatsView";


export const SocialView = () => {
  const activeTab = useNavigationStore((state) => state.activeTab);

  const showRightSidebar = ["Chat", "Mi Perfil",].includes(activeTab);

  return (
    <div className="flex flex-1 overflow-hidden h-full">
      <SidebarNav />
      
      <main className="flex-1 bg-[#131313] flex flex-col min-w-0 border-r border-[#353534] relative overflow-y-auto">
        
        <div className={activeTab === "Chat" ? "flex flex-1 overflow-hidden" : "hidden"}>
          <ChatPanel className="flex-1 overflow-hidden p-0 bg-[#131313]" />
        </div>

        {activeTab === "Mi Perfil" && (
          <ProfilePanel />
        )}

        {activeTab === "Tienda" && (
          <div className="p-6 w-full max-w-7xl mx-auto">
            <StoreView />
          </div>
        )}

        {activeTab === "Pronósticos" && (
          <div className="p-6 w-full max-w-[1350px] mx-auto transition-all duration-300">
            <div className="flex flex-col lg:flex-row gap-6 items-start relative transition-all duration-300">
              <div className="flex-1 flex flex-col gap-6 w-full min-w-0 transition-all duration-300">
                <ClaimRewardsBanner />
                <BetsCards />
                <SidebarPolls />
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
          <div className="p-6 w-full max-w-7xl mx-auto flex flex-col h-full">
            <UserSupportView />
          </div>
        )}

      </main>

      {showRightSidebar && (
        <RightSidebar currentTab={activeTab} />
      )}
    </div>
  );
};