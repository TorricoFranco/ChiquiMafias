export const translateStatus = (status: string): string => {
    const statusMap: Record<string, string> = {
        '1H': 'PT',
        '2H': 'ST',
        'HT': 'ET',
        'ET': 'Prórroga',
        'BT': 'Prórroga',
        'P': 'Penales',
        'PEN': 'Penales',
        'LIVE': 'En Vivo',
        'FT': 'Finalizado',
        'TBD': 'A Confirmar',
        'NS': 'Programado',
        'SUSP': 'Suspendido',
    };
    return statusMap[status] || status;
};