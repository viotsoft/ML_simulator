#!/usr/bin/env node
// Мастер полной настройки SMM-конвейера. Одна команда:
//
//   node marketing/setup.js           — пошагово подключает все платформы
//   node marketing/setup.js --check   — только проверить готовность окружения
//
// Что делает сам: проводит по OAuth каждой платформы, записывает ВСЕ секреты
// в GitHub (gh secret set) и предлагает запустить первый цикл генерации.
// Что остаётся вам: создать dev-приложения на порталах платформ (мастер
// открывает нужные страницы и говорит, что нажать) и подтвердить OAuth.

const { execFileSync, spawnSync } = require('child_process');
const readline = require('readline/promises');
const { facebook, linkedin, tiktok, openBrowser } = require('./auth-helper');
const { ensureTls } = require('./tls-fix');

const CHECK_ONLY = process.argv.includes('--check');

function sh(cmd, args) {
  return execFileSync(cmd, args, { encoding: 'utf8' }).trim();
}

function hasCmd(c) {
  try { sh(process.platform === 'win32' ? 'where' : 'which', [c]); return true; } catch { return false; }
}

function detectRepo() {
  try {
    const m = sh('git', ['remote', 'get-url', 'origin']).match(/github\.com[:/](.+?)(\.git)?$/);
    return m ? m[1] : null;
  } catch { return null; }
}

function ghAuthorized() {
  return spawnSync('gh', ['auth', 'status'], { encoding: 'utf8' }).status === 0;
}

// ---------- проверка окружения ----------

function check() {
  const repo = detectRepo();
  const rows = [
    ['node ' + process.version, true],
    ['GitHub CLI (gh) установлен', hasCmd('gh')],
    ['GitHub CLI авторизован', hasCmd('gh') && ghAuthorized()],
    [`репозиторий определён (${repo || 'origin не найден'})`, !!repo],
    ['ffmpeg (для TikTok-видео; в GitHub Actions уже есть)', hasCmd('ffmpeg')],
  ];
  let ok = true;
  for (const [label, pass] of rows) {
    console.log(`${pass ? '✓' : '✗'} ${label}`);
    if (!pass) ok = false;
  }
  if (!hasCmd('gh')) console.log('\n  → установить: brew install gh');
  else if (!ghAuthorized()) console.log('\n  → авторизовать: gh auth login');
  return ok;
}

// ---------- шаги мастера ----------

async function yes(rl, q) {
  const a = (await rl.question(`${q} [y/n]: `)).trim().toLowerCase();
  return a === 'y' || a === 'yes' || a === 'д' || a === 'да';
}

function setSecrets(repo, secrets) {
  for (const [name, value] of Object.entries(secrets)) {
    execFileSync('gh', ['secret', 'set', name, '--repo', repo, '--body', value]);
    console.log(`  ✓ секрет ${name} записан в GitHub`);
  }
}

async function stepAnthropic(rl, repo) {
  console.log(`\n──── Шаг 1/4 · Anthropic API (тексты постов, ~$1–3/мес) ────
Нужен API-ключ: console.anthropic.com → API keys → Create key.`);
  if (!(await yes(rl, 'Настроить сейчас?'))) return false;
  openBrowser('https://console.anthropic.com/settings/keys');
  const key = (await rl.question('Вставьте ключ (sk-ant-...): ')).trim();
  if (!key) return false;
  setSecrets(repo, { ANTHROPIC_API_KEY: key });
  return true;
}

async function stepFacebook(rl, repo) {
  console.log(`\n──── Шаг 2/4 · Facebook (модерация НЕ нужна) ────
Перед OAuth нужно приложение Meta (5 минут, один раз):
  1. developers.facebook.com → My Apps → Create App → тип Business.
  2. Вы — админ и приложения, и Facebook-страницы.
  3. Понадобятся App ID и App Secret (Settings → Basic).`);
  if (!(await yes(rl, 'Приложение готово, продолжаем?'))) return false;
  setSecrets(repo, await facebook(rl));
  return true;
}

async function stepLinkedin(rl, repo) {
  console.log(`\n──── Шаг 3/4 · LinkedIn (модерация НЕ нужна) ────
Перед OAuth нужно приложение LinkedIn (5 минут, один раз):
  1. developer.linkedin.com → Create app.
  2. Products → добавить «Share on LinkedIn» и «Sign In with LinkedIn using OpenID Connect».
  3. Auth → Redirect URLs → добавить http://localhost:8899/cb
  4. Понадобятся Client ID и Client Secret (вкладка Auth).`);
  if (!(await yes(rl, 'Приложение готово, продолжаем?'))) return false;
  setSecrets(repo, await linkedin(rl));
  return true;
}

async function stepTiktok(rl, repo) {
  console.log(`\n──── Шаг 4/4 · TikTok (нужен аудит для публичных постов) ────
Перед OAuth нужно приложение TikTok (10 минут, один раз):
  1. developers.tiktok.com → Manage apps → Connect an app.
  2. Добавить продукты Login Kit и Content Posting API (Direct Post).
  3. Login Kit → Redirect URI:
     https://ml-simulator-app-production.up.railway.app/api/tiktok/callback
  4. Сразу отправьте приложение на аудит — до него посты будут приватными (SELF_ONLY).
  5. Понадобятся Client key и Client secret.`);
  if (!(await yes(rl, 'Приложение готово, продолжаем?'))) return false;
  setSecrets(repo, await tiktok(rl));
  return true;
}

// ---------- main ----------

async function main() {
  console.log('=== Мастер настройки SMM-конвейера ML Career Simulator ===\n');
  await ensureTls();
  const envOk = check();
  if (CHECK_ONLY) process.exit(envOk ? 0 : 1);

  if (!hasCmd('gh')) {
    console.log('\nСначала установите GitHub CLI (brew install gh) и запустите мастер снова.');
    process.exit(1);
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    if (!ghAuthorized()) {
      console.log('\nGitHub CLI не авторизован — открываю вход (выберите GitHub.com → Login with a web browser):');
      const r = spawnSync('gh', ['auth', 'login', '--hostname', 'github.com', '--web'], { stdio: 'inherit' });
      if (r.status !== 0 || !ghAuthorized()) throw new Error('авторизация gh не завершена');
    }

    const repo = detectRepo();
    if (!repo) throw new Error('не найден git remote origin с GitHub-репозиторием');
    console.log(`\nСекреты будут записаны в: ${repo}\n(шаг можно пропустить и вернуться к нему позже — мастер перезапускаем сколько угодно)`);

    const done = {
      anthropic: await stepAnthropic(rl, repo),
      facebook: await stepFacebook(rl, repo),
      linkedin: await stepLinkedin(rl, repo),
      tiktok: await stepTiktok(rl, repo),
    };

    console.log('\n=== Итог ===');
    for (const [k, v] of Object.entries(done)) console.log(`${v ? '✓' : '— пропущено'} ${k}`);
    console.log('\nПлатформы независимы: публикатор пропускает ненастроенные.');

    if (done.anthropic && (await yes(rl, '\nЗапустить первую генерацию контента прямо сейчас?'))) {
      execFileSync('gh', ['workflow', 'run', 'marketing-generate', '--repo', repo], { stdio: 'inherit' });
      console.log(`✓ Запущено. Ход выполнения: https://github.com/${repo}/actions
Когда генерация закончится (~2 мин), первый пост уйдёт при ближайшем запуске
marketing-publish (ежедневно 14:00 UTC) — или запустите его вручную там же.`);
    }
  } finally {
    rl.close();
  }
}

main().catch((e) => {
  console.error('\nОшибка:', e.message);
  process.exit(1);
});
