# SMM-автоматизация: генерация и постинг контента

Полностью автоматический промоушен курса в соцсетях **прямыми API платформ** (без платных
сервисов-агрегаторов). Контент — на английском, из реальных материалов курса.

## Как это работает

```
Понедельник 06:00 UTC (GitHub Actions, marketing-generate.yml):
  generate.js → Claude API → 7 постов (5 рубрик) + PNG-карточки
              → коммит в marketing/queue/

Ежедневно 14:00 UTC (marketing-publish.yml):
  publish.js → пост дня → Facebook-страница + LinkedIn-профиль + TikTok
             → пометка "опубликовано" → коммит
```

Для TikTok генератор дополнительно собирает вертикальное видео 1080×1920
(3 слайда с zoom-эффектом + синтезированный саундтрек — та же прогрессия
Am–F–C–G, что в промо-ролике на лендинге). Платформы включаются независимо:
без секретов платформа просто пропускается.

Рубрики (ротация, без повторов, состояние в `marketing/state.json`):
1. **Interview question of the day** — вопрос из тренажёра собеседований + сжатый разбор;
2. **Quiz challenge** — вопрос квиза, «ответ в комментариях» (драйвит engagement);
3. **60-second lesson** — практический вывод из модуля курса;
4. **A day at Datacore** — мини-история из сюжета курса;
5. **Product** — прямой промо-пост (1 из 5).

Каждый пост ведёт на `en.html` со своими utm-метками; источник каждой регистрации
виден в `/admin` (колонка «Источник»).

## Быстрая настройка: одна команда

```bash
node marketing/setup.js
```

Мастер сам: авторизует GitHub CLI, проведёт по OAuth каждой платформы и **сам
запишет все секреты в GitHub** (`gh secret set`) — ничего не нужно копировать
руками. Вам остаётся только создать dev-приложения на порталах платформ (мастер
открывает нужные страницы и говорит, что нажать) и подтвердить входы. Любой шаг
можно пропустить и вернуться позже — мастер перезапускается сколько угодно.
Проверка окружения без настройки: `node marketing/setup.js --check`.

Ниже — те же шаги подробно (если хотите делать вручную или что-то пошло не так).

## Разовая настройка (~30 минут)

### 1. Facebook (модерация НЕ нужна)

Постим на **свою** страницу — для этого достаточно приложения в dev-режиме,
App Review не требуется.

1. https://developers.facebook.com → **Create App** → тип Business.
2. Вы должны быть админом и приложения, и Facebook-страницы.
3. Локально: `node marketing/auth-helper.js facebook` — откроется браузер,
   помощник получит **бессрочный** Page Access Token и напечатает
   `FB_PAGE_ID` и `FB_PAGE_TOKEN`.

### 2. LinkedIn (модерация НЕ нужна)

Постим в **личный профиль** через self-serve продукт «Share on LinkedIn».
(Постинг на страницу компании требует отдельной партнёрской модерации — не используем.)

1. https://developer.linkedin.com → **Create app** (привяжется к любой вашей LinkedIn Page).
2. Вкладка **Products** → добавить **Share on LinkedIn** и
   **Sign In with LinkedIn using OpenID Connect** (оба одобряются мгновенно).
3. Вкладка **Auth** → Redirect URLs → добавить `http://localhost:8899/cb`.
4. Локально: `node marketing/auth-helper.js linkedin` → напечатает
   `LINKEDIN_TOKEN` и `LINKEDIN_PERSON_URN`.

⚠️ Токен LinkedIn живёт **60 дней**. За 10 дней до истечения `publish.js` начнёт
писать warning в логи Actions — просто перезапустите helper и обновите секрет.

### 3. TikTok (аккаунт: https://www.tiktok.com/@user7761017650203)

Код готов; для публичных постов нужен аудит приложения TikTok (1–2 недели) —
**подайте заявку сразу**, до аудита видео публикуются приватно (SELF_ONLY),
после — публикатор сам переключится на публичные.

