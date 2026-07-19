import { HeadToHead } from "./HeadToHead";
import { FormTab } from "./FormTab";
import { MiniTables } from "./MiniTables";

interface PreMatchData {
    form: any; // O define una interface para form si quieres ser más estricto
    history: any;
    miniTable: any;
}

interface PreMatchDashboardProps {
    data: PreMatchData | undefined; // Es undefined porque puede ser null antes de cargar
    isLoading: boolean;
}

export const PreMatchDashboard = ({ data, isLoading }: PreMatchDashboardProps) => {
    if (isLoading) return <div className="animate-pulse space-y-8">
        <div className="h-48 bg-white/5 rounded-3xl" />
        <div className="h-64 bg-white/5 rounded-3xl" />
    </div>;

    if (!data) return null;

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* 1. Racha Actual (Forma) */}
            <FormTab form={data.form} />

            {/* 2. Historial Enfrentamientos */}
            <HeadToHead history={data.history} />

            {/* 3. Tablas de Posiciones y Promedios */}
            <MiniTables tables={data.miniTable} />
        </div>
    );
};