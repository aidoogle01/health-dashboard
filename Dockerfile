# Debian (not Alpine) because the Garmin/MyFitnessPal connector needs curl_cffi's glibc wheels.
FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund
COPY tsconfig.json ./
COPY src ./src
COPY public ./public
RUN npm run build && npm prune --omit=dev

FROM node:20-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-venv ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY connectors/requirements.txt ./connectors/requirements.txt
RUN python3 -m venv /opt/connectors && /opt/connectors/bin/pip install --no-cache-dir -r connectors/requirements.txt
ENV NODE_ENV=production DATA_DIR=/data PYTHON_BIN=/opt/connectors/bin/python
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY public ./public
COPY connectors ./connectors
EXPOSE 3100
CMD ["node", "dist/index.js"]
