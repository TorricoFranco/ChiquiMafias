export const formatDateHeader = (dateStr: string) => {
    try {
        const date = new Date(dateStr);
        const now = new Date();

        const isToday =
            date.getDate() === now.getDate() &&
            date.getMonth() === now.getMonth() &&
            date.getFullYear() === now.getFullYear();

        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);
        const isTomorrow =
            date.getDate() === tomorrow.getDate() &&
            date.getMonth() === tomorrow.getMonth() &&
            date.getFullYear() === tomorrow.getFullYear();

        const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

        const dayName = dayNames[date.getDay()].toUpperCase();
        const dayNum = date.getDate();
        const monthNum = date.getMonth() + 1;

        if (isToday) {
            return `HOY - ${dayName} ${dayNum}/${monthNum}`;
        }
        if (isTomorrow) {
            return `MAÑANA - ${dayName} ${dayNum}/${monthNum}`;
        }

        return `${dayName} ${dayNum}/${monthNum}`;
    } catch {
        return dateStr;
    }
};