#!/usr/bin/env node
// Публикация постов из marketing/queue/ в Facebook (страница) и LinkedIn (профиль).
// Запускается ежедневно из GitHub Actions; берёт самый старый неопубликованный
// пост с наступившей датой, публикует и помечает published.* (идемпотентно).
//
//   node marketing/publish.js [--platform facebook|linkedin] [--dry-run]
//
// Секреты (env): FB_PAGE_ID, FB_PAGE_TOKEN, LINKEDIN_TOKEN, LINKEDIN_PERSON_URN

const fs = require('fs');
const path = require('path');

const QUEUE_DIR = path.join(__dirname, 'queue');
const STATE_FILE = path.join(__dirname, 'state.json');
const LINKEDIN_VERSION = process.env.LINKEDIN_VERSION || '202506';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const only = args.includes('--platform') ? args[args.indexOf('--platform') + 1] : null;
const PLATFORMS = only ? [only] : ['facebook', 'linkedin'];

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

// Пост дня для платформы: дата наступила, ещё не публиковался туда
function nextFor(queue, platform) {
  return queue.find((q) => q.post.scheduledFor <= today() && !q.post.published[platform]);
}

async function apiCheck(res, what) {
  if (!res.ok) throw new Error(`${what}: HTTP ${res.status} ${await res.text()}`);
  return res;
}

// ---------- Facebook: фото + текст на страницу ----------

async function publishFacebook(post, imagePath) {
  const pageId = process.env.FB_PAGE_ID;
  const token = process.env.FB_PAGE_TOKEN;
  if (!pageId || !token) throw new Error('FB_PAGE_ID / FB_PAGE_TOKEN не заданы');

  const form = new FormData();
  form.append('message', post.texts.facebook);
  form.append('access_token', token);
  form.append('source', new Blob([fs.readFileSync(imagePath)], { type: 'image/png' }), post.image);

  const res = await apiCheck(
    await fetch(`https://graph.facebook.com/v23.0/${pageId}/photos`, { method: 'POST', body: form }),
    'Facebook /photos'
  );
  const data = await res.json();
  return data.post_id || data.id;
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

const publishers = { facebook: publishFacebook, linkedin: publishLinkedin };

async function main() {
  const queue = loadQueue();
  if (!queue.length) {
    console.log('Очередь пуста — сначала node marketing/generate.js');
    return;
  }
  warnLinkedinExpiry();

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
      console.log(item.post.texts[platform]);
      console.log(`  image: ${imagePath} (${fs.existsSync(imagePath) ? 'есть' : 'НЕТ ФАЙЛА!'})`);
      continue;
    }
    try {
      const id = await publishers[platform](item.post, imagePath);
      item.post.published[platform] = { at: new Date().toISOString(), id };
      fs.writeFileSync(item.file, JSON.stringify(item.post, null, 2));
      console.log(`[${platform}] ✓ опубликован ${item.post.id} → ${id}`);
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
