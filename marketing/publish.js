#!/usr/bin/env node
// Публикация постов из очереди в соцсети: Facebook (страница, посты и Reels),
// Instagram (посты и Reels), LinkedIn (профиль), TikTok, Threads, X.
// Используется сервером (планировщик и админ-панель) и как CLI:
//
//   node marketing/publish.js [--platform <net>] [--dry-run]
//
// Креды — из панели (credentials.json), env-переменные — запасной путь.
// Платформы без кредов пропускаются (можно включать по одной).

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const store = require('./credentials');

const { QUEUE_DIR, PUB_DIR } = store;
const LINKEDIN_VERSION = process.env.LINKEDIN_VERSION || '202506';
const APP_URL = process.env.APP_URL || 'https://ml-simulator-app-production.up.railway.app';

// instagram идёт после facebook: картинку для него берём из FB-поста (публичный CDN)
const PLATFORMS = ['facebook', 'instagram', 'linkedin', 'tiktok', 'threads', 'x'];

function configured(platform) {
  return !!store.platformCreds(platform);
}

// Статус подключений для панели
function platformStatus() {
  const config = store.loadConfig();
  const out = {};
  for (const p of PLATFORMS) {
    const creds = store.platformCreds(p);
    out[p] = {
      configured: !!creds,
      enabled: config.enabled[p] !== false,
      detail: creds ? connectionDetail(p, creds) : null,
    };
  }
  return out;
}

function connectionDetail(p, creds) {
  const days = (iso) => (iso ? Math.max(0, Math.round((new Date(iso) - Date.now()) / 86400000)) : null);
  switch (p) {
    case 'facebook': return { account: creds.pageName || creds.pageId };
    case 'instagram': return { account: creds.igUsername || creds.igUserId };
    case 'linkedin': {
      const issued = creds.issuedAt ? Math.floor((Date.now() - new Date(creds.issuedAt)) / 86400000) : null;
      return { account: creds.personUrn, tokenDaysLeft: issued === null ? null : Math.max(0, 60 - issued) };
    }
    case 'tiktok': return { account: 'TikTok' };
    case 'threads': return { account: creds.username || creds.userId, tokenDaysLeft: days(creds.expiresAt) };
    case 'x': return { account: creds.username || 'X' };
    default: return {};
  }
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function loadQueue() {
  if (!fs.existsSync(QUEUE_DIR)) return [];
  return fs
    .readdirSync(QUEUE_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => ({ file: path.join(QUEUE_DIR, f), post: JSON.parse(fs.readFileSync(path.join(QUEUE_DIR, f), 'utf8')) }))
    .sort((a, b) => a.post.scheduledFor.localeCompare(b.post.scheduledFor));
}

// Пост дня для платформы: дата наступила, ещё не публиковался туда.
// Для TikTok нужен собранный mp4 — посты без видео пропускаем.
function nextFor(queue, platform) {
  return queue.find((q) =>
    q.post.scheduledFor <= today() &&
    !q.post.published[platform] &&
    (platform !== 'tiktok' || (q.post.video && fs.existsSync(path.join(QUEUE_DIR, q.post.video)))));
}

async function apiCheck(res, what) {
  if (!res.ok) throw new Error(`${what}: HTTP ${res.status} ${await res.text()}`);
  return res;
}

// Публичный URL для медиа очереди (нужен Threads): копия файла под случайным
// именем в PUB_DIR, отдаётся сервером по /m/<имя> без авторизации.
function publicMediaUrl(file) {
  const src = path.join(QUEUE_DIR, file);
  const name = crypto.createHash('sha256').update(fs.readFileSync(src)).digest('hex').slice(0, 24) + path.extname(file);
  const dst = path.join(PUB_DIR, name);
  if (!fs.existsSync(dst)) fs.copyFileSync(src, dst);
  return `${APP_URL}/m/${name}`;
}

// ---------- Facebook: фото + текст на страницу (или Reels, если format:'reel') ----------

async function publishFacebook(post) {
  const creds = store.platformCreds('facebook');
  if (!creds) throw new Error('Facebook не подключён');
  const { pageId, pageToken: token } = creds;

  if (post.format === 'reel' && post.video) return publishFacebookReel(post, pageId, token);

  const form = new FormData();
  form.append('message', post.texts.facebook);
  form.append('access_token', token);
  form.append('source', new Blob([fs.readFileSync(path.join(QUEUE_DIR, post.image))], { type: 'image/png' }), post.image);

  const res = await apiCheck(
    await fetch(`https://graph.facebook.com/v23.0/${pageId}/photos`, { method: 'POST', body: form }),
    'Facebook /photos'
  );
  const data = await res.json();
  // photoId нужен Instagram-ветке как источник публичного URL картинки
  return { id: data.post_id || data.id, photoId: data.id };
}

// Facebook Reels: start → бинарная загрузка на rupload → finish (PUBLISHED)
async function publishFacebookReel(post, pageId, token) {
  const video = fs.readFileSync(path.join(QUEUE_DIR, post.video));

  const start = await (await apiCheck(
    await fetch(`https://graph.facebook.com/v23.0/${pageId}/video_reels`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ upload_phase: 'start', access_token: token }),
    }),
    'FB Reels start'
  )).json();

  await apiCheck(
    await fetch(start.upload_url, {
      method: 'POST',
      headers: { Authorization: `OAuth ${token}`, offset: '0', file_size: String(video.length) },
      body: video,
    }),
    'FB Reels upload'
  );

  const fin = await (await apiCheck(
    await fetch(`https://graph.facebook.com/v23.0/${pageId}/video_reels?upload_phase=finish&video_id=${start.video_id}&video_state=PUBLISHED&description=${encodeURIComponent(post.texts.facebook)}&access_token=${token}`, { method: 'POST' }),
    'FB Reels finish'
  )).json();
  if (!fin.success) throw new Error(`FB Reels finish: ${JSON.stringify(fin)}`);
  return { id: start.video_id, reel: true };
}

