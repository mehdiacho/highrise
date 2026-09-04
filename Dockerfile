# Richup — single container.
# Fastify serves the built web bundle (static SPA) AND the Socket.io game server
# on one port, so the whole game runs from one origin (no CORS, socket is
# same-origin). The shared package is consumed as raw TS, so the server runs
# via tsx — no separate compile step.
# Node 22: pnpm 11 requires Node >= 22.13 (it imports the node:sqlite builtin).
FROM node:22-slim

RUN corepack enable

WORKDIR /app

# Install deps first (workspace-aware) for layer caching. Needs every workspace
# manifest + the workspace/lock files present before install.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/server/package.json apps/server/package.json
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile

# Bring in the source (node_modules/dist excluded via .dockerignore so the
# installed dependency layer above survives this copy).
COPY . .

# Build the production web bundle → apps/web/dist
RUN pnpm --filter @richup/web build

# tsx is a devDependency, so keep dev deps at runtime (do not set NODE_ENV before install).
ENV NODE_ENV=production
ENV PORT=3001
ENV WEB_ROOT=/app/apps/web/dist
EXPOSE 3001

# `run start` executes with cwd = the server package dir, so tsx resolves
# src/index.ts and the @richup/shared workspace symlink correctly.
CMD ["pnpm", "--filter", "@richup/server", "run", "start"]
