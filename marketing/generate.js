#!/usr/bin/env node
// Генератор EN-постов для соцсетей из реальных материалов курса (content/en).
// Раз в неделю создаёт пачку постов в marketing/queue/ + PNG-карточки.
//
//   node marketing/generate.js [--posts 7] [--offline] [--dry-run]
//
// --offline  — без Claude API (шаблонные тексты; для теста конвейера)
// --dry-run  — напечатать посты, ничего не записывать
// Нужен ANTHROPIC_API_KEY (кроме --offline).

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const QUEUE_DIR = path.join(__dirname, 'queue');
const STATE_FILE = path.join(__dirname, 'state.json');
const APP_URL = process.env.APP_URL || 'https://ml-simulator-app-production.up.railway.app';
const MODEL = process.env.MARKETING_MODEL || 'claude-sonnet-5';

// Порядок рубрик: 5 контентных + 1 продуктовая на каждые 6 постов.
// 'audience' — темы из marketing/topics.json под три аудитории
// (новички / свитчеры из разработки / бизнес-контекст).
const RUBRICS = ['interview', 'quiz', 'audience', 'lesson', 'story', 'product'];

const args = process.argv.slice(2);
const OFFLINE = args.includes('--offline');
const DRY_RUN = args.includes('--dry-run');
const VIDEOS_ONLY = args.includes('--videos-only'); // досборка mp4 для готовой очереди
const POSTS = Number(args[args.indexOf('--posts') + 1]) || 7;

// ---------- контент курса ----------

function loadJSON(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

const modules = loadJSON(path.join(ROOT, 'content/en/modules.json'));
const quizzes = loadJSON(path.join(ROOT, 'content/en/quizzes.json'));
const interviews = loadJSON(path.join(ROOT, 'content/en/interviews.json'));
const topics = loadJSON(path.join(__dirname, 'topics.json')).topics;

// Плоские списки для ротации
const quizPool = [];
for (const [mod, list] of Object.entries(quizzes)) {
  list.forEach((q, i) => quizPool.push({ key: `${mod}:${i}`, mod, ...q }));
}
const interviewPool = [];
for (const [track, list] of Object.entries(interviews.questions)) {
  list.forEach((q, i) => interviewPool.push({ key: `${track}:${i}`, track, ...q }));
}

// Тексты модулей без SVG-вставок и разметки — сырьё для мини-уроков
function moduleExcerpt(id) {
  const md = fs.readFileSync(path.join(ROOT, `content/en/${id}.md`), 'utf8');
  return md
    .replace(/<figure[\s\S]*?<\/figure>/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .slice(0, 3000);
}

const PRODUCT_FACTS = [
  'The first 2 modules and the whole Junior interview track are completely free — no card required.',
  'You get a "Middle-track ML Engineer" certificate after passing all 20 core modules (70% quiz threshold).',
  'The course is a workplace simulator: you are "hired" as a Junior ML Engineer at fictional company Datacore and grow to Middle through 20 real business cases.',
  'There is a built-in interview simulator: Junior, Middle and ML System Design tracks with model answers.',
  'Full access is $20/month — modules 3–23, Middle + System Design interview tracks, certificate.',
  '3 advanced modules are based on the book "Machine Learning System Design" (Babushkin & Kravchenko, Manning).',
];

// ---------- состояние ротации ----------

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return { cursor: 0, used: { quiz: [], interview: [], lesson: [], story: [], product: [] } };
  }
}

function pickRotating(pool, usedKeys, keyFn) {
  let candidates = pool.filter((x) => !usedKeys.includes(keyFn(x)));
  if (!candidates.length) {
    usedKeys.length = 0; // весь пул пройден — начинаем заново
    candidates = pool;
  }
  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  usedKeys.push(keyFn(pick));
  return pick;
}

function pickSource(rubric, state) {
  const used = (state.used[rubric] = state.used[rubric] || []);
  switch (rubric) {
    case 'audience':
      return pickRotating(topics, used, (t) => t.id);
    case 'quiz':
      return pickRotating(quizPool, used, (q) => q.key);
    case 'interview':
      return pickRotating(interviewPool, used, (q) => q.key);
    case 'lesson': {
      const m = pickRotating(modules, used, (m) => m.id);
      return { ...m, excerpt: moduleExcerpt(m.id) };
    }
    case 'story': {
      const m = pickRotating(modules, used, (m) => m.id);
      return { ...m, excerpt: moduleExcerpt(m.id).slice(0, 1500) };
    }
    case 'product':
      return { fact: pickRotating(PRODUCT_FACTS, used, (f) => f) };
  }
}

// ---------- промпты ----------

