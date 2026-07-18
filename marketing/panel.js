// Серверная часть маркетинговой админ-панели: REST API, OAuth-подключения
// соцсетей (редиректы на публичный домен — без localhost-боли), планировщик
// автопубликации/автогенерации и одноразовая миграция очереди из репозитория.
//
// Подключение из server.js:  require('./marketing/panel').mount(app, { requireAdmin, loadDB })

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const store = require('./credentials');
const { QUEUE_DIR, PUB_DIR } = store;

const APP_URL = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');

// ---------------------------------------------------------------- миграция

// Первый запуск на диске: переносим очередь и состояние ротации из репозитория
function migrateRepoQueue() {
  const repoQueue = path.join(__dirname, 'queue');
  try {
    store.ensureDirs();
    if (fs.readdirSync(QUEUE_DIR).length === 0 && fs.existsSync(repoQueue)) {
      for (const f of fs.readdirSync(repoQueue)) {
        fs.copyFileSync(path.join(repoQueue, f), path.join(QUEUE_DIR, f));
      }
      console.log(`[marketing] очередь мигрирована из репозитория (${fs.readdirSync(QUEUE_DIR).length} файлов)`);
    }
    const repoState = path.join(__dirname, 'state.json');
    if (!fs.existsSync(store.STATE_FILE) && fs.existsSync(repoState)) {
      fs.copyFileSync(repoState, store.STATE_FILE);
    }
  } catch (e) {
    console.error('[marketing] миграция очереди:', e.message);
  }
}

// ---------------------------------------------------------------- фоновая операция
// Генерация/публикация занимают до минут — HTTP-запрос возвращает jobId,
// панель опрашивает статус. Одна операция за раз.

let currentJob = null;

function startJob(kind, fn) {
  if (currentJob && currentJob.status === 'running') {
    throw new Error(`Уже выполняется операция «${currentJob.kind}» — дождитесь окончания`);
  }
  const job = { id: Date.now().toString(36), kind, status: 'running', log: [], startedAt: new Date().toISOString() };
  currentJob = job;
  const log = (m) => {
    job.log.push(String(m));
    if (job.log.length > 300) job.log.shift();
    console.log(`[marketing:${kind}]`, m);
  };
  Promise.resolve()
    .then(() => fn(log))
    .then((result) => { job.status = 'done'; job.result = result; })
    .catch((e) => { job.status = 'error'; job.error = e.message; console.error(`[marketing:${kind}]`, e); });
  return job.id;
}

// ---------------------------------------------------------------- планировщик

async function refreshThreadsToken() {
  const creds = store.platformCreds('threads');
  if (!creds || !creds.expiresAt) return;
  const daysLeft = (new Date(creds.expiresAt) - Date.now()) / 86400000;
  if (daysLeft > 10) return;
  const res = await fetch(`https://graph.threads.net/refresh_access_token?grant_type=th_refresh_token&access_token=${creds.accessToken}`);
  if (!res.ok) return console.error('[marketing] threads refresh:', await res.text());
  const data = await res.json();
  store.updateTokens('threads', {
    accessToken: data.access_token,
    expiresAt: new Date(Date.now() + (data.expires_in || 5184000) * 1000).toISOString(),
  });
  console.log('[marketing] Threads-токен продлён');
}

function isoWeek(d) {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  const y = t.getUTCFullYear();
  return `${y}-w${Math.ceil((((t - Date.UTC(y, 0, 1)) / 86400000) + 1) / 7)}`;
}

