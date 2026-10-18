# ==========================================
# 1. BUILD: compila TypeScript y genera el cliente de Prisma
# ==========================================
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx prisma generate && npm run build

# ==========================================
# 2. DEPENDENCIAS DE PRODUCCIÓN (sin devDependencies, con el cliente de Prisma ya generado)
# ==========================================
FROM node:20-alpine AS prod-deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev && npx prisma generate

# ==========================================
# 3. RUNNER: solo lo necesario, sin root
# ==========================================
FROM node:20-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app

COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json package-lock.json ./
COPY --chown=node:node prisma ./prisma

# downloadTeamLogo escribe en public/logos: el usuario node necesita poder crearlo.
RUN mkdir -p public/logos && chown -R node:node public

USER node
EXPOSE 3007

CMD ["npm", "run", "start:prod"]
