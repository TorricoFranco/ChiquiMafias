// Auxiliar para formatear la hora (ej: "20:30 HS")
export const formatMatchTime = (dateStr: string) => {
    try {
        const date = new Date(dateStr);
        return `${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} HS`;
    } catch {
        return dateStr;
    }
};

