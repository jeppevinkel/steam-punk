FROM node:slim
LABEL authors="Jeppe"

ENV NODE_ENV production

RUN apt-get update \
    && apt-get install -y \
        python3 \
        make \
        g++ \
        sqlite3 \
        libsqlite3-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /steampunk

COPY . .

RUN npm install

CMD ["node", "index.js"]