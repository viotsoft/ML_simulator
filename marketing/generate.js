#!/usr/bin/env node
// Генератор EN-постов для соцсетей из реальных материалов курса (content/en).
// Используется сервером (админ-панель, планировщик) и как CLI:
//
//   node marketing/generate.js [--posts 7] [--offline] [--dry-run] [--videos-only]
//
// --offline  — без Claude API (шаблонные тексты; для теста конвейера)
// --dry-run  — напечатать посты, ничего не записывать
// Ключ Anthropic — из панели (credentials.json) или env ANTHROPIC_API_KEY.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const store = require('./credentials');

const ROOT = path.join(__dirname, '..');
const { QUEUE_DIR, STATE_FILE } = store;
const APP_URL = process.env.APP_URL || 'https://ml-simulator-app-production.up.railway.app';
const MODEL = process.env.MARKETING_MODEL || 'claude-sonnet-5';

// Порядок рубрик: 5 контентных + 1 продуктовая на каждые 6 постов.
// 'audience' — темы из marketing/topics.json под три аудитории
// (новички / свитчеры из разработки / бизнес-контекст).
const RUBRICS = ['interview', 'quiz', 'audience', 'lesson', 'story', 'product'];

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
    return { cursor: 0, used: {} };
  }
}

function saveState(state) {
  store.ensureDirs();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
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
- x text: a tweet up to 240 chars INCLUDING one {{LINK}}, punchy, 1-2 hashtags max.
- threads text: up to 450 chars, conversational, ends with {{LINK}}, 0-2 hashtags.
- The card is a square image: kicker (small label, up to 30 chars), headline (up to 60 chars, the hook), lines (2-4 bullet strings, up to 55 chars each), footer is fixed by the system.
- Never invent facts about the course beyond what is given.

Return ONLY valid JSON, no markdown fences:
{"facebook": "...", "linkedin": "...", "tiktok": "...", "instagram": "...", "x": "...", "threads": "...", "card": {"kicker": "...", "headline": "...", "lines": ["...", "..."]}}`;

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
${AUDIENCE_VOICE[src.audience] || AUDIENCE_VOICE.beginner}
Topic: ${src.topic}
Angle to take: ${src.angle || 'pick the strongest practical angle yourself'}

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
  const key = store.anthropicKey();
  if (!key) throw new Error('Ключ Anthropic не задан — добавьте его в Настройках панели (или ANTHROPIC_API_KEY)');
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

async function callClaudeRetry(prompt, log = () => {}) {
  // обрезанный/невалидный JSON от модели — просто пробуем ещё раз
  for (let attempt = 1; ; attempt++) {
    try { return await callClaude(prompt); }
    catch (e) {
      if (attempt >= 3) throw e;
      log(`  попытка ${attempt} не удалась (${e.message.slice(0, 80)}), повтор...`);
    }
  }
}

// Шаблонные посты без API — только чтобы проверить конвейер end-to-end
function offlinePost(rubric, src) {
  const map = {
    audience: () => ({
      facebook: `${src.topic}\n\n(${src.angle || ''})\n\nStart free: {{LINK}}`,
      linkedin: `${src.topic}\n\n${src.angle || ''}\n\nStart free: {{LINK}}\n\n#MachineLearning #MLEngineer #CareerGrowth`,
      tiktok: `${src.topic.slice(0, 100)} #ml #machinelearning #techcareer — Link in bio`,
      card: { kicker: src.audience === 'switcher' ? 'FOR ENGINEERS' : src.audience === 'business' ? 'ML × BUSINESS' : 'START IN ML', headline: src.topic.slice(0, 60), lines: [(src.angle || '').slice(0, 55)] },
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

function stripLink(text) {
  return (text || '').replace(/\s*\{\{LINK\}\}\s*/g, ' ').trim();
}

function assemblePost(rubric, gen, date, extra = {}) {
  const id = `${date}-${rubric}-${crypto.randomBytes(3).toString('hex')}`;
  return {
    id,
    scheduledFor: date,
    rubric,
    ...extra,
    texts: {
      facebook: gen.facebook.replace('{{LINK}}', trackedLink('facebook', id)),
      linkedin: gen.linkedin.replace('{{LINK}}', trackedLink('linkedin', id)),
      // TikTok и Instagram не дают кликабельных ссылок — CTA "Link in bio"
      tiktok: stripLink(gen.tiktok),
      instagram: stripLink(gen.instagram || gen.tiktok),
      x: (gen.x || `${(gen.card && gen.card.headline) || ''} {{LINK}}`).replace('{{LINK}}', trackedLink('x', id)).trim(),
      threads: (gen.threads || gen.facebook).replace('{{LINK}}', trackedLink('threads', id)),
    },
    card: { ...gen.card, footer: 'ml-simulator · start free' },
    image: `${id}.png`,
    video: `${id}.mp4`,
    published: {},
  };
}

// Карточка обязательна; видео — best effort (без ffmpeg пост валиден для
// сетей без видео, TikTok его пропустит)
async function renderMedia(post, log = () => {}) {
  store.ensureDirs();
  const { renderCard } = require('./render-card');
  await renderCard(post.card, path.join(QUEUE_DIR, post.image));
  try {
    const { makeVideo } = require('./make-video');
    await makeVideo(post, path.join(QUEUE_DIR, post.video));
  } catch (e) {
    log(`  видео не собрано (${e.message.split('\n')[0]})`);
    delete post.video;
  }
}

function savePost(post) {
  store.ensureDirs();
  fs.writeFileSync(path.join(QUEUE_DIR, `${post.id}.json`), JSON.stringify(post, null, 2));
}

// Еженедельная пачка: count постов начиная с сегодня, reels штук — в формате рилс
async function generateBatch(count = 7, { offline = false, reels = 0, log = console.log } = {}) {
  if (!offline) await require('./tls-fix').ensureTls();
  const state = loadState();
  const posts = [];
  const startDate = new Date();

  for (let i = 0; i < count; i++) {
    const rubric = RUBRICS[(state.cursor + i) % RUBRICS.length];
    const src = pickSource(rubric, state);
    log(`[${i + 1}/${count}] ${rubric}...`);
    const gen = offline ? offlinePost(rubric, src) : await callClaudeRetry(buildPrompt(rubric, src), log);
    const date = new Date(startDate.getTime() + i * 24 * 3600 * 1000).toISOString().slice(0, 10);
    posts.push(assemblePost(rubric, gen, date));
  }
  state.cursor = (state.cursor + count) % RUBRICS.length;

  // reels штук распределяем равномерно по пачке
  for (let r = 0; r < Math.min(reels, posts.length); r++) {
    posts[Math.floor((r + 0.5) * posts.length / Math.min(reels, posts.length))].format = 'reel';
  }

  for (const p of posts) {
    await renderMedia(p, log);
    savePost(p);
    log(`✓ ${p.id}`);
  }
  saveState(state);
  return posts;
}

// Спец-пост из панели: тема из банка (topicId) или своя (customTopic)
async function generateSpecial({ topicId, customTopic, audience = 'beginner', format = 'post', offline = false, log = console.log } = {}) {
  if (!offline) await require('./tls-fix').ensureTls();
  const state = loadState();
  let src;
  if (topicId) {
    src = topics.find((t) => t.id === topicId);
    if (!src) throw new Error(`Тема ${topicId} не найдена`);
    (state.used.audience = state.used.audience || []).push(topicId);
  } else if (customTopic) {
    src = { topic: customTopic, audience, angle: '' };
  } else {
    src = pickSource('audience', state);
  }
  const gen = offline ? offlinePost('audience', src) : await callClaudeRetry(buildPrompt('audience', src), log);
  const date = new Date().toISOString().slice(0, 10);
  const post = assemblePost('audience', gen, date, format === 'reel' ? { format: 'reel' } : {});
  await renderMedia(post, log);
  savePost(post);
  saveState(state);
  return post;
}

// Собрать недостающие видео для уже сгенерированных постов
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

module.exports = { generateBatch, generateSpecial, topics, RUBRICS };

// ---------- CLI ----------

if (require.main === module) {
  const args = process.argv.slice(2);
  const OFFLINE = args.includes('--offline');
  const DRY_RUN = args.includes('--dry-run');
  const POSTS = Number(args[args.indexOf('--posts') + 1]) || 7;

  (async () => {
    if (args.includes('--videos-only')) return videosOnly();
    if (DRY_RUN) {
      // dry-run: сгенерировать и напечатать, ничего не записывая
      const state = loadState();
      for (let i = 0; i < POSTS; i++) {
        const rubric = RUBRICS[(state.cursor + i) % RUBRICS.length];
        const src = pickSource(rubric, state);
        const gen = OFFLINE ? offlinePost(rubric, src) : await callClaudeRetry(buildPrompt(rubric, src), console.error);
        const date = new Date().toISOString().slice(0, 10);
        const p = assemblePost(rubric, gen, date);
        console.log(`\n===== ${p.id} =====`);
        console.log(`--- facebook ---\n${p.texts.facebook}`);
        console.log(`--- linkedin ---\n${p.texts.linkedin}`);
        console.log(`--- card --- ${JSON.stringify(p.card)}`);
      }
      return;
    }
    const posts = await generateBatch(POSTS, { offline: OFFLINE });
    console.log(`\nГотово: ${posts.length} постов в ${QUEUE_DIR}`);
  })().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
