/* ML Career Simulator — SPA */
const view = document.getElementById('view');
const userPanel = document.getElementById('userPanel');
let state = { user: null, modules: [], paymentsMode: 'demo' };

const api = async (path, opts = {}) => {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'Ошибка сервера'), { status: res.status, data });
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

// ---------------------------------------------------------------- шапка
function renderUserPanel() {
  if (!state.user) { userPanel.innerHTML = ''; return; }
  const u = state.user;
  const canManage = u.subscribed && state.paymentsMode === 'stripe';
  userPanel.innerHTML = `
    <span class="badge ${u.subscribed ? 'badge-pro' : 'badge-free'}">${u.subscribed ? 'PRO' : 'FREE'}</span>
    <span>${esc(u.name)}</span>
    ${canManage ? `<button class="btn btn-ghost" style="padding:7px 14px;font-size:13px" id="billingBtn">Подписка</button>` : ''}
    <button class="btn btn-ghost" style="padding:7px 16px;font-size:13px" id="logoutBtn">Выйти</button>`;
  document.getElementById('logoutBtn').onclick = async () => {
    await api('/api/logout', { method: 'POST' });
    state.user = null;
    renderUserPanel();
    renderAuth();
  };
  const billingBtn = document.getElementById('billingBtn');
  if (billingBtn) billingBtn.onclick = async () => {
    try {
      const { url } = await api('/api/billing-portal', { method: 'POST' });
      window.location.href = url;   // Stripe Billing Portal: карта, счета, отмена
    } catch (e) { toast(e.message); }
  };
}