// ---------- Instagram: тем же Meta-приложением ----------
// Посты: картинка из FB-поста (Content Publishing API принимает только публичный
// image_url, CDN Facebook подходит) — поэтому Instagram идёт ПОСЛЕ Facebook.
// Reels: resumable-загрузка напрямую.

async function igWaitContainer(containerId, token, tries = 40) {
  for (let i = 0; i < tries; i++) {
    const st = await (await apiCheck(
      await fetch(`https://graph.facebook.com/v23.0/${containerId}?fields=status_code&access_token=${token}`),
      'Instagram container status'
    )).json();
    if (st.status_code === 'FINISHED') return;
    if (st.status_code === 'ERROR') throw new Error('Instagram не смог обработать медиа (status ERROR)');
    await new Promise((r) => setTimeout(r, 3000));
  }
}

async function igPublish(igUser, containerId, token) {
  const pub = await (await apiCheck(
    await fetch(`https://graph.facebook.com/v23.0/${igUser}/media_publish`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ creation_id: containerId, access_token: token }),
    }),
    'Instagram media_publish'
  )).json();
  return pub.id;
}

async function publishInstagramReel(post, creds) {
  const { pageToken: token, igUserId: igUser } = creds;
  const video = fs.readFileSync(path.join(QUEUE_DIR, post.video));

  const container = await (await apiCheck(
    await fetch(`https://graph.facebook.com/v23.0/${igUser}/media`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        media_type: 'REELS',
        upload_type: 'resumable',
        caption: post.texts.instagram || post.texts.tiktok || '',
        access_token: token,
      }),
    }),
    'IG Reels container'
  )).json();

  await apiCheck(
    await fetch(container.uri || `https://rupload.facebook.com/ig-api-upload/v23.0/${container.id}`, {
      method: 'POST',
      headers: { Authorization: `OAuth ${token}`, offset: '0', file_size: String(video.length) },
      body: video,
    }),
    'IG Reels upload'
  );

  await igWaitContainer(container.id, token);
  return { id: await igPublish(igUser, container.id, token), reel: true };
}

async function publishInstagram(post) {
  const creds = store.platformCreds('instagram');
  if (!creds) throw new Error('Instagram не подключён');
  if (post.format === 'reel' && post.video) return publishInstagramReel(post, creds);

  const { pageToken: token, igUserId: igUser } = creds;
  const fb = post.published.facebook;
  if (!fb || !(fb.photoId || fb.id)) throw new Error('сначала пост должен выйти в Facebook (источник картинки)');

  let imageUrl;
  if (fb.photoId) {
    const photo = await (await apiCheck(
      await fetch(`https://graph.facebook.com/v23.0/${fb.photoId}?fields=images&access_token=${token}`),
      'Facebook photo url'
    )).json();
    imageUrl = photo.images && photo.images[0] && photo.images[0].source;
  } else {
    // старые записи без photoId: берём картинку прямо из поста
    const p = await (await apiCheck(
      await fetch(`https://graph.facebook.com/v23.0/${fb.id}?fields=full_picture&access_token=${token}`),
      'Facebook post picture'
    )).json();
    imageUrl = p.full_picture;
  }
  if (!imageUrl) throw new Error('не удалось получить URL картинки из FB-поста');

  const caption = post.texts.instagram
    || post.texts.facebook.replace(/utm_source=facebook/g, 'utm_source=instagram');

  const container = await (await apiCheck(
    await fetch(`https://graph.facebook.com/v23.0/${igUser}/media`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ image_url: imageUrl, caption, access_token: token }),
    }),
    'Instagram /media'
  )).json();

  await igWaitContainer(container.id, token, 15);
  return igPublish(igUser, container.id, token);
}

