# syntax=docker/dockerfile:1
# Imagen de producción de Gestión Dalmata (Next.js standalone + Prisma).

FROM node:22-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate \
 && npm run build \
 # El seed se empaqueta en un único JS para no necesitar tsx en producción.
 && npx esbuild prisma/seed.ts --bundle --platform=node --target=node22 \
      --external:@prisma/client --alias:@=./src --outfile=prisma/seed.js

FROM base AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    UPLOAD_DIR=/app/uploads
# CLI de Prisma (misma versión que el proyecto) para aplicar migraciones al arrancar.
RUN npm install -g prisma@6.19.3 && npm cache clean --force
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --from=build --chown=node:node /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build --chown=node:node /app/node_modules/@prisma ./node_modules/@prisma
COPY --chown=node:node docker/entrypoint.sh ./entrypoint.sh
RUN mkdir -p /app/uploads && chown node:node /app/uploads && chmod +x ./entrypoint.sh
USER node
EXPOSE 3000
CMD ["./entrypoint.sh"]
