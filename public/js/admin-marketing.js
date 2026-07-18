/* Маркетинговая панель: очередь, генерация, публикация, подключения сетей */

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const NETS = ['facebook', 'instagram', 'linkedin', 'tiktok', 'threads', 'x'];
const NET_LABEL = {
  facebook: 'Facebook', instagram: 'Instagram', linkedin: 'LinkedIn',
  tiktok: 'TikTok', threads: 'Threads', x: 'X (Twitter)',
};
const NET_ICON = { facebook: '📘', instagram: '📸', linkedin: '💼', tiktok: '🎵', threads: '🧵', x: '𝕏' };
const AUD_LABEL = { beginner: 'Новички', switcher: 'Свитчеры (инженеры)', business: 'Бизнес/студенты' };

async function api(url, opts = {}) {
  const res = await fetch(url, {
    credentials: 'same-origin',
    headers: opts.body ? { 'content-type': 'application/json' } : {},
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

function toast(msg, ok = true) {
  const t = document.createElement('div');
  t.className = 'mk-toast' + (ok ? '' : ' err');
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}

// ---------------------------------------------------------------- фоновые операции

let jobTimer = null;

async function pollJob(onDone) {
  clearInterval(jobTimer);
  const banner = $('#jobBanner');
  banner.hidden = false;
  jobTimer = setInterval(async () => {
    try {
      const job = await api('/api/admin/marketing/job');
      $('#jobTitle').textContent = job.kind ? `${job.kind}…` : 'Выполняется…';
      $('#jobLog').textContent = (job.log || []).slice(-8).join('\n');
      if (job.status !== 'running') {
        clearInterval(jobTimer);
        banner.hidden = true;
        if (job.status === 'error') toast(`Ошибка: ${job.error}`, false);
        else toast('Готово');
        onDone && onDone(job);
      }
    } catch { /* повторим на следующем тике */ }
  }, 2000);
}

// ---------------------------------------------------------------- вкладки

document.querySelectorAll('#tabs button').forEach((b) => {
  b.onclick = () => {
    document.querySelectorAll('#tabs button').forEach((x) => x.classList.toggle('active', x === b));
    document.querySelectorAll('.mk-tab').forEach((s) => { s.hidden = s.id !== `tab-${b.dataset.tab}`; });
    LOADERS[b.dataset.tab]();
  };
});

// ---------------------------------------------------------------- очередь

function netBadges(post, networks) {
  return NETS.map((n) => {
    if (!networks[n] || !networks[n].configured) return '';
    const pub = post.published && post.published[n];
    return `<span class="mk-net ${pub ? 'ok' : ''}" title="${NET_LABEL[n]}${pub ? ' — опубликован' : ''}">${NET_ICON[n]}${pub ? '✓' : ''}</span>`;
  }).join('');
}

function postCard(p, networks) {
  const today = new Date().toISOString().slice(0, 10);
  const stateLabel = Object.keys(p.published || {}).length
    ? '<span class="badge badge-pro">опубликован</span>'
    : p.scheduledFor <= today
      ? '<span class="badge badge-free">сегодня</span>'
      : `<span class="mk-date">${p.scheduledFor}</span>`;
  return `
  <div class="mk-card" data-id="${esc(p.id)}">
    <div class="mk-card-media">
      ${p.hasImage ? `<img loading="lazy" src="/admin/marketing/media/${esc(p.image)}" alt="">` : ''}
      ${p.format === 'reel' ? '<span class="mk-reel">🎬 Reels</span>' : ''}
    </div>
    <div class="mk-card-body">
      <div class="mk-card-top">
        ${stateLabel}
        <span class="mk-rubric">${esc(p.rubric)}</span>
        <span class="mk-badges">${netBadges(p, networks)}</span>
      </div>
      <div class="mk-text">${esc((p.texts && p.texts.facebook || '').slice(0, 180))}…</div>
      <div class="mk-actions">
        <button class="btn btn-primary mk-pub">Опубликовать сейчас</button>
        <button class="btn btn-ghost mk-edit">Редактировать</button>
        ${p.hasVideo ? `<a class="btn btn-ghost" href="/admin/marketing/media/${esc(p.video)}" target="_blank">▶ Видео</a>` : ''}
        <button class="btn btn-ghost mk-del" title="Удалить">🗑</button>
      </div>
      <div class="mk-editor" hidden></div>
    </div>
  </div>`;
}

function editorForm(p) {
  const fields = NETS.map((n) => `
    <label>${NET_ICON[n]} ${NET_LABEL[n]}</label>
    <textarea data-net="${n}" rows="3">${esc(p.texts && p.texts[n] || '')}</textarea>`).join('');
  return `
    <div class="mk-form">
      <div class="mk-row">
        <label>Дата <input type="date" class="mk-date-in" value="${esc(p.scheduledFor)}"></label>
        <label>Формат
          <select class="mk-format">
            <option value="post" ${p.format !== 'reel' ? 'selected' : ''}>Пост</option>
            <option value="reel" ${p.format === 'reel' ? 'selected' : ''}>Reels (видео)</option>
          </select>
        </label>
      </div>
      ${fields}
      <div class="mk-actions">
        <button class="btn btn-primary mk-save">Сохранить</button>
        <button class="btn btn-ghost mk-cancel">Отмена</button>
      </div>
    </div>`;
}

async function loadQueue() {
  const el = $('#tab-queue');
  el.innerHTML = '<p class="mk-muted">Загрузка…</p>';
  const { posts, networks, config } = await api('/api/admin/marketing/queue');
  const connected = NETS.filter((n) => networks[n] && networks[n].configured);
  const pending = posts.filter((p) => !Object.keys(p.published || {}).length).length;

  el.innerHTML = `
    <div class="admin-stats">
      <div class="admin-stat"><div class="n">${posts.length}</div><div class="l">Постов в очереди</div></div>
      <div class="admin-stat"><div class="n">${pending}</div><div class="l">Ждут публикации</div></div>
      <div class="admin-stat"><div class="n">${connected.length}/6</div><div class="l">Сетей подключено</div></div>
      <div class="admin-stat"><div class="n">${String(config.publishHourUTC).padStart(2, '0')}:00</div><div class="l">Автопубликация (UTC)</div></div>
    </div>
    ${posts.length ? `<div class="mk-grid">${posts.map((p) => postCard(p, networks)).join('')}</div>`
      : '<div class="admin-empty">Очередь пуста — сгенерируйте посты на вкладке «Создать».</div>'}`;

  el.querySelectorAll('.mk-card').forEach((card) => {
    const id = card.dataset.id;
    const post = posts.find((p) => p.id === id);
    card.querySelector('.mk-pub').onclick = async () => {
      if (!confirm(`Опубликовать «${id}» во все подключённые сети прямо сейчас?`)) return;
      try {
        await api('/api/admin/marketing/publish', { method: 'POST', body: JSON.stringify({ postId: id }) });
        pollJob(loadQueue);
      } catch (e) { toast(e.message, false); }
    };
    card.querySelector('.mk-del').onclick = async () => {
      if (!confirm(`Удалить пост «${id}»?`)) return;
      try {
        await api(`/api/admin/marketing/post/${id}`, { method: 'DELETE' });
        loadQueue();
      } catch (e) { toast(e.message, false); }
    };
    card.querySelector('.mk-edit').onclick = () => {
      const ed = card.querySelector('.mk-editor');
      if (!ed.hidden) { ed.hidden = true; return; }
      ed.innerHTML = editorForm(post);
      ed.hidden = false;
      ed.querySelector('.mk-cancel').onclick = () => { ed.hidden = true; };
      ed.querySelector('.mk-save').onclick = async () => {
        const texts = {};
        ed.querySelectorAll('textarea[data-net]').forEach((t) => { texts[t.dataset.net] = t.value; });
        try {
          await api(`/api/admin/marketing/post/${id}`, {
            method: 'PUT',
            body: JSON.stringify({
              texts,
              scheduledFor: ed.querySelector('.mk-date-in').value,
              format: ed.querySelector('.mk-format').value,
            }),
          });
          toast('Сохранено');
          loadQueue();
        } catch (e) { toast(e.message, false); }
      };
    };
  });
}

// ---------------------------------------------------------------- создать

async function loadCreate() {
  const el = $('#tab-create');
  el.innerHTML = '<p class="mk-muted">Загрузка…</p>';
  const { topics } = await api('/api/admin/marketing/topics');
  const groups = {};
  for (const t of topics) (groups[t.audience] = groups[t.audience] || []).push(t);
  const options = Object.entries(groups).map(([aud, list]) =>
    `<optgroup label="${esc(AUD_LABEL[aud] || aud)}">${list.map((t) =>
      `<option value="${t.id}" data-audience="${t.audience}">${t.used ? '✓ ' : ''}${esc(t.topic)}</option>`).join('')}</optgroup>`).join('');

  el.innerHTML = `
    <div class="mk-panel">
      <h2>Спец-пост</h2>
      <div class="mk-form">
        <label>Тема из банка (50 готовых)
          <select id="cTopic"><option value="">— своя тема ниже —</option>${options}</select>
        </label>
        <label>Своя тема (если не выбрана из банка)
          <input id="cCustom" type="text" placeholder="Например: Почему дата-аналитику стоит попробовать ML">
        </label>
        <div class="mk-row">
          <label>Аудитория
            <select id="cAud">
              <option value="beginner">Новички</option>
              <option value="switcher">Свитчеры (инженеры)</option>
              <option value="business">Бизнес/студенты</option>
            </select>
          </label>
          <label>Формат
            <select id="cFormat">
              <option value="post">Пост (карточка)</option>
              <option value="reel">Reels (видео с музыкой)</option>
            </select>
          </label>
        </div>
        <div class="mk-actions">
          <button id="cGen" class="btn btn-primary">✨ Сгенерировать и в очередь (на сегодня)</button>
        </div>
        <p class="mk-muted">Пост появится в «Очереди» с сегодняшней датой — там его можно отредактировать и опубликовать сразу.</p>
      </div>
    </div>
    <div class="mk-panel">
      <h2>Пачка на неделю</h2>
      <div class="mk-form">
        <div class="mk-row">
          <label>Постов <input id="bCount" type="number" min="1" max="14" value="7"></label>
          <label>Из них Reels <input id="bReels" type="number" min="0" max="7" value="2"></label>
        </div>
        <div class="mk-actions">
          <button id="bGen" class="btn btn-primary">Сгенерировать пачку</button>
        </div>
        <p class="mk-muted">Рубрики чередуются автоматически: вопрос с собеседования, квиз, тема для аудитории, урок, история, промо. По одному посту в день начиная с сегодня.</p>
      </div>
    </div>`;

  $('#cGen').onclick = async () => {
    const topicId = $('#cTopic').value;
    const customTopic = $('#cCustom').value.trim();
    const sel = $('#cTopic').selectedOptions[0];
    try {
      await api('/api/admin/marketing/generate', {
        method: 'POST',
        body: JSON.stringify({
          mode: 'special',
          topicId: topicId || undefined,
          customTopic: !topicId ? customTopic : undefined,
          audience: topicId ? sel.dataset.audience : $('#cAud').value,
          format: $('#cFormat').value,
        }),
      });
      pollJob(() => { $('#tabs button[data-tab="queue"]').click(); });
    } catch (e) { toast(e.message, false); }
  };

  $('#bGen').onclick = async () => {
    try {
      await api('/api/admin/marketing/generate', {
        method: 'POST',
        body: JSON.stringify({ mode: 'batch', count: Number($('#bCount').value), reels: Number($('#bReels').value) }),
      });
      pollJob(() => { $('#tabs button[data-tab="queue"]').click(); });
    } catch (e) { toast(e.message, false); }
  };
}

// ---------------------------------------------------------------- подключения

const NET_HINT = {
  facebook: 'developers.facebook.com → Create App (Business). Обязательно: Settings → Basic → App Domains = домен сайта + Add Platform → Website (Site URL сайта); продукт Facebook Login → Settings → Valid OAuth Redirect URIs = URL ниже. Instagram подключается автоматически, если IG Business привязан к странице.',
  instagram: 'Подключается вместе с Facebook: привяжите IG Business-аккаунт к странице и нажмите Connect у Facebook.',
  linkedin: 'developer.linkedin.com → Create app → Products: «Share on LinkedIn» + «Sign In with LinkedIn» → Auth → добавьте Redirect URL ниже.',
  tiktok: 'developers.tiktok.com → Connect an app → Login Kit + Content Posting API → Redirect URI ниже. Сразу подайте на аудит (до него посты приватные).',
  threads: 'developers.facebook.com → ваше приложение → добавить продукт Threads API → Redirect Callback URL ниже.',
  x: 'developer.x.com → Project → App → User authentication settings: OAuth 2.0, type Web App, Callback URL ниже. Хватает бесплатного тарифа.',
};

async function loadNetworks() {
  const el = $('#tab-networks');
  el.innerHTML = '<p class="mk-muted">Загрузка…</p>';
  const { networks, redirectUris } = await api('/api/admin/marketing/networks');

  el.innerHTML = NETS.map((n) => {
    const s = networks[n];
    const canOauth = n !== 'instagram';
    const detail = s.detail || {};
    const tokenNote = detail.tokenDaysLeft != null ? ` · токен: ${detail.tokenDaysLeft} дн.` : '';
    return `
    <div class="mk-panel mk-net-card" data-net="${n}">
      <div class="mk-net-head">
        <h2>${NET_ICON[n]} ${NET_LABEL[n]}</h2>
        ${s.configured
          ? `<span class="badge badge-pro">подключено${detail.account ? ': ' + esc(detail.account) : ''}${tokenNote}</span>`
          : '<span class="badge badge-free">не подключено</span>'}
      </div>
      <p class="mk-muted">${esc(NET_HINT[n])}</p>
      ${canOauth ? `
      <p class="mk-muted">Redirect/Callback URL для настроек приложения: <code>${esc(redirectUris[n] || '')}</code></p>
      <div class="mk-form mk-row">
        <label>${n === 'tiktok' ? 'Client key' : 'App/Client ID'} <input class="mk-app-id" type="text" placeholder="${s.appConfigured ? 'сохранён' : ''}"></label>
        <label>Secret <input class="mk-app-secret" type="password" placeholder="${s.appConfigured ? 'сохранён' : ''}"></label>
      </div>
      <div class="mk-actions">
        <button class="btn btn-ghost mk-save-app">Сохранить ключи</button>
        <button class="btn btn-primary mk-connect" ${s.appConfigured || s.configured ? '' : 'disabled'}>${s.configured ? 'Переподключить' : 'Подключить'}</button>
        ${s.configured ? '<button class="btn btn-ghost mk-disc">Отключить</button>' : ''}
      </div>` : ''}
    </div>`;
  }).join('');

  el.querySelectorAll('.mk-net-card').forEach((card) => {
    const net = card.dataset.net;
    const saveBtn = card.querySelector('.mk-save-app');
    if (saveBtn) saveBtn.onclick = async () => {
      try {
        await api(`/api/admin/marketing/networks/${net}/credentials`, {
          method: 'POST',
          body: JSON.stringify({ id: card.querySelector('.mk-app-id').value, secret: card.querySelector('.mk-app-secret').value }),
        });
        toast('Ключи сохранены');
        loadNetworks();
      } catch (e) { toast(e.message, false); }
    };
    const conn = card.querySelector('.mk-connect');
    if (conn) conn.onclick = () => {
      window.open(`/api/admin/marketing/connect/${net}`, '_blank');
      toast('Завершите вход в новой вкладке, затем обновите этот раздел');
    };
    const disc = card.querySelector('.mk-disc');
    if (disc) disc.onclick = async () => {
      if (!confirm(`Отключить ${NET_LABEL[net]}?`)) return;
      await api(`/api/admin/marketing/networks/${net}/disconnect`, { method: 'POST' });
      loadNetworks();
    };
  });
}

// ---------------------------------------------------------------- настройки

async function loadSettings() {
  const el = $('#tab-settings');
  el.innerHTML = '<p class="mk-muted">Загрузка…</p>';
  const { config, anthropicKeySet } = await api('/api/admin/marketing/settings');
  const kyiv = (config.publishHourUTC + 3) % 24;

  el.innerHTML = `
    <div class="mk-panel">
      <h2>Расписание</h2>
      <div class="mk-form">
        <label><input id="sAutoPub" type="checkbox" ${config.autoPublish ? 'checked' : ''}> Автопубликация ежедневно</label>
        <div class="mk-row">
          <label>Час публикации (UTC) <input id="sPubHour" type="number" min="0" max="23" value="${config.publishHourUTC}"></label>
          <span class="mk-muted" style="align-self:end">≈ ${String(kyiv).padStart(2, '0')}:00 по Киеву</span>
        </div>
        <label><input id="sAutoGen" type="checkbox" ${config.autoGenerate ? 'checked' : ''}> Автогенерация еженедельно</label>
        <div class="mk-row">
          <label>День недели (0=вс)
            <input id="sGenDow" type="number" min="0" max="6" value="${config.generateDowUTC}"></label>
          <label>Час (UTC) <input id="sGenHour" type="number" min="0" max="23" value="${config.generateHourUTC}"></label>
        </div>
        <div class="mk-row">
          <label>Постов в пачке <input id="sBatch" type="number" min="1" max="14" value="${config.postsPerBatch}"></label>
          <label>Из них Reels <input id="sReels" type="number" min="0" max="7" value="${config.reelsPerBatch}"></label>
        </div>
      </div>
    </div>
    <div class="mk-panel">
      <h2>Ключ Anthropic (генерация текстов)</h2>
      <div class="mk-form">
        <label>API key <input id="sKey" type="password" placeholder="${anthropicKeySet ? 'задан — ввести новый для замены' : 'sk-ant-…'}"></label>
        <p class="mk-muted">console.anthropic.com → API keys. Расход ~$1–5/мес.</p>
      </div>
    </div>
    <div class="mk-actions"><button id="sSave" class="btn btn-primary">Сохранить настройки</button></div>`;

  $('#sSave').onclick = async () => {
    try {
      await api('/api/admin/marketing/settings', {
        method: 'POST',
        body: JSON.stringify({
          autoPublish: $('#sAutoPub').checked,
          autoGenerate: $('#sAutoGen').checked,
          publishHourUTC: Number($('#sPubHour').value),
          generateDowUTC: Number($('#sGenDow').value),
          generateHourUTC: Number($('#sGenHour').value),
          postsPerBatch: Number($('#sBatch').value),
          reelsPerBatch: Number($('#sReels').value),
          anthropicKey: $('#sKey').value || undefined,
        }),
      });
      toast('Настройки сохранены');
      loadSettings();
    } catch (e) { toast(e.message, false); }
  };
}

// ---------------------------------------------------------------- статистика

async function loadStats() {
  const el = $('#tab-stats');
  el.innerHTML = '<p class="mk-muted">Загрузка…</p>';
  const { bySource, published } = await api('/api/admin/marketing/stats');

  const srcRows = Object.entries(bySource).sort((a, b) => b[1].total - a[1].total)
    .map(([src, v]) => `<tr><td>${esc(src)}</td><td>${v.total}</td><td>${v.subscribed}</td></tr>`).join('');
  const pubRows = published.map((p) => `
    <tr>
      <td>${esc(p.id)}</td>
      <td>${p.format === 'reel' ? '🎬' : '🖼'} ${esc(p.rubric)}</td>
      <td>${Object.keys(p.published).map((n) => NET_ICON[n] || n).join(' ')}</td>
      <td>${p.signups || '—'}</td>
    </tr>`).join('');

  el.innerHTML = `
    <div class="mk-panel">
      <h2>Регистрации по источникам</h2>
      <div class="admin-table-wrap"><table class="admin-table">
        <thead><tr><th>Источник (utm_source)</th><th>Регистраций</th><th>Подписок</th></tr></thead>
        <tbody>${srcRows || '<tr><td colspan="3">Пока пусто</td></tr>'}</tbody>
      </table></div>
    </div>
    <div class="mk-panel">
      <h2>Опубликованные посты</h2>
      <div class="admin-table-wrap"><table class="admin-table">
        <thead><tr><th>Пост</th><th>Тип</th><th>Сети</th><th>Регистраций с поста</th></tr></thead>
        <tbody>${pubRows || '<tr><td colspan="4">Пока пусто</td></tr>'}</tbody>
      </table></div>
    </div>`;
}

// ---------------------------------------------------------------- init

const LOADERS = { queue: loadQueue, create: loadCreate, networks: loadNetworks, settings: loadSettings, stats: loadStats };

(async () => {
  // если операция уже шла (перезагрузили страницу) — продолжаем следить
  try {
    const job = await api('/api/admin/marketing/job');
    if (job.status === 'running') pollJob(loadQueue);
  } catch {}
  loadQueue();
})();
