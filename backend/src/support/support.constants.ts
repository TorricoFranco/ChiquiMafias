// El asunto y los mensajes se reenvían a Discord, que corta en 2000 caracteres.
// new_frontend/features/supports/constants.ts tiene los mismos valores.
export const TICKET_SUBJECT_MAX_LENGTH = 100
export const TICKET_MESSAGE_MAX_LENGTH = 1800

// Las capturas se suben a Cloudinary con la firma de /uploads/signature. El bot descarga
// la URL para adjuntarla, así que no se acepta cualquier host.
export const CLOUDINARY_URL_PATTERN = /^https:\/\/res\.cloudinary\.com\//
