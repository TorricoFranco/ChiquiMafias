export class TableProcessor {
  static calculate(initialData: any, allUpdates: Record<string, any>, fixtures: any[]) {
    if (!initialData) return null;

    const updated = JSON.parse(JSON.stringify(initialData));

    const updateStats = (team: any, gf: number, gc: number) => {
      if (!team) return;
      const win = gf > gc ? 1 : 0;
      const draw = gf === gc ? 1 : 0;
      const pts = gf > gc ? 3 : (gf === gc ? 1 : 0);

      team.played = Number(team.played || 0) + 1;
      team.won = Number(team.won || 0) + win;
      team.draw = Number(team.draw || 0) + draw;
      team.lost = Number(team.lost || 0) + (gf < gc ? 1 : 0);
      team.pts = Number(team.pts || 0) + pts;
      team.points = Number(team.points || 0) + pts;
      team.goalsFor = Number(team.goalsFor || 0) + gf;
      team.goalsAgainst = Number(team.goalsAgainst || 0) + gc;
      team.goalDiff = team.goalsFor - team.goalsAgainst;
    };

    const sortTable = (a: any, b: any) => {
      const ptsA = a.points ?? a.pts ?? 0;
      const ptsB = b.points ?? b.pts ?? 0;
      if (ptsB !== ptsA) return ptsB - ptsA;
      if ((b.goalDiff || 0) !== (a.goalDiff || 0)) return (b.goalDiff || 0) - (a.goalDiff || 0);
      return (b.goalsFor || 0) - (a.goalsFor || 0);
    };

    Object.entries(allUpdates).forEach(([matchId, score]: [string, any]) => {

      //  Si es playoff, no suma
      if (score.isPlayoff) return;

      const homeId = score.homeTeamId || score.home_team_id;
      const awayId = score.awayTeamId || score.away_team_id;
      const goalsH = Number(score.h);
      const goalsA = Number(score.a);

      if (isNaN(goalsH) || isNaN(goalsA) || !homeId || !awayId) return;

      // Buscar info del partido en el fixture
      let matchInfo: any = null;
      for (const md of fixtures) {
        const found = md.matches?.find((m: any) => String(m.id) === String(matchId));
        if (found) { matchInfo = found; break; }
      }

      // ACTUALIZAR TABLAS (Apertura/Clausura)
      const phasesToSearch = matchInfo
        ? [matchInfo.tournament.toLowerCase()]
        : ["apertura", "clausura"];

      phasesToSearch.forEach((phaseKey) => {
        const phaseData = updated[phaseKey];
        if (!phaseData?.groups) return;

        Object.keys(phaseData.groups).forEach(zone => {
          const group = phaseData.groups[zone];
          const teamH = group?.find((t: any) => String(t.teamId) === String(homeId));
          const teamA = group?.find((t: any) => String(t.teamId) === String(awayId));

          if (teamH && teamA) {
            updateStats(teamH, goalsH, goalsA);
            updateStats(teamA, goalsA, goalsH);
          }
        });
      });

      // TABLA ANUAL
      const annualH = updated.annual?.find((t: any) => String(t.teamId) === String(homeId));
      const annualA = updated.annual?.find((t: any) => String(t.teamId) === String(awayId));
      updateStats(annualH, goalsH, goalsA);
      updateStats(annualA, goalsA, goalsH);

      // PROMEDIOS
      const avgH = updated.averages?.find((t: any) => String(t.teamId) === String(homeId));
      const avgA = updated.averages?.find((t: any) => String(t.teamId) === String(awayId));

      [
        { row: avgH, gf: goalsH, gc: goalsA },
        { row: avgA, gf: goalsA, gc: goalsH }
      ].forEach(({ row, gf, gc }) => {
        if (row) {
          const ptsG = gf > gc ? 3 : gf === gc ? 1 : 0;
          row.pts26 = Number(row.pts26 || 0) + ptsG;
          row.totalPoints = Number(row.totalPoints || 0) + ptsG;
          row.totalPlayed = Number(row.totalPlayed || 0) + 1;
          row.coefficient = Number((row.totalPoints / row.totalPlayed).toFixed(3));
        }
      });
    }); 

    // ORDENAMIENTOS FINALES
    if (updated.annual) updated.annual.sort(sortTable);

    if (updated.averages) {
      updated.averages.sort((a: any, b: any) => (b.coefficient || 0) - (a.coefficient || 0));
    }

    ["apertura", "clausura"].forEach(phase => {
      if (updated[phase]?.groups) {
        Object.keys(updated[phase].groups).forEach(zone => {
          if (Array.isArray(updated[phase].groups[zone])) {
            updated[phase].groups[zone].sort(sortTable);
          }
        });
      }
    });

    return updated;
  }
}