1. https://developers.tiktok.com → **Manage apps → Connect an app**.
2. Добавьте продукты **Login Kit** и **Content Posting API**; включите Direct Post.
3. В Login Kit → Redirect URI:
   `https://ml-simulator-app-production.up.railway.app/api/tiktok/callback`
   (localhost TikTok не принимает; эта страница на сайте просто покажет код).
4. Отправьте приложение на **ревью/аудит** (в форме honestly опишите: «automated
   posting of my own educational ML content to my own account»).
5. Локально: `node marketing/auth-helper.js tiktok` → напечатает
   `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, `TIKTOK_REFRESH_TOKEN`.
6. **Ссылка в bio**: TikTok не даёт кликабельных ссылок в описании видео, поэтому
   CTA в постах — «Link in bio». Поставьте в bio аккаунта:
   `https://ml-simulator-app-production.up.railway.app/en.html?utm_source=tiktok&utm_medium=bio`
   — тогда регистрации из TikTok будут видны в `/admin`.

Refresh-токен живёт 365 дней (access-токен публикатор обновляет сам каждый запуск).

### 4. Anthropic API (генерация текстов)

https://console.anthropic.com → API keys → создать ключ.
Расход: 7 постов/неделю ≈ **$1–3 в месяц**.

### 5. Секреты в GitHub

`node marketing/setup.js` записывает всё сам. Вручную: репозиторий →
**Settings → Secrets and variables → Actions → New repository secret**:

| Секрет | Откуда |
| --- | --- |
| `ANTHROPIC_API_KEY` | console.anthropic.com |
| `FB_PAGE_ID` | auth-helper facebook |
| `FB_PAGE_TOKEN` | auth-helper facebook |
| `LINKEDIN_TOKEN` | auth-helper linkedin (обновлять раз в ~55 дней) |
| `LINKEDIN_PERSON_URN` | auth-helper linkedin |
| `TIKTOK_CLIENT_KEY` | auth-helper tiktok |
| `TIKTOK_CLIENT_SECRET` | auth-helper tiktok |
| `TIKTOK_REFRESH_TOKEN` | auth-helper tiktok (обновлять раз в ~год) |

Платформы независимы: можно начать только с Facebook + LinkedIn и добавить
TikTok-секреты позже — публикатор просто пропускает ненастроенные платформы.

### 6. Первый запуск

GitHub → **Actions** → `marketing-generate` → **Run workflow** (создаст очередь),
затем `marketing-publish` → **Run workflow** (опубликует первый пост).
Дальше всё идёт по расписанию само.

## Локальные команды

```bash
npm install --prefix marketing            # один раз (sharp для карточек)
node marketing/generate.js --dry-run      # посмотреть тексты без записи (нужен ANTHROPIC_API_KEY)
node marketing/generate.js --offline      # шаблонная пачка без API — проверить конвейер
node marketing/publish.js --dry-run       # что будет опубликовано сегодня
node marketing/publish.js --platform facebook   # опубликовать только в FB
```

Очередь — обычные файлы в `marketing/queue/` (JSON + PNG + MP4): любой пост можно
отредактировать руками или удалить до публикации. Для сборки TikTok-видео локально
нужен `ffmpeg` (`brew install ffmpeg`; в GitHub Actions уже есть) — без него посты
генерируются без видео и TikTok их пропускает.

## Фаза 2: Instagram (когда будет аккаунт)

Нужен **Instagram Business/Creator**, привязанный к вашей Facebook-странице
(Настройки страницы → Linked accounts). После этого постинг на свой аккаунт работает
через то же Meta-приложение без модерации — добавим ветку Instagram в `publish.js`
(два вызова: `/media` → `/media_publish` с той же PNG-карточкой).

## Замечания

- Коммиты очереди помечаются `[skip railway]`, чтобы не пересобирать прод впустую;
  `marketing/` и `.github/` добавлены в `.dockerignore` — в образ Railway не попадают.
- Приложение Meta может вечно жить в dev-режиме: для постинга на собственную
  страницу этого достаточно.
- Тексты генерирует `claude-sonnet-5` строго из материалов курса (модули, квизы,
  вопросы собеседований) — модель проинструктирована не выдумывать факты о продукте.
