FROM node:slim
LABEL authors="Jeppe"

ENV NODE_ENV production

WORKDIR /steampunk

COPY . .

RUN npm install

CMD ["node", "index.js"]