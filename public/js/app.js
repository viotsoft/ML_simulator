/* ML Career Simulator — SPA (RU/EN) */
const view = document.getElementById('view');
const userPanel = document.getElementById('userPanel');

// ---------------------------------------------------------------- i18n
let LANG = localStorage.getItem('lang') || 'ru';
if (!['ru', 'en'].includes(LANG)) LANG = 'ru';

// Первое касание: запоминаем utm-метки, чтобы при регистрации знать источник
try {
  const qs = new URLSearchParams(location.search);
  if (qs.get('utm_source') && !localStorage.getItem('firstTouch')) {
    const ft = {};
    for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content']) {
      if (qs.get(k)) ft[k] = qs.get(k).slice(0, 64);
    }
    localStorage.setItem('firstTouch', JSON.stringify(ft));
  }
} catch {}
document.cookie = `lang=${LANG}; Path=/; Max-Age=31536000; SameSite=Lax`;
document.documentElement.lang = LANG;

const I18N = {
  ru: {
    appTitle: 'ML Career Simulator — рабочее место',
    logout: 'Выйти',
    billing: 'Подписка',
    authHint: 'Ваше «трудоустройство» в Datacore начинается с аккаунта. Первые 2 модуля бесплатны.',
    tabRegister: 'Регистрация',
    tabLogin: 'Вход',
    fieldName: 'Имя (появится на сертификате)',
    fieldNamePh: 'Иван Петров',
    fieldEmail: 'Email',
    fieldPass: 'Пароль',
    fieldPassPh: 'минимум 6 символов',
    btnRegister: 'Создать аккаунт и начать',
    btnLogin: 'Войти',
    welcomeToast: 'Добро пожаловать в Datacore! Начните с модуля 1.',
    navModules: '📚 Модули',
    navInterviews: '🎤 Собеседования',
    navAgents: '🤖 Агенты',
    agentsTitle: '🤖 Агентная инженерия',
    agentsIntro: 'Второй трек: от Junior до Senior AI Engineer. Двадцать кейсов о том, как строить агентные системы в реальной компании — и как выводить их на рынок. Сквозная история: CEO просит «маркетинговую фабрику», вы превращаете идею в работающую систему.',
    agentsRoadmap: (ready, total) => `Открыто ${ready} из ${total} модулей. Остальные выходят по мере готовности — без доплат.`,
    agentModuleN: (n) => `Модуль A${n}`,
    agentSoonTag: 'Скоро',
    agentSoonToast: 'Модуль ещё готовится — он появится здесь автоматически.',
    agentQuizTitle: (n) => `📝 Квиз модуля A${n}`,
    agentBackModules: '← Все модули трека «Агенты»',
    agentGrades: { start: 'Начинающий AI Engineer', junior: 'Junior AI Engineer', middle: 'Middle AI Engineer', senior: 'Senior AI Engineer 🏆' },
    agentCertBtn: '🎓 Сертификат AI Agent Engineer',
    agentCertHint: (n) => `Сертификат откроется после всех ${n} модулей трека`,
    agentCertHeader: 'ML Career Simulator · Сертификат AI Agent Engineer',
    agentCertBody: (n) => `успешно прошёл(ла) ${n} модулей трека агентной инженерии и подтвердил(а) уровень <b>AI Agent Engineer</b>: проектирование, запуск и вывод на рынок агентных систем.`,
    navCca: '🏛 Claude Architect',
    ccaTitle: '🏛 Подготовка к Claude Certified Architect',
    ccaIntro: 'Третий трек: подготовка к экзамену CCAR-F (Claude Certified Architect – Foundations). Двадцать модулей закрывают все 30 официальных целей экзамена, распределение — по весам доменов. В конце — пробный экзамен: 60 вопросов за 120 минут и отчёт по доменам, как в настоящем.',
    ccaDisclaimer: 'Независимая подготовка. Курс не аффилирован с Anthropic и не является официальной сертификацией; сам экзамен сдаётся отдельно.',
    ccaRoadmap: (ready, total) => `Открыто ${ready} из ${total} модулей. Остальные выходят по мере готовности — без доплат.`,
    ccaModuleN: (n) => `Модуль C${n}`,
    ccaSoonTag: 'Скоро',
    ccaSoonToast: 'Модуль ещё готовится — он появится здесь автоматически.',
    ccaQuizTitle: (n) => `📝 Квиз модуля C${n}`,
    ccaBackModules: '← Все модули трека «Claude Architect»',
    ccaGrades: { start: 'Начало подготовки', foundations: 'Foundations', practitioner: 'Practitioner', ready: 'Готов к экзамену 🏆' },
    ccaTs: (ts) => `Цели экзамена: ${ts}`,
    ccaExamBtn: (n, m) => `🎯 Пробный экзамен · ${n} вопросов / ${m} мин`,
    ccaExamSoon: 'Пробный экзамен откроется, когда банк вопросов будет набран.',
    ccaExamBest: (n) => `Лучший результат: ${n} из 1000`,
    ccaCertBtn: '🎓 Сертификат CCAR-F Exam Ready',
    ccaCertHint: (n) => `Сертификат откроется после всех ${n} модулей и пробного экзамена от 720`,
    ccaCertHeader: 'ML Career Simulator · CCAR-F Exam Ready',
    ccaCertBody: (n) => `успешно прошёл(ла) ${n} модулей трека подготовки к экзамену Claude Certified Architect – Foundations и сдал(а) пробный экзамен с результатом не ниже 720. Это внутренний сертификат ML Career Simulator, а не официальная сертификация Anthropic.`,
    grade: (g) => `Ваш грейд: ${g}`,
    grades: { advanced: 'Middle+ · Advanced complete 🏆', middle: 'Middle ML Engineer 🎉', almost: 'Middle (почти!)', track: 'Middle-track', juniorPlus: 'Junior+', junior: 'Junior' },
    passedOf: (p, n) => `Пройдено ${p} из ${n} модулей`,
    certBtn: '🎓 Открыть сертификат',
    certHint: (n) => `Сертификат откроется после базовых ${n} модулей`,
    subBtn: '⚡ Открыть все модули — $20/мес',
    moduleN: (n) => `Модуль ${n}`,
    quizScore: (s, t) => `Квиз: ${s}/${t}`,
    freeTag: 'Бесплатно',
    availableTag: 'Доступно',
    proTag: 'По подписке PRO',
    paywallTitle: 'Этот модуль — в подписке PRO',
    paywallText: 'Вы прошли бесплатную часть — стажировку. Дальше начинается настоящая работа: 21 модуль с боевыми кейсами, симулятор собеседований, финальный проект и сертификат Middle-track ML Engineer.',
    paywallPrice: '$20 <small>/ месяц · отмена в любой момент</small>',
    paywallBtn: 'Оформить подписку',
    paywallWait: 'Секунду…',
    paywallBack: '← Вернуться к модулям',
    paywallStripeNote: 'Оплата картой через Stripe Checkout — безопасная страница оплаты Stripe. Отменить подписку можно в один клик из личного кабинета.',
    paywallWayforpayNote: 'Оплата через WayForPay — украинский платёжный сервис, принимает карты со всего мира. Окно оплаты откроется прямо на странице. Отменить подписку можно кнопкой «Подписка» в шапке.',
    paywallDemoNote: 'Демо-режим: оплата активируется мгновенно без списания средств. Для боевого режима задайте ключи Stripe или WayForPay (см. README).',
    subOkToast: 'Подписка PRO активна — все модули открыты!',
    wfpConfirming: 'Оплата подтверждается…',
    wfpDeclined: 'Оплата не прошла. Попробуйте другую карту.',
    wfpPending: 'Платёж обрабатывается банком, обычно это занимает секунды.',
    cancelConfirm: 'Отменить подписку PRO? Доступ к платным модулям закроется.',
    cancelOkToast: 'Подписка отменена.',
    backModules: '← Все модули',
    quizTitle: (n) => `📝 Квиз модуля ${n}`,
    quizSub: 'Порог прохождения — 70%. Каждый ответ будет объяснён после проверки. Пересдавать можно сколько угодно.',
    quizCheck: 'Проверить ответы',
    quizAnswerAll: 'Ответьте на все вопросы.',
    quizPassed: (c, t) => `✅ Модуль пройден: ${c}/${t} правильных!`,
    quizFailed: (c, t) => `❌ ${c}/${t} — нужно минимум 70%. Перечитайте разборы выше и попробуйте ещё раз.`,
    quizNext: 'Следующий модуль →',
    quizRetry: 'Пересдать квиз',
    quizAll: 'Все модули',
    quizCert: '🎓 Получить сертификат',
    interviewsTitle: '🎤 Симулятор собеседований',
    interviewsIntro: 'Тренажёр в формате реального интервью: прочитайте вопрос, сформулируйте ответ вслух (серьёзно — вслух!), затем откройте эталонный разбор и сравните. Три трека — от скрининга джуна до ML System Design.',
    interviewsQ: (n) => `${n} вопросов`,
    interviewsFree: 'Бесплатно',
    interviewsPro: 'PRO',
    interviewsLocked: 'По подписке PRO',
    backTracks: '← Все треки собеседований',
    interviewHeader: (t) => `Собеседование: ${t}`,
    adviceLabel: 'Совет интервьюера:',
    trainHint: 'Как тренироваться: закройте разбор, ответьте на вопрос вслух за 2–3 минуты, потом сравните с эталоном.',
    questionOf: (i, n) => `Вопрос ${i}/${n}`,
    showAnswer: 'Показать разбор',
    hideAnswer: 'Скрыть разбор',
    certHeader: 'ML Career Simulator · Certificate of Completion',
    certTitle: 'Сертификат',
    certConfirms: 'подтверждает, что',
    certBody: (n) => `успешно прошёл(ла) ${n} модулей симулятора карьеры ML-инженера — от разведочного анализа данных до продакшен-деплоя и ML system design — и сдал(а) итоговый экзамен на уровень <b>Middle-track ML Engineer</b>.`,
    certDate: 'Дата',
    certPrint: '🖨 Распечатать / сохранить в PDF',
    checkoutOk: '🎉 Оплата прошла — подписка PRO активна!',
    checkoutPending: 'Оплата обрабатывается. Если доступ не откроется за пару минут — напишите в поддержку.',
    checkoutCancel: 'Оплата отменена — вы можете вернуться к ней в любой момент.',
  },
  en: {
    appTitle: 'ML Career Simulator — workplace',
    logout: 'Log out',
    billing: 'Subscription',
    authHint: 'Your "employment" at Datacore starts with an account. The first 2 modules are free.',
    tabRegister: 'Sign up',
    tabLogin: 'Log in',
    fieldName: 'Name (will appear on the certificate)',
    fieldNamePh: 'Jane Smith',
    fieldEmail: 'Email',
    fieldPass: 'Password',
    fieldPassPh: 'at least 6 characters',
    btnRegister: 'Create account & start',
    btnLogin: 'Log in',
    welcomeToast: 'Welcome to Datacore! Start with Module 1.',
    navModules: '📚 Modules',
    navInterviews: '🎤 Interviews',
    navAgents: '🤖 Agents',
    agentsTitle: '🤖 Agentic Engineering',
    agentsIntro: 'The second track: from Junior to Senior AI Engineer. Twenty cases on building agentic systems inside a real company — and taking them to market. One storyline: the CEO asks for a "marketing factory", you turn the idea into a working system.',
    agentsRoadmap: (ready, total) => `${ready} of ${total} modules are live. The rest ship as they are written — at no extra cost.`,
    agentModuleN: (n) => `Module A${n}`,
    agentSoonTag: 'Soon',
    agentSoonToast: 'This module is still being written — it will appear here automatically.',
    agentQuizTitle: (n) => `📝 Module A${n} quiz`,
    agentBackModules: '← All agent modules',
    agentGrades: { start: 'Getting started in AI', junior: 'Junior AI Engineer', middle: 'Middle AI Engineer', senior: 'Senior AI Engineer 🏆' },
    agentCertBtn: '🎓 AI Agent Engineer certificate',
    agentCertHint: (n) => `The certificate unlocks after all ${n} track modules`,
    agentCertHeader: 'ML Career Simulator · AI Agent Engineer Certificate',
    agentCertBody: (n) => `has successfully completed ${n} modules of the agentic engineering track and demonstrated the level of an <b>AI Agent Engineer</b>: designing, shipping and commercializing agentic systems.`,
    navCca: '🏛 Claude Architect',
    ccaTitle: '🏛 Claude Certified Architect prep',
    ccaIntro: 'The third track: preparation for the CCAR-F exam (Claude Certified Architect – Foundations). Twenty modules cover all 30 official exam objectives, weighted the way the domains are. It ends with a mock exam: 60 questions in 120 minutes and a per-domain report, just like the real one.',
    ccaDisclaimer: 'Independent preparation. This course is not affiliated with Anthropic and is not an official certification; the exam itself is taken separately.',
    ccaRoadmap: (ready, total) => `${ready} of ${total} modules are live. The rest ship as they are written — at no extra cost.`,
    ccaModuleN: (n) => `Module C${n}`,
    ccaSoonTag: 'Soon',
    ccaSoonToast: 'This module is still being written — it will appear here automatically.',
    ccaQuizTitle: (n) => `📝 Module C${n} quiz`,
    ccaBackModules: '← All Claude Architect modules',
    ccaGrades: { start: 'Getting started', foundations: 'Foundations', practitioner: 'Practitioner', ready: 'Exam ready 🏆' },
    ccaTs: (ts) => `Exam objectives: ${ts}`,
    ccaExamBtn: (n, m) => `🎯 Mock exam · ${n} questions / ${m} min`,
    ccaExamSoon: 'The mock exam opens once the question bank is complete.',
    ccaExamBest: (n) => `Best score: ${n} of 1000`,
    ccaCertBtn: '🎓 CCAR-F Exam Ready certificate',
    ccaCertHint: (n) => `Unlocks after all ${n} modules and a mock exam of 720 or higher`,
    ccaCertHeader: 'ML Career Simulator · CCAR-F Exam Ready',
    ccaCertBody: (n) => `has completed ${n} modules of the Claude Certified Architect – Foundations preparation track and passed the mock exam with a score of 720 or higher. This is an internal ML Career Simulator certificate, not an official Anthropic certification.`,
    grade: (g) => `Your grade: ${g}`,
    grades: { advanced: 'Middle+ · Advanced complete 🏆', middle: 'Middle ML Engineer 🎉', almost: 'Middle (almost!)', track: 'Middle-track', juniorPlus: 'Junior+', junior: 'Junior' },
    passedOf: (p, n) => `${p} of ${n} modules completed`,
    certBtn: '🎓 Open certificate',
    certHint: (n) => `The certificate unlocks after the ${n} core modules`,
    subBtn: '⚡ Unlock all modules — $20/mo',
    moduleN: (n) => `Module ${n}`,
    quizScore: (s, t) => `Quiz: ${s}/${t}`,
    freeTag: 'Free',
    availableTag: 'Available',
    proTag: 'PRO subscription',
    paywallTitle: 'This module is part of the PRO subscription',
    paywallText: 'You have finished the free part — the internship. Now the real job begins: 21 modules with real-world cases, an interview simulator, a capstone project and the Middle-track ML Engineer certificate.',
    paywallPrice: '$20 <small>/ month · cancel anytime</small>',
    paywallBtn: 'Subscribe',
    paywallWait: 'One second…',
    paywallBack: '← Back to modules',
    paywallStripeNote: 'Card payments via Stripe Checkout — Stripe’s secure payment page. Cancel your subscription in one click from your account.',
    paywallWayforpayNote: 'Payment via WayForPay — a Ukrainian payment service that accepts cards from anywhere in the world. The payment window opens right on this page. Cancel anytime with the "Subscription" button in the header.',
    paywallDemoNote: 'Demo mode: the subscription activates instantly with no charge. Set the Stripe or WayForPay keys to enable live payments (see README).',
    subOkToast: 'PRO subscription is active — all modules are unlocked!',
    wfpConfirming: 'Confirming payment…',
    wfpDeclined: 'Payment failed. Please try another card.',
    wfpPending: 'Your bank is processing the payment — usually just a few seconds.',
    cancelConfirm: 'Cancel your PRO subscription? Access to paid modules will end.',
    cancelOkToast: 'Subscription cancelled.',
    backModules: '← All modules',
    quizTitle: (n) => `📝 Module ${n} quiz`,
    quizSub: 'Passing threshold — 70%. Every answer is explained after checking. Unlimited retakes.',
    quizCheck: 'Check answers',
    quizAnswerAll: 'Please answer all questions.',
    quizPassed: (c, t) => `✅ Module passed: ${c}/${t} correct!`,
    quizFailed: (c, t) => `❌ ${c}/${t} — you need at least 70%. Re-read the explanations above and try again.`,
    quizNext: 'Next module →',
    quizRetry: 'Retake quiz',
    quizAll: 'All modules',
    quizCert: '🎓 Get certificate',
    interviewsTitle: '🎤 Interview simulator',
    interviewsIntro: 'A trainer in real-interview format: read the question, say your answer out loud (seriously — out loud!), then open the model answer and compare. Three tracks — from a junior screening to ML System Design.',
    interviewsQ: (n) => `${n} questions`,
    interviewsFree: 'Free',
    interviewsPro: 'PRO',
    interviewsLocked: 'PRO subscription',
    backTracks: '← All interview tracks',
    interviewHeader: (t) => `Interview: ${t}`,
    adviceLabel: 'Interviewer’s advice:',
    trainHint: 'How to practice: keep the answer hidden, answer out loud in 2–3 minutes, then compare with the model answer.',
    questionOf: (i, n) => `Question ${i}/${n}`,
    showAnswer: 'Show answer',
    hideAnswer: 'Hide answer',
    certHeader: 'ML Career Simulator · Certificate of Completion',
    certTitle: 'Certificate',
    certConfirms: 'this certifies that',
    certBody: (n) => `has successfully completed ${n} modules of the ML engineer career simulator — from exploratory data analysis to production deployment and ML system design — and passed the final exam at the <b>Middle-track ML Engineer</b> level.`,
    certDate: 'Date',
    certPrint: '🖨 Print / save as PDF',
    checkoutOk: '🎉 Payment received — PRO subscription is active!',
    checkoutPending: 'Payment is being processed. If access does not open within a couple of minutes, contact support.',
    checkoutCancel: 'Payment cancelled — you can come back to it anytime.',
  },
};
const t = (key, ...args) => {
  // фолбэк на основную локаль: забытый ключ не должен печатать "undefined"
  const v = I18N[LANG][key] !== undefined ? I18N[LANG][key] : I18N.ru[key];
  return typeof v === 'function' ? v(...args) : (v === undefined ? '' : v);
};