async function tick() {
  const cfg = store.loadConfig();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  if (cfg.autoPublish && now.getUTCHours() === cfg.publishHourUTC && cfg.lastPublishDate !== today) {
    cfg.lastPublishDate = today;
    store.saveConfig(cfg); // маркер до запуска — защита от повторов при падении
    console.log('[marketing] плановая публикация…');
    try {
      const { publishDue } = require('./publish');
      await publishDue({ log: (m) => console.log('[marketing]', m) });
    } catch (e) { console.error('[marketing] публикация:', e.message); }
    await refreshThreadsToken().catch(() => {});
  }

  const week = isoWeek(now);
  if (cfg.autoGenerate && now.getUTCDay() === cfg.generateDowUTC
      && now.getUTCHours() === cfg.generateHourUTC && cfg.lastGenerateWeek !== week) {
    cfg.lastGenerateWeek = week;
    store.saveConfig(cfg);
    console.log('[marketing] плановая генерация…');
    try {
      const { generateBatch } = require('./generate');
      await generateBatch(cfg.postsPerBatch, { reels: cfg.reelsPerBatch, log: (m) => console.log('[marketing]', m) });
    } catch (e) { console.error('[marketing] генерация:', e.message); }
  }
}

// ---------------------------------------------------------------- OAuth
// Все redirect'ы — на публичный домен приложения. state живёт 15 минут.

const oauthStates = new Map(); // state -> { net, verifier, created }

function newState(net, extra = {}) {
  const state = crypto.randomBytes(16).toString('hex');
  oauthStates.set(state, { net, created: Date.now(), ...extra });
  for (const [k, v] of oauthStates) if (Date.now() - v.created > 900000) oauthStates.delete(k);
  return state;
}

function redirectUri(net) {
  return `${APP_URL}/api/oauth/${net}/callback`;
}

function appCreds(net) {
  const a = store.loadCredentials().apps || {};
  return a[net] || null;
}

function b64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function getJSON(url, opts, what) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`${what}: HTTP ${res.status} ${await res.text()}`);
  return res.json();
}

const AUTHORIZE = {
  facebook(app) {
    const scope = 'pages_manage_posts,pages_read_engagement,pages_show_list,instagram_basic,instagram_content_publish';
    return `https://www.facebook.com/v23.0/dialog/oauth?client_id=${app.id}&redirect_uri=${encodeURIComponent(redirectUri('facebook'))}&scope=${scope}&response_type=code&state=`;
  },
  linkedin(app) {
    const scope = encodeURIComponent('openid profile w_member_social');
    return `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${app.id}&redirect_uri=${encodeURIComponent(redirectUri('linkedin'))}&scope=${scope}&state=`;
  },
  tiktok(app) {
    const scope = encodeURIComponent('user.info.basic,video.publish');
    return `https://www.tiktok.com/v2/auth/authorize/?client_key=${app.id}&scope=${scope}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri('tiktok'))}&state=`;
  },
  threads(app) {
    const scope = encodeURIComponent('threads_basic,threads_content_publish');
    return `https://threads.net/oauth/authorize?client_id=${app.id}&redirect_uri=${encodeURIComponent(redirectUri('threads'))}&scope=${scope}&response_type=code&state=`;
  },
  x(app, extra) {
    const scope = encodeURIComponent('tweet.read tweet.write users.read offline.access');
    return `https://x.com/i/oauth2/authorize?response_type=code&client_id=${app.id}&redirect_uri=${encodeURIComponent(redirectUri('x'))}&scope=${scope}&code_challenge=${extra.challenge}&code_challenge_method=S256&state=`;
  },
};

