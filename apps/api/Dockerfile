# syntax=docker/dockerfile:1.7

# ----- stage 1: build -----
FROM node:20-alpine AS build
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /repo
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/package.json
RUN pnpm install --frozen-lockfile
COPY apps/api ./apps/api
RUN pnpm --filter @worka/api exec prisma generate
RUN pnpm --filter @worka/api build

# ----- stage 2: runtime -----
# We keep the full monorepo tree under /repo so pnpm's relative symlinks
# (apps/api/node_modules → ../../node_modules/.pnpm/...) stay valid.
FROM node:20-alpine AS runtime
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=build /repo /repo
RUN chmod +x /repo/apps/api/start.sh
WORKDIR /repo/apps/api
EXPOSE 3000
CMD ["/repo/apps/api/start.sh"]
