"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import { MatchScorecard } from "../widgets/MatchScorecard";
import { SidebarMatchCard } from "../widgets/SidebarMatchCard";
import { useCalendarWithLive } from "@/features/fixture/hooks/useCalendarWithLive";

interface SidebarFixtureListProps {
    season?: string;
    leagueId?: string;
}

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

export const SidebarFixtureList = ({
    season = "2026",
    leagueId = "1",
}: SidebarFixtureListProps) => {
    const { calendarData, isLoading } = useCalendarWithLive(season, leagueId);
    const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);
    const tabsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (calendarData?.availableDays?.length) {
            const todayKey = getFormattedDateKey(new Date());
            const index = calendarData.availableDays.findIndex((day: string) => day >= todayKey);

            if (index !== -1) {
                setSelectedDayIndex(index);
            } else {
                setSelectedDayIndex(calendarData.availableDays.length - 1);
            }
        }
    }, [calendarData?.availableDays]);

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
        const live = allMatches.filter((m: any) => m.is_live);

        const selectedDateKey = calendarData.availableDays[selectedDayIndex];
        const matchesForSelectedDate = calendarData.calendar[selectedDateKey] || [];
        const selectedNotLive = matchesForSelectedDate.filter((m: any) => !m.is_live);

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
            {liveMatches.length > 0 && (
                <div className="bg-[#1e1414] border border-red-900/40 rounded-xl p-4 overflow-hidden w-full">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-['Montserrat',sans-serif] text-xs font-extrabold text-white uppercase tracking-widest flex items-center gap-2">
                            <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></span>
                            EN VIVO
                        </h3>
                        <span className="text-[10px] font-bold text-[#d2f000]">{liveMatches.length} En Curso</span>
                    </div>

                    {/* CONTENEDOR CARRUSEL */}
                    <div className="flex overflow-x-auto gap-3 pb-2 snap-x scrollbar-none scroll-smooth">
                        {liveMatches.map((match: any) => (
                            <div key={match.id} className="min-w-[85%] md:min-w-[280px] snap-center flex-shrink-0">
                                <MatchScorecard match={match} />
                            </div>
                        ))}
                    </div>
                </div>
            )}

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
                    selectedDateMatches.map((match: any) => (
                        <SidebarMatchCard key={match.id} match={match} />
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