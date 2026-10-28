// Tienen que coincidir con los scripts `dev:e2e` / `start:e2e` de package.json.
// La capa mockeada usa su propio puerto: el front de Docker (3005) sirve los chunks de dev
// a ~1 MB/s por el port forwarding y cada carga tarda más de 20 s.
// E2E_BASE_URL sirve para correr en otro puerto cuando otra sesión ya tiene su `dev:e2e` en el 3100:
// Playwright reutilizaría ese servidor y probaría el código de otra carpeta. El `webServer` sigue
// levantando el 3100, así que el servidor del otro puerto se levanta a mano antes, por ejemplo:
// `npx cross-env E2E_DEV_SERVER=1 NEXT_PUBLIC_API_URL=http://localhost:3007 NEXT_PUBLIC_GOOGLE_CLIENT_ID=e2e-google-client-id next dev --webpack -p 3120`.
export const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3100";
export const API_URL = "http://localhost:3007";

// El smoke full-stack usa el front de Docker: el CORS del backend solo permite 3000 y 3005.
export const FULLSTACK_BASE_URL = process.env.E2E_FULLSTACK_BASE_URL ?? "http://localhost:3005";
