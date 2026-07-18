#!/usr/bin/env node
// Одноразовый локальный помощник: проводит по OAuth Facebook и LinkedIn
// и печатает значения для GitHub → Settings → Secrets and variables → Actions.
//
//   node marketing/auth-helper.js facebook   — долгоживущий Page Token (не истекает)
//   node marketing/auth-helper.js linkedin   — токен профиля (живёт 60 дней)
//   node marketing/auth-helper.js tiktok     — refresh-токен (живёт 365 дней)
//
// Предварительно (см. MARKETING.md): создать приложения на
// developers.facebook.com и developer.linkedin.com; в LinkedIn-приложении
// добавить redirect URL http://localhost:8899/cb (у Facebook в dev-режиме
// localhost разрешён автоматически).

const http = require('http');
const fs = require('fs');
const path = require('path');
const readline = require('readline/promises');
const { spawn } = require('child_process');

const REDIRECT = 'http://localhost:8899/cb';
const STATE_FILE = path.join(__dirname, 'state.json');

function openBrowser(url) {
  console.log(`\nОткрываю браузер... Если не открылся, перейдите вручную:\n${url}\n`);
  const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  spawn(cmd, [url], { stdio: 'ignore', detached: true }).unref();
}

// Ждём один редирект с ?code=...
function waitForCode() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const u = new URL(req.url, 'http://localhost:8899');
      if (u.pathname !== '/cb') return res.end();
      const code = u.searchParams.get('code');
      res.setHeader('content-type', 'text/html; charset=utf-8');
      res.end(code ? '<h2>Готово — вернитесь в терминал.</h2>' : `<h2>Ошибка: ${u.searchParams.get('error_description') || u.searchParams.get('error')}</h2>`);
      server.close();
      code ? resolve(code) : reject(new Error('OAuth отклонён: ' + u.searchParams.get('error')));
    });
    server.listen(8899);
  });
}

async function getJSON(url, opts, what) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`${what}: HTTP ${res.status} ${await res.text()}`);
  return res.json();
}

async function facebook(rl) {
  console.log('\n=== Facebook: долгоживущий Page Access Token ===');
  const appId = (await rl.question('App ID (developers.facebook.com → ваше приложение): ')).trim();
  const appSecret = (await rl.question('App Secret (Settings → Basic): ')).trim();

  // instagram_* — для публикации в привязанный IG Business-аккаунт тем же токеном
  const scope = 'pages_manage_posts,pages_read_engagement,pages_show_list,instagram_basic,instagram_content_publish';
  openBrowser(`https://www.facebook.com/v23.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(REDIRECT)}&scope=${scope}&response_type=code`);
  const code = await waitForCode();

  const short = await getJSON(
    `https://graph.facebook.com/v23.0/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&redirect_uri=${encodeURIComponent(REDIRECT)}&code=${code}`,
    {}, 'обмен code на токен'
  );
  const long = await getJSON(
    `https://graph.facebook.com/v23.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${short.access_token}`,
    {}, 'обмен на долгоживущий токен'
  );
  const pages = await getJSON(`https://graph.facebook.com/v23.0/me/accounts?access_token=${long.access_token}`, {}, 'список страниц');
  if (!pages.data.length) throw new Error('У этого аккаунта нет страниц. Создайте Facebook-страницу и повторите.');

  console.log('\nВаши страницы:');
  pages.data.forEach((p, i) => console.log(`  ${i + 1}) ${p.name} (id ${p.id})`));
  const n = Number(await rl.question('Номер страницы для постинга: ')) - 1;
  const page = pages.data[n];
  if (!page) throw new Error('Неверный номер');

  console.log('\n(Page-токен, полученный из долгоживущего user-токена, не истекает.)');

  const secrets = { FB_PAGE_ID: page.id, FB_PAGE_TOKEN: page.access_token };
  // Если к странице привязан Instagram Business — включаем и его
  try {
    const ig = await getJSON(
      `https://graph.facebook.com/v23.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`,
      {}, 'проверка Instagram'
    );
    if (ig.instagram_business_account) {
      secrets.IG_USER_ID = ig.instagram_business_account.id;
      console.log('✓ К странице привязан Instagram Business — параллельный постинг в Instagram включён.');
    } else {
      console.log('ℹ Instagram не привязан к странице. Чтобы постить и туда: переведите IG-аккаунт в Business/Creator,\n  привяжите его к этой Facebook-странице и запустите этот шаг ещё раз.');
    }
  } catch {}
  return secrets;
}

