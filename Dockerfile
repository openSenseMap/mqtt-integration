ARG NODE_VERSION=current

FROM node:${NODE_VERSION}-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist

COPY --from=builder /app/drizzle ./drizzle

COPY ./entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 mqttservice
USER mqttservice

EXPOSE 3001

ENTRYPOINT ["./entrypoint.sh"]