# ==========================================
# 1. ETAPA DE DEPENDENCIAS
# ==========================================
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
# Instalamos limpiamente usando el lockfile
RUN npm ci

# ==========================================
# 2. ETAPA DE COMPILACIÓN (BUILDER)
# ==========================================
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Argumentos necesarios en tiempo de compilación (Next.js hace "bake" de esto en el código estático)
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_ARGENTINA_LEAGUE_ID

ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=${NEXT_PUBLIC_GOOGLE_CLIENT_ID}
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_ARGENTINA_LEAGUE_ID=${NEXT_PUBLIC_ARGENTINA_LEAGUE_ID}

# Deshabilitamos telemetría de Next.js
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ==========================================
# 3. ETAPA DE PRODUCCIÓN (RUNNER)
# ==========================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Creamos un usuario sin privilegios por seguridad
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiamos la carpeta public
COPY --from=builder /app/public ./public

# Asumimos el uso de `output: 'standalone'` en next.config.js
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Cambiamos al usuario no root
USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Ejecutamos el servidor standalone de Next.js
CMD ["node", "server.js"]