import { useQuery } from '@tanstack/react-query';

export const usePendingFixtures = (season: string, tournament: string) => {
    return useQuery({
        queryKey: ['fixtures', 'pending', season, tournament],
        queryFn: async () => {
            if (!season || !tournament) return [];


            const baseUrl = process.env.NEXT_PUBLIC_API_URL;
            const url = `${baseUrl}/fixtures/pendings/seasons/${season}/tournaments/${tournament}`;

            const res = await fetch(url);

            if (!res.ok) throw new Error('Error al cargar partidos pendientes');

            const data = await res.json();
            return data;
        },
        enabled: Boolean(season && tournament),
        staleTime: 1000 * 60 * 10,
    });
};