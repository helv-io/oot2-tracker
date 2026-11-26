# oot2-tracker — multi-stage build.
# Stage 1 bundles the React client; stage 2 is a dependency-free Node
# runtime (the server uses only node:http + node:sqlite).

FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY client ./client
COPY build.mjs ./
RUN npm run build

FROM node:24-slim
LABEL org.opencontainers.image.title="oot2-tracker" \
      org.opencontainers.image.description="Ocarina of Time 100% checklist — 272 deeds, three views, per-user progress with Google sign-in." \
      org.opencontainers.image.source="https://github.com/helv-io/oot2-tracker" \
      org.opencontainers.image.url="https://github.com/helv-io/oot2-tracker" \
      org.opencontainers.image.licenses="MIT"
ENV NODE_ENV=production \
    TZ=America/New_York \
    PORT=8080 \
    DB_PATH=/data/oot.sqlite \
    PUBLIC_URL=https://oot.helv.io
WORKDIR /app
# --chown matters: the app runs as the node user, and source files may
# arrive with restrictive modes from the build context.
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node server ./server
COPY --chown=node:node package.json ./
VOLUME /data
EXPOSE 8080
USER node
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["node", "server/healthcheck.js"]
CMD ["node", "server/server.js"]
