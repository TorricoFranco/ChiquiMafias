import { useEffect, useState } from 'react';

export interface ClosingInfo {
  label: string;
  /** Falta poco (menos de una hora) o ya pasó la hora y el cron todavía no cerró el mercado. */
  urgent: boolean;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Texto de cierre de un mercado a partir de su `closesAt`. Solo informa: no decide si se puede apostar. */
export function getClosingInfo(closesAt: string, now: number): ClosingInfo {
  const target = new Date(closesAt).getTime();
  if (Number.isNaN(target)) return { label: '', urgent: false };

  const diff = target - now;
  if (diff <= 0) return { label: 'Cerrando…', urgent: true };

  if (diff < HOUR) {
    return { label: `Cierra en ${Math.max(1, Math.ceil(diff / MINUTE))} min`, urgent: true };
  }

  if (diff < DAY) {
    const hours = Math.floor(diff / HOUR);
    const minutes = Math.floor((diff % HOUR) / MINUTE);
    return { label: `Cierra en ${hours} h ${minutes} min`, urgent: false };
  }

  const date = new Date(target).toLocaleString('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
  return { label: `Cierra ${date}`, urgent: false };
}

/** Reloj con resolución de medio minuto: alcanza para cuentas regresivas en minutos. */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