// ---------------------------------------------------------------- auth
function renderAuth(mode = 'register') {
  view.innerHTML = `
    <div class="auth-box">
      <h2>ML Career Simulator</h2>
      <div class="hint">Ваше «трудоустройство» в Datacore начинается с аккаунта. Первые 2 модуля бесплатны.</div>
      <div class="auth-tabs">
        <button id="tabReg" class="${mode === 'register' ? 'active' : ''}">Регистрация</button>
        <button id="tabLog" class="${mode === 'login' ? 'active' : ''}">Вход</button>
      </div>
      <div class="form-error" id="authError"></div>
      ${mode === 'register' ? `
        <div class="field"><label>Имя (появится на сертификате)</label><input id="fName" placeholder="Иван Петров"></div>` : ''}
      <div class="field"><label>Email</label><input id="fEmail" type="email" placeholder="you@example.com"></div>
      <div class="field"><label>Пароль</label><input id="fPass" type="password" placeholder="минимум 6 символов"></div>
      <button class="btn btn-primary" style="width:100%" id="authSubmit">
        ${mode === 'register' ? 'Создать аккаунт и начать' : 'Войти'}
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
    if (mode === 'register') body.name = document.getElementById('fName').value;
    try {
      const data = await api(mode === 'register' ? '/api/register' : '/api/login',
        { method: 'POST', body: JSON.stringify(body) });
      state.user = data.user;
      renderUserPanel();
      renderDashboard();
      if (mode === 'register') toast('Добро пожаловать в Datacore! Начните с модуля 1.');
    } catch (e) { err.textContent = e.message; }
  };
  document.getElementById('authSubmit').onclick = submit;
  view.querySelectorAll('input').forEach((i) => i.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); }));
}

// ---------------------------------------------------------------- навигация разделов
function sectionTabs(active) {
  return `
    <div class="section-tabs">
      <button class="${active === 'modules' ? 'active' : ''}" id="navModules">📚 Модули</button>
      <button class="${active === 'interviews' ? 'active' : ''}" id="navInterviews">🎤 Собеседования</button>
    </div>`;
}
function bindSectionTabs() {
  const m = document.getElementById('navModules');
  const i = document.getElementById('navInterviews');
  if (m) m.onclick = renderDashboard;
  if (i) i.onclick = renderInterviews;
}

// ---------------------------------------------------------------- дашборд
async function renderDashboard() {
  const { modules } = await api('/api/modules');
  state.modules = modules;
  const u = state.user;
  const passed = modules.filter((m) => m.progress && m.progress.passed).length;
  const pct = Math.round((passed / modules.length) * 100);

  const grade = passed >= modules.length ? 'Middle+ · Advanced complete 🏆'
    : passed >= 20 ? 'Middle ML Engineer 🎉'
    : passed >= 17 ? 'Middle (почти!)'
    : passed >= 10 ? 'Middle-track'
    : passed >= 6 ? 'Junior+'
    : 'Junior';

  view.innerHTML = `
    ${sectionTabs('modules')}
    <div class="progress-panel">
      <div class="info">
        <div style="font-weight:700;font-size:18px">Ваш грейд: ${grade}</div>
        <div style="color:var(--muted);font-size:14px;margin-top:2px">Пройдено ${passed} из ${modules.length} модулей</div>
        <div class="progress-bar"><div style="width:${pct}%"></div></div>
      </div>
      ${u.certificateReady
        ? `<button class="btn btn-primary" id="certBtn">🎓 Открыть сертификат</button>`
        : `<div style="color:var(--muted);font-size:13px;max-width:200px">Сертификат откроется после всех ${modules.length} модулей</div>`}
      ${!u.subscribed ? `<button class="btn btn-ghost" id="subBtn">⚡ Открыть все модули — $20/мес</button>` : ''}
    </div>
    <div class="module-list">
      ${modules.map((m) => {
        const done = m.progress && m.progress.passed;
        const icon = done ? '✅' : m.unlocked ? '📂' : '🔒';
        const status = done
          ? `Квиз: ${m.progress.score}/${m.progress.total}`
          : m.unlocked ? (m.free ? 'Бесплатно' : 'Доступно') : 'По подписке PRO';
        return `
        <div class="module-card ${m.unlocked ? '' : 'locked'}" data-id="${m.id}" data-unlocked="${m.unlocked}">
          <div class="module-status">${icon}</div>
          <div>
            <div class="m-title">Модуль ${m.order}. ${esc(m.title)}</div>
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
      <h2 style="margin-bottom:8px">🎤 Симулятор собеседований</h2>
      <p style="color:var(--muted);max-width:640px">Тренажёр в формате реального интервью: прочитайте вопрос,
      сформулируйте ответ вслух (серьёзно — вслух!), затем откройте эталонный разбор и сравните.
      Три трека — от скрининга джуна до ML System Design.</p>
    </div>
    <div class="grid grid-3" style="margin-top:24px">
      ${tracks.map((t) => `
        <div class="card track-card ${t.unlocked ? '' : 'locked'}" data-id="${t.id}" data-unlocked="${t.unlocked}" style="cursor:pointer">
          <span class="icon">${t.icon}</span>
          <h3>${esc(t.title)} ${t.unlocked ? '' : '🔒'}</h3>
          <p>${esc(t.description)}</p>
          <div style="margin-top:14px;font-size:13px;color:${t.unlocked ? 'var(--green)' : 'var(--amber)'};font-weight:600">
            ${t.count} вопросов · ${t.free ? 'Бесплатно' : t.unlocked ? 'PRO' : 'По подписке PRO'}
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
      <a class="back-link" id="backLink">← Все треки собеседований</a>
      <h1 style="font-size:28px;margin-bottom:10px">${track.icon} Собеседование: ${esc(track.title)}</h1>
      <blockquote class="advice">💡 <b>Совет интервьюера:</b> ${esc(track.advice)}</blockquote>
      <div style="margin:22px 0 8px;color:var(--muted);font-size:14px">
        Как тренироваться: закройте разбор, ответьте на вопрос вслух за 2–3 минуты, потом сравните с эталоном.
      </div>
      ${questions.map((q, i) => `
        <div class="iq-card">
          <div class="iq-q"><span class="iq-num">Вопрос ${i + 1}/${questions.length}</span>${esc(q.q)}</div>
          <button class="btn btn-ghost iq-toggle" data-i="${i}" style="padding:8px 18px;font-size:13px">Показать разбор</button>
          <div class="iq-a" id="iqA${i}" hidden>${esc(q.a).replace(/\n/g, '<br>')}</div>
        </div>`).join('')}
    </div>`;
  document.getElementById('backLink').onclick = renderInterviews;
  view.querySelectorAll('.iq-toggle').forEach((btn) => {
    btn.onclick = () => {
      const el = document.getElementById(`iqA${btn.dataset.i}`);
      el.hidden = !el.hidden;
      btn.textContent = el.hidden ? 'Показать разбор' : 'Скрыть разбор';
    };
  });
  window.scrollTo(0, 0);
}

// ---------------------------------------------------------------- пейвол
function renderPaywall() {
  view.innerHTML = `
    <div class="paywall">
      <div class="lock">🔒</div>
      <h2>Этот модуль — в подписке PRO</h2>
      <p>Вы прошли бесплатную часть — стажировку. Дальше начинается настоящая работа:
      18 модулей с боевыми кейсами, финальный проект и сертификат Middle-track ML Engineer.</p>
      <div class="price-line">$20 <small>/ месяц · отмена в любой момент</small></div>
      <button class="btn btn-primary btn-lg" id="paySub">Оформить подписку</button>
      <p style="margin-top:18px;font-size:13px">
        <a href="#" id="backDash">← Вернуться к модулям</a>
      </p>
      ${state.paymentsMode === 'stripe'
        ? `<p style="font-size:12px;color:var(--muted)">Оплата картой через Stripe Checkout — безопасная страница оплаты Stripe.
           Отменить подписку можно в один клик из личного кабинета.</p>`
        : `<p style="font-size:12px;color:var(--muted)">Демо-режим: оплата активируется мгновенно без списания средств.
           Для боевого режима задайте Stripe-ключи (см. README).</p>`}
    </div>`;
  document.getElementById('paySub').onclick = async () => {
    const btn = document.getElementById('paySub');
    btn.disabled = true;
    btn.textContent = 'Секунду…';
    try {
      const data = await api('/api/subscribe', { method: 'POST' });
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;   // → Stripe Checkout
        return;
      }
      state.user = data.user;                       // демо-режим
      renderUserPanel();
      toast('Подписка PRO активна — все модули открыты!');
      renderDashboard();
    } catch (e) {
      toast(e.message);
      btn.disabled = false;
      btn.textContent = 'Оформить подписку';
    }
  };
  document.getElementById('backDash').onclick = (e) => { e.preventDefault(); renderDashboard(); };
}

// ---------------------------------------------------------------- модуль + квиз
async function renderModule(id) {
  let data;
  try {
    data = await api(`/api/module/${id}`);
  } catch (e) {
    if (e.status === 402) return renderPaywall();
    return toast(e.message);
  }
  const { module: mod, html, quiz } = data;
  view.innerHTML = `
    <div class="module-view">
      <a class="back-link" id="backLink">← Все модули</a>
      <div class="md-content">${html}</div>
      <div class="quiz-box" id="quizBox">
        <h2>📝 Квиз модуля ${mod.order}</h2>
        <div class="quiz-sub">Порог прохождения — 70%. Каждый ответ будет объяснён после проверки. Пересдавать можно сколько угодно.</div>
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
          <button type="submit" class="btn btn-primary btn-lg">Проверить ответы</button>
        </form>
        <div id="quizResult"></div>
      </div>
    </div>`;
  document.getElementById('backLink').onclick = renderDashboard;
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
      errEl.textContent = 'Ответьте на все вопросы.';
      return;
    }
    const result = await api(`/api/quiz/${id}`, { method: 'POST', body: JSON.stringify({ answers }) });
    state.user = result.user;
    renderUserPanel();

    // подсветка ответов и объяснения
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

    const passedAll = state.user.certificateReady;
    document.getElementById('quizResult').innerHTML = `
      <div class="quiz-result ${result.passed ? 'pass' : 'fail'}">
        ${result.passed
          ? `✅ Модуль пройден: ${result.correct}/${result.total} правильных!`
          : `❌ ${result.correct}/${result.total} — нужно минимум 70%. Перечитайте разборы выше и попробуйте ещё раз.`}
      </div>
      <div style="margin-top:16px;display:flex;gap:12px;flex-wrap:wrap">
        ${result.passed
          ? (passedAll
              ? `<button class="btn btn-primary" id="toCert">🎓 Получить сертификат</button>`
              : `<button class="btn btn-primary" id="toNext">Следующий модуль →</button>`)
          : `<button class="btn btn-primary" id="retryQuiz">Пересдать квиз</button>`}
        <button class="btn btn-ghost" id="toDash">Все модули</button>
      </div>`;
    document.getElementById('toDash').onclick = renderDashboard;
    const retry = document.getElementById('retryQuiz');
    if (retry) retry.onclick = () => renderModule(id);
    const next = document.getElementById('toNext');
    if (next) next.onclick = () => {
      const cur = state.modules.find((m) => m.id === id);
      const nx = state.modules.find((m) => m.order === cur.order + 1);
      if (!nx) return renderDashboard();
      if (nx.unlocked) renderModule(nx.id); else renderPaywall();
    };
    const toCert = document.getElementById('toCert');
    if (toCert) toCert.onclick = renderCertificate;
    document.getElementById('quizResult').scrollIntoView({ behavior: 'smooth' });
  };
}

// ---------------------------------------------------------------- сертификат
async function renderCertificate() {
  let cert;
  try {
    cert = await api('/api/certificate');
  } catch (e) { return toast(e.message); }
  view.innerHTML = `
    <a class="back-link" id="backLink">← Все модули</a>
    <div class="certificate">
      <div class="c-title">ML Career Simulator · Certificate of Completion</div>
      <h1>Сертификат</h1>
      <div style="font-size:14px;color:#77778c">подтверждает, что</div>
      <div class="c-name">${esc(cert.name)}</div>
      <div class="c-text">
        успешно прошёл(ла) все ${cert.modules} модулей симулятора карьеры ML-инженера —
        от разведочного анализа данных до продакшен-деплоя и ML system design —
        и сдал(а) итоговый экзамен на уровень <b>Middle-track ML Engineer</b>.
      </div>
      <div class="c-meta">
        <span>ID: ${esc(cert.certId)}</span>
        <span>Дата: ${esc(cert.date)}</span>
        <span>mlsimulator.dev</span>
      </div>
    </div>
    <div style="text-align:center;margin-top:22px">
      <button class="btn btn-primary" onclick="window.print()">🖨 Распечатать / сохранить в PDF</button>
    </div>`;
  document.getElementById('backLink').onclick = renderDashboard;
}

// ---------------------------------------------------------------- старт
(async function init() {
  const { user, paymentsMode } = await api('/api/me');
  state.user = user;
  state.paymentsMode = paymentsMode || 'demo';
  renderUserPanel();

  // возврат со Stripe Checkout
  const params = new URLSearchParams(location.search);
  if (user && params.get('checkout') === 'success' && params.get('session_id')) {
    try {
      const data = await api(`/api/checkout/confirm?session_id=${encodeURIComponent(params.get('session_id'))}`);
      state.user = data.user;
      renderUserPanel();
      toast('🎉 Оплата прошла — подписка PRO активна!');
    } catch (e) {
      toast('Оплата обрабатывается. Если доступ не откроется за пару минут — напишите в поддержку.');
    }
    history.replaceState(null, '', '/app.html');
  } else if (params.get('checkout') === 'cancel') {
    toast('Оплата отменена — вы можете вернуться к ней в любой момент.');
    history.replaceState(null, '', '/app.html');
  }

  if (state.user) renderDashboard(); else renderAuth();
})();
