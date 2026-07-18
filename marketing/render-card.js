// Рендер брендовых PNG-карточек для постов: SVG (палитра сайта) → sharp → PNG.
// Отдельный package.json в marketing/ — sharp ставится только в CI,
// в прод-образ Railway не попадает.

const W = 1200;
const H = 1200;
const PAD = 90;

const C = {
  bg: '#0b1020',
  bgSoft: '#11172e',
  card: '#161d38',
  border: '#263056',
  text: '#e8ecf8',
  muted: '#93a0c4',
  accent: '#6c8cff',
  green: '#34d399',
};

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Перенос по словам под примерную ширину строки (librsvg не умеет сам)
function wrap(text, maxChars, maxLines) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > maxChars && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = (cur + ' ' + w).trim();
    }
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = lines[maxLines - 1].replace(/\W*\w+$/, '') + '…';
  }
  return lines;
}

function buildSvg(card) {
  const font = 'Helvetica, Arial, sans-serif';
  const headline = wrap(card.headline || '', 26, 4);
  const items = (card.lines || []).slice(0, 4).map((l) => wrap(l, 44, 2));

  let y = 300;
  const headlineSvg = headline
    .map((l) => `<text x="${PAD}" y="${(y += 78)}" font-family="${font}" font-size="64" font-weight="700" fill="${C.text}">${esc(l)}</text>`)
    .join('\n');

  y += 60;
  const itemsSvg = items
    .map((ls) => {
      const bullet = `<circle cx="${PAD + 12}" cy="${y + 52}" r="9" fill="${C.green}"/>`;
      const t = ls
        .map((l) => `<text x="${PAD + 44}" y="${(y += 52)}" font-family="${font}" font-size="38" fill="${C.muted}">${esc(l)}</text>`)
        .join('\n');
      y += 18;
      return bullet + t;
    })
    .join('\n');

  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${C.bgSoft}"/>
      <stop offset="1" stop-color="${C.bg}"/>
    </linearGradient>
    <linearGradient id="bar" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${C.accent}"/>
      <stop offset="1" stop-color="${C.green}"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect x="60" y="60" width="${W - 120}" height="${H - 120}" rx="28" fill="${C.card}" stroke="${C.border}" stroke-width="2"/>
  <rect x="60" y="60" width="${W - 120}" height="10" rx="5" fill="url(#bar)"/>
  <text x="${PAD}" y="200" font-family="${font}" font-size="30" font-weight="700" letter-spacing="4" fill="${C.accent}">${esc((card.kicker || '').toUpperCase())}</text>
  ${headlineSvg}
  ${itemsSvg}
  <text x="${PAD}" y="${H - 120}" font-family="${font}" font-size="34" font-weight="700" fill="${C.text}">ML Career Simulator</text>
  <text x="${PAD}" y="${H - 76}" font-family="${font}" font-size="28" fill="${C.accent}">${esc(card.footer || 'start free')}</text>
</svg>`;
}

async function renderCard(card, outPath) {
  const sharp = require('sharp');
  await sharp(Buffer.from(buildSvg(card))).png().toFile(outPath);
}

module.exports = { renderCard, buildSvg };
