export const MATCH_STATUS_MAP = {
  'TBD': 'A confirmar',
  'NS': 'Próximamente',
  '1H': '1er Tiempo',
  'HT': 'Entretiempo',
  '2H': '2do Tiempo',
  'ET': 'Tiempo Extra',
  'BT': 'Break',
  'P': 'Penales',
  'SUSP': 'Suspendido',
  'INT': 'Interrumpido',
  'FT': 'Finalizado',
  'AET': 'Finalizado (ET)',
  'PEN': 'Finalizado (Penales)',
  'CANC': 'Cancelado',
  'ABD': 'Abandonado',
  'AWD': 'Adjudicado',
  'WO': 'Walkover',
  'LIVE': 'En Vivo'
} as const;

export type MatchStatusShort = keyof typeof MATCH_STATUS_MAP;

export const getStatusLabel = (status: string): string => {
  return MATCH_STATUS_MAP[status as MatchStatusShort] || status;
};

export const isLiveStatus = (status: string): boolean => {
  return ['1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE'].includes(status);
};