const COMMON_RULES = `
You write organic social media posts in English promoting "ML Career Simulator" —
a gamified course where the learner is hired as a Junior ML Engineer at fictional
company Datacore and grows to Middle through 20 real business cases.

Rules:
- Put the literal placeholder {{LINK}} exactly once in each post text (it becomes a tracked URL).
- First line must be a scroll-stopping hook. No "In today's fast-paced world" clichés, no emoji spam (max 2 emoji per post).
- facebook text: up to 500 chars, casual. linkedin text: up to 1200 chars, professional but human, short paragraphs, 3-5 hashtags at the end (e.g. #MachineLearning #MLEngineer #DataScience).
- tiktok text: a video caption up to 150 chars, punchy, 3-4 hashtags (#ml #machinelearning #techcareer), NO links and NO {{LINK}} — end with "Link in bio".
- instagram text: up to 400 chars, hook first line, 5-8 hashtags at the end, NO links and NO {{LINK}} (links are not clickable there) — end with "Link in bio".
- The card is a square image: kicker (small label, up to 30 chars), headline (up to 60 chars, the hook), lines (2-4 bullet strings, up to 55 chars each), footer is fixed by the system.
- Never invent facts about the course beyond what is given.

Return ONLY valid JSON, no markdown fences:
{"facebook": "...", "linkedin": "...", "tiktok": "...", "instagram": "...", "card": {"kicker": "...", "headline": "...", "lines": ["...", "..."]}}`;

const AUDIENCE_VOICE = {
  beginner: `Audience: complete beginners who dream of starting ML but feel intimidated.
Tone: encouraging, zero jargon (explain any term in one clause), remove fear. CTA: the first 2 modules are free, start today.`,
  switcher: `Audience: working software engineers considering a switch to ML.
Tone: peer-to-peer, respect their existing skills, map ML concepts to engineering concepts they know. CTA: the simulator feels like a real job, not a course — see if the work suits you.`,
  business: `Audience: students, product managers and analysts who want to understand the business side of ML.
Tone: business-first, money and decisions over math, concrete company examples. CTA: the course teaches ML through real business cases — understand what your future team actually does.`,
};

function buildPrompt(rubric, src) {
  switch (rubric) {
    case 'audience':
      return `${COMMON_RULES}

Rubric: audience-targeted post.
${AUDIENCE_VOICE[src.audience]}
Topic: ${src.topic}
Angle to take: ${src.angle}

Post format: open with a hook that names the reader's situation, deliver one genuinely useful insight on the topic (not a teaser — real value), then bridge naturally to the CTA with {{LINK}}. Card: the topic as headline, 2-3 key points as lines.`;
    case 'interview':
      return `${COMMON_RULES}

Rubric: "ML interview question of the day". Track: ${src.track}.
Question: ${src.q}
Model answer (source material): ${src.a}

Post format: pose the interview question, give a condensed 2-3 sentence version of the strong answer, then invite readers to practice full mock interviews (Junior track is free) at {{LINK}}. Card: the question as headline (shorten if needed), key answer points as lines.`;
    case 'quiz':
      return `${COMMON_RULES}

Rubric: "Quiz challenge" — engagement bait: readers answer in the comments.
Question: ${src.question}
Options: ${src.options.map((o, i) => `${'ABCD'[i]}) ${o}`).join(' ')}
Correct: ${'ABCD'[src.answer]} — ${src.explanation}

Post format: pose the question with the lettered options, ask "Answer in the comments — I'll post the explanation tomorrow", mention 120 such questions inside the course at {{LINK}}. Do NOT reveal the correct answer in the post. Card: question as headline, the four options as lines.`;
    case 'lesson':
      return `${COMMON_RULES}

Rubric: "60-second ML lesson" based on course module "${src.title}" (${src.subtitle}).
Module excerpt (source material):
${src.excerpt}

Post format: teach ONE concrete, practical takeaway from the excerpt in plain language (a mistake to avoid, a rule of thumb, an insight). End with: this is 1 of 23 hands-on modules at {{LINK}}. Card: the takeaway as headline, 2-4 supporting points as lines.`;
    case 'story':
      return `${COMMON_RULES}

Rubric: "A day at Datacore" — a mini workplace story from the course narrative.
Module: "${src.title}" — ${src.subtitle}. Excerpt: ${src.excerpt}

Post format: tell the business situation as a short relatable story (the deadline, the confused stakeholder, the model that failed...), tease how an ML engineer solves it, invite readers to live this scenario themselves at {{LINK}}. Card: the dramatic moment as headline.`;
    case 'product':
      return `${COMMON_RULES}

Rubric: product post (direct promo, still valuable and honest).
Key fact to build the post around: ${src.fact}

Post format: lead with the learner's pain (tutorials don't get you hired, theory without practice), present the simulator and the key fact, clear CTA to start free at {{LINK}}. Card: the offer as headline.`;
  }
}

