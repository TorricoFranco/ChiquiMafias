import { Activity } from "lucide-react";

export const FormTab = ({ form }: { form: { home: string; away: string } }) => {
    // Función para asignar color según el resultado
    const getStatusColor = (char: string) => {
        switch (char.toUpperCase()) {
            case "G": return "bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.4)]";
            case "P": return "bg-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.4)]";
            case "E": return "bg-gray-500 text-white";
            default: return "bg-gray-700 text-gray-400";
        }
    };

    const renderRacha = (racha: string) => (
        <div className="flex gap-1.5">
            {racha.split("").map((res, i) => (
                <div
                    key={i}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black italic transition-transform hover:scale-110 cursor-default ${getStatusColor(res)}`}
                >
                    {res}
                </div>
            ))}
        </div>
    );

    return (
        <section className="bg-white/5 border border-white/10 rounded-3xl p-6 relative overflow-hidden group">
            {/* Decoración de fondo */}
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity pointer-events-none">
                <Activity className="w-24 h-24" />
            </div>

            <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-500 mb-6 text-center">
                Estado de Forma (Últimos 5)
            </h4>

            <div className="flex flex-col md:flex-row justify-around items-center gap-8">
                {/* Local */}
                <div className="flex flex-col items-center gap-3">
                    <p className="text-[10px] font-black uppercase text-sky-500 tracking-tighter">Local</p>
                    {renderRacha(form.home)}
                </div>

                {/* Separador Visual */}
                <div className="hidden md:block h-10 w-[1px] bg-white/10" />

                {/* Visitante */}
                <div className="flex flex-col items-center gap-3">
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-tighter">Visitante</p>
                    {renderRacha(form.away)}
                </div>
            </div>

            <p className="text-center mt-6 text-[9px] text-gray-600 font-bold uppercase tracking-widest">
                G: Ganado • E: Empatado • P: Perdido
            </p>
        </section>
    );
};