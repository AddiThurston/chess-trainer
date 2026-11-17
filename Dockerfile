FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runner
RUN apt-get update \
  && apt-get install -y --no-install-recommends stockfish \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=43117
ENV HOSTNAME=0.0.0.0
ENV STOCKFISH_PATH=/usr/games/stockfish
RUN useradd --system --uid 1001 --create-home nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static
# The import worker runs the TypeScript source directly; the standalone output already holds its packages.
COPY --from=builder /app/src/lib ./src/lib
COPY --from=builder /app/src/worker.ts ./src/worker.ts
COPY --from=builder /app/scripts/alias.mjs ./scripts/alias.mjs
COPY --from=builder /app/data ./data
RUN mkdir -p /app/.lichess-cache && chown nextjs:nextjs /app/.lichess-cache
USER nextjs
EXPOSE 43117
CMD ["node", "server.js"]
