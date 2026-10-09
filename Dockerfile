# Build from the repo root: docker build -f apps/dashboard/Dockerfile .
FROM node:20-alpine AS build
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY apps/dashboard/package.json ./apps/dashboard/
RUN pnpm install --filter @mealwise/dashboard --no-frozen-lockfile
COPY apps/dashboard ./apps/dashboard
RUN pnpm --filter @mealwise/dashboard build && pnpm --filter @mealwise/dashboard --prod deploy /out

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production DATA_DIR=/data
COPY --from=build /out/package.json ./
COPY --from=build /out/node_modules ./node_modules
COPY --from=build /app/apps/dashboard/dist ./dist
COPY --from=build /app/apps/dashboard/public ./public
VOLUME /data
EXPOSE 3100
CMD ["node", "dist/index.js"]
