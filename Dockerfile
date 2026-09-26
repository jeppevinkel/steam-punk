FROM node:26-bookworm-slim AS build

# Toolchain for building better-sqlite3 in case no prebuilt binary is available.
RUN apt-get update \
    && apt-get install -y python3 make g++ build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /steampunk

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev


FROM node:26-bookworm-slim
LABEL authors="Jeppe"

ENV NODE_ENV=production

WORKDIR /steampunk

COPY --from=build /steampunk/package.json ./
COPY --from=build /steampunk/node_modules ./node_modules
COPY --from=build /steampunk/dist ./dist

CMD ["node", "dist/index.js"]
