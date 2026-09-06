/**
 * Публичные страницы уроков и SEO-обвязка.
 *
 * Зачем отдельный модуль: server.js отвечает за продукт (авторизация, прогресс,
 * оплата), а здесь живёт всё, что видит поисковик и человек, пришедший из
 * YouTube Shorts: страницы уроков, canonical/OG/JSON-LD, sitemap, robots,
 * 404/500 и счётчик показов без cookie.
 *
 * Монтируется в двух точках, и порядок принципиален:
 *   mountEarly — ДО express.static: подстановка {{BASE}} в статические html
 *                и заглушка на прямую отдачу файлов админки;
 *   mountLate  — ПОСЛЕ всех маршрутов: уроки, sitemap, robots и обработчики
 *                404/500, которые обязаны стоять последними.
 */
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

const SITE_NAME = 'ML Career Simulator';
const TEASER_BUDGET = 2800;   // символов markdown теории сверх «Ситуации» и «Задачи»
const THIN_CONTENT = 1500;    // ниже этого страница считается тонкой — предупреждаем на старте

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------------------------------------------------------------- локали
// Русские адреса менять нельзя: они уже опубликованы и на них ведут ссылки.
// Английские встают под /en/, рядом с существующим /en.html.
const LOCALES = {
  ru: {
    lang: 'ru',
    ogLocale: 'ru_RU',
    home: '/',
    hub: '/lessons',
    lesson: (slug) => `/lesson/${slug}`,
    ogDir: '/og',
    // Служебные строки модуля, которые на публичной странице не нужны.
    levelLine: /^>\s*\*\*Уровень:.*$/m,
    tails: [/\*\*Что почитать[^*]*\*\*[\s\S]*$/m, /^\s*Квиз ниже.*$/m],
    hours: /~\s*(\d+(?:[.,]\d+)?)\s*час/,
    minutes: /~\s*(\d+)\s*минут/,
    timeLabel: /~\s*([\d.,]+\s*(?:час\w*|минут\w*))/,
    nav: { lessons: 'Уроки', program: 'Программа', pricing: 'Тарифы', signin: 'Войти' },
    foot: { all: 'Все уроки', terms: 'Условия использования', privacy: 'Конфиденциальность' },
    crumbs: { home: 'Главная', lessons: 'Уроки', module: (n, t) => `Модуль ${n}. ${t}` },
    body: {
      moduleWord: 'МОДУЛЬ',
      ctaPrimary: 'Пройти модуль в симуляторе',
      ctaSecondary: 'Все 23 урока',
      noteFree: 'Этот модуль бесплатный — нужна только регистрация, без карты.',
      notePaid: 'Первые два модуля бесплатны, без карты. Остальные — по подписке $20/мес.',
      takeaways: 'Что запомнить',
      nextIn: (t) => `Дальше в модуле: ${t}`,
      practiceFallback: 'Пошаговый разбор решения, код и квиз на 5 вопросов.',
      openModule: 'Открыть модуль →',
      nearby: 'Соседние уроки',
      wholeProgram: 'Программа целиком — 23 урока',
    },
    hubCopy: {
      eyebrow: 'ТРЕК КЛАССИЧЕСКОГО ML · 23 УРОКА',
      h1: 'Разборы <em>реальных ML-задач</em> из работы инженера',
      sub: 'Каждый урок — задача, которая пришла от бизнеса: почему прибыль падает при растущей выручке, отчего модель с точностью 99% бесполезна, как выбрать порог по цене ошибки. Разбор с цифрами открыт, практика и квиз — в симуляторе.',
      title: 'Уроки ML на реальных бизнес-задачах — 23 разбора',
      description: 'Разборы реальных задач ML-инженера: метрики и цена ошибки, утечки данных, дисбаланс классов, прогноз спроса, MLOps. Первые модули бесплатно.',
    },
    err: {
      word: 'ОШИБКА',
      h404: 'Такой страницы нет',
      t404: 'Возможно, ссылка устарела или в адресе опечатка.',
      h500: 'Что-то сломалось',
      t500: 'Это на нашей стороне. Попробуйте обновить страницу.',
      title404: 'Страница не найдена',
      title500: 'Ошибка сервера',
      home: 'На главную',
      all: 'Все уроки',
    },
  },
  en: {
    lang: 'en',
    ogLocale: 'en_US',
    home: '/en.html',
    hub: '/en/lessons',
    lesson: (slug) => `/en/lesson/${slug}`,
    ogDir: '/og/en',
    levelLine: /^>\s*\*\*Level:.*$/m,
    tails: [/\*\*Further reading[^*]*\*\*[\s\S]*$/m, /^\s*Quiz below.*$/m],
    hours: /~\s*(\d+(?:[.,]\d+)?)\s*hour/,
    minutes: /~\s*(\d+)\s*minute/,
    timeLabel: /~\s*([\d.,]+\s*(?:hours?|minutes?))/,
    nav: { lessons: 'Lessons', program: 'Program', pricing: 'Pricing', signin: 'Sign in' },
    foot: { all: 'All lessons', terms: 'Terms of use', privacy: 'Privacy' },
    crumbs: { home: 'Home', lessons: 'Lessons', module: (n, t) => `Module ${n}. ${t}` },
    body: {
      moduleWord: 'MODULE',
      ctaPrimary: 'Open this module in the simulator',
      ctaSecondary: 'All 23 lessons',
      noteFree: 'This module is free — it only needs an account, no card.',
      notePaid: 'The first two modules are free, no card. The rest are $20/month.',
      takeaways: 'What to remember',
      nextIn: (t) => `Next in this module: ${t}`,
      practiceFallback: 'A step-by-step walkthrough of the solution, the code and a five-question quiz.',
      openModule: 'Open the module →',
      nearby: 'Nearby lessons',
      wholeProgram: 'The whole program — 23 lessons',
    },
    hubCopy: {
      eyebrow: 'CLASSIC ML TRACK · 23 LESSONS',
      h1: 'Real <em>ML problems</em> as they reach an engineer',
      sub: 'Every lesson is a problem that came from the business: why profit falls while revenue grows, why a 99%-accurate model is useless, how to set a threshold from the cost of an error. The walkthrough with the numbers is open; the practice and the quiz live in the simulator.',
      title: 'ML lessons built on real business problems — 23 walkthroughs',
      description: 'Walkthroughs of real ML engineering problems: metrics and the cost of error, data leakage, class imbalance, demand forecasting, MLOps. First modules free.',
    },
    err: {
      word: 'ERROR',
      h404: 'This page does not exist',
      t404: 'The link may be out of date, or there is a typo in the address.',
      h500: 'Something broke',
      t500: 'That is on our side. Try reloading the page.',
      title404: 'Page not found',
      title500: 'Server error',
      home: 'Go to the homepage',
      all: 'All lessons',
    },
  },
};

