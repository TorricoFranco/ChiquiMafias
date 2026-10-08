"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileNav } from "@/components/layout/MobileNav";
import { SocialView } from "@/components/Social/SocialView";
import { LeagueView } from "@/features/league/components/LeagueView";
import { useNavigationStore } from "@/store/useNavigationStore";

function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab");

  const [mainTab, setMainTab] = useState(tabParam || "social");
  const activeSection = useNavigationStore((state) => state.activeTab);
  const setActiveSection = useNavigationStore((state) => state.setActiveTab);

  useEffect(() => {
    if (tabParam) {
      setMainTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (tab: string) => {
    setMainTab(tab);
    router.push(`/?tab=${tab}`, { scroll: false });
  };

  const handleSectionSelect = (section: string) => {
    if (mainTab !== "social") handleTabChange("social");
    setActiveSection(section);
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#050505] text-[#e5e2e1]">
      <Header activeTab={mainTab} setActiveTab={handleTabChange} />

      {/* pb-16: lugar para la MobileNav fija en pantallas chicas */}
      <div className="flex-1 flex flex-col pt-16 pb-16 lg:pb-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          {mainTab === "social" && <SocialView />}

          {mainTab === "ligas" && (
            <LeagueView onSwitchToSocial={() => handleTabChange("social")} />
          )}

          {mainTab === "calendario" && (
            <div className="flex-1 flex items-center justify-center h-full">
              <h1 className="text-2xl text-[#d2f000]">Vista Calendario (Próximamente)</h1>
            </div>
          )}
        </div>
        <Footer />
      </div>

      <MobileNav activeSection={mainTab === "social" ? activeSection : null} onSelect={handleSectionSelect} />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="h-screen w-screen bg-[#050505]" />}>
      <HomeContent />
    </Suspense>
  );
}