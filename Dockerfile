FROM node:22-slim

WORKDIR /srv
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server.js ./
COPY content ./content
COPY public ./public

# данные пользователей — на постоянный диск (том), путь задаётся DATA_DIR
ENV DATA_DIR=/data
VOLUME ["/data"]

EXPOSE 3000
CMD ["node", "server.js"]