function setLang(lang) {
  if (lang === LANG) return;
  localStorage.setItem('lang', lang);
  document.cookie = `lang=${lang}; Path=/; Max-Age=31536000; SameSite=Lax`;
  location.reload();
}

let state = { user: null, modules: [], agentModules: [], ccaModules: [], paymentsMode: 'demo' };

const api = async (path, opts = {}) => {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'Server error'), { status: res.status, data });
  return data;
};

const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

function langSwitchHTML() {
  return `
    <div class="lang-switch">
      <button class="${LANG === 'ru' ? 'active' : ''}" data-lang="ru">RU</button>
      <button class="${LANG === 'en' ? 'active' : ''}" data-lang="en">EN</button>
    </div>`;
}
function bindLangSwitch(root) {
  (root || document).querySelectorAll('.lang-switch button').forEach((b) => {
    b.onclick = () => setLang(b.dataset.lang);
  });
}

// ---------------------------------------------------------------- шапка
function renderUserPanel() {
  const u = state.user;
  if (!u) {
    userPanel.innerHTML = langSwitchHTML();
    bindLangSwitch(userPanel);
    return;
  }
  const canManage = u.subscribed && (state.paymentsMode === 'stripe' || state.paymentsMode === 'wayforpay');
  userPanel.innerHTML = `
    ${langSwitchHTML()}
    <span class="badge ${u.subscribed ? 'badge-pro' : 'badge-free'}">${u.subscribed ? 'PRO' : 'FREE'}</span>
    <span>${esc(u.name)}</span>
    ${canManage ? `<button class="btn btn-ghost" style="padding:7px 14px;font-size:13px" id="billingBtn">${t('billing')}</button>` : ''}
    <button class="btn btn-ghost" style="padding:7px 16px;font-size:13px" id="logoutBtn">${t('logout')}</button>`;
  bindLangSwitch(userPanel);
  document.getElementById('logoutBtn').onclick = async () => {
    await api('/api/logout', { method: 'POST' });
    state.user = null;
    renderUserPanel();
    renderAuth();
  };
  const billingBtn = document.getElementById('billingBtn');
  if (billingBtn) billingBtn.onclick = async () => {
    if (state.paymentsMode === 'stripe') {
      try {
        const { url } = await api('/api/billing-portal', { method: 'POST' });
        window.location.href = url;   // Stripe Billing Portal
      } catch (e) { toast(e.message); }
      return;
    }
    // WayForPay: нет хостед-портала — отменяем напрямую через наш API
    if (!confirm(t('cancelConfirm'))) return;
    try {
      const data = await api('/api/wayforpay/cancel', { method: 'POST' });
      state.user = data.user;
      renderUserPanel();
      toast(t('cancelOkToast'));
      if (view.querySelector('.module-list') || view.querySelector('.paywall')) renderDashboard();
    } catch (e) { toast(e.message); }
  };
}