// Обмен кода на токены + сохранение. Возвращает html-сообщение об успехе.
const EXCHANGE = {
  async facebook(app, code) {
    const short = await getJSON(
      `https://graph.facebook.com/v23.0/oauth/access_token?client_id=${app.id}&client_secret=${app.secret}&redirect_uri=${encodeURIComponent(redirectUri('facebook'))}&code=${code}`,
      {}, 'FB обмен code');
    const long = await getJSON(
      `https://graph.facebook.com/v23.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${app.id}&client_secret=${app.secret}&fb_exchange_token=${short.access_token}`,
      {}, 'FB long-lived');
    const pages = await getJSON(`https://graph.facebook.com/v23.0/me/accounts?access_token=${long.access_token}`, {}, 'FB страницы');
    if (!pages.data.length) {
      throw new Error('Facebook не выдал доступ ни к одной странице. В диалоге Meta нажмите «Edit settings» и отметьте страницу.');
    }
    // Одна страница — подключаем сразу; несколько — берём первую (сменить можно переподключением)
    const page = pages.data[0];
    let ig = null;
    try {
      const r = await getJSON(
        `https://graph.facebook.com/v23.0/${page.id}?fields=instagram_business_account{id,username}&access_token=${page.access_token}`,
        {}, 'FB→IG');
      ig = r.instagram_business_account || null;
    } catch {}
    store.updateTokens('facebook', {
      pageId: page.id,
      pageName: page.name,
      pageToken: page.access_token,
      igUserId: ig ? ig.id : null,
      igUsername: ig ? ig.username : null,
      obtainedAt: new Date().toISOString(),
    });
    return `Facebook подключён: страница «${page.name}»${ig ? ` + Instagram @${ig.username}` : ' (Instagram к странице не привязан)'}`;
  },

  async linkedin(app, code) {
    const tok = await getJSON('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code', code,
        redirect_uri: redirectUri('linkedin'),
        client_id: app.id, client_secret: app.secret,
      }),
    }, 'LinkedIn обмен code');
    const me = await getJSON('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${tok.access_token}` },
    }, 'LinkedIn userinfo');
    store.updateTokens('linkedin', {
      accessToken: tok.access_token,
      personUrn: `urn:li:person:${me.sub}`,
      issuedAt: new Date().toISOString(),
    });
    return `LinkedIn подключён: ${me.name || me.sub} (токен живёт ~60 дней)`;
  },

  async tiktok(app, code) {
    const tok = await getJSON('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: app.id, client_secret: app.secret,
        grant_type: 'authorization_code', code,
        redirect_uri: redirectUri('tiktok'),
      }),
    }, 'TikTok обмен code');
    if (!tok.access_token) throw new Error('TikTok не вернул токен: ' + JSON.stringify(tok));
    store.updateTokens('tiktok', {
      refreshToken: tok.refresh_token,
      openId: tok.open_id,
      obtainedAt: new Date().toISOString(),
    });
    return 'TikTok подключён (refresh-токен живёт ~365 дней). До аудита приложения посты будут приватными.';
  },

  async threads(app, code) {
    const short = await getJSON('https://graph.threads.net/oauth/access_token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: app.id, client_secret: app.secret,
        grant_type: 'authorization_code', code,
        redirect_uri: redirectUri('threads'),
      }),
    }, 'Threads обмен code');
    const long = await getJSON(
      `https://graph.threads.net/access_token?grant_type=th_exchange_token&client_secret=${app.secret}&access_token=${short.access_token}`,
      {}, 'Threads long-lived');
    const me = await getJSON(
      `https://graph.threads.net/v1.0/me?fields=id,username&access_token=${long.access_token}`,
      {}, 'Threads me');
    store.updateTokens('threads', {
      accessToken: long.access_token,
      userId: me.id,
      username: me.username,
      expiresAt: new Date(Date.now() + (long.expires_in || 5184000) * 1000).toISOString(),
    });
    return `Threads подключён: @${me.username} (токен продлевается автоматически)`;
  },

  async x(app, code, extra) {
    const headers = { 'content-type': 'application/x-www-form-urlencoded' };
    if (app.secret) headers.Authorization = 'Basic ' + Buffer.from(`${app.id}:${app.secret}`).toString('base64');
    const tok = await getJSON('https://api.x.com/2/oauth2/token', {
      method: 'POST',
      headers,
      body: new URLSearchParams({
        grant_type: 'authorization_code', code,
        client_id: app.id,
        redirect_uri: redirectUri('x'),
        code_verifier: extra.verifier,
      }),
    }, 'X обмен code');
    let username = null;
    try {
      const me = await getJSON('https://api.x.com/2/users/me', {
        headers: { Authorization: `Bearer ${tok.access_token}` },
      }, 'X me');
      username = me.data && me.data.username;
    } catch {}
    store.updateTokens('x', {
      accessToken: tok.access_token,
      refreshToken: tok.refresh_token,
      expiresAt: new Date(Date.now() + (tok.expires_in || 7200) * 1000).toISOString(),
      username,
    });
    return `X подключён${username ? `: @${username}` : ''}`;
  },
};

