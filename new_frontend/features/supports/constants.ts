// Límites de los DTOs de soporte del backend (create-ticket.dto.ts y create-ticket-message.dto.ts).
// El mensaje se reenvía al hilo de Discord, que corta en 2000 caracteres.
export const TICKET_SUBJECT_MAX_LENGTH = 100;
export const TICKET_MESSAGE_MAX_LENGTH = 1800;
