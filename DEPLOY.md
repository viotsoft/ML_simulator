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

## Шаг 2. Настроить платёжку

Stripe и PayPal **не поддерживают приём платежей мерчантом из России/Украины/СНГ** —
регистрация продавца там просто недоступна для этих стран. Если вы в одной из них —
идите в раздел **«2а. WayForPay»**. Если ваш бизнес зарегистрирован в стране,
поддерживаемой Stripe (ЕС, США и т.д.) — раздел **«2б. Stripe»**.

### 2а. WayForPay (Украина, приём карт со всего мира)

**Тестовый режим — можно проверить прямо сейчас, без регистрации:**
```
WFP_MERCHANT_ACCOUNT=test_merch_n1
WFP_MERCHANT_SECRET=flk3409refn54t54t*FNJRET
WFP_DOMAIN=localhost   # или домен вашего деплоя
```
Это официальные публичные реквизиты песочницы WayForPay — с ними виджет оплаты
открывается по-настоящему (проверено), но деньги не списываются.

**Боевой аккаунт:**
1. Зарегистрируйте ФОП (если ещё нет) — в приложении «Дія» это занимает around
   15–30 минут, без визита к нотариусу.
2. Зарегистрируйтесь как продавец: https://wayforpay.com → «Підключити прийом платежів».
   Понадобятся паспортные данные ФОП и реквизиты банковского счёта (IBAN).
   Модерация обычно занимает от нескольких часов до 1–2 дней.