// ---------------------------------------------------------------- auth
function renderAuth(mode = 'register') {
  view.innerHTML = `
    <div class="auth-box">
      <h2>ML Career Simulator</h2>
      <div class="hint">${t('authHint')}</div>
      <div class="auth-tabs">
        <button id="tabReg" class="${mode === 'register' ? 'active' : ''}">${t('tabRegister')}</button>
        <button id="tabLog" class="${mode === 'login' ? 'active' : ''}">${t('tabLogin')}</button>
      </div>
      <div class="form-error" id="authError"></div>
      ${mode === 'register' ? `
        <div class="field"><label>${t('fieldName')}</label><input id="fName" placeholder="${t('fieldNamePh')}"></div>` : ''}
      <div class="field"><label>${t('fieldEmail')}</label><input id="fEmail" type="email" placeholder="you@example.com"></div>
      <div class="field"><label>${t('fieldPass')}</label><input id="fPass" type="password" placeholder="${t('fieldPassPh')}"></div>
      <button class="btn btn-primary" style="width:100%" id="authSubmit">
        ${mode === 'register' ? t('btnRegister') : t('btnLogin')}
      </button>
    </div>`;
  document.getElementById('tabReg').onclick = () => renderAuth('register');
  document.getElementById('tabLog').onclick = () => renderAuth('login');
  const submit = async () => {
    const err = document.getElementById('authError');
    err.textContent = '';
    const body = {
      email: document.getElementById('fEmail').value,
      password: document.getElementById('fPass').value,
    };
    if (mode === 'register') {
      body.name = document.getElementById('fName').value;
      try { body.source = JSON.parse(localStorage.getItem('firstTouch')); } catch {}
    }
    try {
      const data = await api(mode === 'register' ? '/api/register' : '/api/login',
        { method: 'POST', body: JSON.stringify(body) });
      state.user = data.user;
      renderUserPanel();
      renderDashboard();
      if (mode === 'register') toast(t('welcomeToast'));
    } catch (e) { err.textContent = e.message; }
  };
  document.getElementById('authSubmit').onclick = submit;
  view.querySelectorAll('input').forEach((i) => i.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); }));
}