// ---------- LinkedIn: загрузка картинки + пост от имени профиля ----------

async function publishLinkedin(post) {
  const creds = store.platformCreds('linkedin');
  if (!creds) throw new Error('LinkedIn не подключён');
  const liHeaders = (extra = {}) => ({
    Authorization: `Bearer ${creds.accessToken}`,
    'LinkedIn-Version': LINKEDIN_VERSION,
    'X-Restli-Protocol-Version': '2.0.0',
    ...extra,
  });

  const init = await apiCheck(
    await fetch('https://api.linkedin.com/rest/images?action=initializeUpload', {
      method: 'POST',
      headers: liHeaders({ 'content-type': 'application/json' }),
      body: JSON.stringify({ initializeUploadRequest: { owner: creds.personUrn } }),
    }),
    'LinkedIn initializeUpload'
  );
  const { value } = await init.json();

  await apiCheck(
    await fetch(value.uploadUrl, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${creds.accessToken}` },
      body: fs.readFileSync(path.join(QUEUE_DIR, post.image)),
    }),
    'LinkedIn image PUT'
  );

  const res = await apiCheck(
    await fetch('https://api.linkedin.com/rest/posts', {
      method: 'POST',
      headers: liHeaders({ 'content-type': 'application/json' }),
      body: JSON.stringify({
        author: creds.personUrn,
        commentary: post.texts.linkedin,
        visibility: 'PUBLIC',
        distribution: { feedDistribution: 'MAIN_FEED', targetEntities: [], thirdPartyDistributionChannels: [] },
        content: { media: { id: value.image, altText: post.card.headline || 'ML Career Simulator' } },
        lifecycleState: 'PUBLISHED',
        isReshareDisabledByAuthor: false,
      }),
    }),
    'LinkedIn /rest/posts'
  );
  return res.headers.get('x-restli-id') || res.headers.get('x-linkedin-id') || 'ok';
}

// ---------- TikTok: Direct Post (FILE_UPLOAD) ----------
// Access-токен живёт 24 часа — обновляем при каждом запуске по refresh-токену
// (тот живёт 365 дней; при ротации сохраняем новый). До аудита приложения TikTok
// разрешает только SELF_ONLY — берём максимально открытый уровень из creator_info.

async function tiktokAccessToken(creds) {
  const res = await apiCheck(
    await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: creds.clientKey,
        client_secret: creds.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: creds.refreshToken,
      }),
    }),
    'TikTok oauth/token'
  );
  const data = await res.json();
  if (!data.access_token) throw new Error(`TikTok oauth/token: ${JSON.stringify(data)}`);
  if (data.refresh_token && data.refresh_token !== creds.refreshToken) {
    store.updateTokens('tiktok', { refreshToken: data.refresh_token });
  }
  return data.access_token;
}

async function tiktokJSON(url, token, body, what) {
  const res = await apiCheck(
    await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json; charset=UTF-8' },
      body: JSON.stringify(body || {}),
    }),
    what
  );
  const data = await res.json();
  if (data.error && data.error.code !== 'ok') throw new Error(`${what}: ${JSON.stringify(data.error)}`);
  return data.data;
}

async function publishTiktok(post) {
  const creds = store.platformCreds('tiktok');
  if (!creds) throw new Error('TikTok не подключён');
  const token = await tiktokAccessToken(creds);

  const creator = await tiktokJSON(
    'https://open.tiktokapis.com/v2/post/publish/creator_info/query/', token, {}, 'TikTok creator_info');
  const levels = creator.privacy_level_options || [];
  const privacy = levels.includes('PUBLIC_TO_EVERYONE') ? 'PUBLIC_TO_EVERYONE'
    : levels.includes('EVERYONE') ? 'EVERYONE' : 'SELF_ONLY';
  if (privacy === 'SELF_ONLY') {
    console.warn('TikTok-приложение ещё не прошло аудит — видео публикуется приватно (SELF_ONLY)');
  }

  const video = fs.readFileSync(path.join(QUEUE_DIR, post.video));
  const init = await tiktokJSON('https://open.tiktokapis.com/v2/post/publish/video/init/', token, {
    post_info: {
      title: post.texts.tiktok || post.card.headline,
      privacy_level: privacy,
      disable_comment: false,
      disable_duet: false,
      disable_stitch: false,
    },
    source_info: {
      source: 'FILE_UPLOAD',
      video_size: video.length,
      chunk_size: video.length,
      total_chunk_count: 1,
    },
  }, 'TikTok video/init');

  await apiCheck(
    await fetch(init.upload_url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Range': `bytes 0-${video.length - 1}/${video.length}`,
      },
      body: video,
    }),
    'TikTok video upload'
  );
  return init.publish_id;
}

// ---------- Threads: контейнер (TEXT/IMAGE/VIDEO) → publish ----------
// Медиа нужен публичный URL — отдаём свой файл через /m/<hash>.

async function publishThreads(post) {
  const creds = store.platformCreds('threads');
  if (!creds) throw new Error('Threads не подключён');
  const { accessToken: token, userId } = creds;

  const body = { access_token: token, text: post.texts.threads || post.texts.facebook };
  if (post.format === 'reel' && post.video) {
    body.media_type = 'VIDEO';
    body.video_url = publicMediaUrl(post.video);
  } else if (post.image && fs.existsSync(path.join(QUEUE_DIR, post.image))) {
    body.media_type = 'IMAGE';
    body.image_url = publicMediaUrl(post.image);
  } else {
    body.media_type = 'TEXT';
  }

  const container = await (await apiCheck(
    await fetch(`https://graph.threads.net/v1.0/${userId}/threads`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
    'Threads container'
  )).json();

  // видео обрабатывается асинхронно; картинки обычно мгновенно
  for (let i = 0; i < 30; i++) {
    const st = await (await apiCheck(
      await fetch(`https://graph.threads.net/v1.0/${container.id}?fields=status&access_token=${token}`),
      'Threads container status'
    )).json();
    if (!st.status || st.status === 'FINISHED') break;
    if (st.status === 'ERROR') throw new Error('Threads не смог обработать медиа');
    await new Promise((r) => setTimeout(r, 3000));
  }

  const pub = await (await apiCheck(
    await fetch(`https://graph.threads.net/v1.0/${userId}/threads_publish`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ creation_id: container.id, access_token: token }),
    }),
    'Threads publish'
  )).json();
  return pub.id;
}

