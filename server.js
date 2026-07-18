/**
 * ML Career Simulator — сервер
 * Express + JSON-хранилище (data/users.json) + Markdown-контент (content/)
 *
 * Запуск: npm install && npm start  →  http://localhost:3000
 */
const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------------------------------------------------------------- Stripe
// Без ключей приложение работает в ДЕМО-режиме (подписка включается кнопкой).
// Для боевого режима задайте переменные окружения:
//   STRIPE_SECRET_KEY     — sk_live_... / sk_test_...
//   STRIPE_PRICE_ID       — price_... (продукт "PRO $20/мес", recurring)
//   STRIPE_WEBHOOK_SECRET — whsec_... (подпись вебхука)
//   APP_URL               — публичный URL приложения (https://...)
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const APP_URL = (process.env.APP_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
const stripe = STRIPE_SECRET_KEY ? require('stripe')(STRIPE_SECRET_KEY) : null;

// ---------------------------------------------------------------- WayForPay
// Украинский эквайер: работает для мерчантов из Украины (ФОП/ООО), принимает
// карты со всего мира. Без ключей ниже — тоже демо-режим. Для боевого режима:
//   WFP_MERCHANT_ACCOUNT  — merchantAccount (идентификатор магазина)
//   WFP_MERCHANT_SECRET   — secretKey (подпись HMAC-MD5 виджета и вебхука)
//   WFP_MERCHANT_PASSWORD — merchantPassword (отдельный секрет для regularApi:
//                            управление подпиской — приостановка/отмена)
//   WFP_DOMAIN            — домен сайта, зарегистрированный в кабинете WayForPay
// Публичные тестовые реквизиты для песочницы (см. DEPLOY.md): merchantAccount
// test_merch_n1 / secret flk3409refn54t54t*FNJRET — ничего платить не нужно.
const WFP_MERCHANT_ACCOUNT = process.env.WFP_MERCHANT_ACCOUNT || '';
const WFP_MERCHANT_SECRET = process.env.WFP_MERCHANT_SECRET || '';
const WFP_MERCHANT_PASSWORD = process.env.WFP_MERCHANT_PASSWORD || '';
const WFP_DOMAIN = process.env.WFP_DOMAIN || '';
const PRICE_USD = '20.00';

function wfpSign(parts) {
  return crypto.createHmac('md5', WFP_MERCHANT_SECRET).update(parts.join(';')).digest('hex');
}

// Приоритет: если заданы реквизиты WayForPay — используем их (это боевой
// вариант для украинского мерчанта); иначе — Stripe, если он настроен;
// иначе — демо-режим без реальных платежей.
const PAYMENTS_MODE = WFP_MERCHANT_ACCOUNT && WFP_MERCHANT_SECRET ? 'wayforpay'
  : stripe && STRIPE_PRICE_ID ? 'stripe'
  : 'demo';

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const CONTENT_DIR = path.join(__dirname, 'content');

// ---------------------------------------------------------------- локали
// Контент лежит в content/<locale>/: modules.json, quizzes.json,
// interviews.json и m01.md … m23.md. Русский — основной; если английского
// файла модуля нет, отдаём русский (фолбэк).
const LOCALES = ['ru', 'en'];
const DEFAULT_LOCALE = 'ru';
const CONTENT = {};
for (const loc of LOCALES) {
  const dir = path.join(CONTENT_DIR, loc);
  CONTENT[loc] = {
    modules: JSON.parse(fs.readFileSync(path.join(dir, 'modules.json'), 'utf8')),
    quizzes: JSON.parse(fs.readFileSync(path.join(dir, 'quizzes.json'), 'utf8')),
    interviews: JSON.parse(fs.readFileSync(path.join(dir, 'interviews.json'), 'utf8')),
  };
}
const MODULES = CONTENT[DEFAULT_LOCALE].modules;   // структура/порядок общие для локалей

function getLang(req) {
  const q = String(req.query.lang || '');
  if (LOCALES.includes(q)) return q;
  const c = parseCookies(req).lang;
  return LOCALES.includes(c) ? c : DEFAULT_LOCALE;
}
function localeModules(lang) { return CONTENT[lang].modules; }
function localeQuizzes(lang) { return CONTENT[lang].quizzes; }
function localeInterviews(lang) { return CONTENT[lang].interviews; }
function moduleMarkdownPath(lang, id) {
  const p = path.join(CONTENT_DIR, lang, `${id}.md`);
  return fs.existsSync(p) ? p : path.join(CONTENT_DIR, DEFAULT_LOCALE, `${id}.md`);
}

const FREE_MODULES = 2;          // первые N модулей бесплатны
const PASS_SCORE = 0.7;          // порог прохождения квиза
const CERT_REQUIRED = 20;        // сертификат — базовый курс (модули 21+ — бонус-трек Advanced)

// ---------------------------------------------------------------- хранилище
function loadDB() {
  if (!fs.existsSync(USERS_FILE)) return { users: {}, sessions: {} };
  return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
}
function saveDB(db) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(USERS_FILE, JSON.stringify(db, null, 2));
}

