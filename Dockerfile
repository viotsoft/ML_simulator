FROM node:22-slim

WORKDIR /srv
ENV NODE_ENV=production

# ffmpeg — сборка вертикальных видео (Reels/TikTok) маркетинговым конвейером
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server.js ./
COPY content ./content
COPY public ./public
COPY marketing ./marketing

# Данные пользователей — на постоянный диск, путь задаётся DATA_DIR.
# Сам том подключается платформой (Railway Volumes / Render Disks и т.п.),
# поэтому Docker-директива VOLUME здесь не используется: Railway отклоняет
# сборку с ней ("use Railway Volumes" вместо стандартного Docker VOLUME).
ENV DATA_DIR=/data

EXPOSE 3000
CMD ["node", "server.js"]
