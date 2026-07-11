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
const PAYMENTS_MODE = stripe && STRIPE_PRICE_ID ? 'stripe' : 'demo';

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const CONTENT_DIR = path.join(__dirname, 'content');

const MODULES = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, 'modules.json'), 'utf8'));
const QUIZZES = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, 'quizzes.json'), 'utf8'));
const INTERVIEWS = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, 'interviews.json'), 'utf8'));

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
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: 'Заполните имя, email и пароль' });
  if (password.length < 6) return res.status(400).json({ error: 'Пароль — минимум 6 символов' });
  const key = String(email).trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(key)) return res.status(400).json({ error: 'Некорректный email' });

  const db = loadDB();
  if (db.users[key]) return res.status(409).json({ error: 'Пользователь с таким email уже существует' });

  const { salt, hash } = hashPassword(password);
  db.users[key] = {
    name: String(name).trim(),
    email: key,
    salt, hash,
    subscribed: false,
    createdAt: new Date().toISOString(),
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
// Stripe-режим: создаём Checkout Session и отправляем пользователя на оплату.
// Демо-режим (ключи не заданы): подписка включается сразу, без списания.
app.post('/api/subscribe', requireAuth, async (req, res) => {
  const { db, user } = req.ctx;

  if (PAYMENTS_MODE === 'demo') {
    user.subscribed = true;
    user.subscribedAt = new Date().toISOString();
    saveDB(db);
    return res.json({ ok: true, mode: 'demo', user: publicUser(user) });
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

// ---------------------------------------------------------------- модули
function moduleAccess(user, mod) {
  if (mod.order <= FREE_MODULES) return true;
  return !!(user && user.subscribed);
}

app.get('/api/modules', (req, res) => {
  const ctx = currentUser(req);
  const user = ctx ? ctx.user : null;
  res.json({
    modules: MODULES.map((m) => ({
      id: m.id, order: m.order, title: m.title, subtitle: m.subtitle,
      level: m.level, tags: m.tags, free: m.order <= FREE_MODULES,
      unlocked: moduleAccess(user, m),
      progress: user ? user.progress[m.id] || null : null
    }))
  });
});

app.get('/api/module/:id', requireAuth, (req, res) => {
  const mod = MODULES.find((m) => m.id === req.params.id);
  if (!mod) return res.status(404).json({ error: 'Модуль не найден' });
  if (!moduleAccess(req.ctx.user, mod)) {
    return res.status(402).json({ error: 'Модуль доступен по подписке', needSubscription: true });
  }
  const mdPath = path.join(CONTENT_DIR, `${mod.id}.md`);
  const markdown = fs.readFileSync(mdPath, 'utf8');
  const quiz = (QUIZZES[mod.id] || []).map((q, i) => ({ index: i, question: q.question, options: q.options }));
  res.json({
    module: { id: mod.id, order: mod.order, title: mod.title, subtitle: mod.subtitle, level: mod.level, tags: mod.tags },
    html: marked.parse(markdown),
    quiz
  });
});

// ---------------------------------------------------------------- квизы
app.post('/api/quiz/:id', requireAuth, (req, res) => {
  const mod = MODULES.find((m) => m.id === req.params.id);
  if (!mod) return res.status(404).json({ error: 'Модуль не найден' });
  if (!moduleAccess(req.ctx.user, mod)) return res.status(402).json({ error: 'Модуль доступен по подписке' });

  const quiz = QUIZZES[mod.id] || [];
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
  res.json({
    tracks: INTERVIEWS.tracks.map((t) => ({
      id: t.id, title: t.title, icon: t.icon, description: t.description,
      free: t.free, count: (INTERVIEWS.questions[t.id] || []).length,
      unlocked: t.free || !!user.subscribed
    }))
  });
});

app.get('/api/interview/:track', requireAuth, (req, res) => {
  const track = INTERVIEWS.tracks.find((t) => t.id === req.params.track);
  if (!track) return res.status(404).json({ error: 'Трек не найден' });
  if (!track.free && !req.ctx.user.subscribed) {
    return res.status(402).json({ error: 'Трек доступен по подписке', needSubscription: true });
  }
  res.json({
    track: { id: track.id, title: track.title, icon: track.icon, advice: track.advice },
    questions: INTERVIEWS.questions[track.id] || []
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

app.listen(PORT, () => {
  console.log(`ML Career Simulator запущен: http://localhost:${PORT}`);
});