// ---------------------------------------------------------------- пароли
function hashPassword(password, salt) {
  salt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}
function verifyPassword(password, salt, hash) {
  const candidate = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(candidate, 'hex'), Buffer.from(hash, 'hex'));
}

// ---------------------------------------------------------------- сессии
function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx > -1) out[pair.slice(0, idx).trim()] = decodeURIComponent(pair.slice(idx + 1).trim());
  });
  return out;
}
function currentUser(req) {
  const token = parseCookies(req).session;
  if (!token) return null;
  const db = loadDB();
  const email = db.sessions[token];
  return email ? { db, user: db.users[email], token } : null;
}
function requireAuth(req, res, next) {
  const ctx = currentUser(req);
  if (!ctx) return res.status(401).json({ error: 'Требуется вход в систему' });
  req.ctx = ctx;
  next();
}

// ---------------------------------------------------------------- Stripe webhook
// ВАЖНО: этот роут стоит ДО express.json() — Stripe проверяет подпись по сырому телу.
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  if (!stripe || !STRIPE_WEBHOOK_SECRET) return res.status(400).send('Stripe не настроен');
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook: неверная подпись:', err.message);
    return res.status(400).send('Invalid signature');
  }

  const db = loadDB();
  const findByCustomer = (customerId) =>
    Object.values(db.users).find((u) => u.stripeCustomerId === customerId);

  switch (event.type) {
    case 'checkout.session.completed': {
      const s = event.data.object;
      const email = (s.metadata && s.metadata.email) || s.customer_email;
      const user = email && db.users[String(email).toLowerCase()];
      if (user) {
        user.subscribed = true;
        user.subscribedAt = new Date().toISOString();
        user.stripeCustomerId = s.customer;
        user.stripeSubscriptionId = s.subscription;
        saveDB(db);
        console.log(`Webhook: подписка активирована для ${email}`);
      }
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      const user = findByCustomer(sub.customer);
      if (user) {
        user.subscribed = false;
        user.unsubscribedAt = new Date().toISOString();
        saveDB(db);
        console.log(`Webhook: подписка отменена для ${user.email}`);
      }
      break;
    }
    case 'customer.subscription.updated': {
      const sub = event.data.object;
      const user = findByCustomer(sub.customer);
      if (user) {
        // active/trialing = доступ есть; past_due/canceled/unpaid = доступа нет
        user.subscribed = ['active', 'trialing'].includes(sub.status);
        saveDB(db);
        console.log(`Webhook: статус подписки ${user.email} → ${sub.status}`);
      }
      break;
    }
    default:
      break;
  }
  res.json({ received: true });
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------------------------------------------------------------- auth API
app.post('/api/register', (req, res) => {
  const { name, email, password, source } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: 'Заполните имя, email и пароль' });
  if (password.length < 6) return res.status(400).json({ error: 'Пароль — минимум 6 символов' });
  const key = String(email).trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(key)) return res.status(400).json({ error: 'Некорректный email' });

  const db = loadDB();
  if (db.users[key]) return res.status(409).json({ error: 'Пользователь с таким email уже существует' });

  // Откуда пришёл пользователь (utm-метки соцсетей) — только известные ключи
  const src = {};
  if (source && typeof source === 'object') {
    for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content']) {
      if (typeof source[k] === 'string' && source[k]) src[k] = source[k].slice(0, 64);
    }
  }

  const { salt, hash } = hashPassword(password);
  db.users[key] = {
    name: String(name).trim(),
    email: key,
    salt, hash,
    subscribed: false,
    createdAt: new Date().toISOString(),
    source: Object.keys(src).length ? src : null,
    progress: {} // moduleId -> { score, total, passedAt, attempts }
  };
  const token = crypto.randomBytes(32).toString('hex');
  db.sessions[token] = key;
  saveDB(db);
  res.setHeader('Set-Cookie', `session=${token}; HttpOnly; Path=/; Max-Age=2592000; SameSite=Lax`);
  res.json({ ok: true, user: publicUser(db.users[key]) });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body || {};
  const key = String(email || '').trim().toLowerCase();
  const db = loadDB();
  const user = db.users[key];
  if (!user || !verifyPassword(String(password || ''), user.salt, user.hash)) {
    return res.status(401).json({ error: 'Неверный email или пароль' });
  }
  const token = crypto.randomBytes(32).toString('hex');
  db.sessions[token] = key;
  saveDB(db);
  res.setHeader('Set-Cookie', `session=${token}; HttpOnly; Path=/; Max-Age=2592000; SameSite=Lax`);
  res.json({ ok: true, user: publicUser(user) });
});