// ---------------------------------------------------------------- навигация разделов
// Разделы описаны списком: новая вкладка — одна строка, а не правка в двух функциях.
const SECTIONS = [
  { key: 'modules', id: 'navModules', label: 'navModules', render: () => renderDashboard() },
  { key: 'interviews', id: 'navInterviews', label: 'navInterviews', render: () => renderInterviews() },
  { key: 'agents', id: 'navAgents', label: 'navAgents', render: () => renderAgents() },
  { key: 'cca', id: 'navCca', label: 'navCca', render: () => renderCca() },
];
function sectionTabs(active) {
  const buttons = SECTIONS.map((sec) =>
    `<button class="${active === sec.key ? 'active' : ''}" id="${sec.id}">${t(sec.label)}</button>`
  ).join('\n      ');
  return `
    <div class="section-tabs">
      ${buttons}
    </div>`;
}
function bindSectionTabs() {
  for (const sec of SECTIONS) {
    const el = document.getElementById(sec.id);
    if (el) el.onclick = sec.render;
  }
}

// ---------------------------------------------------------------- дашборд
async function renderDashboard() {
  const { modules } = await api('/api/modules');
  state.modules = modules;
  const u = state.user;
  const passed = modules.filter((m) => m.progress && m.progress.passed).length;
  const pct = Math.round((passed / modules.length) * 100);

  const g = I18N[LANG].grades;
  const grade = passed >= modules.length ? g.advanced
    : passed >= 20 ? g.middle
    : passed >= 17 ? g.almost
    : passed >= 10 ? g.track
    : passed >= 6 ? g.juniorPlus
    : g.junior;

  view.innerHTML = `
    ${sectionTabs('modules')}
    <div class="progress-panel">
      <div class="info">
        <div style="font-weight:700;font-size:18px">${t('grade', grade)}</div>
        <div style="color:var(--muted);font-size:14px;margin-top:2px">${t('passedOf', passed, modules.length)}</div>
        <div class="progress-bar"><div style="width:${pct}%"></div></div>
      </div>
      ${u.certificateReady
        ? `<button class="btn btn-primary" id="certBtn">${t('certBtn')}</button>`
        : `<div style="color:var(--muted);font-size:13px;max-width:200px">${t('certHint', 20)}</div>`}
      ${!u.subscribed ? `<button class="btn btn-ghost" id="subBtn">${t('subBtn')}</button>` : ''}
    </div>
    <div class="module-list">
      ${modules.map((m) => {
        const done = m.progress && m.progress.passed;
        const icon = done ? '✅' : m.unlocked ? '📂' : '🔒';
        const status = done
          ? t('quizScore', m.progress.score, m.progress.total)
          : m.unlocked ? (m.free ? t('freeTag') : t('availableTag')) : t('proTag');
        return `
        <div class="module-card ${m.unlocked ? '' : 'locked'}" data-id="${m.id}" data-unlocked="${m.unlocked}">
          <div class="module-status">${icon}</div>
          <div>
            <div class="m-title">${t('moduleN', m.order)}. ${esc(m.title)}</div>
            <div class="m-sub">${esc(m.subtitle)}</div>
          </div>
          <div class="module-meta">${esc(m.level)}<br>${status}</div>
        </div>`;
      }).join('')}
    </div>`;

  view.querySelectorAll('.module-card').forEach((card) => {
    card.onclick = () => {
      if (card.dataset.unlocked === 'true') renderModule(card.dataset.id);
      else renderPaywall();
    };
  });
  const certBtn = document.getElementById('certBtn');
  if (certBtn) certBtn.onclick = renderCertificate;
  const subBtn = document.getElementById('subBtn');
  if (subBtn) subBtn.onclick = renderPaywall;
  bindSectionTabs();
}

