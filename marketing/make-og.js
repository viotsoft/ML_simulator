/**
 * Иконки сайта и OG-картинки страниц уроков: SVG → sharp → PNG.
 *
 * Запуск (разово, результат коммитится в public/):
 *   node marketing/make-og.js
 *
 * Палитра и приём переноса строк — те же, что у карточек постов
 * (marketing/render-card.js): картинки из разных каналов должны выглядеть
 * как один бренд.
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const C = { bg: '#111110', bgSoft: '#161614', border: '#2e2c28',
  text: '#eeebe4', muted: '#a39e93', accent: '#d4ae54' };

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// librsvg не переносит текст сам — режем по словам под примерную ширину
function wrap (text, maxChars, maxLines) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > maxChars && cur) { lines.push(cur); cur = w; }
    else cur = (cur + ' ' + w).trim();
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = lines[maxLines - 1].replace(/\W*\w+$/, '') + '…';
  }
  return lines;
}

const FONT = 'Helvetica, Arial, sans-serif';

function ogSvg ({ kicker, title, footer }) {
  const lines = wrap(title, 30, 4);
  const startY = 300 - (lines.length - 1) * 33;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${C.bgSoft}"/><stop offset="100%" stop-color="${C.bg}"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <rect x="0" y="0" width="1200" height="6" fill="${C.accent}"/>
  <text x="80" y="120" fill="${C.accent}" font-family="${FONT}" font-size="26" font-weight="bold" letter-spacing="3">${esc(kicker)}</text>
  ${lines.map((l, i) => `<text x="80" y="${startY + i * 66}" fill="${C.text}" font-family="${FONT}" font-size="54" font-weight="bold">${esc(l)}</text>`).join('\n  ')}
  <line x1="80" y1="516" x2="1120" y2="516" stroke="${C.border}" stroke-width="2"/>
  <text x="80" y="566" fill="${C.muted}" font-family="${FONT}" font-size="27">${esc(footer)}</text>
  <text x="1120" y="566" fill="${C.accent}" font-family="${FONT}" font-size="27" font-weight="bold" text-anchor="end">ML Simulator</text>
</svg>`;
}

// Знак сайта: тёмный скруглённый квадрат с монограммой.
const markSvg = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="${C.bg}"/>
  <rect x="2" y="2" width="60" height="60" rx="12" fill="none" stroke="${C.accent}" stroke-width="3"/>
  <text x="32" y="43" text-anchor="middle" fill="${C.text}" font-family="${FONT}" font-size="27" font-weight="bold">ML</text>
</svg>`;

async function main () {
  const pub = path.join(__dirname, '..', 'public');
  const read = (lang) => JSON.parse(fs.readFileSync(
    path.join(__dirname, '..', 'content', lang, 'modules.json'), 'utf8'));
  const modules = read('ru');

  fs.writeFileSync(path.join(pub, 'favicon.svg'), markSvg(64));
  for (const [name, size] of [['favicon.png', 48], ['apple-touch-icon.png', 180]]) {
    await sharp(Buffer.from(markSvg(size))).png().toFile(path.join(pub, name));
  }

  await sharp(Buffer.from(ogSvg({
    kicker: 'СИМУЛЯТОР КАРЬЕРЫ ML-ИНЖЕНЕРА',
    title: 'От первой ML-задачи до архитектуры уровня enterprise',
    footer: 'Три трека · 23 модуля на реальных задачах',
  }))).png().toFile(path.join(pub, 'og', 'default.png'));

  // Русские — в /og, английские — в /og/en: имена файлов совпадают по id модуля.
  const sets = [
    { lang: 'ru', dir: path.join(pub, 'og'), word: 'МОДУЛЬ', footer: 'Разбор реального кейса' },
    { lang: 'en', dir: path.join(pub, 'og', 'en'), word: 'MODULE', footer: 'A real case, walked through' },
  ];
  let made = 1;
  for (const s of sets) {
    fs.mkdirSync(s.dir, { recursive: true });
    for (const m of read(s.lang)) {
      const seo = m.seo || {};
      await sharp(Buffer.from(ogSvg({
        kicker: `${s.word} ${String(m.order).padStart(2, '0')} · ${m.level.toUpperCase()}`,
        title: seo.h1 || m.title,
        footer: s.footer,
      }))).png().toFile(path.join(s.dir, `${m.id}.png`));
      made++;
    }
  }
  console.log(`[og] иконки и ${made} картинки готовы`);
}

main().catch((e) => { console.error(e); process.exit(1); });
