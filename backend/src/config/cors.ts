// Orígenes que pueden llamar a la API con credenciales (cookie del refresh token).
// En producción (y staging) sale únicamente de CLIENT_URL; los localhost solo existen en dev y test.
const DEV_ORIGINS = ['http://localhost:3000', 'http://localhost:3005']

// 'staging' también corre detrás del proxy y con datos reales: mismo modo seguro que producción.
export function isProductionLike(nodeEnv: string | undefined): boolean {
  return nodeEnv === 'production' || nodeEnv === 'staging'
}

export function buildCorsOrigins(
  clientUrl: string | undefined,
  nodeEnv: string | undefined,
): string[] {
  const fromEnv = (clientUrl ?? '')
    .split(',')
    .map((url) => url.trim().replace(/\/+$/, ''))
    .filter(Boolean)

  const origins = isProductionLike(nodeEnv)
    ? fromEnv
    : [...fromEnv, ...DEV_ORIGINS]

  return [...new Set(origins)]
}
