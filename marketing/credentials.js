// Хранилище маркетингового конвейера: пути, креды сетей, конфиг планировщика.
// Всё лежит на постоянном диске (DATA_DIR/marketing), env-переменные остаются
// запасным источником для обратной совместимости с CLI/Actions.

const fs = require('fs');
const path = require('path');

const MARKETING_DIR = process.env.MARKETING_DIR
  || path.join(process.env.DATA_DIR || path.join(__dirname, '..', 'data'), 'marketing');
const QUEUE_DIR = path.join(MARKETING_DIR, 'queue');
const PUB_DIR = path.join(MARKETING_DIR, 'pub'); // публично отдаваемые медиа (для Threads)
const CREDENTIALS_FILE = path.join(MARKETING_DIR, 'credentials.json');
const CONFIG_FILE = path.join(MARKETING_DIR, 'config.json');
const STATE_FILE = path.join(MARKETING_DIR, 'state.json'); // ротация тем/квизов

function ensureDirs() {
  fs.mkdirSync(QUEUE_DIR, { recursive: true });
  fs.mkdirSync(PUB_DIR, { recursive: true });
}

function readJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

function writeJSON(file, data) {
  ensureDirs();
  fs.writeFileSync(file, JSON.stringify(data, null, 2), { mode: 0o600 });
}

// credentials.json: { apps: {net: {id, secret}}, tokens: {net: {...}}, anthropicKey }
function loadCredentials() {
  return readJSON(CREDENTIALS_FILE, { apps: {}, tokens: {} });
}
function saveCredentials(c) {
  writeJSON(CREDENTIALS_FILE, c);
}

// config.json: расписание и переключатели сетей
const DEFAULT_CONFIG = {
  autoPublish: true,
  publishHourUTC: 14,
  autoGenerate: true,
  generateDowUTC: 1, // понедельник
  generateHourUTC: 6,
  postsPerBatch: 7,
  reelsPerBatch: 2,
  enabled: {}, // {facebook: false} — выключить сеть вручную; отсутствие ключа = включена
  lastPublishDate: null,
  lastGenerateWeek: null,
};
function loadConfig() {
  return { ...DEFAULT_CONFIG, ...readJSON(CONFIG_FILE, {}) };
}
function saveConfig(c) {
  writeJSON(CONFIG_FILE, c);
}

function anthropicKey() {
  return loadCredentials().anthropicKey || process.env.ANTHROPIC_API_KEY || '';
}

// Креды платформы: сперва сохранённые токены, затем env (старый путь)
function platformCreds(net) {
  const c = loadCredentials();
  const t = c.tokens || {};
  const a = c.apps || {};
  switch (net) {
    case 'facebook': {
      const f = t.facebook || {};
      const pageId = f.pageId || process.env.FB_PAGE_ID;
      const pageToken = f.pageToken || process.env.FB_PAGE_TOKEN;
      return pageId && pageToken ? { pageId, pageToken, pageName: f.pageName } : null;
    }
    case 'instagram': {
      const f = t.facebook || {};
      const pageToken = f.pageToken || process.env.FB_PAGE_TOKEN;
      const igUserId = f.igUserId || process.env.IG_USER_ID;
      return pageToken && igUserId ? { pageToken, igUserId, igUsername: f.igUsername } : null;
    }
    case 'linkedin': {
      const l = t.linkedin || {};
      const accessToken = l.accessToken || process.env.LINKEDIN_TOKEN;
      const personUrn = l.personUrn || process.env.LINKEDIN_PERSON_URN;
      return accessToken && personUrn ? { accessToken, personUrn, issuedAt: l.issuedAt } : null;
    }
    case 'tiktok': {
      const tt = t.tiktok || {};
      const clientKey = (a.tiktok && a.tiktok.id) || process.env.TIKTOK_CLIENT_KEY;
      const clientSecret = (a.tiktok && a.tiktok.secret) || process.env.TIKTOK_CLIENT_SECRET;
      const refreshToken = tt.refreshToken || process.env.TIKTOK_REFRESH_TOKEN;
      return clientKey && clientSecret && refreshToken ? { clientKey, clientSecret, refreshToken } : null;
    }
    case 'threads': {
      const th = t.threads || {};
      return th.accessToken && th.userId ? { accessToken: th.accessToken, userId: th.userId, expiresAt: th.expiresAt } : null;
    }
    case 'x': {
      const x = t.x || {};
      const clientId = (a.x && a.x.id) || process.env.X_CLIENT_ID;
      return clientId && x.refreshToken
        ? { clientId, clientSecret: (a.x && a.x.secret) || '', accessToken: x.accessToken, refreshToken: x.refreshToken, expiresAt: x.expiresAt }
        : null;
    }
    default:
      return null;
  }
}

// Обновить токены сети (например, после refresh-ротации)
function updateTokens(net, patch) {
  const c = loadCredentials();
  c.tokens = c.tokens || {};
  c.tokens[net] = { ...(c.tokens[net] || {}), ...patch };
  saveCredentials(c);
}

module.exports = {
  MARKETING_DIR, QUEUE_DIR, PUB_DIR, STATE_FILE,
  ensureDirs, loadCredentials, saveCredentials, loadConfig, saveConfig,
  anthropicKey, platformCreds, updateTokens,
};