// ---------- Claude API ----------

async function callClaude(prompt) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY не задан (или используйте --offline)');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data.content.map((c) => c.text || '').join('');
  const jsonText = text.replace(/^```(json)?\s*/i, '').replace(/```\s*$/, '').trim();
  return JSON.parse(jsonText);
}

// Шаблонные посты без API — только чтобы проверить конвейер end-to-end
function offlinePost(rubric, src) {
  const map = {
    audience: () => ({
      facebook: `${src.topic}\n\n(${src.angle})\n\nStart free: {{LINK}}`,
      linkedin: `${src.topic}\n\n${src.angle}\n\nStart free: {{LINK}}\n\n#MachineLearning #MLEngineer #CareerGrowth`,
      tiktok: `${src.topic.slice(0, 100)} #ml #machinelearning #techcareer — Link in bio`,
      card: { kicker: src.audience === 'switcher' ? 'FOR ENGINEERS' : src.audience === 'business' ? 'ML × BUSINESS' : 'START IN ML', headline: src.topic.slice(0, 60), lines: [src.angle.slice(0, 55)] },
    }),
    interview: () => ({
      facebook: `ML interview question: ${src.q}\n\nCould you answer it out loud? Practice the full mock interview (free Junior track): {{LINK}}`,
      linkedin: `ML interview question of the day (${src.track} track):\n\n"${src.q}"\n\nStrong candidates answer in under a minute. Practice with model answers — the Junior track is free: {{LINK}}\n\n#MachineLearning #MLEngineer #DataScience`,
      tiktok: 'Could you answer this ML interview question out loud? #ml #machinelearning #interview — Link in bio',
      card: { kicker: 'INTERVIEW QUESTION', headline: src.q.slice(0, 60), lines: ['Can you answer in 60 seconds?', 'Model answer inside'] },
    }),
    quiz: () => ({
      facebook: `Quiz time!\n\n${src.question}\n${src.options.map((o, i) => `${'ABCD'[i]}) ${o}`).join('\n')}\n\nAnswer in the comments! 120 more inside: {{LINK}}`,
      linkedin: `ML quiz — answer in the comments:\n\n${src.question}\n\n${src.options.map((o, i) => `${'ABCD'[i]}) ${o}`).join('\n')}\n\nExplanation tomorrow. 120 questions like this in the course: {{LINK}}\n\n#MachineLearning #Quiz #DataScience`,
      tiktok: 'ML quiz — answer in the comments! #ml #machinelearning #quiz — Link in bio',
      card: { kicker: 'ML QUIZ', headline: src.question.slice(0, 60), lines: src.options.map((o, i) => `${'ABCD'[i]}) ${o}`.slice(0, 55)) },
    }),
    lesson: () => ({
      facebook: `60-second ML lesson: ${src.title}.\n\n${src.subtitle}\n\nOne of 23 hands-on modules: {{LINK}}`,
      linkedin: `60-second ML lesson from module "${src.title}":\n\n${src.subtitle}\n\nThis is 1 of 23 hands-on modules in the ML Career Simulator: {{LINK}}\n\n#MachineLearning #MLEngineer #Learning`,
      tiktok: '60-second ML lesson. #ml #machinelearning #learnontiktok — Link in bio',
      card: { kicker: '60-SECOND LESSON', headline: src.title.slice(0, 60), lines: [src.subtitle.slice(0, 55)] },
    }),
    story: () => ({
      facebook: `A day at Datacore: ${src.title}.\n\n${src.subtitle}\n\nLive this scenario yourself: {{LINK}}`,
      linkedin: `A day in the life of an ML engineer at Datacore:\n\n"${src.title}" — ${src.subtitle}\n\nThe ML Career Simulator lets you live these scenarios: {{LINK}}\n\n#MachineLearning #CareerGrowth #DataScience`,
      tiktok: 'A day in the life of an ML engineer. #ml #techcareer #dayinthelife — Link in bio',
      card: { kicker: 'A DAY AT DATACORE', headline: src.title.slice(0, 60), lines: [src.subtitle.slice(0, 55)] },
    }),
    product: () => ({
      facebook: `Tutorials don't get you hired. Practice does.\n\n${src.fact}\n\nStart free: {{LINK}}`,
      linkedin: `Tutorials don't get you hired. Practice does.\n\n${src.fact}\n\nStart free — no card required: {{LINK}}\n\n#MachineLearning #MLEngineer #CareerGrowth`,
      tiktok: 'From Junior to Middle ML Engineer — through real work cases. #ml #machinelearning #techcareer — Link in bio',
      card: { kicker: 'ML CAREER SIMULATOR', headline: 'From Junior to Middle ML Engineer', lines: [src.fact.slice(0, 55)] },
    }),
  };
  return map[rubric]();
}