// ---------------------------------------------------------------- разбор модуля
/**
 * Нарезка markdown по заголовкам. Считаем «```» и «~~~», чтобы заголовок
 * внутри блока кода не был принят за настоящий.
 */
function splitByHeading (md, level) {
  const re = level === 2 ? /^##(?!#)\s/ : /^###(?!#)\s/;
  const lines = md.split(/\r?\n/);
  const starts = [];
  let fence = false;
  lines.forEach((l, i) => {
    if (/^\s*(```|~~~)/.test(l)) { fence = !fence; return; }
    if (!fence && re.test(l)) starts.push(i);
  });
  const whole = (k) => lines.slice(starts[k], k + 1 < starts.length ? starts[k + 1] : lines.length).join('\n');
  return {
    count: starts.length,
    intro: lines.slice(0, starts.length ? starts[0] : lines.length).join('\n'),
    head: (k) => (lines[starts[k]] || '').replace(/^#+\s+/, '').trim(),
    body: (k) => whole(k).split('\n').slice(1).join('\n').trim(),
    whole,
  };
}

// Схему отдаём сырым HTML мимо marked: внутри <figure> у части модулей есть
// пустые строки, которые по CommonMark закрыли бы html-блок и вывели разметку
// SVG простым текстом на страницу.
function firstFigure (md) {
  const m = /<figure class="viz">[\s\S]*?<\/figure>/.exec(md);
  return m ? m[0] : '';
}

// Листинг кода — это уже платная часть, на публичной странице его быть не должно.
function stripFences (md) {
  const out = [];
  let fence = false;
  for (const l of md.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(l)) { fence = !fence; continue; }
    if (!fence) out.push(l);
  }
  return out.join('\n');
}

function trimTail (text, loc) {
  // Формулировки плавают в обоих языках: «Что почитать» и «Что почитать
  // дополнительно», «Quiz below!» и «Quiz below — go!». Паттерны живут в
  // таблице локалей.
  let out = text;
  for (const re of loc.tails) out = out.replace(re, '');
  return out.trim();
}

/**
 * Публичная выжимка модуля.
 *
 * У всех 23 модулей ровно пять секций второго уровня в неизменном порядке:
 *   0 Ситуация · 1 Задача · 2 Теория · 3 Практика · 4 Выводы
 * А вот тексты заголовков плавают: m01 заканчивается «Итогом дня», m02 —
 * «Чеклистом EDA», у m20 вместо «Теории» — «Защита проекта», вместо
 * «Практики» — «Экзамен», вместо выводов — «Куда дальше». Поэтому режем
 * ПО НОМЕРУ секции: иначе особый случай понадобился бы восьми модулям.
 */
function lessonTeaser (md, loc) {
  const s = splitByHeading(md, 2);
  if (s.count < 5) throw new Error(`ожидалось 5 секций, найдено ${s.count}`);

  // Шапку берём без строки «# Модуль N …»: <h1> ставим свой, два H1 на
  // странице — прямая ошибка разметки.
  // Убираем «# Модуль N …» (свой <h1> уже есть, два — ошибка разметки) и
  // строку «> **Уровень:** … **Время:** …» — она дословно повторяет плашку
  // над заголовком страницы.
  const intro = s.intro
    .replace(/^#\s.*$/m, '')
    .replace(loc.levelLine, '')
    .replace(/^---\s*$/gm, '')
    .trim();
  const parts = [intro, `## ${s.head(0)}`, stripFences(s.body(0)), `## ${s.head(1)}`, stripFences(s.body(1))];

  // Теорию добираем целыми подразделами, пока не выберем бюджет. Хотя бы один
  // берём всегда: без него страница — 600–1000 знаков, то есть thin content.
  const theory = splitByHeading(s.whole(2), 3);
  const subs = theory.count
    ? Array.from({ length: theory.count }, (_, k) => theory.whole(k))
    : [s.body(2)];
  const taken = [];
  let used = 0;
  for (const sub of subs) {
    // Добираем целыми подразделами, пока не наберём бюджет. Две тонкости:
    // проверка «до», а не «после» — иначе большой второй подраздел отсекается
    // и остаётся 900 знаков; и считаем только прозу, без разметки, иначе
    // громоздкий SVG-рисунок выбирает бюджет за десяток живых слов.
    if (taken.length && used >= TEASER_BUDGET) break;
    const clean = stripFences(sub);
    taken.push(clean);
    used += clean.replace(/<[^>]*>/g, '').length;
  }
  if (taken.length) parts.push(`## ${s.head(2)}`, ...taken);

  const markdown = trimTail(parts.filter((p) => p && p.trim()).join('\n\n'), loc);
  const fig = firstFigure(md);
  const practice = splitByHeading(s.whole(3), 3);

  return {
    markdown,
    // если схема уже попала во взятый кусок теории — не дублируем
    figure: fig && !markdown.includes(fig) ? fig : '',
    takeaways: trimTail(s.body(4), loc),
    // витрина платной части: только заголовки подразделов, без тел
    // «💻 Практика» → «Практика»: эмодзи уместна в модуле, но не в заголовке страницы
    practiceTitle: s.head(3).replace(/^[^\p{L}\p{N}]+/u, ''),
    practiceOutline: Array.from({ length: practice.count }, (_, k) => practice.head(k)),
    chars: markdown.length,
  };
}

// «~90 минут» → PT90M, «~3 часа» → PT3H. Реальные данные из шапки модуля,
// а не выдуманное время.
function timeRequired (md, loc) {
  // «~2.5 часа» / «~2.5 hours» — не «5»: дробную часть обязательно
  // захватываем, иначе \d+ подберёт цифру после точки.
  const h = loc.hours.exec(md);
  if (h) {
    const mins = Math.round(parseFloat(h[1].replace(',', '.')) * 60);
    return mins % 60 === 0 ? `PT${mins / 60}H` : `PT${mins}M`;
  }
  const m = loc.minutes.exec(md);
  return m ? `PT${m[1]}M` : '';
}

// ---------------------------------------------------------------- каркас страницы
// Ссылку на приложение подставляем в готовый html: страницы уроков кэшируются
// целиком, а метки у каждого посетителя свои.
const CTA_TOKEN = '__CTA_HREF__';

function metaHead (o) {
  const img = o.base + (o.image || '/og/default.png');
  const alt = (o.alternates || [])
    .map((a) => `\n  <link rel="alternate" hreflang="${esc(a.lang)}" href="${esc(a.href)}">`).join('');
  const ld = (o.jsonld || [])
    .map((j) => `\n  <script type="application/ld+json">${JSON.stringify(j)}</script>`).join('');
  return `<meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(o.title)}</title>
  <meta name="description" content="${esc(o.description)}">
  <link rel="canonical" href="${esc(o.canonical)}">
  <meta name="robots" content="${o.noindex ? 'noindex,follow' : 'index,follow,max-image-preview:large,max-snippet:-1'}">${alt}
  <meta name="theme-color" content="#0b1020">
  <meta property="og:type" content="${esc(o.ogType || 'website')}">
  <meta property="og:site_name" content="${SITE_NAME}">
  <meta property="og:locale" content="${esc(o.loc.ogLocale)}">
  <meta property="og:title" content="${esc(o.title)}">
  <meta property="og:description" content="${esc(o.description)}">
  <meta property="og:url" content="${esc(o.canonical)}">
  <meta property="og:image" content="${esc(img)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(o.title)}">
  <meta name="twitter:description" content="${esc(o.description)}">
  <meta name="twitter:image" content="${esc(img)}">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="icon" href="/favicon.png" type="image/png" sizes="48x48">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <link rel="stylesheet" href="/css/style.css">${ld}`;
}

const NAV = (loc) => `<header class="container">
  <nav class="nav">
    <a class="logo" href="${loc.home}" style="text-decoration:none">ML<span>Simulator</span></a>
    <div class="nav-links">
      <a href="${loc.hub}">${esc(loc.nav.lessons)}</a>
      <a href="${loc.home}#program">${esc(loc.nav.program)}</a>
      <a href="${loc.home}#pricing">${esc(loc.nav.pricing)}</a>
      <a href="${CTA_TOKEN}" class="btn btn-primary" style="padding:9px 20px">${esc(loc.nav.signin)}</a>
    </div>
  </nav>
</header>`;

const FOOT = (loc) => `<footer class="footer">
  <div class="container">
    ML Career Simulator © 2026 · <a href="${loc.hub}">${esc(loc.foot.all)}</a> ·
    <a href="/terms.html">${esc(loc.foot.terms)}</a> · <a href="/privacy.html">${esc(loc.foot.privacy)}</a>
  </div>
</footer>`;

// Ни строчки JavaScript: ссылки с метками собираются на сервере. Трафик из
// Shorts — мобильный, и пустой js здесь дороже, чем кажется.
function page (o) {
  const loc = o.loc;
  return fillCta(`<!DOCTYPE html>
<html lang="${loc.lang}">
<head>
  ${metaHead(o)}
</head>
<body>
${NAV(loc)}
${o.body}
${FOOT(loc)}
</body>
</html>`, o.cta);
}

// Без явной ссылки токен гасим на «/app.html»: литерал __CTA_HREF__ в href
// на странице 404 или хабе был бы битой ссылкой.
function fillCta (html, href) {
  return html.split(CTA_TOKEN).join(esc(href || '/app.html'));
}

// ---------------------------------------------------------------- страница урока

function lessonBody (mod, teaser, all, free, md, loc) {
  const seo = mod.seo || {};
  const B = loc.body;
  const idx = all.findIndex((m) => m.id === mod.id);
  const prev = all[idx - 1];
  const next = all[idx + 1];
  const mins = loc.timeLabel.exec(md);

  const nearby = [prev, next].filter(Boolean).map((m) => `
      <a class="syl-item" href="${loc.lesson(m.slug)}" style="text-decoration:none;color:inherit">
        <span class="syl-num">${String(m.order).padStart(2, '0')}</span> ${esc(m.title)}
      </a>`).join('');

  const outline = teaser.practiceOutline.length
    ? `<ul>${teaser.practiceOutline.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>`
    : `<p>${esc(B.practiceFallback)}</p>`;

  return `
<section class="hero container" style="padding-top:34px;padding-bottom:10px">
  <div class="eyebrow">${esc(B.moduleWord)} ${String(mod.order).padStart(2, '0')} · ${esc(mod.level)}${mins ? ' · ' + esc(mins[1]) : ''}</div>
  <h1>${esc(seo.h1 || mod.title)}</h1>
  <p class="sub">${esc(seo.lead || mod.subtitle)}</p>
  <div class="cta-row">
    <a href="${CTA_TOKEN}" class="btn btn-primary btn-lg">${esc(B.ctaPrimary)}</a>
    <a href="${loc.hub}" class="btn btn-ghost btn-lg">${esc(B.ctaSecondary)}</a>
  </div>
  <p class="note">${esc(mod.order <= free ? B.noteFree : B.notePaid)}</p>
</section>

<article class="section container" style="padding-top:26px">
  <div class="md-content">
    ${marked.parse(teaser.markdown)}
    ${teaser.figure}
  </div>
</article>

<section class="section container" style="padding-top:0">
  <div class="card">
    <h3>${esc(B.takeaways)}</h3>
    <div class="md-content">${marked.parse(teaser.takeaways)}</div>
  </div>
</section>

<section class="section container" style="padding-top:0">
  <div class="card lesson-paywall">
    <h3>${esc(B.nextIn(teaser.practiceTitle))}</h3>
    ${outline}
    <p style="margin-top:14px">
      <a href="${CTA_TOKEN}" class="btn btn-primary btn-lg">${esc(B.openModule)}</a>
    </p>
  </div>
</section>

<section class="section container" id="program" style="padding-top:0">
  <h2>${esc(B.nearby)}</h2>
  <div class="syllabus">${nearby}</div>
  <p style="text-align:center;margin-top:22px">
    <a href="${loc.hub}" class="btn btn-ghost">${esc(B.wholeProgram)}</a>
  </p>
</section>`;
}

function lessonJsonLd (mod, base, teaser, md, free, loc) {
  const seo = mod.seo || {};
  const url = base + loc.lesson(mod.slug);
  const freeModule = mod.order <= free;
  const resource = {
    '@type': 'LearningResource',
    '@id': `${url}#lesson`,
    url,
    name: seo.title || mod.title,
    description: seo.description || mod.subtitle,
    inLanguage: loc.lang,
    learningResourceType: 'lesson',
    educationalLevel: mod.level,
    teaches: mod.tags || [],
    position: mod.order,
    isPartOf: { '@id': `${base}/#course` },
    provider: { '@id': `${base}/#org` },
    isAccessibleForFree: freeModule,
  };
  const t = timeRequired(md, loc);
  if (t) resource.timeRequired = t;
  // Разметка платного контента. Без неё «показали кусок, спрятали остальное»
  // выглядит для поисковика как маскировка (cloaking), а не как paywall.
  if (!freeModule) {
    resource.hasPart = { '@type': 'WebPageElement', isAccessibleForFree: false, cssSelector: '.lesson-paywall' };
  }
  return [{
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: loc.crumbs.home, item: base + loc.home },
          { '@type': 'ListItem', position: 2, name: loc.crumbs.lessons, item: base + loc.hub },
          { '@type': 'ListItem', position: 3, name: loc.crumbs.module(mod.order, mod.title) },
        ],
      },
      resource,
      { '@type': 'Course', '@id': `${base}/#course`, name: SITE_NAME, url: `${base}/`, provider: { '@id': `${base}/#org` } },
      { '@type': 'Organization', '@id': `${base}/#org`, name: SITE_NAME, url: `${base}/`, logo: `${base}/apple-touch-icon.png` },
    ],
  }];
}