function oauthResultPage(ok, message) {
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  return `<!DOCTYPE html><meta charset="utf-8">
<body style="font-family:sans-serif;background:#0b1020;color:#e8ecf8;display:grid;place-items:center;min-height:90vh">
<div style="max-width:640px;text-align:center">
<h2>${ok ? '✅' : '❌'} ${esc(message)}</h2>
<p style="color:#93a0c4">Вкладку можно закрыть — вернитесь в панель и обновите раздел «Подключения».</p>
</div></body>`;
}

// ---------------------------------------------------------------- REST API

function listPosts() {
  if (!fs.existsSync(QUEUE_DIR)) return [];
  return fs.readdirSync(QUEUE_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      const p = JSON.parse(fs.readFileSync(path.join(QUEUE_DIR, f), 'utf8'));
      return {
        ...p,
        hasImage: !!(p.image && fs.existsSync(path.join(QUEUE_DIR, p.image))),
        hasVideo: !!(p.video && fs.existsSync(path.join(QUEUE_DIR, p.video))),
      };
    })
    .sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor) || a.id.localeCompare(b.id));
}

function mount(app, { requireAdmin, loadDB }) {
  migrateRepoQueue();
  setInterval(() => tick().catch((e) => console.error('[marketing] tick:', e.message)), 60000);

  const { platformStatus, publishDue, publishOne, PLATFORMS } = require('./publish');

  // страница панели
  app.get('/admin/marketing', requireAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'admin-marketing.html'));
  });

  // публичные медиа для Threads (не угадываемые имена-хэши)
  app.get('/m/:file', (req, res) => {
    const f = path.join(PUB_DIR, path.basename(req.params.file));
    if (!fs.existsSync(f)) return res.status(404).end();
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.sendFile(f);
  });

  // медиа очереди для предпросмотра в панели
  app.get('/admin/marketing/media/:file', requireAdmin, (req, res) => {
    const f = path.join(QUEUE_DIR, path.basename(req.params.file));
    if (!fs.existsSync(f)) return res.status(404).end();
    res.sendFile(f);
  });

  app.get('/api/admin/marketing/queue', requireAdmin, (req, res) => {
    res.json({ posts: listPosts(), networks: platformStatus(), config: store.loadConfig() });
  });

  app.put('/api/admin/marketing/post/:id', requireAdmin, (req, res) => {
    const file = path.join(QUEUE_DIR, `${path.basename(req.params.id)}.json`);
    if (!fs.existsSync(file)) return res.status(404).json({ error: 'Пост не найден' });
    const post = JSON.parse(fs.readFileSync(file, 'utf8'));
    const b = req.body || {};
    if (b.texts && typeof b.texts === 'object') {
      for (const k of ['facebook', 'instagram', 'linkedin', 'tiktok', 'threads', 'x']) {
        if (typeof b.texts[k] === 'string') post.texts[k] = b.texts[k];
      }
    }
    if (typeof b.scheduledFor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(b.scheduledFor)) {
      post.scheduledFor = b.scheduledFor;
    }
    if (b.format === 'reel') post.format = 'reel';
    if (b.format === 'post') delete post.format;
    fs.writeFileSync(file, JSON.stringify(post, null, 2));
    res.json({ ok: true, post });
  });

  app.delete('/api/admin/marketing/post/:id', requireAdmin, (req, res) => {
    const id = path.basename(req.params.id);
    const file = path.join(QUEUE_DIR, `${id}.json`);
    if (!fs.existsSync(file)) return res.status(404).json({ error: 'Пост не найден' });
    for (const ext of ['.json', '.png', '.mp4']) {
      try { fs.unlinkSync(path.join(QUEUE_DIR, `${id}${ext}`)); } catch {}
    }
    res.json({ ok: true });
  });

  app.post('/api/admin/marketing/generate', requireAdmin, (req, res) => {
    const b = req.body || {};
    try {
      const { generateBatch, generateSpecial } = require('./generate');
      const jobId = startJob(b.mode === 'batch' ? 'генерация пачки' : 'генерация поста', async (log) => {
        if (b.mode === 'batch') {
          const cfg = store.loadConfig();
          const posts = await generateBatch(Number(b.count) || cfg.postsPerBatch, {
            reels: Number(b.reels ?? cfg.reelsPerBatch),
            offline: !!b.offline,
            log,
          });
          return { postIds: posts.map((p) => p.id) };
        }
        const post = await generateSpecial({
          topicId: b.topicId || undefined,
          customTopic: b.customTopic || undefined,
          audience: b.audience || 'beginner',
          format: b.format === 'reel' ? 'reel' : 'post',
          offline: !!b.offline,
          log,
        });
        return { postIds: [post.id] };
      });
      res.json({ jobId });
    } catch (e) {
      res.status(409).json({ error: e.message });
    }
  });

  app.post('/api/admin/marketing/publish', requireAdmin, (req, res) => {
    const b = req.body || {};
    try {
      const jobId = startJob('публикация', async (log) => {
        if (b.postId) return publishOne(b.postId, { platforms: b.platforms || PLATFORMS, log });
        return publishDue({ platforms: b.platforms || PLATFORMS, log });
      });
      res.json({ jobId });
    } catch (e) {
      res.status(409).json({ error: e.message });
    }
  });

  app.get('/api/admin/marketing/job', requireAdmin, (req, res) => {
    res.json(currentJob || { status: 'idle' });
  });

  app.get('/api/admin/marketing/topics', requireAdmin, (req, res) => {
    const { topics } = require('./generate');
    const state = (() => { try { return JSON.parse(fs.readFileSync(store.STATE_FILE, 'utf8')); } catch { return { used: {} }; } })();
    const used = (state.used && state.used.audience) || [];
    res.json({ topics: topics.map((t) => ({ ...t, used: used.includes(t.id) })) });
  });

  app.get('/api/admin/marketing/networks', requireAdmin, (req, res) => {
    const creds = store.loadCredentials();
    const status = platformStatus();
    for (const [net, s] of Object.entries(status)) {
      const appNet = net === 'instagram' ? 'facebook' : net;
      s.appConfigured = !!(creds.apps && creds.apps[appNet] && creds.apps[appNet].id);
    }
    res.json({ networks: status, redirectUris: Object.fromEntries(['facebook', 'linkedin', 'tiktok', 'threads', 'x'].map((n) => [n, redirectUri(n)])) });
  });

  app.post('/api/admin/marketing/networks/:net/credentials', requireAdmin, (req, res) => {
    const net = req.params.net;
    if (!AUTHORIZE[net]) return res.status(400).json({ error: 'Неизвестная сеть' });
    const { id, secret } = req.body || {};
    if (!id) return res.status(400).json({ error: 'Нужен client id / app id' });
    const c = store.loadCredentials();
    c.apps = c.apps || {};
    c.apps[net] = { id: String(id).trim(), secret: String(secret || '').trim() };
    store.saveCredentials(c);
    res.json({ ok: true });
  });

  app.post('/api/admin/marketing/networks/:net/disconnect', requireAdmin, (req, res) => {
    const c = store.loadCredentials();
    if (c.tokens) delete c.tokens[req.params.net === 'instagram' ? 'facebook' : req.params.net];
    store.saveCredentials(c);
    res.json({ ok: true });
  });

  app.get('/api/admin/marketing/connect/:net', requireAdmin, (req, res) => {
    const net = req.params.net;
    const make = AUTHORIZE[net];
    if (!make) return res.status(400).send('Неизвестная сеть');
    const appc = appCreds(net);
    if (!appc) return res.status(400).send('Сначала сохраните App ID/Secret этой сети в панели');
    let extra = {};
    if (net === 'x') {
      const verifier = b64url(crypto.randomBytes(32));
      extra = { verifier, challenge: b64url(crypto.createHash('sha256').update(verifier).digest()) };
    }
    const state = newState(net, extra);
    res.redirect(make(appc, extra) + state);
  });

  app.get('/api/oauth/:net/callback', async (req, res) => {
    const net = req.params.net;
    try {
      const st = oauthStates.get(String(req.query.state || ''));
      if (!st || st.net !== net) throw new Error('state не совпал — начните подключение заново из панели');
      oauthStates.delete(String(req.query.state));
      if (req.query.error) throw new Error(String(req.query.error_description || req.query.error));
      const code = String(req.query.code || '');
      if (!code) throw new Error('код авторизации не получен');
      const message = await EXCHANGE[net](appCreds(net), decodeURIComponent(code), st);
      res.type('html').send(oauthResultPage(true, message));
    } catch (e) {
      res.type('html').send(oauthResultPage(false, `${net}: ${e.message.slice(0, 500)}`));
    }
  });

  app.get('/api/admin/marketing/settings', requireAdmin, (req, res) => {
    const cfg = store.loadConfig();
    res.json({ config: cfg, anthropicKeySet: !!store.anthropicKey() });
  });

  app.post('/api/admin/marketing/settings', requireAdmin, (req, res) => {
    const b = req.body || {};
    const cfg = store.loadConfig();
    for (const k of ['publishHourUTC', 'generateHourUTC', 'generateDowUTC', 'postsPerBatch', 'reelsPerBatch']) {
      if (b[k] !== undefined && Number.isFinite(Number(b[k]))) cfg[k] = Number(b[k]);
    }
    for (const k of ['autoPublish', 'autoGenerate']) {
      if (typeof b[k] === 'boolean') cfg[k] = b[k];
    }
    if (b.enabled && typeof b.enabled === 'object') cfg.enabled = { ...cfg.enabled, ...b.enabled };
    store.saveConfig(cfg);
    if (typeof b.anthropicKey === 'string' && b.anthropicKey.trim()) {
      const c = store.loadCredentials();
      c.anthropicKey = b.anthropicKey.trim();
      store.saveCredentials(c);
    }
    res.json({ ok: true, config: store.loadConfig() });
  });

  // Статистика: откуда приходят регистрации (utm первого касания)
  app.get('/api/admin/marketing/stats', requireAdmin, (req, res) => {
    const db = loadDB();
    const bySource = {};
    const byPost = {};
    for (const u of Object.values(db.users || {})) {
      const src = (u.source && u.source.utm_source) || 'прямые/органика';
      bySource[src] = bySource[src] || { total: 0, subscribed: 0 };
      bySource[src].total++;
      if (u.subscribed) bySource[src].subscribed++;
      const content = u.source && u.source.utm_content;
      if (content) byPost[content] = (byPost[content] || 0) + 1;
    }
    const published = listPosts()
      .filter((p) => Object.keys(p.published).length)
      .map((p) => ({ id: p.id, rubric: p.rubric, format: p.format || 'post', published: p.published, signups: byPost[p.id] || 0 }))
      .sort((a, b) => b.id.localeCompare(a.id))
      .slice(0, 30);
    res.json({ bySource, published });
  });

  console.log(`[marketing] панель: ${APP_URL}/admin/marketing`);
}

module.exports = { mount };