// ---------- X: OAuth2 PKCE, refresh-токены ротируются при каждом обновлении ----------

async function xAccessToken(creds) {
  // живой access-токен ещё действует минимум 5 минут — используем его
  if (creds.accessToken && creds.expiresAt && new Date(creds.expiresAt) - Date.now() > 300000) {
    return creds.accessToken;
  }
  const headers = { 'content-type': 'application/x-www-form-urlencoded' };
  if (creds.clientSecret) {
    headers.Authorization = 'Basic ' + Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString('base64');
  }
  const res = await apiCheck(
    await fetch('https://api.x.com/2/oauth2/token', {
      method: 'POST',
      headers,
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: creds.refreshToken,
        client_id: creds.clientId,
      }),
    }),
    'X oauth2/token'
  );
  const data = await res.json();
  if (!data.access_token) throw new Error(`X oauth2/token: ${JSON.stringify(data)}`);
  // X ротирует refresh-токен при каждом обновлении — обязательно сохраняем
  store.updateTokens('x', {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || creds.refreshToken,
    expiresAt: new Date(Date.now() + (data.expires_in || 7200) * 1000).toISOString(),
  });
  return data.access_token;
}

async function publishX(post) {
  const creds = store.platformCreds('x');
  if (!creds) throw new Error('X не подключён');
  const token = await xAccessToken(creds);

  const payload = { text: post.texts.x || post.texts.facebook.slice(0, 270) };

  // Картинка — best effort: v2 media upload доступен не на всех тарифах
  try {
    if (post.image && fs.existsSync(path.join(QUEUE_DIR, post.image))) {
      const form = new FormData();
      form.append('media', new Blob([fs.readFileSync(path.join(QUEUE_DIR, post.image))], { type: 'image/png' }), post.image);
      form.append('media_category', 'tweet_image');
      const up = await fetch('https://api.x.com/2/media/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (up.ok) {
        const m = await up.json();
        const mediaId = (m.data && (m.data.id || m.data.media_key)) || m.media_id_string;
        if (mediaId) payload.media = { media_ids: [String(mediaId)] };
      }
    }
  } catch { /* твит уйдёт без картинки */ }

  const res = await apiCheck(
    await fetch('https://api.x.com/2/tweets', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    }),
    'X /2/tweets'
  );
  const data = await res.json();
  return data.data && data.data.id;
}