// ---------------------------------------------------------------- хаб и служебные страницы
function hubBody (all, loc) {
  const items = all.map((m) => `
    <a class="syl-item" href="${loc.lesson(m.slug)}" style="text-decoration:none;color:inherit">
      <span class="syl-num">${String(m.order).padStart(2, '0')}</span> ${esc((m.seo || {}).h1 || m.title)}
    </a>`).join('');
  return `
<section class="hero container" style="padding-top:34px;padding-bottom:10px">
  <div class="eyebrow">${esc(loc.hubCopy.eyebrow)}</div>
  <h1>${loc.hubCopy.h1}</h1>
  <p class="sub">${esc(loc.hubCopy.sub)}</p>
</section>
<section class="section container" style="padding-top:10px">
  <div class="syllabus">${items}</div>
</section>`;
}

function errorBody (code, title, text, loc) {
  return `
<section class="hero container" style="padding-top:60px">
  <div class="eyebrow">${esc(loc.err.word)} ${code}</div>
  <h1>${esc(title)}</h1>
  <p class="sub">${esc(text)}</p>
  <div class="cta-row">
    <a href="${loc.home}" class="btn btn-primary btn-lg">${esc(loc.err.home)}</a>
    <a href="${loc.hub}" class="btn btn-ghost btn-lg">${esc(loc.err.all)}</a>
  </div>
</section>`;
}

