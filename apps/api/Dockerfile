# syntax=docker/dockerfile:1.7

# ----- stage 1: install workspace deps -----
FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /repo
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/package.json
RUN pnpm install --frozen-lockfile

# ----- stage 2: build + deploy -----
FROM node:20-alpine AS build
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /repo
COPY --from=deps /repo /repo
COPY apps/api ./apps/api
RUN pnpm --filter @worka/api exec prisma generate
RUN pnpm --filter @worka/api build
# pnpm deploy resolves all workspace symlinks into a self-contained tree.
# --legacy uses the older deploy algorithm that preserves the full node_modules layout.
RUN pnpm --filter @worka/api deploy --legacy /deploy

# ----- stage 3: runtime -----
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /deploy/node_modules ./node_modules
COPY --from=build /deploy/package.json ./package.json
COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/apps/api/prisma ./prisma
EXPOSE 3000
# Run migrations then start. Call prisma binary directly (no npx) since prisma
# is now in production dependencies.
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node dist/main.js"]
