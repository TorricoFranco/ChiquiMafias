
import { LeagueMatch } from '../type';

// Auxiliar para agrupar partidos por fecha (YYYY-MM-DD)
export const groupMatchesByDate = (matchesList: LeagueMatch[]) => {
    const groups: { [key: string]: { dateStr: string; matches: LeagueMatch[] } } = {};

    matchesList.forEach((match) => {
        const d = new Date(match.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (!groups[key]) {
            groups[key] = { dateStr: match.date, matches: [] };
        }
        groups[key].matches.push(match);
    });

    return Object.keys(groups)
        .sort()
        .map((key) => groups[key]);
};
