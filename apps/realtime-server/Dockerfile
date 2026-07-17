FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared-types ./packages/shared-types
COPY apps/realtime-server/package.json ./apps/realtime-server/package.json
RUN pnpm install --frozen-lockfile --filter realtime-server...

FROM deps AS build
COPY apps/realtime-server ./apps/realtime-server
RUN pnpm --filter realtime-server build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared-types ./packages/shared-types
COPY --from=build /app/apps/realtime-server/node_modules ./apps/realtime-server/node_modules
COPY --from=build /app/apps/realtime-server/dist ./apps/realtime-server/dist
COPY --from=build /app/apps/realtime-server/package.json ./apps/realtime-server/package.json

EXPOSE 4000
CMD ["node", "apps/realtime-server/dist/index.js"]
