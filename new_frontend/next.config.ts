import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack(config, { dev }) {
    // El polling es para Docker; el servidor local de e2e usa el watcher nativo.
    if (dev && !process.env.E2E_DEV_SERVER) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300
      };
    }
    return config;
  },
  // Solo el servidor de e2e (`npm run dev:e2e`): sin esto `next dev` descarta las rutas compiladas
  // a los pocos segundos y los tests las recompilan una y otra vez.
  ...(process.env.E2E_DEV_SERVER
    ? { onDemandEntries: { maxInactiveAge: 60 * 60 * 1000, pagesBufferLength: 50 } }
    : {}),
};

export default nextConfig;