const publishers = {
  facebook: publishFacebook,
  instagram: publishInstagram,
  linkedin: publishLinkedin,
  tiktok: publishTiktok,
  threads: publishThreads,
  x: publishX,
};

// ---------- оркестрация ----------

// Опубликовать «пост дня» на все настроенные платформы (или заданные).
// Возвращает [{platform, status: 'published'|'skipped'|'error', postId?, id?, message?}]
async function publishDue({ platforms = PLATFORMS, dryRun = false, log = console.log } = {}) {
  const config = store.loadConfig();
  const queue = loadQueue();
  const results = [];
  for (const platform of platforms) {
    const item = queue.length ? nextFor(queue, platform) : null;
    if (!item) {
      results.push({ platform, status: 'skipped', message: 'нечего публиковать' });
      continue;
    }
    if (config.enabled[platform] === false) {
      results.push({ platform, status: 'skipped', message: 'сеть выключена в настройках' });
      continue;
    }
    if (!configured(platform)) {
      results.push({ platform, status: 'skipped', message: 'не подключена' });
      continue;
    }
    if (dryRun) {
      results.push({ platform, status: 'dry-run', postId: item.post.id });
      continue;
    }
    try {
      const result = await publishers[platform](item.post);
      const rec = typeof result === 'object' ? result : { id: result };
      item.post.published[platform] = { at: new Date().toISOString(), ...rec };
      fs.writeFileSync(item.file, JSON.stringify(item.post, null, 2));
      log(`[${platform}] ✓ опубликован ${item.post.id} → ${rec.id}`);
      results.push({ platform, status: 'published', postId: item.post.id, id: rec.id });
    } catch (e) {
      log(`[${platform}] ✗ ${e.message}`);
      results.push({ platform, status: 'error', postId: item.post.id, message: e.message });
    }
  }
  return results;
}

// Опубликовать конкретный пост немедленно (кнопка в панели)
async function publishOne(postId, { platforms = PLATFORMS, log = console.log } = {}) {
  const file = path.join(QUEUE_DIR, `${postId}.json`);
  if (!fs.existsSync(file)) throw new Error(`Пост ${postId} не найден`);
  const post = JSON.parse(fs.readFileSync(file, 'utf8'));
  const config = store.loadConfig();
  const results = [];
  for (const platform of platforms) {
    if (post.published[platform]) {
      results.push({ platform, status: 'skipped', message: 'уже опубликован' });
      continue;
    }
    if (config.enabled[platform] === false || !configured(platform)) {
      results.push({ platform, status: 'skipped', message: 'не подключена/выключена' });
      continue;
    }
    if (platform === 'tiktok' && !(post.video && fs.existsSync(path.join(QUEUE_DIR, post.video)))) {
      results.push({ platform, status: 'skipped', message: 'нет видео' });
      continue;
    }
    try {
      const result = await publishers[platform](post);
      const rec = typeof result === 'object' ? result : { id: result };
      post.published[platform] = { at: new Date().toISOString(), ...rec };
      fs.writeFileSync(file, JSON.stringify(post, null, 2));
      log(`[${platform}] ✓ ${post.id} → ${rec.id}`);
      results.push({ platform, status: 'published', id: rec.id });
    } catch (e) {
      log(`[${platform}] ✗ ${e.message}`);
      results.push({ platform, status: 'error', message: e.message });
    }
  }
  return results;
}

module.exports = { publishDue, publishOne, platformStatus, configured, PLATFORMS, loadQueue };

// ---------- CLI ----------

if (require.main === module) {
  const args = process.argv.slice(2);
  const DRY_RUN = args.includes('--dry-run');
  const only = args.includes('--platform') ? [args[args.indexOf('--platform') + 1]] : undefined;

  (async () => {
    if (!DRY_RUN) await require('./tls-fix').ensureTls();
    const results = await publishDue({ platforms: only, dryRun: DRY_RUN });
    for (const r of results) {
      console.log(`[${r.platform}] ${r.status}${r.postId ? ' ' + r.postId : ''}${r.message ? ' — ' + r.message : ''}`);
    }
    if (results.some((r) => r.status === 'error')) process.exit(1);
  })().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
