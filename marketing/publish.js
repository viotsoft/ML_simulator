#!/usr/bin/env node
// Публикация постов из marketing/queue/ в Facebook (страница) и LinkedIn (профиль).
// Запускается ежедневно из GitHub Actions; берёт самый старый неопубликованный
// пост с наступившей датой, публикует и помечает published.* (идемпотентно).
//
//   node marketing/publish.js [--platform facebook|linkedin|tiktok] [--dry-run]
//
// Секреты (env): FB_PAGE_ID, FB_PAGE_TOKEN, LINKEDIN_TOKEN, LINKEDIN_PERSON_URN,
//   TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET, TIKTOK_REFRESH_TOKEN
// Платформы без секретов пропускаются (можно включать по одной).

const fs = require('fs');
const path = require('path');

const QUEUE_DIR = path.join(__dirname, 'queue');
const STATE_FILE = path.join(__dirname, 'state.json');
const LINKEDIN_VERSION = process.env.LINKEDIN_VERSION || '202506';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const only = args.includes('--platform') ? args[args.indexOf('--platform') + 1] : null;
// instagram идёт после facebook: картинку для него берём из FB-поста (публичный CDN)
const PLATFORMS = only ? [only] : ['facebook', 'instagram', 'linkedin', 'tiktok'];

const REQUIRED_ENV = {
  facebook: ['FB_PAGE_ID', 'FB_PAGE_TOKEN'],
  instagram: ['FB_PAGE_TOKEN', 'IG_USER_ID'],
  linkedin: ['LINKEDIN_TOKEN', 'LINKEDIN_PERSON_URN'],
  tiktok: ['TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET', 'TIKTOK_REFRESH_TOKEN'],
};

function configured(platform) {
  return (REQUIRED_ENV[platform] || []).every((k) => process.env[k]);
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

// ---------- Facebook: фото + текст на страницу (или Reels, если format:'reel') ----------

async function publishFacebook(post, imagePath) {
  const pageId = process.env.FB_PAGE_ID;
  const token = process.env.FB_PAGE_TOKEN;
  if (!pageId || !token) throw new Error('FB_PAGE_ID / FB_PAGE_TOKEN не заданы');

  if (post.format === 'reel' && post.video) return publishFacebookReel(post, pageId, token);

  const form = new FormData();
  form.append('message', post.texts.facebook);
  form.append('access_token', token);
  form.append('source', new Blob([fs.readFileSync(imagePath)], { type: 'image/png' }), post.image);

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

// Instagram Reels: resumable-загрузка (публичный URL не нужен) + ожидание обработки
async function publishInstagramReel(post) {
  const token = process.env.FB_PAGE_TOKEN;
  const igUser = process.env.IG_USER_ID;
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

  // обработка видео занимает десятки секунд
  for (let i = 0; i < 40; i++) {
    const st = await (await apiCheck(
      await fetch(`https://graph.facebook.com/v23.0/${container.id}?fields=status_code&access_token=${token}`),
      'IG Reels status'
    )).json();
    if (st.status_code === 'FINISHED') break;
    if (st.status_code === 'ERROR') throw new Error('Instagram не смог обработать видео (status ERROR)');
    await new Promise((r) => setTimeout(r, 3000));
  }

  const pub = await (await apiCheck(
    await fetch(`https://graph.facebook.com/v23.0/${igUser}/media_publish`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ creation_id: container.id, access_token: token }),
    }),
    'IG Reels publish'
  )).json();
  return { id: pub.id, reel: true };
}

// ---------- Instagram: тем же Meta-приложением, картинка — из FB-поста ----------
// Content Publishing API принимает только публичный image_url, поэтому Instagram
// публикуется ПОСЛЕ Facebook: берём CDN-ссылку уже загруженной туда карточки.

async function publishInstagram(post) {
  if (post.format === 'reel' && post.video) return publishInstagramReel(post);
  const token = process.env.FB_PAGE_TOKEN;
  const igUser = process.env.IG_USER_ID;
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

  // Контейнер обрабатывается асинхронно — публиковать можно только со статусом FINISHED
  for (let i = 0; i < 15; i++) {
    const st = await (await apiCheck(
      await fetch(`https://graph.facebook.com/v23.0/${container.id}?fields=status_code&access_token=${token}`),
      'Instagram container status'
    )).json();
    if (st.status_code === 'FINISHED') break;
    if (st.status_code === 'ERROR') throw new Error('Instagram не смог обработать картинку (status ERROR)');
    await new Promise((r) => setTimeout(r, 2000));
  }

  const pub = await (await apiCheck(
    await fetch(`https://graph.facebook.com/v23.0/${igUser}/media_publish`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ creation_id: container.id, access_token: token }),
    }),
    'Instagram /media_publish'
  )).json();
  return pub.id;
}

// ---------- LinkedIn: загрузка картинки + пост от имени профиля ----------

function liHeaders(extra = {}) {
  return {
    Authorization: `Bearer ${process.env.LINKEDIN_TOKEN}`,
    'LinkedIn-Version': LINKEDIN_VERSION,
    'X-Restli-Protocol-Version': '2.0.0',
    ...extra,
  };
}