// ---------------------------------------------------------------- собеседования
async function renderInterviews() {
  const { tracks } = await api('/api/interviews');
  view.innerHTML = `
    ${sectionTabs('interviews')}
    <div class="interview-intro">
      <h2 style="margin-bottom:8px">${t('interviewsTitle')}</h2>
      <p style="color:var(--muted);max-width:640px">${t('interviewsIntro')}</p>
    </div>
    <div class="grid grid-3" style="margin-top:24px">
      ${tracks.map((tr) => `
        <div class="card track-card ${tr.unlocked ? '' : 'locked'}" data-id="${tr.id}" data-unlocked="${tr.unlocked}" style="cursor:pointer">
          <span class="icon">${tr.icon}</span>
          <h3>${esc(tr.title)} ${tr.unlocked ? '' : '🔒'}</h3>
          <p>${esc(tr.description)}</p>
          <div style="margin-top:14px;font-size:13px;color:${tr.unlocked ? 'var(--green)' : 'var(--amber)'};font-weight:600">
            ${t('interviewsQ', tr.count)} · ${tr.free ? t('interviewsFree') : tr.unlocked ? t('interviewsPro') : t('interviewsLocked')}
          </div>
        </div>`).join('')}
    </div>`;
  view.querySelectorAll('.track-card').forEach((card) => {
    card.onclick = () => {
      if (card.dataset.unlocked === 'true') renderInterviewTrack(card.dataset.id);
      else renderPaywall();
    };
  });
  bindSectionTabs();
}

async function renderInterviewTrack(id) {
  let data;
  try {
    data = await api(`/api/interview/${id}`);
  } catch (e) {
    if (e.status === 402) return renderPaywall();
    return toast(e.message);
  }
  const { track, questions } = data;
  view.innerHTML = `
    <div class="module-view">
      <a class="back-link" id="backLink">${t('backTracks')}</a>
      <h1 style="font-size:28px;margin-bottom:10px">${track.icon} ${t('interviewHeader', esc(track.title))}</h1>
      <blockquote class="advice">💡 <b>${t('adviceLabel')}</b> ${esc(track.advice)}</blockquote>
      <div style="margin:22px 0 8px;color:var(--muted);font-size:14px">${t('trainHint')}</div>
      ${questions.map((q, i) => `
        <div class="iq-card">
          <div class="iq-q"><span class="iq-num">${t('questionOf', i + 1, questions.length)}</span>${esc(q.q)}</div>
          <button class="btn btn-ghost iq-toggle" data-i="${i}" style="padding:8px 18px;font-size:13px">${t('showAnswer')}</button>
          <div class="iq-a" id="iqA${i}" hidden>${esc(q.a).replace(/\n/g, '<br>')}</div>
        </div>`).join('')}
    </div>`;
  document.getElementById('backLink').onclick = renderInterviews;
  view.querySelectorAll('.iq-toggle').forEach((btn) => {
    btn.onclick = () => {
      const el = document.getElementById(`iqA${btn.dataset.i}`);
      el.hidden = !el.hidden;
      btn.textContent = el.hidden ? t('showAnswer') : t('hideAnswer');
    };
  });
  window.scrollTo(0, 0);
}

// ---------------------------------------------------------------- WayForPay-виджет
// Скрипт грузим один раз и переиспользуем; окно оплаты открывается прямо
// на странице (без ухода на внешний сайт), как Stripe Elements.
let wfpScriptPromise = null;
function loadWfpScript() {
  if (window.Wayforpay) return Promise.resolve();
  if (!wfpScriptPromise) {
    wfpScriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://secure.wayforpay.com/server/pay-widget.js';
      s.onload = resolve;
      s.onerror = () => reject(new Error('WayForPay script failed to load'));
      document.head.appendChild(s);
    });
  }
  return wfpScriptPromise;
}