/**
 * Карта сайта на обе локали. Каждая страница объявляет свой языковой двойник:
 * ссылки обязаны быть взаимными, иначе Google отбрасывает весь кластер целиком.
 */
function sitemap (base, sets) {
  const url = (href, extra) => `  <url><loc>${href}</loc>${extra || ''}</url>`;
  const pair = (ruHref, enHref) => [
    `<xhtml:link rel="alternate" hreflang="ru" href="${ruHref}"/>`,
    `<xhtml:link rel="alternate" hreflang="en" href="${enHref}"/>`,
    `<xhtml:link rel="alternate" hreflang="x-default" href="${ruHref}"/>`,
  ].join('');

  const home = pair(`${base}/`, `${base}/en.html`);
  const hubs = pair(base + LOCALES.ru.hub, base + LOCALES.en.hub);

  const rows = [
    url(`${base}/`, home),
    url(`${base}/en.html`, home),
    url(base + LOCALES.ru.hub, hubs),
    url(base + LOCALES.en.hub, hubs),
  ];

  // Уроки перечисляем парами по id модуля: языковой двойник есть у каждого.
  for (const m of sets.ru) {
    const twin = sets.enById.get(m.id);
    const ruHref = base + LOCALES.ru.lesson(m.slug);
    const enHref = twin ? base + LOCALES.en.lesson(twin.slug) : '';
    const alt = twin ? pair(ruHref, enHref) : '';
    const upd = (m.seo || {}).updated;
    rows.push(url(ruHref, alt + (upd ? `<lastmod>${upd}</lastmod>` : '')));
    if (twin) {
      const tupd = (twin.seo || {}).updated;
      rows.push(url(enHref, alt + (tupd ? `<lastmod>${tupd}</lastmod>` : '')));
    }
  }

  rows.push(url(`${base}/terms.html`), url(`${base}/privacy.html`));

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${rows.join('\n')}
</urlset>`;
}

function robots (base) {
  return `User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin
Disallow: /m/
Disallow: /app.html

Sitemap: ${base}/sitemap.xml
`;
}

// ---------------------------------------------------------------- счётчик показов
// Свой, серверный, без cookie и без чужих скриптов: privacy.html обещает, что
// сторонней аналитики на сайте нет, и обещание остаётся верным. Храним только
// (день, модуль, utm-источник) → число. Ни IP, ни user-agent, ни какого-либо
// идентификатора посетителя в файле нет.
const RETENTION_DAYS = 180;
const SRC_CAP = 50;          // utm_content задаётся снаружи: без потолка его можно раздуть

function makeViews (dataDir) {
  const file = path.join(dataDir, 'views.json');
  let data;
  try { data = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { data = { days: {}, lifetime: {} }; }
  if (!data.days) data.days = {};
  if (!data.lifetime) data.lifetime = {};
  let dirty = false;

  function kind (req) {
    const h = req.headers;
    if (h['sec-purpose'] || h.purpose === 'prefetch') return 'skip';
    if (/bot|crawl|spider|slurp|preview|headless|curl|wget|python-requests/i.test(h['user-agent'] || '')) return 'bots';
    if (h['sec-fetch-dest'] && h['sec-fetch-dest'] !== 'document') return 'skip';
    return 'views';
  }

  function source (req) {
    const pick = (k) => String(req.query[k] || '').slice(0, 64).replace(/[^A-Za-z0-9._-]/g, '');
    const src = pick('utm_source');
    const content = pick('utm_content');
    if (!src && !content) return 'direct';
    return `${src || 'unknown'}/${content || '-'}`;
  }

  function hit (req, id) {
    const k = kind(req);
    if (k === 'skip') return;
    const day = new Date().toISOString().slice(0, 10);
    if (!data.days[day]) data.days[day] = {};
    const m = data.days[day][id] || (data.days[day][id] = { views: 0, bots: 0, src: {} });
    m[k]++;
    if (k === 'views') {
      let key = source(req);
      if (!(key in m.src) && Object.keys(m.src).length >= SRC_CAP) key = 'other';
      m.src[key] = (m.src[key] || 0) + 1;
    }
    dirty = true;
  }

  function prune () {
    const edge = new Date(Date.now() - RETENTION_DAYS * 864e5).toISOString().slice(0, 10);
    for (const [day, mods] of Object.entries(data.days)) {
      if (day >= edge) continue;
      for (const [id, v] of Object.entries(mods)) {
        const l = data.lifetime[id] || (data.lifetime[id] = { views: 0, bots: 0 });
        l.views += v.views; l.bots += v.bots;
      }
      delete data.days[day];
      dirty = true;
    }
  }

  // Пишем через временный файл: рестарт посреди записи не должен оставить
  // обрезанный json.
  function flush () {
    if (!dirty) return;
    dirty = false;
    try {
      fs.mkdirSync(dataDir, { recursive: true });
      fs.writeFileSync(`${file}.tmp`, JSON.stringify(data));
      fs.renameSync(`${file}.tmp`, file);
    } catch (e) { console.error('[seo] счётчик не сохранён:', e.message); }
  }

  const timer = setInterval(() => { prune(); flush(); }, 30e3);
  if (timer.unref) timer.unref();
  // Railway шлёт SIGTERM на каждый редеплой — без этого терялись бы показы.
  for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, () => { flush(); process.exit(0); });

  return { hit, flush, data: () => data };
}

// ---------------------------------------------------------------- монтирование
/**
 * До express.static: подстановка {{BASE}} в статические html. Иначе
 * express.static отдаст файл первым, и canonical уедет в прод с литералом.
 *
 * (Html админки из public/ вынесен в views/ — оттуда express.static его не
 * достанет, и защита маршрутом requireAdmin становится единственным входом.)
 */
function mountEarly (app, deps) {
  const { base, publicDir } = deps;

  // Один сайт — один адрес. Пока PUBLIC_URL указывает на localhost (по
  // умолчанию он равен APP_URL), редирект спит и ничего не делает. Как только
  // подключён свой домен, старый *.up.railway.app перестаёт быть вторым
  // индексируемым зеркалом и уводит на канонический хост.
  const canonicalHost = (() => {
    try { return new URL(base).hostname; } catch { return ''; }
  })();
  const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)$/;

  if (canonicalHost && !LOCAL.test(canonicalHost)) {
    app.use((req, res, next) => {
      // Только навигация. POST не перенаправляем: вебхуки WayForPay и Stripe
      // приходят на APP_URL и обязаны дойти без прыжков.
      if (req.method !== 'GET' && req.method !== 'HEAD') return next();
      // /api/ — вебхуки и healthcheck платформы; /m/ — медиа, которые Threads
      // забирает по абсолютной ссылке на старом хосте.
      if (req.path.startsWith('/api/') || req.path.startsWith('/m/')) return next();
      const host = String(req.hostname || '');
      if (!host || LOCAL.test(host) || host === canonicalHost) return next();
      res.redirect(301, base + req.originalUrl);
    });
  }
  const PAGES = { '/': 'index.html', '/en.html': 'en.html', '/app.html': 'app.html',
    '/terms.html': 'terms.html', '/privacy.html': 'privacy.html' };

  for (const [route, file] of Object.entries(PAGES)) {
    const full = path.join(publicDir, file);
    if (!fs.existsSync(full)) { console.warn(`[seo] нет файла ${file}`); continue; }
    const html = fs.readFileSync(full, 'utf8').split('{{BASE}}').join(base);
    app.get(route, (req, res) => res.type('html').send(html));
  }
  // Без этого /index.html доедет до express.static и отдаст сырой файл с
  // литералом {{BASE}} — вторая копия главной страницы с битым canonical.
  app.get('/index.html', (req, res) => res.redirect(301, `${base}/`));
}

/**
 * После всех маршрутов: страницы уроков, sitemap, robots и обработчики
 * 404/500 — они обязаны быть последними в цепочке.
 */
/**
 * После всех маршрутов: страницы уроков на обе локали, sitemap, robots и
 * обработчики 404/500 — они обязаны быть последними в цепочке.
 */
function mountLate (app, deps) {
  const { base, modules, markdownPath, dataDir, freeModules, requireAdmin, loadDB } = deps;
  const views = makeViews(dataDir);

  // Ключ счётчика: для русского — просто id модуля (данные уже накоплены так),
  // для остальных локалей — с суффиксом, иначе m06 двух языков сложились бы.
  const viewKey = (lang, id) => (lang === 'ru' ? id : `${id}@${lang}`);

  const sets = {};   // lang -> массив модулей со slug
  const pages = {};  // lang -> Map slug -> {id, short, html}
  const ids = {};    // lang -> Map id -> slug

  for (const lang of Object.keys(LOCALES)) {
    const list = modules(lang).filter((m) => m.slug);
    sets[lang] = list;
    ids[lang] = new Map(list.map((m) => [m.id, m]));
  }

  for (const lang of Object.keys(LOCALES)) {
    const loc = LOCALES[lang];
    const all = sets[lang];
    const bySlug = new Map();
    pages[lang] = bySlug;

    for (const mod of all) {
      if (bySlug.has(mod.slug)) { console.warn(`[seo] ${lang}: дубль slug «${mod.slug}» (${mod.id})`); continue; }
      try {
        const md = fs.readFileSync(markdownPath(lang, mod.id), 'utf8');
        const teaser = lessonTeaser(md, loc);
        if (teaser.chars < THIN_CONTENT) console.warn(`[seo] ${lang}/${mod.id}: тонкая страница, ${teaser.chars} знаков`);
        const seo = mod.seo || {};
        // Языковой двойник объявляем только если он реально существует:
        // ссылка на 404 обнуляет весь кластер hreflang.
        const alternates = [];
        const ruTwin = ids.ru.get(mod.id);
        const enTwin = ids.en.get(mod.id);
        if (ruTwin && enTwin) {
          alternates.push(
            { lang: 'ru', href: base + LOCALES.ru.lesson(ruTwin.slug) },
            { lang: 'en', href: base + LOCALES.en.lesson(enTwin.slug) },
            { lang: 'x-default', href: base + LOCALES.ru.lesson(ruTwin.slug) },
          );
        }
        const html = page({
          loc, base, alternates,
          title: seo.title || `${mod.title} — ${SITE_NAME}`,
          description: seo.description || mod.subtitle,
          canonical: base + loc.lesson(mod.slug),
          image: `${loc.ogDir}/${mod.id}.png`,
          ogType: 'article',
          jsonld: lessonJsonLd(mod, base, teaser, md, freeModules, loc),
          body: lessonBody(mod, teaser, all, freeModules, md, loc),
          cta: CTA_TOKEN,   // подставим на запрос, см. ниже
        });
        bySlug.set(mod.slug, { id: mod.id, lang, short: seo.short || '', html });
      } catch (e) {
        // Кривой модуль стоит одной страницы, а не всего сервера.
        console.warn(`[seo] ${lang}/${mod.id}: страница не собрана — ${e.message}`);
      }
    }
    console.log(`[seo] страниц уроков (${lang}): ${bySlug.size}/${modules(lang).length}`);
  }

  // Ссылку на приложение собираем на сервере: метки из описания ролика
  // переживают выключенный JavaScript, а страница остаётся без единого скрипта.
  function ctaHref (req, short) {
    const q = new URLSearchParams();
    for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content']) {
      const v = String(req.query[k] || '').slice(0, 64).replace(/[^A-Za-z0-9._-]/g, '');
      if (v) q.set(k, v);
    }
    if (!q.get('utm_source') && short) {
      q.set('utm_source', 'youtube'); q.set('utm_medium', 'shorts'); q.set('utm_content', short);
    }
    const qs = q.toString();
    return qs ? `/app.html?${qs}` : '/app.html';
  }

  for (const lang of Object.keys(LOCALES)) {
    const loc = LOCALES[lang];
    const all = sets[lang];
    const bySlug = pages[lang];
    const byId = new Map(all.map((m) => [m.id, m.slug]));

    const hubHtml = page({
      loc, base,
      title: loc.hubCopy.title,
      description: loc.hubCopy.description,
      canonical: base + loc.hub,
      alternates: [
        { lang: 'ru', href: base + LOCALES.ru.hub },
        { lang: 'en', href: base + LOCALES.en.hub },
        { lang: 'x-default', href: base + LOCALES.ru.hub },
      ],
      jsonld: [{
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        itemListElement: all.map((m) => ({
          '@type': 'ListItem', position: m.order, url: base + loc.lesson(m.slug), name: m.title,
        })),
      }],
      body: hubBody(all, loc),
    });

    app.get(loc.hub, (req, res) => res.type('html').send(hubHtml));

    app.get(loc.lesson(':key'), (req, res, next) => {
      const key = String(req.params.key || '').toLowerCase();
      // Один адрес — одна страница: регистр и id-алиас сводим постоянным
      // редиректом, иначе те же тексты живут по трём URL.
      const alias = byId.get(key);
      if (alias && alias !== key) return res.redirect(301, base + loc.lesson(alias));
      const lesson = bySlug.get(key);
      if (!lesson) return next();
      if (req.params.key !== key) return res.redirect(301, base + loc.lesson(key));
      views.hit(req, viewKey(lang, lesson.id));
      // Перезагрузка в пределах двух минут не долетает до сервера — это
      // дедупликация без единого идентификатора посетителя.
      res.set('Cache-Control', 'private, max-age=120');
      res.type('html').send(lesson.html.split(CTA_TOKEN).join(esc(ctaHref(req, lesson.short))));
    });
  }

  app.get('/sitemap.xml', (req, res) => res.type('application/xml')
    .send(sitemap(base, { ru: sets.ru, enById: ids.en })));
  app.get('/robots.txt', (req, res) => res.type('text/plain').send(robots(base)));

  app.get('/api/admin/views', requireAdmin, (req, res) => {
    const db = loadDB();
    const signups = {};
    for (const u of Object.values(db.users || {})) {
      const c = u.source && u.source.utm_content;
      if (!c) continue;
      const row = signups[c] || (signups[c] = { total: 0, subscribed: 0 });
      row.total++;
      if (u.subscribed) row.subscribed++;
    }
    const data = views.data();
    const since = (n) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
    const sum = (key, from, field) => Object.entries(data.days)
      .filter(([d]) => d >= from).reduce((a, [, m]) => a + ((m[key] || {})[field] || 0), 0);

    const rows = [];
    for (const lang of Object.keys(LOCALES)) {
      for (const m of sets[lang]) {
        const key = viewKey(lang, m.id);
        const short = (m.seo || {}).short || '';
        const life = data.lifetime[key] || { views: 0, bots: 0 };
        rows.push({
          id: m.id, lang, order: m.order, title: m.title, slug: m.slug, short,
          url: LOCALES[lang].lesson(m.slug),
          views7: sum(key, since(7), 'views'),
          views30: sum(key, since(30), 'views'),
          total: sum(key, '0000-00-00', 'views') + life.views,
          bots: sum(key, '0000-00-00', 'bots') + life.bots,
          signups: (signups[short] || {}).total || 0,
          subscribed: (signups[short] || {}).subscribed || 0,
        });
      }
    }
    rows.sort((a, b) => b.views30 - a.views30 || a.order - b.order || a.lang.localeCompare(b.lang));
    res.json({ lessons: rows });
  });

  // Служебные страницы отдаём на языке раздела: англоязычный посетитель,
  // промахнувшийся мимо /en/lesson/..., не должен получить русскую 404.
  const errPages = {};
  for (const lang of Object.keys(LOCALES)) {
    const loc = LOCALES[lang];
    errPages[lang] = {
      notFound: page({
        loc, base, noindex: true,
        title: `${loc.err.title404} — ${SITE_NAME}`,
        description: loc.err.t404,
        canonical: `${base}${lang === 'ru' ? '' : '/en'}/404`,
        body: errorBody(404, loc.err.h404, loc.err.t404, loc),
      }),
      serverError: page({
        loc, base, noindex: true,
        title: `${loc.err.title500} — ${SITE_NAME}`,
        description: loc.err.t500,
        canonical: `${base}${lang === 'ru' ? '' : '/en'}/500`,
        body: errorBody(500, loc.err.h500, loc.err.t500, loc),
      }),
    };
  }
  const langOf = (req) => (/^\/en(\/|\.html|$)/.test(req.path) ? 'en' : 'ru');

  app.use((req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Не найдено' });
    // Именно 404, а не 200: «мягкие» 404 поисковик считает ошибкой качества.
    res.status(404).type('html').send(errPages[langOf(req)].notFound);
  });
  // Обработчика ошибок в приложении не было вовсе — исключение в любом
  // маршруте отдавало стандартную страницу Express со стеком.
  app.use((err, req, res, next) => {
    console.error(err);
    if (req.path.startsWith('/api/')) return res.status(500).json({ error: 'Ошибка сервера' });
    res.status(500).type('html').send(errPages[langOf(req)].serverError);
  });
}

module.exports = { mountEarly, mountLate, lessonTeaser, timeRequired };
