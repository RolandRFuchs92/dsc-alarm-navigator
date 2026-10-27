# syntax=docker/dockerfile:1
#
# DSC Alarm Navigator: Next.js standalone server on port 3000.
#
#   docker build -t dsc-panel-guides .
#   docker run -d --name dsc-panel-guides --restart unless-stopped \
#     -p 127.0.0.1:3000:3000 --env-file /etc/dsc-panel-guides.env dsc-panel-guides
#
# Runtime config comes only from the environment: DATABASE_URL, BETTER_AUTH_SECRET,
# BETTER_AUTH_URL. Nothing secret is baked in. Migrations never run here; run
# `npm run db:migrate` (tern) by hand before starting a new version.

# node:24 (npm 11) matches local dev.
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Runtime: only the standalone server, its traced node_modules and the static assets.
FROM node:24-alpine AS run
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 3000

# /api/health also does a DB round trip, so an unreachable database shows as unhealthy.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- "http://127.0.0.1:3000/api/health" || exit 1

CMD ["node", "server.js"]