// После onApproved от виджета ждём, пока вебхук на сервере пометит
// подписку активной (обычно доли секунды) — коротко опрашиваем /api/me.
async function pollSubscribed(maxTries = 8, delayMs = 1200) {
  for (let i = 0; i < maxTries; i++) {
    const { user } = await api('/api/me');
    if (user && user.subscribed) return user;
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return null;
}

// ---------------------------------------------------------------- пейвол
function renderPaywall() {
  const note = state.paymentsMode === 'stripe' ? t('paywallStripeNote')
    : state.paymentsMode === 'wayforpay' ? t('paywallWayforpayNote')
    : t('paywallDemoNote');
  view.innerHTML = `
    <div class="paywall">
      <div class="lock">🔒</div>
      <h2>${t('paywallTitle')}</h2>
      <p>${t('paywallText')}</p>
      <div class="price-line">${t('paywallPrice')}</div>
      <button class="btn btn-primary btn-lg" id="paySub">${t('paywallBtn')}</button>
      <p style="margin-top:18px;font-size:13px">
        <a href="#" id="backDash">${t('paywallBack')}</a>
      </p>
      <p style="font-size:12px;color:var(--muted)">${note}</p>
    </div>`;
  const paySub = document.getElementById('paySub');
  const resetBtn = () => { paySub.disabled = false; paySub.textContent = t('paywallBtn'); };

  paySub.onclick = async () => {
    paySub.disabled = true;
    paySub.textContent = t('paywallWait');
    try {
      const data = await api('/api/subscribe', { method: 'POST' });

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;   // → Stripe Checkout
        return;
      }

      if (data.widget) {                            // → WayForPay-виджет
        await loadWfpScript();
        const wfp = new window.Wayforpay();
        paySub.textContent = t('paywallBtn');
        paySub.disabled = false;
        wfp.run(
          data.widget,
          async () => {                               // onApproved
            toast(t('wfpConfirming'));
            const user = await pollSubscribed();
            if (user) {
              state.user = user;
              renderUserPanel();
              toast(t('subOkToast'));
              renderDashboard();
            } else {
              toast(t('wfpPending'));
            }
          },
          () => toast(t('wfpDeclined')),              // onDeclined
          () => toast(t('wfpPending')),                // onPending
        );
        return;
      }

      state.user = data.user;                       // демо-режим
      renderUserPanel();
      toast(t('subOkToast'));
      renderDashboard();
    } catch (e) {
      toast(e.message);
      resetBtn();
    }
  };
  document.getElementById('backDash').onclick = (e) => { e.preventDefault(); renderDashboard(); };
}

// ---------------------------------------------------------------- модуль + квиз
// Различия треков в одном месте: пути API, возврат, список для «следующего модуля»
// и сертификат. Сама механика модуля и квиза — общая.
const TRACK_UI = {
  ml: {
    modulePath: (id) => `/api/module/${id}`,
    quizPath: (id) => `/api/quiz/${id}`,
    back: () => renderDashboard(),
    list: () => state.modules,
    certReady: (u) => u.certificateReady,
    cert: () => renderCertificate(),
    backLabel: () => t('backModules'),
    quizTitle: (n) => t('quizTitle', n),
    soonToast: 'agentSoonToast',
  },
  agent: {
    modulePath: (id) => `/api/agent-module/${id}`,
    quizPath: (id) => `/api/agent-quiz/${id}`,
    back: () => renderAgents(),
    list: () => state.agentModules,
    certReady: (u) => u.agentCertificateReady,
    cert: () => renderAgentCertificate(),
    backLabel: () => t('agentBackModules'),
    quizTitle: (n) => t('agentQuizTitle', n),
    soonToast: 'agentSoonToast',
  },
  cca: {
    modulePath: (id) => `/api/cca-module/${id}`,
    quizPath: (id) => `/api/cca-quiz/${id}`,
    back: () => renderCca(),
    list: () => state.ccaModules,
    certReady: (u) => !!(u.tracks && u.tracks.cca && u.tracks.cca.certificateReady),
    cert: () => renderCcaCertificate(),
    backLabel: () => t('ccaBackModules'),
    quizTitle: (n) => t('ccaQuizTitle', n),
    soonToast: 'ccaSoonToast',
  },
};

