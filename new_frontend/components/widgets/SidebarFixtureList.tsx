"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import { SidebarMatchCard } from "../widgets/SidebarMatchCard";
import { useCalendarWithLive } from "@/features/fixture/hooks/useCalendarWithLive";
import { LiveMatchesCarousel } from "./LiveMatchesCarousel";
import { LEAGUE_SLUG } from "@/features/competitions/constants";
import { useCompetitions, useCurrentSeason } from "@/features/competitions/hooks/useCompetitions";

const getFormattedDateKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const formatDayLabel = (dateStr: string) => {
    const date = new Date(`${dateStr}T12:00:00`);
    const dayName = new Intl.DateTimeFormat("es-AR", { weekday: "short" }).format(date).toUpperCase().replace(".", "");
    const dayNum = date.getDate();
    const monthName = new Intl.DateTimeFormat("es-AR", { month: "short" }).format(date).toUpperCase().replace(".", "");
    return { dayName, dayNum, monthName };
};

/** Calendario de la Liga y de las otras competiciones (la Copa) con sus marcadores en vivo. */
export const SidebarFixtureList = () => {
    const {
        season,
        isLoading: isSeasonLoading,
        isError: isSeasonError,
        retry: retrySeason,
    } = useCurrentSeason(LEAGUE_SLUG);
    const { data: competitions } = useCompetitions();
    // Referencias estables (salen de la query): el calendario las usa como dependencias.
    const league = useMemo(() => competitions?.find((c) => c.slug === LEAGUE_SLUG), [competitions]);
    const others = useMemo(() => competitions?.filter((c) => c.slug !== LEAGUE_SLUG) ?? [], [competitions]);
    const { calendarData, isLoading: isCalendarLoading } = useCalendarWithLive(season, league, others);
    // Mientras llega la temporada el calendario no se pide: también es "cargando".
    const isLoading = isSeasonLoading || isCalendarLoading;
    const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);
    const tabsRef = useRef<HTMLDivElement>(null);

    // Al cambiar los días del calendario, selecciona hoy (o el último día). Se compara el contenido:
    // un refetch con los mismos días no le cambia el día al usuario. Se ajusta durante el render, sin efecto.
    const availableDays = calendarData?.availableDays;
    const daysKey = availableDays?.join(',');
    const [prevDaysKey, setPrevDaysKey] = useState<string | undefined>(undefined);
    if (daysKey !== prevDaysKey) {
        setPrevDaysKey(daysKey);
        if (availableDays?.length) {
            const todayKey = getFormattedDateKey(new Date());
            const index = availableDays.findIndex((day: string) => day >= todayKey);

            setSelectedDayIndex(index !== -1 ? index : availableDays.length - 1);
        }
    }

    // Scroll automático hacia la pestaña activa dentro de la barra
    useEffect(() => {
        if (tabsRef.current) {
            const selectedTab = tabsRef.current.children[selectedDayIndex] as HTMLElement;
            if (selectedTab) {
                selectedTab.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
            }
        }
    }, [selectedDayIndex]);

    const { liveMatches, selectedDateMatches, displayDate } = useMemo(() => {
        if (!calendarData?.calendar || !calendarData?.availableDays) {
            return { liveMatches: [], selectedDateMatches: [], displayDate: "" };
        }
        const allMatches = Object.values(calendarData.calendar).flat();
        const live = allMatches.filter((m) => m.is_live);

        const selectedDateKey = calendarData.availableDays[selectedDayIndex];
        const matchesForSelectedDate = calendarData.calendar[selectedDateKey] || [];
        const selectedNotLive = matchesForSelectedDate.filter((m) => !m.is_live);

        const dateFormatter = new Intl.DateTimeFormat("es-AR", {
            weekday: "long",
            day: "numeric",
            month: "long",
        });

        const formattedDate = selectedDateKey
            ? dateFormatter.format(new Date(`${selectedDateKey}T12:00:00`))
            : "";

        return {
            liveMatches: live,
            selectedDateMatches: selectedNotLive,
            displayDate: formattedDate,
        };
    }, [calendarData, selectedDayIndex]);

    const handlePrevDay = () => setSelectedDayIndex((prev) => Math.max(0, prev - 1));
    const handleNextDay = () => {
        if (calendarData?.availableDays) {
            setSelectedDayIndex((prev) => Math.min(calendarData.availableDays.length - 1, prev + 1));
        }
    };

    if (isSeasonError) {
        return (
            <div role="alert" className="w-full max-w-4xl mx-auto flex flex-col items-center gap-3 text-center text-[#c6c9ab] text-xs py-12 bg-[#181818] rounded-xl border border-[#353534]">
                No se pudo cargar el calendario.
                <button
                    type="button"
                    onClick={retrySeason}
                    className="bg-[#d2f000] hover:bg-[#b8d300] text-[#191e00] font-black uppercase tracking-wider px-4 py-2 rounded-lg"
                >
                    Reintentar
                </button>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="w-full max-w-4xl mx-auto text-center text-[#c6c9ab] text-xs py-12 animate-pulse bg-[#181818] rounded-xl border border-[#353534]">
                Cargando calendario...
            </div>
        );
    }

    if (!calendarData?.availableDays?.length) {
        return (
            <div className="w-full max-w-4xl mx-auto text-center text-[#c6c9ab] text-xs py-12 opacity-60 bg-[#181818] rounded-xl border border-[#353534]">
                No hay partidos disponibles en el calendario.
            </div>
        );
    }

    const isFirstDay = selectedDayIndex === 0;
    const isLastDay = selectedDayIndex === calendarData.availableDays.length - 1;

    return (
        <div className="w-full max-w-4xl mx-auto space-y-5 p-2 md:p-4">
            {/* PARTIDOS EN VIVO */}
            <LiveMatchesCarousel matches={liveMatches} />
            {/* SELECTOR DE FECHAS (Flechas + Tira deslizable de días) */}
            <div className="flex items-center gap-2 bg-[#201f1f] rounded-xl p-2 border border-[#454932]">
                <button
                    onClick={handlePrevDay}
                    disabled={isFirstDay}
                    className={`p-2 rounded-lg transition-all flex items-center justify-center flex-shrink-0 ${isFirstDay ? "opacity-30 cursor-not-allowed" : "hover:bg-[#353534] text-[#c6c9ab] hover:text-white"
                        }`}
                >
                    <span className="material-symbols-outlined text-xl">chevron_left</span>
                </button>

                {/* Tira horizontal deslizable */}
                <div ref={tabsRef} className="flex-1 flex items-center gap-2 overflow-x-auto scrollbar-none py-1 scroll-smooth">
                    {calendarData.availableDays.map((dayKey: string, idx: number) => {
                        const { dayName, dayNum, monthName } = formatDayLabel(dayKey);
                        const isSelected = idx === selectedDayIndex;

                        return (
                            <button
                                key={dayKey}
                                onClick={() => setSelectedDayIndex(idx)}
                                className={`flex flex-col items-center justify-center min-w-[64px] px-2.5 py-1.5 rounded-lg transition-all flex-shrink-0 border ${isSelected
                                    ? "bg-[#d2f000] text-black font-extrabold border-[#d2f000] shadow-sm scale-105"
                                    : "bg-[#252525] text-[#c6c9ab] hover:text-white hover:bg-[#30302f] border-[#353534]"
                                    }`}
                            >
                                <span className={`text-[9px] font-bold ${isSelected ? "text-black/80" : "text-[#8c8e76]"}`}>
                                    {dayName}
                                </span>
                                <span className="text-sm font-black leading-none my-0.5">
                                    {dayNum}
                                </span>
                                <span className={`text-[8px] font-semibold ${isSelected ? "text-black/70" : "text-[#8c8e76]"}`}>
                                    {monthName}
                                </span>
                            </button>
                        );
                    })}
                </div>

                <button
                    onClick={handleNextDay}
                    disabled={isLastDay}
                    className={`p-2 rounded-lg transition-all flex items-center justify-center flex-shrink-0 ${isLastDay ? "opacity-30 cursor-not-allowed" : "hover:bg-[#353534] text-[#c6c9ab] hover:text-white"
                        }`}
                >
                    <span className="material-symbols-outlined text-xl">chevron_right</span>
                </button>
            </div>

            {/* ENCABEZADO DE LA FECHA SELECCIONADA */}
            <div className="flex items-center justify-between px-1">
                <span className="text-xs md:text-sm font-bold text-white capitalize">
                    {displayDate}
                </span>
                <span className="text-[11px] font-bold text-[#8c8e76]">
                    {selectedDateMatches.length} partidos
                </span>
            </div>

            {/* LISTA DE PARTIDOS DEL DÍA */}
            <div className="space-y-2.5">
                {selectedDateMatches.length > 0 ? (
                    selectedDateMatches.map((match) => (
                        <SidebarMatchCard key={match.id} match={match} competitionName={match.competitionName} />
                    ))
                ) : (
                    <div className="text-center text-[#8c8e76] text-xs py-10 border border-dashed border-[#353534] rounded-xl bg-[#181818]">
                        {liveMatches.length > 0
                            ? "Los partidos de este día están en curso arriba."
                            : "No hay partidos programados para esta fecha."}
                    </div>
                )}
            </div>
        </div>
    );
};