async function linkedin(rl) {
  console.log('\n=== LinkedIn: токен профиля (w_member_social) ===');
  console.log(`В приложении на developer.linkedin.com: Products → добавьте «Share on LinkedIn»\nи «Sign In with LinkedIn using OpenID Connect»; Auth → Redirect URLs → ${REDIRECT}`);
  const clientId = (await rl.question('Client ID: ')).trim();
  const clientSecret = (await rl.question('Client Secret: ')).trim();

  const scope = encodeURIComponent('openid profile w_member_social');
  openBrowser(`https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(REDIRECT)}&scope=${scope}`);
  const code = await waitForCode();

  const tok = await getJSON('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  }, 'обмен code на токен');

  const me = await getJSON('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${tok.access_token}` },
  }, 'userinfo');

  console.log(`\nТокен живёт ~${Math.round((tok.expires_in || 5184000) / 86400)} дней — публикатор напомнит о перевыпуске в логах Actions.`);

  // Дата выпуска — для предупреждения в publish.js (файл коммитится в репо)
  let state = {};
  try { state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch {}
  state.linkedin = { issuedAt: new Date().toISOString() };
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  console.log('Дата выпуска записана в marketing/state.json — закоммитьте её.');
  return { LINKEDIN_TOKEN: tok.access_token, LINKEDIN_PERSON_URN: `urn:li:person:${me.sub}` };
}

async function tiktok(rl) {
  console.log('\n=== TikTok: refresh-токен для Content Posting API ===');
  const appUrl = process.env.APP_URL || 'https://ml-simulator-app-production.up.railway.app';
  const redirect = `${appUrl}/api/tiktok/callback`;
  console.log(`В приложении на developers.tiktok.com: продукты Login Kit + Content Posting API;
Login Kit → Redirect URI → ${redirect}
(localhost TikTok не принимает, поэтому код авторизации покажет страница на вашем сайте).`);
  const clientKey = (await rl.question('Client key: ')).trim();
  const clientSecret = (await rl.question('Client secret: ')).trim();

  const scope = encodeURIComponent('user.info.basic,video.publish');
  openBrowser(`https://www.tiktok.com/v2/auth/authorize/?client_key=${clientKey}&scope=${scope}&response_type=code&redirect_uri=${encodeURIComponent(redirect)}&state=mlsim`);
  const code = decodeURIComponent((await rl.question('Вставьте код со страницы: ')).trim());

  const tok = await getJSON('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirect,
    }),
  }, 'обмен code на токен');
  if (!tok.access_token) throw new Error('TikTok не вернул токен: ' + JSON.stringify(tok));

  console.log(`\nRefresh-токен живёт ~${Math.round((tok.refresh_expires_in || 31536000) / 86400)} дней; access-токен публикатор обновляет сам при каждом запуске.`);
  console.log('До прохождения аудита приложения видео публикуются приватно (SELF_ONLY) — это ожидаемо.');
  return { TIKTOK_CLIENT_KEY: clientKey, TIKTOK_CLIENT_SECRET: clientSecret, TIKTOK_REFRESH_TOKEN: tok.refresh_token };
}

const FLOWS = { facebook, linkedin, tiktok };

async function main() {
  const which = process.argv[2];
  if (!FLOWS[which]) {
    console.log('Использование: node marketing/auth-helper.js facebook | linkedin | tiktok');
    process.exit(1);
  }
  await require('./tls-fix').ensureTls();
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const secrets = await FLOWS[which](rl);
    console.log('\n→ Добавьте в GitHub Secrets (или запустите node marketing/setup.js — он делает это сам):\n');
    for (const [k, v] of Object.entries(secrets)) console.log(`${k}=${v}`);
  } finally {
    rl.close();
  }
}

module.exports = { facebook, linkedin, tiktok, openBrowser };

if (require.main === module) {
  main().catch((e) => {
    console.error('\nОшибка:', e.message);
    process.exit(1);
  });
}