async function renderModule(id, track = 'ml') {
  const T = TRACK_UI[track];
  let data;
  try {
    data = await api(T.modulePath(id));
  } catch (e) {
    if (e.status === 402) return renderPaywall();
    if (e.status === 409) return toast(t(T.soonToast));
    return toast(e.message);
  }
  const { module: mod, html, quiz } = data;
  view.innerHTML = `
    <div class="module-view">
      <a class="back-link" id="backLink">${T.backLabel()}</a>
      <div class="md-content">${html}</div>
      <div class="quiz-box" id="quizBox">
        <h2>${T.quizTitle(mod.order)}</h2>
        <div class="quiz-sub">${t('quizSub')}</div>
        <form id="quizForm">
          ${quiz.map((q, i) => `
            <div class="quiz-q" data-q="${i}">
              <div class="q-text">${i + 1}. ${esc(q.question)}</div>
              ${q.options.map((opt, j) => `
                <label class="quiz-opt" data-opt="${j}">
                  <input type="radio" name="q${i}" value="${j}"> <span>${esc(opt)}</span>
                </label>`).join('')}
            </div>`).join('')}
          <div class="form-error" id="quizError"></div>
          <button type="submit" class="btn btn-primary btn-lg">${t('quizCheck')}</button>
        </form>
        <div id="quizResult"></div>
      </div>
    </div>`;
  document.getElementById('backLink').onclick = T.back;
  window.scrollTo(0, 0);

  document.getElementById('quizForm').onsubmit = async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('quizError');
    errEl.textContent = '';
    const answers = quiz.map((_, i) => {
      const sel = document.querySelector(`input[name="q${i}"]:checked`);
      return sel ? Number(sel.value) : null;
    });
    if (answers.some((a) => a === null)) {
      errEl.textContent = t('quizAnswerAll');
      return;
    }
    const result = await api(T.quizPath(id), { method: 'POST', body: JSON.stringify({ answers }) });
    state.user = result.user;
    renderUserPanel();

    result.review.forEach((r, i) => {
      const qEl = document.querySelector(`.quiz-q[data-q="${i}"]`);
      qEl.querySelectorAll('.quiz-opt').forEach((optEl) => {
        const j = Number(optEl.dataset.opt);
        if (j === r.answer) optEl.classList.add('correct');
        else if (j === answers[i] && !r.correct) optEl.classList.add('wrong');
        optEl.querySelector('input').disabled = true;
      });
      const exp = document.createElement('div');
      exp.className = 'quiz-explanation';
      exp.textContent = '💡 ' + r.explanation;
      qEl.appendChild(exp);
    });
    e.target.querySelector('button[type=submit]').style.display = 'none';

    const passedAll = T.certReady(state.user);
    document.getElementById('quizResult').innerHTML = `
      <div class="quiz-result ${result.passed ? 'pass' : 'fail'}">
        ${result.passed ? t('quizPassed', result.correct, result.total) : t('quizFailed', result.correct, result.total)}
      </div>
      <div style="margin-top:16px;display:flex;gap:12px;flex-wrap:wrap">
        ${result.passed
          ? (passedAll
              ? `<button class="btn btn-primary" id="toCert">${t('quizCert')}</button>`
              : `<button class="btn btn-primary" id="toNext">${t('quizNext')}</button>`)
          : `<button class="btn btn-primary" id="retryQuiz">${t('quizRetry')}</button>`}
        <button class="btn btn-ghost" id="toDash">${t('quizAll')}</button>
      </div>`;
    document.getElementById('toDash').onclick = T.back;
    const retry = document.getElementById('retryQuiz');
    if (retry) retry.onclick = () => renderModule(id, track);
    const next = document.getElementById('toNext');
    if (next) next.onclick = () => {
      const list = T.list();
      const cur = list.find((m) => m.id === id);
      const nx = list.find((m) => m.order === cur.order + 1);
      if (!nx) return T.back();
      if (nx.status === 'soon') return toast(t(T.soonToast));
      if (nx.unlocked) renderModule(nx.id, track); else renderPaywall();
    };
    const toCert = document.getElementById('toCert');
    if (toCert) toCert.onclick = T.cert;
    document.getElementById('quizResult').scrollIntoView({ behavior: 'smooth' });
  };
}

// ---------------------------------------------------------------- агентный трек
async function renderAgents() {
  const { modules, certRequired } = await api('/api/agent-modules');
  state.agentModules = modules;
  const u = state.user;
  const passed = modules.filter((m) => m.progress && m.progress.passed).length;
  const ready = modules.filter((m) => m.status !== 'soon').length;
  const pct = Math.round((passed / modules.length) * 100);

  const g = I18N[LANG].agentGrades;
  const grade = passed >= modules.length ? g.senior
    : passed >= 13 ? g.middle
    : passed >= 6 ? g.junior
    : g.start;

  view.innerHTML = `
    ${sectionTabs('agents')}
    <div class="interview-intro" style="margin-bottom:22px">
      <h2 style="font-size:22px;margin-bottom:8px">${t('agentsTitle')}</h2>
      <p style="color:var(--muted);font-size:15px;max-width:760px">${t('agentsIntro')}</p>
    </div>
    <div class="progress-panel">
      <div class="info">
        <div style="font-weight:700;font-size:18px">${t('grade', grade)}</div>
        <div style="color:var(--muted);font-size:14px;margin-top:2px">${t('passedOf', passed, modules.length)} · ${t('agentsRoadmap', ready, modules.length)}</div>
        <div class="progress-bar"><div style="width:${pct}%"></div></div>
      </div>
      ${u.agentCertificateReady
        ? `<button class="btn btn-primary" id="agentCertBtn">${t('agentCertBtn')}</button>`
        : `<div style="color:var(--muted);font-size:13px;max-width:200px">${t('agentCertHint', certRequired)}</div>`}
      ${!u.subscribed ? `<button class="btn btn-ghost" id="subBtn">${t('subBtn')}</button>` : ''}
    </div>
    <div class="module-list">
      ${modules.map((m) => {
        const soon = m.status === 'soon';
        const done = m.progress && m.progress.passed;
        const icon = done ? '✅' : soon ? '🕓' : m.unlocked ? '📂' : '🔒';
        const status = done
          ? t('quizScore', m.progress.score, m.progress.total)
          : soon ? t('agentSoonTag')
          : m.unlocked ? (m.free ? t('freeTag') : t('availableTag')) : t('proTag');
        return `
        <div class="module-card ${m.unlocked ? '' : 'locked'}" data-id="${m.id}" data-unlocked="${m.unlocked}" data-soon="${soon}">
          <div class="module-status">${icon}</div>
          <div>
            <div class="m-title">${t('agentModuleN', m.order)}. ${esc(m.title)}</div>
            <div class="m-sub">${esc(m.subtitle)}</div>
          </div>
          <div class="module-meta">${esc(m.level)}<br>${status}</div>
        </div>`;
      }).join('')}
    </div>`;

  view.querySelectorAll('.module-card').forEach((card) => {
    card.onclick = () => {
      if (card.dataset.soon === 'true') return toast(t('agentSoonToast'));
      if (card.dataset.unlocked === 'true') renderModule(card.dataset.id, 'agent');
      else renderPaywall();
    };
  });
  const certBtn = document.getElementById('agentCertBtn');
  if (certBtn) certBtn.onclick = renderAgentCertificate;
  const subBtn = document.getElementById('subBtn');
  if (subBtn) subBtn.onclick = renderPaywall;
  bindSectionTabs();
}