async function publishLinkedin(post, imagePath) {
  const author = process.env.LINKEDIN_PERSON_URN; // urn:li:person:XXXX
  if (!process.env.LINKEDIN_TOKEN || !author) throw new Error('LINKEDIN_TOKEN / LINKEDIN_PERSON_URN не заданы');

  const init = await apiCheck(
    await fetch('https://api.linkedin.com/rest/images?action=initializeUpload', {
      method: 'POST',
      headers: liHeaders({ 'content-type': 'application/json' }),
      body: JSON.stringify({ initializeUploadRequest: { owner: author } }),
    }),
    'LinkedIn initializeUpload'
  );
  const { value } = await init.json();

  await apiCheck(
    await fetch(value.uploadUrl, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${process.env.LINKEDIN_TOKEN}` },
      body: fs.readFileSync(imagePath),
    }),
    'LinkedIn image PUT'
  );

  const res = await apiCheck(
    await fetch('https://api.linkedin.com/rest/posts', {
      method: 'POST',
      headers: liHeaders({ 'content-type': 'application/json' }),
      body: JSON.stringify({
        author,
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
// (тот живёт 365 дней). До прохождения аудита приложения TikTok разрешает
// только SELF_ONLY — берём максимально открытый уровень из creator_info.

async function tiktokAccessToken() {
  const res = await apiCheck(
    await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_KEY,
        client_secret: process.env.TIKTOK_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: process.env.TIKTOK_REFRESH_TOKEN,
      }),
    }),
    'TikTok oauth/token'
  );
  const data = await res.json();
  if (!data.access_token) throw new Error(`TikTok oauth/token: ${JSON.stringify(data)}`);
  if (data.refresh_token && data.refresh_token !== process.env.TIKTOK_REFRESH_TOKEN) {
    console.warn('::warning::TikTok выдал НОВЫЙ refresh-токен — обновите секрет TIKTOK_REFRESH_TOKEN');
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
  const token = await tiktokAccessToken();

  const creator = await tiktokJSON(
    'https://open.tiktokapis.com/v2/post/publish/creator_info/query/', token, {}, 'TikTok creator_info');
  const levels = creator.privacy_level_options || [];
  const privacy = levels.includes('PUBLIC_TO_EVERYONE') ? 'PUBLIC_TO_EVERYONE'
    : levels.includes('EVERYONE') ? 'EVERYONE' : 'SELF_ONLY';
  if (privacy === 'SELF_ONLY') {
    console.warn('::warning::TikTok-приложение ещё не прошло аудит — видео публикуется приватно (SELF_ONLY)');
  }

  const videoPath = path.join(QUEUE_DIR, post.video);
  const video = fs.readFileSync(videoPath);
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

// Токен LinkedIn живёт 60 дней — предупреждаем заранее (дата из state.json)
function warnLinkedinExpiry() {
  try {
    const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    const issued = state.linkedin && state.linkedin.issuedAt;
    if (!issued) return;
    const days = Math.floor((Date.now() - new Date(issued)) / 86400000);
    if (days >= 50) {
      console.warn(`::warning::LinkedIn-токену ${days} дней (лимит 60). Перевыпустите: node marketing/auth-helper.js`);
    }
  } catch {}
}

const publishers = { facebook: publishFacebook, instagram: publishInstagram, linkedin: publishLinkedin, tiktok: publishTiktok };

async function main() {
  if (!DRY_RUN) await require('./tls-fix').ensureTls();
  const queue = loadQueue();
  if (!queue.length) {
    console.log('Очередь пуста — сначала node marketing/generate.js');
    return;
  }
  warnLinkedinExpiry();

  if (!DRY_RUN && !PLATFORMS.some(configured)) {
    console.error(`Ни одна платформа не настроена. Нужны секреты: ${JSON.stringify(REQUIRED_ENV)}`);
    process.exit(1);
  }

  let failed = false;
  for (const platform of PLATFORMS) {
    const item = nextFor(queue, platform);
    if (!item) {
      console.log(`[${platform}] нечего публиковать (всё опубликовано или даты не наступили)`);
      continue;
    }
    const imagePath = path.join(QUEUE_DIR, item.post.image);
    if (DRY_RUN) {
      console.log(`[${platform}] DRY-RUN — был бы опубликован ${item.post.id}:`);
      console.log(item.post.texts[platform] || '(будет использован facebook-текст с utm_source=instagram)');
      const media = platform === 'tiktok' ? path.join(QUEUE_DIR, item.post.video) : imagePath;
      console.log(`  media: ${media} (${fs.existsSync(media) ? 'есть' : 'НЕТ ФАЙЛА!'})`);
      continue;
    }
    if (!configured(platform)) {
      console.log(`[${platform}] пропущен — секреты не заданы (${REQUIRED_ENV[platform].join(', ')})`);
      continue;
    }
    try {
      const result = await publishers[platform](item.post, imagePath);
      const rec = typeof result === 'object' ? result : { id: result };
      item.post.published[platform] = { at: new Date().toISOString(), ...rec };
      fs.writeFileSync(item.file, JSON.stringify(item.post, null, 2));
      console.log(`[${platform}] ✓ опубликован ${item.post.id} → ${rec.id}`);
    } catch (e) {
      failed = true;
      console.error(`[${platform}] ✗ ${e.message}`);
    }
  }
  if (failed) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
