"use client";

import { MessageCircle, Activity, Shield } from "lucide-react";

import { useMatch } from "@/hook/react-query/useMatchDetails";
import { usePreMatch } from "@/hook/react-query/usePrematch";

// Componentes UI
import { MatchHeader } from "./MatchHeaderDetails";
import { MatchStats } from "./MatchStats";
import { ChatMatch } from "./ChatMatch";
import { LineupsSection } from "./LineupsSection";
import { EventsMatch } from "./EventsMatch";
import { ChatDisabledMessage } from "./ChatDIsableMessage";
import { SectionTitle } from "./SectionTitle";
import { PreMatchDashboard } from "./PreMatchDashboard";

export const MatchDetailsPage = ({ initialMatch }) => {
  const matchId = initialMatch.metadata.id;
  const { data: match } = useMatch(matchId, initialMatch);
  const status = match.metadata.status;
  const liveStatuses = ["1H", "HT", "2H", "ET", "BT", "P", "LIVE"];

  const isLive = liveStatuses.includes(status);
  const isNotStarted = ["NS", "SCHEDULED"].includes(status);
  const isFinished = ["FT", "AET", "PEN"].includes(status);
  const isStarted = !isNotStarted;

  const { data: preMatch, isLoading: loadingPreMatch } = usePreMatch(matchId, isNotStarted);

  // Lógica  UI
  const hasLineups = match.lineups && match.lineups.length > 0;

  const isExpanded = isNotStarted && !hasLineups;

  const showChatSideBar = !isExpanded;

  const showChat = true
  // !isFinished && (isLive || (isNotStarted && hasLineups));
  const showEvents = isStarted && match.events?.length > 0;

  if (!match) return null;

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white font-sans selection:bg-sky-500/30 pb-20">
      <MatchHeader metadata={match.metadata} score={match.score} teams={match.teams} />

      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-12">
        {/* Cambiamos el grid: si es expandido, no hay gap de columna lateral */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* COLUMNA PRINCIPAL */}
          <div className={`space-y-12 transition-all duration-500 ${isExpanded ? "lg:col-span-12" : "lg:col-span-8"
            }`}>

            {/* Análisis Pre-Partido (Si está expandido, se ve gigante y pro) */}
            {isNotStarted && (
              <PreMatchDashboard data={preMatch} isLoading={loadingPreMatch} />
            )}

            {/* Formaciones */}
            {hasLineups && (
              <section className="animate-in fade-in duration-500">
                <SectionTitle
                  icon={<Shield className="w-5 h-5 text-sky-500" />}
                  title="Formaciones"
                />
                <LineupsSection match={match} />
              </section>
            )}

            {/* Estadísticas Live */}
            {isStarted && match.stats && (
              <section className="animate-in fade-in duration-500">
                <SectionTitle icon={<Activity className="w-5 h-5 text-sky-500" />} title="Estadísticas en Vivo" />
                <MatchStats stats={match.stats} />
              </section>
            )}
          </div>

          {/* COLUMNA LATERAL: Solo aparece si NO está expandido */}
          {showChatSideBar && (
            <aside className="lg:col-span-4 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <SectionTitle icon={<MessageCircle className="w-5 h-5 text-sky-500" />} title="La Tribuna" />

              {showChat ? (
                <ChatMatch matchId={matchId} active={true} />
              ) : (
                <ChatDisabledMessage isFinished={isFinished} />
              )}
            </aside>
          )}
        </div>
      </div>

      {/* EVENTOS */}
      {showEvents && (
        <section className="max-w-7xl mx-auto px-4 md:px-8 mt-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <SectionTitle icon={<Activity className="w-5 h-5 text-sky-500" />} title="Cronología" />
          <EventsMatch events={match.events} teams={match.teams} />
        </section>
      )}
    </div>
  );
};