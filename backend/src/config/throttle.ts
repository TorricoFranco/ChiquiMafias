import { isProductionLike } from './cors'

export const THROTTLE_LIMIT_DEFAULT = 150

// Límite de peticiones por IP y minuto. THROTTLE_LIMIT solo se respeta fuera de producción y
// staging: sirve para pruebas de carga en local (ver scripts/load) sin tocar el límite real.
export function throttleLimit(
  nodeEnv: string | undefined,
  override: number | undefined,
): number {
  if (isProductionLike(nodeEnv)) return THROTTLE_LIMIT_DEFAULT
  return override ?? THROTTLE_LIMIT_DEFAULT
}
