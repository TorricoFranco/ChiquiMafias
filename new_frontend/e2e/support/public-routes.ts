/**
 * Rutas con @Public() u @OptionalAuth() en los controllers del backend. Todo lo demás exige JWT
 * (JwtAuthGuard global), así que el mock responde 401 si no llega el Bearer vigente de la sesión.
 * Si el backend cambia un decorador, actualizá esta lista.
 */
const PUBLIC_ROUTES: { method: string; path: RegExp }[] = [
  { method: "POST", path: /^\/auth\/(google|refresh|logout|dev-login)$/ },
  { method: "*", path: /^\/fixtures(\/|$)/ },
  { method: "*", path: /^\/matches(\/|$)/ },
  { method: "GET", path: /^\/standings\/seasons\/[^/]+$/ },
  {
    method: "GET",
    path: /^\/stats\/(top-earners|top-streaks|highest-multipliers|most-active|top-stakers|global|top-active|top-chatters)$/,
  },
  { method: "GET", path: /^\/coin-shop\/packs$/ },
  { method: "GET", path: /^\/store(\/all-items)?$/ },
  { method: "GET", path: /^\/polls\/active$/ },
  { method: "GET", path: /^\/polls\/[^/]+\/comments$/ },
  { method: "GET", path: /^\/users\/[^/]+\/public-profile$/ },
  { method: "GET", path: /^\/subscriptions\/plans$/ },
];

/** Rutas con @AllowBannedForAppeal(): las únicas protegidas que un usuario baneado puede usar. */
const BANNED_ALLOWED_ROUTES: { method: string; path: RegExp }[] = [
  { method: "POST", path: /^\/support\/ticket$/ },
  { method: "POST", path: /^\/support\/ticket\/[^/]+\/message$/ },
  { method: "GET", path: /^\/support\/my-tickets(\/[^/]+)?$/ },
];

function matches(routes: { method: string; path: RegExp }[], method: string, path: string) {
  return routes.some((route) => (route.method === "*" || route.method === method) && route.path.test(path));
}

export function isPublicRoute(method: string, path: string) {
  return matches(PUBLIC_ROUTES, method, path);
}

export function isAllowedForBannedUser(method: string, path: string) {
  return matches(BANNED_ALLOWED_ROUTES, method, path);
}
