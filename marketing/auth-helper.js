#!/usr/bin/env node
// Одноразовый локальный помощник: проводит по OAuth Facebook и LinkedIn
// и печатает значения для GitHub → Settings → Secrets and variables → Actions.
//
//   node marketing/auth-helper.js facebook   — долгоживущий Page Token (не истекает)
//   node marketing/auth-helper.js linkedin   — токен профиля (живёт 60 дней)
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

  const scope = 'pages_manage_posts,pages_read_engagement,pages_show_list';
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

  console.log('\n→ Добавьте в GitHub Secrets:\n');
  console.log(`FB_PAGE_ID=${page.id}`);
  console.log(`FB_PAGE_TOKEN=${page.access_token}`);
  console.log('\n(Page-токен, полученный из долгоживущего user-токена, не истекает.)');
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

  console.log('\n→ Добавьте в GitHub Secrets:\n');
  console.log(`LINKEDIN_TOKEN=${tok.access_token}`);
  console.log(`LINKEDIN_PERSON_URN=urn:li:person:${me.sub}`);
  console.log(`\nТокен живёт ~${Math.round((tok.expires_in || 5184000) / 86400)} дней — публикатор напомнит о перевыпуске в логах Actions.`);

  // Дата выпуска — для предупреждения в publish.js (файл коммитится в репо)
  let state = {};
  try { state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch {}
  state.linkedin = { issuedAt: new Date().toISOString() };
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  console.log('Дата выпуска записана в marketing/state.json — закоммитьте её.');
}

async function main() {
  const which = process.argv[2];
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    if (which === 'facebook') await facebook(rl);
    else if (which === 'linkedin') await linkedin(rl);
    else {
      console.log('Использование: node marketing/auth-helper.js facebook | linkedin');
      process.exit(1);
    }
  } finally {
    rl.close();
  }
}

main().catch((e) => {
  console.error('\nОшибка:', e.message);
  process.exit(1);
});
