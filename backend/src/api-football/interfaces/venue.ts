// 1. Actualizá la interfaz para que coincida con lo que manda la API
export interface ApiVenue {
  id: number | null // Cambiado de id? a id: number | null
  name: string | null
  city: string | null
  capacity?: number
  surface?: string
  image?: string
}