// ------------------------------------------------- трек «Claude Certified Architect»
async function renderCca() {
  const { modules, certRequired, exam } = await api('/api/cca-modules');
  state.ccaModules = modules;
  const u = state.user;
  const tr = (u.tracks && u.tracks.cca) || { certificateReady: false, examBest: null };
  const passed = modules.filter((m) => m.progress && m.progress.passed).length;
  const ready = modules.filter((m) => m.status !== 'soon').length;
  const pct = modules.length ? Math.round((passed / modules.length) * 100) : 0;

  const g = I18N[LANG].ccaGrades;
  const grade = passed >= modules.length ? g.ready
    : passed >= Math.ceil(modules.length * 0.65) ? g.practitioner
    : passed >= Math.ceil(modules.length * 0.3) ? g.foundations
    : g.start;

  view.innerHTML = `
    ${sectionTabs('cca')}
    <div class="interview-intro" style="margin-bottom:22px">
      <h2 style="font-size:22px;margin-bottom:8px">${t('ccaTitle')}</h2>
      <p style="color:var(--muted);font-size:15px;max-width:760px">${t('ccaIntro')}</p>
      <p style="color:var(--muted);font-size:12.5px;max-width:760px;margin-top:10px;opacity:.8">${t('ccaDisclaimer')}</p>
    </div>
    <div class="progress-panel">
      <div class="info">
        <div style="font-weight:700;font-size:18px">${t('grade', grade)}</div>
        <div style="color:var(--muted);font-size:14px;margin-top:2px">${t('passedOf', passed, modules.length)} · ${t('ccaRoadmap', ready, modules.length)}${tr.examBest !== null ? ' · ' + t('ccaExamBest', tr.examBest) : ''}</div>
        <div class="progress-bar"><div style="width:${pct}%"></div></div>
      </div>
      ${exam && exam.ready
        ? `<button class="btn btn-primary" id="ccaExamBtn">${t('ccaExamBtn', exam.items, exam.minutes)}</button>`
        : `<div style="color:var(--muted);font-size:13px;max-width:200px">${t('ccaExamSoon')}</div>`}
      ${tr.certificateReady
        ? `<button class="btn btn-primary" id="ccaCertBtn">${t('ccaCertBtn')}</button>`
        : `<div style="color:var(--muted);font-size:13px;max-width:200px">${t('ccaCertHint', certRequired)}</div>`}
      ${!u.subscribed ? `<button class="btn btn-ghost" id="subBtn">${t('subBtn')}</button>` : ''}
    </div>
    <div class="module-list">
      ${modules.map((m) => {
        const soon = m.status === 'soon';
        const done = m.progress && m.progress.passed;
        const icon = done ? '✅' : soon ? '🕓' : m.unlocked ? '📂' : '🔒';
        const status = done
          ? t('quizScore', m.progress.score, m.progress.total)
          : soon ? t('ccaSoonTag')
          : m.unlocked ? (m.free ? t('freeTag') : t('availableTag')) : t('proTag');
        return `
        <div class="module-card ${m.unlocked ? '' : 'locked'}" data-id="${m.id}" data-unlocked="${m.unlocked}" data-soon="${soon}">
          <div class="module-status">${icon}</div>
          <div>
            <div class="m-title">${t('ccaModuleN', m.order)}. ${esc(m.title)}</div>
            <div class="m-sub">${esc(m.subtitle)}</div>
            ${m.ts ? `<div class="m-sub" style="opacity:.7;font-size:12px;margin-top:3px">${t('ccaTs', esc(m.ts))}</div>` : ''}
          </div>
          <div class="module-meta">${esc(m.level)}<br>${status}</div>
        </div>`;
      }).join('')}
    </div>`;

  view.querySelectorAll('.module-card').forEach((card) => {
    card.onclick = () => {
      if (card.dataset.soon === 'true') return toast(t('ccaSoonToast'));
      if (card.dataset.unlocked === 'true') renderModule(card.dataset.id, 'cca');
      else renderPaywall();
    };
  });
  const certBtn = document.getElementById('ccaCertBtn');
  if (certBtn) certBtn.onclick = renderCcaCertificate;
  const examBtn = document.getElementById('ccaExamBtn');
  if (examBtn) examBtn.onclick = () => renderExam();
  const subBtn = document.getElementById('subBtn');
  if (subBtn) subBtn.onclick = renderPaywall;
  bindSectionTabs();
}

// ---------------------------------------------------------------- сертификат
async function renderCertificateView(cfg) {
  let cert;
  try {
    cert = await api(cfg.endpoint);
  } catch (e) { return toast(e.message); }
  view.innerHTML = `
    <a class="back-link" id="backLink">${t(cfg.backKey)}</a>
    <div class="certificate">
      <div class="c-title">${t(cfg.headerKey)}</div>
      <h1>${t('certTitle')}</h1>
      <div style="font-size:14px;color:#77778c">${t('certConfirms')}</div>
      <div class="c-name">${esc(cert.name)}</div>
      <div class="c-text">${t(cfg.bodyKey, cert.modules)}</div>
      <div class="c-meta">
        <span>ID: ${esc(cert.certId)}</span>
        <span>${t('certDate')}: ${esc(cert.date)}</span>
        <span>mlsimulator.dev</span>
      </div>
    </div>
    <div style="text-align:center;margin-top:22px">
      <button class="btn btn-primary" onclick="window.print()">${t('certPrint')}</button>
    </div>`;
  document.getElementById('backLink').onclick = cfg.back;
}

async function renderCertificate() {
  return renderCertificateView({ endpoint: '/api/certificate', backKey: 'backModules',
    headerKey: 'certHeader', bodyKey: 'certBody', back: renderDashboard });
}

async function renderAgentCertificate() {
  return renderCertificateView({ endpoint: '/api/agent-certificate', backKey: 'agentBackModules',
    headerKey: 'agentCertHeader', bodyKey: 'agentCertBody', back: renderAgents });
}

async function renderCcaCertificate() {
  return renderCertificateView({ endpoint: '/api/cca-certificate', backKey: 'ccaBackModules',
    headerKey: 'ccaCertHeader', bodyKey: 'ccaCertBody', back: renderCca });
}

// ---------------------------------------------------------------- старт
(async function init() {
  document.title = t('appTitle');
  const { user, paymentsMode } = await api('/api/me');
  state.user = user;
  state.paymentsMode = paymentsMode || 'demo';
  renderUserPanel();

  const params = new URLSearchParams(location.search);
  if (user && params.get('checkout') === 'success' && params.get('session_id')) {
    try {
      const data = await api(`/api/checkout/confirm?session_id=${encodeURIComponent(params.get('session_id'))}`);
      state.user = data.user;
      renderUserPanel();
      toast(t('checkoutOk'));
    } catch (e) {
      toast(t('checkoutPending'));
    }
    history.replaceState(null, '', '/app.html');
  } else if (params.get('checkout') === 'cancel') {
    toast(t('checkoutCancel'));
    history.replaceState(null, '', '/app.html');
  }

  if (state.user) renderDashboard(); else renderAuth();
})();
