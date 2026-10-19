// Tienen que coincidir con los scripts `dev:e2e` / `start:e2e` de package.json.
// La capa mockeada usa su propio puerto: el front de Docker (3005) sirve los chunks de dev
// a ~1 MB/s por el port forwarding y cada carga tarda más de 20 s.
export const BASE_URL = "http://localhost:3100";
export const API_URL = "http://localhost:3007";

// El smoke full-stack usa el front de Docker: el CORS del backend solo permite 3000 y 3005.
export const FULLSTACK_BASE_URL = process.env.E2E_FULLSTACK_BASE_URL ?? "http://localhost:3005";