// ---------- сборка постов ----------

function trackedLink(platform, postId) {
  return `${APP_URL}/en.html?utm_source=${platform}&utm_medium=social&utm_campaign=organic&utm_content=${postId}`;
}

// Собрать недостающие видео для уже сгенерированных постов (например, если
// при генерации не было ffmpeg)
async function videosOnly() {
  const { makeVideo } = require('./make-video');
  for (const f of fs.readdirSync(QUEUE_DIR).filter((f) => f.endsWith('.json'))) {
    const p = JSON.parse(fs.readFileSync(path.join(QUEUE_DIR, f), 'utf8'));
    if (p.video && fs.existsSync(path.join(QUEUE_DIR, p.video))) continue;
    p.video = `${p.id}.mp4`;
    await makeVideo(p, path.join(QUEUE_DIR, p.video));
    fs.writeFileSync(path.join(QUEUE_DIR, f), JSON.stringify(p, null, 2));
    console.log(`✓ видео ${p.video}`);
  }
}

async function main() {
  if (VIDEOS_ONLY) return videosOnly();
  if (!OFFLINE) await require('./tls-fix').ensureTls();
  const state = loadState();
  const posts = [];
  const startDate = new Date(); // первый пост — сегодня, дальше по одному в день

  for (let i = 0; i < POSTS; i++) {
    const rubric = RUBRICS[(state.cursor + i) % RUBRICS.length];
    const src = pickSource(rubric, state);
    process.stderr.write(`[${i + 1}/${POSTS}] ${rubric}...\n`);
    let gen;
    if (OFFLINE) {
      gen = offlinePost(rubric, src);
    } else {
      // обрезанный/невалидный JSON от модели — просто пробуем ещё раз
      for (let attempt = 1; ; attempt++) {
        try { gen = await callClaude(buildPrompt(rubric, src)); break; }
        catch (e) {
          if (attempt >= 3) throw e;
          process.stderr.write(`  попытка ${attempt} не удалась (${e.message.slice(0, 80)}), повтор...\n`);
        }
      }
    }

    const date = new Date(startDate.getTime() + i * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const id = `${date}-${rubric}-${crypto.randomBytes(3).toString('hex')}`;
    posts.push({
      id,
      scheduledFor: date,
      rubric,
      texts: {
        facebook: gen.facebook.replace('{{LINK}}', trackedLink('facebook', id)),
        linkedin: gen.linkedin.replace('{{LINK}}', trackedLink('linkedin', id)),
        // TikTok и Instagram не дают кликабельных ссылок — CTA "Link in bio"
        tiktok: (gen.tiktok || '').replace(/\s*\{\{LINK\}\}\s*/g, ' ').trim(),
        instagram: (gen.instagram || gen.tiktok || '').replace(/\s*\{\{LINK\}\}\s*/g, ' ').trim(),
      },
      card: { ...gen.card, footer: 'ml-simulator · start free' },
      image: `${id}.png`,
      video: `${id}.mp4`,
      published: {},
    });
  }
  state.cursor = (state.cursor + POSTS) % RUBRICS.length;

  if (DRY_RUN) {
    for (const p of posts) {
      console.log(`\n===== ${p.id} =====`);
      console.log(`--- facebook ---\n${p.texts.facebook}`);
      console.log(`--- linkedin ---\n${p.texts.linkedin}`);
      console.log(`--- card --- ${JSON.stringify(p.card)}`);
    }
    return;
  }

  fs.mkdirSync(QUEUE_DIR, { recursive: true });
  const { renderCard } = require('./render-card');
  const { makeVideo } = require('./make-video');
  for (const p of posts) {
    await renderCard(p.card, path.join(QUEUE_DIR, p.image));
    try {
      await makeVideo(p, path.join(QUEUE_DIR, p.video));
    } catch (e) {
      // без ffmpeg пост остаётся валидным для FB/LinkedIn, TikTok его пропустит
      console.warn(`  видео не собрано (${e.message.split('\n')[0]}) — пост без TikTok`);
      delete p.video;
    }
    fs.writeFileSync(path.join(QUEUE_DIR, `${p.id}.json`), JSON.stringify(p, null, 2));
    console.log(`✓ ${p.id}`);
  }
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  console.log(`\nГотово: ${posts.length} постов в marketing/queue/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
