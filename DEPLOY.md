# Деплой ML Career Simulator

Проект — один Node.js-сервис с файловым хранилищем, поэтому хостингу нужен **постоянный диск**.
Живой деплой на Railway: **https://ml-simulator-app-production.up.railway.app**
(проект `ml-simulator-app` в аккаунте Railway, привязан к GitHub `viotsoft/ML_simulator`, ветка `main`).
Ниже — инструкция и для Railway, и для запасного варианта на Render.

---

## Шаг 1. Выложить код на GitHub (~5 минут)

```bash
cd "~/Documents/ML simulator"

# авторизуйте GitHub CLI (откроется браузер)
gh auth login

# создать приватный репозиторий и запушить (git уже инициализирован, коммит создан)
gh repo create ml-career-simulator --private --source=. --push
```

## Шаг 2. Настроить Stripe (~15 минут)

1. Зарегистрируйтесь / войдите: https://dashboard.stripe.com
2. **Product catalog → Add product**: имя `ML Simulator PRO`, цена **$20 / month (recurring)**.
   Скопируйте **Price ID** (`price_...`).
3. **Developers → API keys**: скопируйте **Secret key** (`sk_live_...`; для проверки начните с test-режима и `sk_test_...`).
4. Вебхук добавите после шага 3, когда будет известен URL приложения.

## Шаг 3. Деплой на Render (~10 минут)

1. Зарегистрируйтесь: https://render.com (можно через GitHub).
2. **New → Blueprint** → выберите репозиторий `ml-career-simulator`.
   Render прочитает `render.yaml`: web-сервис из Dockerfile + диск 1 GB на `/data`.
3. В настройках сервиса → **Environment** задайте:
   - `APP_URL` = `https://<имя-сервиса>.onrender.com`
   - `STRIPE_SECRET_KEY` = `sk_...`
   - `STRIPE_PRICE_ID` = `price_...`
   - `STRIPE_WEBHOOK_SECRET` — пока пропустите, добавите на шаге 4.
4. Deploy. Через пару минут приложение доступно по `https://<имя-сервиса>.onrender.com`.

> Постоянный диск на Render требует платного плана (Starter, ~$7/мес). Для продукта
> с платной подпиской это нормальная база. Без диска данные пользователей
> будут стираться при каждом деплое — так запускать нельзя.

## Шаг 4. Подключить вебхук Stripe (~5 минут)

1. Stripe Dashboard → **Developers → Webhooks → Add endpoint**.
2. URL: `https://<имя-сервиса>.onrender.com/api/stripe/webhook`
3. События: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.
4. Скопируйте **Signing secret** (`whsec_...`) → добавьте в Render как `STRIPE_WEBHOOK_SECRET` → сервис перезапустится.

## Шаг 5. Проверка боевого цикла

1. Откройте сайт, зарегистрируйте тестового пользователя.
2. Нажмите «Оформить подписку» → должно перекинуть на Stripe Checkout.
3. В **test-режиме** Stripe оплатите картой `4242 4242 4242 4242` (любые дата/CVC).
4. После возврата бейдж должен смениться на PRO, модуль 3 — открыться.
5. Кнопка «Подписка» в шапке → Stripe Billing Portal: отмена подписки.
   После отмены вебхук снимет PRO (проверьте через минуту).
6. Убедившись, что всё работает, переключите ключи с `sk_test_` на `sk_live_`
   (и пересоздайте вебхук в live-режиме).

---

## Railway (текущий деплой)

Через CLI (`brew install railway`) или дашборд https://railway.app:

1. **New Project → Deploy from GitHub repo** → выбрать `viotsoft/ML_simulator`, ветка `main`.
   Railway сам находит `Dockerfile` и собирает образ.
2. **Add Volume** на сервисе → mount path `/data`.
3. **Settings → Networking → Generate Domain**. ⚠️ Railway создаёт домен с портом по
   умолчанию (обычно 3000), а контейнер слушает порт из переменной `PORT`, которую
   Railway подставляет сама (в нашем случае — 8080). Если после деплоя домен отвечает
   `502 Application failed to respond` — открой домен и поменяй **Target Port** на тот,
   что в логах контейнера (`railway logs --deployment`, строка вида
   `... запущен: http://localhost:XXXX`).
4. Variables: `APP_URL` = сгенерированный домен, плюс при необходимости `STRIPE_*`
   (без них — демо-режим оплаты). `DATA_DIR=/data` уже зашит в Dockerfile.
5. **Готовые вебхуки Stripe** — тот же адрес: `<домен>/api/stripe/webhook`.

**Известная ловушка сборки:** Railway отклоняет Dockerfile с директивой `VOLUME` —
падает без единой строчки лога сборки («scheduling build» и тишина). Постоянное
хранилище подключается только через Railway Volumes (шаг 2 выше), поэтому в
`Dockerfile` этого проекта директивы `VOLUME` нет — только `ENV DATA_DIR=/data`.
Если увидишь глухой fail без логов на своём форке — проверь Dockerfile на `VOLUME`.

## Альтернатива: Fly.io

```bash
brew install flyctl
fly launch          # прочитает Dockerfile
fly volumes create data --size 1
# в fly.toml добавить [mounts] source="data" destination="/data"
fly secrets set STRIPE_SECRET_KEY=... STRIPE_PRICE_ID=... STRIPE_WEBHOOK_SECRET=... APP_URL=https://<app>.fly.dev
fly deploy
```

---

## Чеклист перед приёмом реальных денег

- [ ] HTTPS работает (Render/Railway/Fly дают из коробки).
- [ ] Вебхук в live-режиме, событие `checkout.session.completed` доходит (Stripe → Webhooks → логи).
- [ ] `data/` на постоянном диске; настроен бэкап (Render Disk snapshots или cron-выгрузка).
- [ ] Тестовая оплата и отмена прошли полный цикл.
- [ ] В Stripe заполнены реквизиты бизнеса и публичное описание (иначе live-режим не включится).
- [ ] На лендинге есть контакт поддержки и условия возврата (требование Stripe).