app.post('/api/logout', requireAuth, (req, res) => {
  const { db, token } = req.ctx;
  delete db.sessions[token];
  saveDB(db);
  res.setHeader('Set-Cookie', 'session=; HttpOnly; Path=/; Max-Age=0');
  res.json({ ok: true });
});

app.get('/api/me', (req, res) => {
  const ctx = currentUser(req);
  if (!ctx) return res.json({ user: null, paymentsMode: PAYMENTS_MODE });
  res.json({ user: publicUser(ctx.user), paymentsMode: PAYMENTS_MODE });
});

function publicUser(u) {
  const passed = Object.values(u.progress).filter((p) => p.passed).length;
  return {
    name: u.name,
    email: u.email,
    subscribed: u.subscribed,
    progress: u.progress,
    passedCount: passed,
    certificateReady: passed >= CERT_REQUIRED
  };
}

// ---------------------------------------------------------------- подписка
// Режим определяется PAYMENTS_MODE: demo (без ключей) / wayforpay / stripe.
app.post('/api/subscribe', requireAuth, async (req, res) => {
  const { db, user } = req.ctx;

  if (PAYMENTS_MODE === 'demo') {
    user.subscribed = true;
    user.subscribedAt = new Date().toISOString();
    saveDB(db);
    return res.json({ ok: true, mode: 'demo', user: publicUser(user) });
  }

  // WayForPay: отдаём фронту подписанные параметры для JS-виджета
  // (сама оплата проходит во всплывающем окне WayForPay, без редиректа).
  if (PAYMENTS_MODE === 'wayforpay') {
    const orderReference = `sub-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    const orderDate = Math.floor(Date.now() / 1000);
    const currency = 'USD';
    const productName = 'ML Simulator PRO — месячная подписка';

    const merchantSignature = wfpSign([
      WFP_MERCHANT_ACCOUNT, WFP_DOMAIN, orderReference, String(orderDate),
      PRICE_USD, currency, productName, '1', PRICE_USD,
    ]);

    const next = new Date();
    next.setMonth(next.getMonth() + 1);
    const dateNext = `${String(next.getDate()).padStart(2, '0')}.${String(next.getMonth() + 1).padStart(2, '0')}.${next.getFullYear()}`;

    db.wfpOrders = db.wfpOrders || {};
    db.wfpOrders[orderReference] = user.email;
    saveDB(db);

    return res.json({
      ok: true,
      mode: 'wayforpay',
      widget: {
        merchantAccount: WFP_MERCHANT_ACCOUNT,
        merchantDomainName: WFP_DOMAIN,
        merchantSignature,
        authorizationType: 'SimpleSignature',
        orderReference,
        orderDate,
        amount: PRICE_USD,
        currency,
        productName,
        productPrice: PRICE_USD,
        productCount: '1',
        clientEmail: user.email,
        clientFirstName: user.name,
        language: 'RU',
        regularMode: 'monthly',
        dateNext,
        serviceUrl: `${APP_URL}/api/wayforpay/webhook`,
      },
    });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
      customer: user.stripeCustomerId || undefined,
      customer_email: user.stripeCustomerId ? undefined : user.email,
      allow_promotion_codes: true,
      metadata: { email: user.email },
      subscription_data: { metadata: { email: user.email } },
      success_url: `${APP_URL}/app.html?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/app.html?checkout=cancel`,
    });
    res.json({ ok: true, mode: 'stripe', checkoutUrl: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err.message);
    res.status(502).json({ error: 'Не удалось создать сессию оплаты. Попробуйте позже.' });
  }
});

// Подтверждение после возврата со Stripe Checkout (страховка на случай,
// если вебхук ещё не долетел): проверяем оплату и активируем подписку.
app.get('/api/checkout/confirm', requireAuth, async (req, res) => {
  if (PAYMENTS_MODE === 'demo') return res.json({ ok: true, user: publicUser(req.ctx.user) });
  try {
    const session = await stripe.checkout.sessions.retrieve(String(req.query.session_id || ''));
    const paidForMe = session.payment_status === 'paid' &&
      (session.metadata && session.metadata.email) === req.ctx.user.email;
    if (!paidForMe) return res.status(400).json({ error: 'Оплата не подтверждена' });
    const { db, user } = req.ctx;
    user.subscribed = true;
    user.subscribedAt = user.subscribedAt || new Date().toISOString();
    user.stripeCustomerId = session.customer;
    user.stripeSubscriptionId = session.subscription;
    saveDB(db);
    res.json({ ok: true, user: publicUser(user) });
  } catch (err) {
    console.error('Stripe confirm error:', err.message);
    res.status(502).json({ error: 'Не удалось проверить оплату' });
  }
});

// Stripe Billing Portal: смена карты, отмена подписки — на стороне Stripe.
app.post('/api/billing-portal', requireAuth, async (req, res) => {
  if (PAYMENTS_MODE === 'demo' || !req.ctx.user.stripeCustomerId) {
    return res.status(400).json({ error: 'Портал доступен только при активной Stripe-подписке' });
  }
  try {
    const portal = await stripe.billingPortal.sessions.create({
      customer: req.ctx.user.stripeCustomerId,
      return_url: `${APP_URL}/app.html`,
    });
    res.json({ url: portal.url });
  } catch (err) {
    console.error('Stripe portal error:', err.message);
    res.status(502).json({ error: 'Не удалось открыть портал подписки' });
  }
});

// WayForPay: вебхук (serviceUrl) — сюда прилетает и первый платёж, и каждое
// последующее автосписание по regularMode. Проверяем подпись, активируем
// подписку и отвечаем в формате, который ждёт WayForPay (иначе он повторит
// вызов). Порядок полей подписи — из офиц. документации wiki.wayforpay.com.
app.post('/api/wayforpay/webhook', (req, res) => {
  const b = req.body || {};
  if (PAYMENTS_MODE !== 'wayforpay') return res.status(404).end();

  const expected = wfpSign([
    b.merchantAccount, b.orderReference, String(b.amount), b.currency,
    String(b.authCode || ''), b.cardPan || '', b.transactionStatus, String(b.reasonCode || ''),
  ]);
  if (expected !== b.merchantSignature) {
    console.error('WayForPay webhook: неверная подпись', b.orderReference);
    return res.status(400).json({ error: 'invalid signature' });
  }

  if (b.transactionStatus === 'Approved') {
    const db = loadDB();
    const email = db.wfpOrders && db.wfpOrders[b.orderReference];
    const user = email && db.users[email];
    if (user) {
      user.subscribed = true;
      user.subscribedAt = user.subscribedAt || new Date().toISOString();
      user.wfpOrderReference = b.orderReference; // нужен для отмены подписки
      saveDB(db);
      console.log(`WayForPay: подписка активирована для ${email}`);
    }
  } else if (['Declined', 'Expired', 'Refunded', 'Voided'].includes(b.transactionStatus)) {
    // регулярный платёж не прошёл (карта не сработала и т.п.) — не глушим,
    // просто логируем; повторную попытку WayForPay делает сам по расписанию
    console.log(`WayForPay: статус ${b.transactionStatus} по заказу ${b.orderReference}`);
  }

  const time = Math.floor(Date.now() / 1000);
  res.json({
    orderReference: b.orderReference,
    status: 'accept',
    time,
    signature: wfpSign([b.orderReference, 'accept', String(time)]),
  });
});

// Отмена регулярного платежа WayForPay — аналог Stripe Billing Portal,
// только без хостед-страницы: дёргаем их API управления подпиской напрямую.
app.post('/api/wayforpay/cancel', requireAuth, async (req, res) => {
  const { db, user } = req.ctx;
  if (PAYMENTS_MODE !== 'wayforpay' || !user.wfpOrderReference) {
    return res.status(400).json({ error: 'Нет активной подписки WayForPay для отмены' });
  }
  try {
    const resp = await fetch('https://api.wayforpay.com/regularApi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestType: 'REMOVE',
        merchantAccount: WFP_MERCHANT_ACCOUNT,
        merchantPassword: WFP_MERCHANT_PASSWORD,
        orderReference: user.wfpOrderReference,
      }),
    });
    const data = await resp.json().catch(() => ({}));
    user.subscribed = false;
    user.unsubscribedAt = new Date().toISOString();
    saveDB(db);
    res.json({ ok: true, user: publicUser(user), wfpReason: data.REASON || data.reason || null });
  } catch (err) {
    console.error('WayForPay cancel error:', err.message);
    res.status(502).json({ error: 'Не удалось отменить подписку. Попробуйте позже.' });
  }
});

// ---------------------------------------------------------------- модули
function moduleAccess(user, mod) {
  if (mod.order <= FREE_MODULES) return true;
  return !!(user && user.subscribed);
}

app.get('/api/modules', (req, res) => {
  const ctx = currentUser(req);
  const user = ctx ? ctx.user : null;
  const mods = localeModules(getLang(req));
  res.json({
    modules: mods.map((m) => ({
      id: m.id, order: m.order, title: m.title, subtitle: m.subtitle,
      level: m.level, tags: m.tags, free: m.order <= FREE_MODULES,
      unlocked: moduleAccess(user, m),
      progress: user ? user.progress[m.id] || null : null
    }))
  });
});

app.get('/api/module/:id', requireAuth, (req, res) => {
  const lang = getLang(req);
  const mod = localeModules(lang).find((m) => m.id === req.params.id);
  if (!mod) return res.status(404).json({ error: 'Модуль не найден' });
  if (!moduleAccess(req.ctx.user, mod)) {
    return res.status(402).json({ error: 'Модуль доступен по подписке', needSubscription: true });
  }
  const markdown = fs.readFileSync(moduleMarkdownPath(lang, mod.id), 'utf8');
  const quiz = (localeQuizzes(lang)[mod.id] || []).map((q, i) => ({ index: i, question: q.question, options: q.options }));
  res.json({
    module: { id: mod.id, order: mod.order, title: mod.title, subtitle: mod.subtitle, level: mod.level, tags: mod.tags },
    html: marked.parse(markdown),
    quiz
  });
});

// ---------------------------------------------------------------- квизы
app.post('/api/quiz/:id', requireAuth, (req, res) => {
  const lang = getLang(req);
  const mod = MODULES.find((m) => m.id === req.params.id);
  if (!mod) return res.status(404).json({ error: 'Модуль не найден' });
  if (!moduleAccess(req.ctx.user, mod)) return res.status(402).json({ error: 'Модуль доступен по подписке' });

  // порядок вопросов/вариантов и правильные индексы одинаковы во всех локалях;
  // локаль влияет только на текст объяснений
  const quiz = localeQuizzes(lang)[mod.id] || [];
  const answers = (req.body || {}).answers;
  if (!Array.isArray(answers) || answers.length !== quiz.length) {
    return res.status(400).json({ error: 'Ответьте на все вопросы' });
  }

  let correct = 0;
  const review = quiz.map((q, i) => {
    const ok = Number(answers[i]) === q.answer;
    if (ok) correct++;
    return { index: i, correct: ok, answer: q.answer, explanation: q.explanation };
  });

  const passed = correct / quiz.length >= PASS_SCORE;
  const { db, user } = req.ctx;
  const prev = user.progress[mod.id] || { attempts: 0 };
  user.progress[mod.id] = {
    score: correct, total: quiz.length, passed: passed || !!prev.passed,
    attempts: (prev.attempts || 0) + 1,
    passedAt: passed ? new Date().toISOString() : prev.passedAt || null
  };
  saveDB(db);

  res.json({ correct, total: quiz.length, passed, review, user: publicUser(user) });
});

// ---------------------------------------------------------------- собеседования
app.get('/api/interviews', requireAuth, (req, res) => {
  const user = req.ctx.user;
  const interviews = localeInterviews(getLang(req));
  res.json({
    tracks: interviews.tracks.map((t) => ({
      id: t.id, title: t.title, icon: t.icon, description: t.description,
      free: t.free, count: (interviews.questions[t.id] || []).length,
      unlocked: t.free || !!user.subscribed
    }))
  });
});

app.get('/api/interview/:track', requireAuth, (req, res) => {
  const interviews = localeInterviews(getLang(req));
  const track = interviews.tracks.find((t) => t.id === req.params.track);
  if (!track) return res.status(404).json({ error: 'Трек не найден' });
  if (!track.free && !req.ctx.user.subscribed) {
    return res.status(402).json({ error: 'Трек доступен по подписке', needSubscription: true });
  }
  res.json({
    track: { id: track.id, title: track.title, icon: track.icon, advice: track.advice },
    questions: interviews.questions[track.id] || []
  });
});

// ---------------------------------------------------------------- сертификат
app.get('/api/certificate', requireAuth, (req, res) => {
  const user = req.ctx.user;
  const passed = Object.values(user.progress).filter((p) => p.passed).length;
  if (passed < CERT_REQUIRED) {
    return res.status(403).json({ error: `Сертификат доступен после прохождения всех ${CERT_REQUIRED} модулей. Пройдено: ${passed}.` });
  }
  const certId = crypto.createHash('sha256').update(user.email + '|ml-simulator-cert').digest('hex').slice(0, 12).toUpperCase();
  res.json({
    name: user.name,
    email: user.email,
    certId,
    date: new Date().toISOString().slice(0, 10),
    modules: CERT_REQUIRED
  });
});

// ---------------------------------------------------------------- админка
// Смотровая площадка «кто зарегистрировался»: защищена HTTP Basic Auth по
// паролю из переменной окружения ADMIN_PASSWORD. Если она не задана, весь
// раздел /admin отключён (404) — так безопаснее, чем пускать всех по умолчанию.
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

function requireAdmin(req, res, next) {
  if (!ADMIN_PASSWORD) return res.status(404).end();

  const header = req.headers.authorization || '';
  const [scheme, encoded] = header.split(' ');
  const supplied = scheme === 'Basic' && encoded
    ? Buffer.from(encoded, 'base64').toString('utf8').split(':')[1] || ''
    : '';

  const a = Buffer.from(supplied);
  const b = Buffer.from(ADMIN_PASSWORD);
  const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
  if (!ok) {
    res.set('WWW-Authenticate', 'Basic realm="ML Simulator Admin"');
    return res.status(401).end();
  }
  next();
}

app.get('/admin', requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Только безопасные поля — без salt/hash паролей и без токенов сессий.
app.get('/api/admin/users', requireAdmin, (req, res) => {
  const db = loadDB();
  const users = Object.values(db.users).map((u) => {
    const passed = Object.values(u.progress || {}).filter((p) => p.passed).length;
    return {
      name: u.name,
      email: u.email,
      createdAt: u.createdAt || null,
      source: (u.source && u.source.utm_source) || null,
      subscribed: !!u.subscribed,
      subscribedAt: u.subscribedAt || null,
      passedCount: passed,
      certificateReady: passed >= CERT_REQUIRED,
    };
  }).sort((x, y) => new Date(y.createdAt || 0) - new Date(x.createdAt || 0));

  res.json({
    total: users.length,
    subscribed: users.filter((u) => u.subscribed).length,
    certified: users.filter((u) => u.certificateReady).length,
    users,
  });
});

app.listen(PORT, () => {
  console.log(`ML Career Simulator запущен: http://localhost:${PORT}`);
});
