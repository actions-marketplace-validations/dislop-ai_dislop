FROM node:22-alpine

WORKDIR /app

COPY package.json ./
COPY src/ ./src/
COPY packs/ ./packs/
COPY server/ ./server/

ENV DISLOP_HOST=0.0.0.0
ENV DISLOP_PORT=8787

USER node
EXPOSE 8787

CMD ["node", "server/index.mjs"]
