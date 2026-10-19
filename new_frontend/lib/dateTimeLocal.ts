/**
 * Valor para un <input type="datetime-local">. Ese input se interpreta en la hora local del
 * navegador, así que no sirve `toISOString().slice(0, 16)` (que está en UTC).
 */
export function toDateTimeLocalValue(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