3. В личном кабинете (https://secure.wayforpay.com) → **Мої магазини** → ваш магазин:
   - `merchantAccount` — виден сразу в списке магазинов;
   - **Налаштування → Безпека → Секретний ключ** — это `WFP_MERCHANT_SECRET`;
   - там же обычно рядом лежит `WFP_MERCHANT_PASSWORD` — отдельный пароль для API
     управления регулярными платежами (если не видите — напишите в поддержку
     support@wayforpay.com, попросите API-пароль для `regularApi`).
4. `WFP_DOMAIN` должен **точно совпадать** с доменом, указанным при регистрации магазина
   (например `ml-simulator-app-production.up.railway.app`, без `https://`).
5. Валюта по умолчанию в коде — `USD` (чтобы цена была понятна международным
   покупателям); WayForPay сам показывает покупателю сумму в гривне по своему курсу.
   Если хотите принимать в UAH — поменяйте `currency` в `server.js` (`/api/subscribe`).

**Как это устроено технически** (если захотите свериться с официальной документацией
на https://wiki.wayforpay.com): оплата — через их JS-виджет (`pay-widget.js`), подпись
запроса — HMAC-MD5 по полям `merchantAccount;merchantDomainName;orderReference;
orderDate;amount;currency;productName;productCount;productPrice`; вебхук на
`/api/wayforpay/webhook` проверяется той же схемой; отмена подписки — вызов
`https://api.wayforpay.com/regularApi` с `requestType: "REMOVE"`.

### 2б. Stripe (страны, где он доступен)

1. Зарегистрируйтесь / войдите: https://dashboard.stripe.com
2. **Product catalog → Add product**: имя `ML Simulator PRO`, цена **$20 / month (recurring)**.
   Скопируйте **Price ID** (`price_...`).
3. **Developers → API keys**: скопируйте **Secret key** (`sk_live_...`; для проверки начните с test-режима и `sk_test_...`).
4. Вебхук добавите после шага 3, когда будет известен URL приложения.

## Шаг 3. Деплой на Render (~10 минут)

1. Зарегистрируйтесь: https://render.com (можно через GitHub).
2. **New → Blueprint** → выберите репозиторий `ml-career-simulator`.
   Render прочитает `render.yaml`: web-сервис из Dockerfile + диск 1 GB на `/data`.
3. В настройках сервиса → **Environment** задайте (WayForPay ИЛИ Stripe, что настроили в шаге 2):
   - `APP_URL` = `https://<имя-сервиса>.onrender.com`
   - `WFP_MERCHANT_ACCOUNT`, `WFP_MERCHANT_SECRET`, `WFP_MERCHANT_PASSWORD`,
     `WFP_DOMAIN` = `<имя-сервиса>.onrender.com` — либо
   - `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET` (последний — на шаге 4).
4. Deploy. Через пару минут приложение доступно по `https://<имя-сервиса>.onrender.com`.

> Постоянный диск на Render требует платного плана (Starter, ~$7/мес). Для продукта
> с платной подпиской это нормальная база. Без диска данные пользователей
> будут стираться при каждом деплое — так запускать нельзя.

## Шаг 4. Подключить вебхук

**WayForPay** — отдельного шага не требуется: адрес вебхука (`serviceUrl`)
формируется автоматически из `APP_URL` и передаётся в каждом запросе на оплату.
Просто убедитесь, что `APP_URL` указывает на реальный публичный домен (WayForPay
должен суметь до него достучаться — `localhost` для боевого режима не подойдёт).

**Stripe:**
1. Stripe Dashboard → **Developers → Webhooks → Add endpoint**.
2. URL: `https://<имя-сервиса>.onrender.com/api/stripe/webhook`
3. События: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.
4. Скопируйте **Signing secret** (`whsec_...`) → добавьте в Render как `STRIPE_WEBHOOK_SECRET` → сервис перезапустится.

## Шаг 5. Проверка боевого цикла

**WayForPay:**
1. Откройте сайт, зарегистрируйте тестового пользователя.
2. Нажмите «Оформить подписку» → на странице должен открыться виджет WayForPay
   (не редирект, а всплывающее окно поверх сайта).
3. Оплатите тестовой картой — карту для гарантированного «Approved» уточните в
   личном кабинете WayForPay или у их поддержки: универсальная `4111 1111 1111 1111`
   в их песочнице может приходить как отклонённая — это ожидаемо и не означает
   ошибку интеграции (подпись и виджет проверены и работают корректно).
4. После оплаты бейдж должен смениться на PRO в течение нескольких секунд
   (сервер ждёт вебхук от WayForPay).
5. Кнопка «Подписка» в шапке → подтверждение → подписка отменяется через их API.
6. Проверив всё в песочнице, замените тестовые `WFP_MERCHANT_ACCOUNT`/`WFP_MERCHANT_SECRET`
   на боевые реквизиты из личного кабинета.

**Stripe:**
1. Нажмите «Оформить подписку» → должно перекинуть на Stripe Checkout.
2. В **test-режиме** Stripe оплатите картой `4242 4242 4242 4242` (любые дата/CVC).
3. После возврата бейдж должен смениться на PRO, модуль 3 — открыться.
4. Кнопка «Подписка» в шапке → Stripe Billing Portal: отмена подписки.
   После отмены вебхук снимет PRO (проверьте через минуту).
5. Убедившись, что всё работает, переключите ключи с `sk_test_` на `sk_live_`
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
4. Variables: `APP_URL` = сгенерированный домен, плюс `WFP_MERCHANT_ACCOUNT` /
   `WFP_MERCHANT_SECRET` / `WFP_MERCHANT_PASSWORD` / `WFP_DOMAIN` (= тот же домен без
   `https://`) или `STRIPE_*` — что настроили в шаге 2. Без них — демо-режим оплаты.
   `DATA_DIR=/data` уже зашит в Dockerfile.
5. Для WayForPay отдельный вебхук настраивать не нужно (см. шаг 4 выше). Для
   Stripe — тот же адрес: `<домен>/api/stripe/webhook`.

   ```bash
   # пример: включить боевой режим WayForPay на уже задеплоенном сервисе
   railway variable set WFP_MERCHANT_ACCOUNT=... WFP_MERCHANT_SECRET=... \
     WFP_MERCHANT_PASSWORD=... WFP_DOMAIN=ml-simulator-app-production.up.railway.app
   ```

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
- [ ] `data/` на постоянном диске; настроен бэкап (Render Disk snapshots, Railway Volumes или cron-выгрузка).
- [ ] Тестовая оплата и отмена прошли полный цикл (в песочнице выбранной платёжки).
- [ ] На лендинге есть контакт поддержки и условия возврата (требование и Stripe, и WayForPay).
- [ ] **Если WayForPay:** магазин прошёл модерацию, `WFP_DOMAIN` точно совпадает с
      зарегистрированным доменом, `APP_URL` — публичный (не localhost) для доставки вебхука.
- [ ] **Если Stripe:** вебхук в live-режиме, событие `checkout.session.completed`
      доходит (Stripe → Webhooks → логи); заполнены реквизиты бизнеса (иначе live-режим не включится).
