# Build from the repo root: docker build -f apps/dashboard/Dockerfile .
# Debian (not Alpine) because the Garmin/MyFitnessPal connector needs curl_cffi's glibc wheels.
FROM node:20-bookworm-slim AS build
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY apps/dashboard/package.json ./apps/dashboard/
RUN pnpm install --filter @mealwise/dashboard --no-frozen-lockfile
COPY apps/dashboard ./apps/dashboard
RUN pnpm --filter @mealwise/dashboard build && pnpm --filter @mealwise/dashboard --prod deploy /out

FROM node:20-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-venv ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY apps/dashboard/connectors/requirements.txt ./connectors/requirements.txt
RUN python3 -m venv /opt/connectors && /opt/connectors/bin/pip install --no-cache-dir -r connectors/requirements.txt
ENV NODE_ENV=production DATA_DIR=/data PYTHON_BIN=/opt/connectors/bin/python
COPY --from=build /out/package.json ./
COPY --from=build /out/node_modules ./node_modules
COPY --from=build /app/apps/dashboard/dist ./dist
COPY --from=build /app/apps/dashboard/public ./public
COPY apps/dashboard/connectors ./connectors
EXPOSE 3100
CMD ["node", "dist/index.js"]
