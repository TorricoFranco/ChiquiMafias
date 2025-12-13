"use client";

import { useState, useCallback, useRef } from "react";
import { ZoneStandings, AnnualRow, PromedioRow, TeamRow, STANDINGS_MOCKS } from "@/lib/mocks";
import { PendingMatch } from "@/lib/matchesMock";

/**
 * Hook para simular partidos y actualizar tablas de posiciones
 * Maneja Apertura/Clausura con Zona A/B + Annual + Promedios
 */
export const useLeagueSimulation = (
  initialStandings: {
    aperturaZoneA: ZoneStandings;
    aperturaZoneB: ZoneStandings;
    clausuraZoneA: ZoneStandings;
    clausuraZoneB: ZoneStandings;
  },
  initialMatches: PendingMatch[]
) => {
  // Estado de tablas de zonas
  const [standings, setStandings] = useState<{
    aperturaZoneA: ZoneStandings;
    aperturaZoneB: ZoneStandings;
    clausuraZoneA: ZoneStandings;
    clausuraZoneB: ZoneStandings;
  }>(initialStandings);

  // Estado de partidos
  const [matches, setMatches] = useState<PendingMatch[]>(initialMatches);

  // Estado de tabla anual
  const [annual, setAnnual] = useState<AnnualRow[]>(STANDINGS_MOCKS.annual);

  // Estado de tabla de promedios
  const [promedios, setPromedios] = useState<PromedioRow[]>(STANDINGS_MOCKS.promedios);

  // Referencia para recordar cambios previos (snapshot)
  const historyRef = useRef<
    Map<
      string,
      {
        standing: ZoneStandings;
        match: PendingMatch;
        annual: AnnualRow[];
        promedios: PromedioRow[];
      }
    >
  >(new Map());

  /**
   * Obtiene la tabla correspondiente según torneo y zona
   */
  const getStandingByKey = useCallback(
    (tournament: "apertura" | "clausura", zone: "A" | "B", standings: any): ZoneStandings => {
      const key = `${tournament}Zone${zone}` as keyof typeof standings;
      return standings[key];
    },
    []
  );

  /**
   * Actualiza tabla anual después de un partido
   */
  const updateAnnualRowsAfterMatch = useCallback(
    (
      annualRows: AnnualRow[],
      teamId: string,
      goalsFor: number,
      goalsAgainst: number,
      ptsEarned: number
    ) => {
      const rows = annualRows.map((r) => ({ ...r }));
      const idx = rows.findIndex((r) => r.teamId === teamId);
      if (idx === -1) return rows;

      const row = { ...rows[idx] };
      row.played_total += 1;
      row.gf_total += goalsFor;
      row.ga_total += goalsAgainst;
      row.gd_total = row.gf_total - row.ga_total;
      row.pts_total += ptsEarned;

      // Actualiza wins/draws/losses según puntos ganados
      if (ptsEarned === 3) row.wins_total += 1;
      else if (ptsEarned === 1) row.draws_total += 1;
      else row.losses_total += 1;

      rows[idx] = row;

      // Reordena por pts_total → gd_total → gf_total
      return rows
        .sort((a, b) => {
          if (b.pts_total !== a.pts_total) return b.pts_total - a.pts_total;
          if (b.gd_total !== a.gd_total) return b.gd_total - a.gd_total;
          return b.gf_total - a.gf_total;
        })
        .map((r, i) => ({ ...r, pos: i + 1 }));
    },
    []
  );

  /**
   * Actualiza tabla de promedios después de un partido
   */
  const updatePromediosAfterMatch = useCallback(
    (promRows: PromedioRow[], teamId: string, ptsEarned: number) => {
      console.log("updatePromedios called with teamId:", teamId, "ptsEarned:", ptsEarned);
      const rows = promRows.map((r) => ({ ...r }));
      const idx = rows.findIndex((r) => r.teamId === teamId);
      console.log("Found index:", idx, "Rows teamIds:", rows.map(r => r.teamId));
      if (idx === -1) {
        console.warn("⚠️ NO ENCONTRADO teamId:", teamId, "en promedios");
        return rows;
      }
      const row = { ...rows[idx] };
      row.points_sum += ptsEarned;
      row.matches_sum += 1;
      row.promedio = parseFloat((row.points_sum / row.matches_sum).toFixed(3));
      rows[idx] = row;

      return rows;
    },
    []
  );

  /**
   * Ordena filas de zona por puntos → DG → GF
   */
  const sortRows = useCallback((rows: TeamRow[]): TeamRow[] => {
    return [...rows]
      .sort((a, b) => {
        if (b.pts !== a.pts) return b.pts - a.pts;
        if (b.gd !== a.gd) return b.gd - a.gd;
        return b.gf - a.gf;
      })
      .map((row, index) => ({
        ...row,
        pos: index + 1,
      }));
  }, []);

  /**
   * Simula un partido: actualiza zona + anual + promedios
   */
  const simulateMatch = useCallback(
    (matchId: string, homeGoals: number, awayGoals: number) => {
      setStandings((prevStandings) => {
        setMatches((prevMatches) => {
          setAnnual((prevAnnual) => {
            setPromedios((prevPromedios) => {
              const match = prevMatches.find((m) => m.matchId === matchId);
              if (!match) return prevPromedios;

              const standing = getStandingByKey(
                match.tournament,
                match.zone,
                prevStandings
              );

              // Snapshot: guarda estado previo para revertir
              historyRef.current.set(matchId, {
                standing: JSON.parse(JSON.stringify(standing)),
                match: JSON.parse(JSON.stringify(match)),
                annual: JSON.parse(JSON.stringify(prevAnnual)),
                promedios: JSON.parse(JSON.stringify(prevPromedios)),
              });

              // Encuentra equipos en la tabla
              const homeTeamIndex = standing.rows.findIndex(
                (t) => t.teamId === match.homeTeamId
              );
              const awayTeamIndex = standing.rows.findIndex(
                (t) => t.teamId === match.awayTeamId
              );

              if (homeTeamIndex === -1 || awayTeamIndex === -1)
                return prevPromedios;

              // Copia tabla
              const newRows = standing.rows.map((row) => ({ ...row }));
              const homeTeam = newRows[homeTeamIndex];
              const awayTeam = newRows[awayTeamIndex];

              // Incrementa partidos jugados
              homeTeam.played += 1;
              awayTeam.played += 1;

              // Actualiza goles
              homeTeam.gf += homeGoals;
              homeTeam.ga += awayGoals;
              awayTeam.gf += awayGoals;
              awayTeam.ga += homeGoals;

              // Diferencia de goles
              homeTeam.gd = homeTeam.gf - homeTeam.ga;
              awayTeam.gd = awayTeam.gf - awayTeam.ga;

              // Calcula puntos y resultados
              let homePts = 0;
              let awayPts = 0;

              if (homeGoals > awayGoals) {
                homeTeam.wins += 1;
                homePts = 3;
                awayTeam.losses += 1;
                awayPts = 0;
              } else if (awayGoals > homeGoals) {
                awayTeam.wins += 1;
                awayPts = 3;
                homeTeam.losses += 1;
                homePts = 0;
              } else {
                homeTeam.draws += 1;
                awayTeam.draws += 1;
                homePts = 1;
                awayPts = 1;
              }

              homeTeam.pts += homePts;
              awayTeam.pts += awayPts;

              // Reordena tabla de zona
              const sortedRows = sortRows(newRows);
              const newStanding = {
                ...standing,
                rows: sortedRows,
                updatedAt: new Date().toISOString(),
              };

              setStandings((prev) => ({
                ...prev,
                [`${match.tournament}Zone${match.zone}`]: newStanding,
              }));

              // Actualiza tabla anual
              const newAnnual1 = updateAnnualRowsAfterMatch(
                prevAnnual,
                homeTeam.teamId,
                homeGoals,
                awayGoals,
                homePts
              );
              const newAnnual2 = updateAnnualRowsAfterMatch(
                newAnnual1,
                awayTeam.teamId,
                awayGoals,
                homeGoals,
                awayPts
              );
              setAnnual(newAnnual2);

              // Actualiza tabla de promedios
              const newProm1 = updatePromediosAfterMatch(
                prevPromedios,
                homeTeam.teamId,
                homePts
              );
              const newProm2 = updatePromediosAfterMatch(
                newProm1,
                awayTeam.teamId,
                awayPts
              );

              // Marca el partido como jugado
              setMatches((prev) =>
                prev.map((m) =>
                  m.matchId === matchId
                    ? { ...m, played: true, homeGoals, awayGoals }
                    : m
                )
              );

              return newProm2;
            });
            return prevAnnual;
          });
          return prevMatches;
        });
        return prevStandings;
      });
    },
    [getStandingByKey, updateAnnualRowsAfterMatch, updatePromediosAfterMatch, sortRows]
  );

  /**
   * Revierte un partido simulado
   */
  const resetMatch = useCallback((matchId: string) => {
    const history = historyRef.current.get(matchId);
    if (!history) return;

    setStandings((prev) => ({
      ...prev,
      [`${history.match.tournament}Zone${history.match.zone}`]: history.standing,
    }));

    setMatches((prev) =>
      prev.map((m) =>
        m.matchId === matchId
          ? { ...m, played: false, homeGoals: undefined, awayGoals: undefined }
          : m
      )
    );

    setAnnual(history.annual);
    setPromedios(history.promedios);

    historyRef.current.delete(matchId);
  }, []);

  return {
    standings,
    matches,
    annual,
    promedios,
    simulateMatch,
    resetMatch,
  };
};