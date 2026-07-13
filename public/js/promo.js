/* ML Career Simulator — промо-ролик (код-анимация, ~100 сек, RU/EN) */
(function () {
  const player = document.getElementById('promoPlayer');
  if (!player) return;
  const LANG = player.dataset.lang === 'en' ? 'en' : 'ru';

  const T = {
    ru: {
      watch: '▶ Смотреть промо · 1:40',
      replay: '↻ Смотреть ещё раз',
      cta: 'Начать бесплатно',
      scenes: {
        hook: ['Курсы дают знания.', 'Работу дают навыки.', 'Получите их — как на настоящей работе.'],
        hookCap: 'ML Career Simulator — симулятор карьеры ML-инженера',
        chatTitle: '#ml-team · Datacore',
        chat1: 'Добро пожаловать в команду! Ты наш новый Junior ML Engineer 🎉',
        chat2: 'Первая задача: выручка растёт, а прибыль — нет. Разберись, что в данных.',
        chat3: 'Отчёт нужен к пятнице. Погнали!',
        chatCap: 'Вас «принимают на работу» в компанию Datacore',
        codeTitle: 'eda_report.py — задача №1',
        codeInsight: '💡 Инсайт: рост куплен скидками, маржа −15%',
        codeCap: 'Решаете реальные задачи: код, данные, выводы для бизнеса',
        alertTitle: '⚠ ALERT: model quality drop',
        alertFound: '🔍 Найдено: утечка данных из будущего',
        alertFixed: '✅ Исправлено. Метрика восстановлена',
        alertCap: 'Разбираете инциденты, как в настоящем проде',
        growthCap: '23 модуля: от первого дня до Middle ML Engineer',
        gJunior: 'Junior', gPlus: 'Junior+', gTrack: 'Middle-track', gMiddle: 'Middle 🎉',
        mods: ['EDA и статистика', 'Модели и метрики', 'Фрод и рекомендации', 'MLOps и System Design'],
        ivQ: 'Вопрос интервьюера: «Accuracy 99% — это хорошо?»',
        ivThink: 'Ваш ответ вслух…',
        ivA: '«Зависит от баланса классов и цены ошибки…» — эталонный разбор внутри',
        ivCap: 'Симулятор собеседований: Junior, Middle, System Design',
        certName: 'Ваше Имя',
        certText: 'Middle-track ML Engineer',
        certCap: 'Финальный проект, экзамен — и сертификат',
        finalTitle: 'Ваша первая ML-работа начинается здесь',
        finalSub: 'Первые 2 модуля — бесплатно. Без карты.',
      },
    },
    en: {
      watch: '▶ Watch the promo · 1:40',
      replay: '↻ Watch again',
      cta: 'Start for free',
      scenes: {
        hook: ['Courses give knowledge.', 'Jobs demand skills.', 'Get them — like on a real job.'],
        hookCap: 'ML Career Simulator — an ML engineer career simulator',
        chatTitle: '#ml-team · Datacore',
        chat1: 'Welcome to the team! You are our new Junior ML Engineer 🎉',
        chat2: 'First task: revenue grows, profit does not. Find out what is in the data.',
        chat3: 'Report due Friday. Let’s go!',
        chatCap: 'You get "hired" by the Datacore company',
        codeTitle: 'eda_report.py — task #1',
        codeInsight: '💡 Insight: growth bought with discounts, margin −15%',
        codeCap: 'You solve real tasks: code, data, business conclusions',
        alertTitle: '⚠ ALERT: model quality drop',
        alertFound: '🔍 Found: data leakage from the future',
        alertFixed: '✅ Fixed. Metric recovered',
        alertCap: 'You investigate incidents, like in real production',
        growthCap: '23 modules: from day one to Middle ML Engineer',
        gJunior: 'Junior', gPlus: 'Junior+', gTrack: 'Middle-track', gMiddle: 'Middle 🎉',
        mods: ['EDA & statistics', 'Models & metrics', 'Fraud & recommenders', 'MLOps & System Design'],
        ivQ: 'Interviewer: “Is 99% accuracy good?”',
        ivThink: 'Your answer out loud…',
        ivA: '“It depends on class balance and the cost of errors…” — model answer inside',
        ivCap: 'Interview simulator: Junior, Middle, System Design',
        certName: 'Your Name',
        certText: 'Middle-track ML Engineer',
        certCap: 'A capstone project, the exam — and the certificate',
        finalTitle: 'Your first ML job starts here',
        finalSub: 'First 2 modules are free. No card required.',
      },
    },
  }[LANG];
  const S = T.scenes;

  const stage = player.querySelector('.promo-stage');
  const captionEl = player.querySelector('.promo-caption');
  const progressEl = player.querySelector('.promo-progress');
  const overlay = player.querySelector('.promo-overlay');
  const overlayBtn = player.querySelector('.promo-overlay-btn');
  const timeEl = player.querySelector('.promo-time');
  overlayBtn.textContent = T.watch;

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------- сцены: {dur (сек), cap, build(el) — DOM с CSS-анимациями}
  const scenes = [
    { dur: 11, cap: S.hookCap, build (el) {
      el.innerHTML = `<div class="sc-hook">
        ${S.hook.map((line, i) => `<div class="sc-hook-line" style="animation-delay:${i * 2.4}s">${esc(line)}</div>`).join('')}
      </div>`;
    }},
    { dur: 14, cap: S.chatCap, build (el) {
      el.innerHTML = `<div class="sc-chat">
        <div class="sc-chat-head">💬 ${esc(S.chatTitle)}</div>
        <div class="sc-bubble" style="animation-delay:.6s"><span class="sc-ava">Л</span>${esc(S.chat1)}</div>
        <div class="sc-bubble" style="animation-delay:4.6s"><span class="sc-ava">Л</span>${esc(S.chat2)}</div>
        <div class="sc-bubble" style="animation-delay:8.6s"><span class="sc-ava">М</span>${esc(S.chat3)}</div>
        <div class="sc-typing" style="animation-delay:11.5s">●●●</div>
      </div>`;
    }},
    { dur: 15, cap: S.codeCap, build (el) {
      const lines = [
        'df = pd.read_csv("sales.csv")',
        'df.duplicated(subset="order_id").sum()   # 412 !',
        'df.groupby("month")[["revenue","profit"]].sum()',
        'df["discount_pct"].mean()               # 4.2% → 16.8%',
      ];
      el.innerHTML = `<div class="sc-code">
        <div class="sc-code-head"><span class="dot r"></span><span class="dot y"></span><span class="dot g"></span>
          <span class="sc-code-title">${esc(S.codeTitle)}</span></div>
        ${lines.map((l, i) => `<div class="sc-code-line" style="animation-delay:${0.6 + i * 2.2}s"><span class="ln">${i + 1}</span>${esc(l)}</div>`).join('')}
        <div class="sc-insight" style="animation-delay:10.5s">${esc(S.codeInsight)}</div>
      </div>`;
    }},
    { dur: 15, cap: S.alertCap, build (el) {
      el.innerHTML = `<div class="sc-alert">
        <div class="sc-alert-banner">${esc(S.alertTitle)}</div>
        <svg viewBox="0 0 560 170" class="sc-alert-chart">
          <polyline class="sc-line-bad" points="10,40 90,42 170,45 250,44 330,95 410,120 550,135"/>
          <polyline class="sc-line-good" points="330,95 410,70 490,50 550,45"/>
          <line x1="330" y1="20" x2="330" y2="150" stroke="#f87171" stroke-dasharray="5 4"/>
        </svg>
        <div class="sc-alert-found" style="animation-delay:5s">${esc(S.alertFound)}</div>
        <div class="sc-alert-fixed" style="animation-delay:9.5s">${esc(S.alertFixed)}</div>
      </div>`;
    }},
    { dur: 15, cap: S.growthCap, build (el) {
      const grades = [S.gJunior, S.gPlus, S.gTrack, S.gMiddle];
      el.innerHTML = `<div class="sc-growth">
        <div class="sc-grade" id="scGrade">${esc(grades[0])}</div>
        <div class="sc-gbar"><div class="sc-gfill"></div></div>
        <div class="sc-mods">
          ${S.mods.map((m, i) => `<div class="sc-mod" style="animation-delay:${1 + i * 2.6}s">✅ ${esc(m)}</div>`).join('')}
        </div>
      </div>`;
      const gradeEl = el.querySelector('#scGrade');
      grades.forEach((g, i) => setTimeout(() => { if (player.dataset.playing === '1') { gradeEl.textContent = g; gradeEl.classList.remove('pop'); void gradeEl.offsetWidth; gradeEl.classList.add('pop'); } }, i * 3400));
    }},
    { dur: 14, cap: S.ivCap, build (el) {
      el.innerHTML = `<div class="sc-iv">
        <div class="sc-iv-q" style="animation-delay:.4s">${esc(S.ivQ)}</div>
        <div class="sc-iv-think" style="animation-delay:3.6s">🎤 ${esc(S.ivThink)}</div>
        <div class="sc-iv-a" style="animation-delay:7.6s">${esc(S.ivA)}</div>
      </div>`;
    }},
    { dur: 16, cap: S.certCap, build (el) {
      el.innerHTML = `<div class="sc-cert">
        <div class="sc-cert-card">
          <div class="sc-cert-eyebrow">CERTIFICATE OF COMPLETION</div>
          <div class="sc-cert-name">${esc(S.certName)}</div>
          <div class="sc-cert-track">${esc(S.certText)}</div>
        </div>
        <div class="sc-final" style="animation-delay:7s">
          <div class="sc-final-title">${esc(S.finalTitle)}</div>
          <div class="sc-final-sub">${esc(S.finalSub)}</div>
          <a class="btn btn-primary btn-lg sc-final-cta" href="/app.html">${esc(T.cta)}</a>
        </div>
      </div>`;
    }},
  ];
  const TOTAL = scenes.reduce((a, s) => a + s.dur, 0);

  // ---------- музыка (Web Audio, синтез на лету — без аудиофайлов)
  // Мотивационный луп ~112 BPM, Am–F–C–G. Слои включаются по мере развития
  // сюжета (getT — текущая секунда ролика): пэд → бас → бочка → хэты.
  function makeMusic(getT) {
    const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
    if (!AC) return { start() {}, pause() {}, resume() {}, stop() {}, toggleMute() { return true; }, muted: () => true };

    let ctx = null, master = null, comp = null, timer = null, step = 0, stopped = true;
    let muted = false;
    try { muted = localStorage.getItem('promoMuted') === '1'; } catch (e) {}

    const BPM = 112, SPB = 60 / BPM, STEP = SPB / 2;              // восьмые
    const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
    const PROG = [[57, 60, 64], [53, 57, 60], [60, 64, 67], [55, 59, 62]]; // Am F C G
    const BASS = [33, 29, 36, 31];
    const ARP  = [0, 1, 2, 1, 0, 2, 1, 2];

    function ensureCtx() {
      if (ctx) return;
      ctx = new AC();
      comp = ctx.createDynamicsCompressor();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.9;
      master.connect(comp).connect(ctx.destination);
    }
    function tone(type, freq, t0, dur, peak, filterFreq) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(peak, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      let node = o;
      if (filterFreq) {
        const f = ctx.createBiquadFilter();
        f.type = 'lowpass'; f.frequency.value = filterFreq;
        o.connect(f); node = f;
      }
      node.connect(g).connect(master);
      o.start(t0); o.stop(t0 + dur + 0.05);
    }
    function kick(t0) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(150, t0);
      o.frequency.exponentialRampToValueAtTime(45, t0 + 0.12);
      g.gain.setValueAtTime(0.32, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);
      o.connect(g).connect(master);
      o.start(t0); o.stop(t0 + 0.25);
    }
    function hat(t0) {
      const len = Math.floor(ctx.sampleRate * 0.05);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const s = ctx.createBufferSource(); s.buffer = buf;
      const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 6000;
      const g = ctx.createGain(); g.gain.value = 0.12;
      s.connect(f).connect(g).connect(master);
      s.start(t0);
    }
    function scheduleStep(i, t0) {
      const bar = Math.floor(i / 8) % 4, pos = i % 8;
      const T = getT();
      const chord = PROG[bar];
      if (pos === 0) chord.forEach((m) => tone('sawtooth', mtof(m), t0, SPB * 3.8, 0.045, 1100)); // пэд
      tone('triangle', mtof(chord[ARP[pos]] + 12), t0, STEP * 0.9, T > 11 ? 0.085 : 0.055);        // арпеджио
      if (T > 11 && pos % 4 === 0) tone('square', mtof(BASS[bar] + 12), t0, SPB * 0.85, 0.06, 500); // бас
      if (T > 25 && pos % 2 === 0) kick(t0);                                                        // бочка
      if (T > 40 && pos % 2 === 1) hat(t0);                                                         // хэты
      if (T > 55 && pos === 4) kick(t0 + STEP / 2);                                                 // драйв-синкопа
    }
    function loop() {
      // lookahead-планировщик: держим очередь нот на ~0.15 c вперёд
      const ahead = ctx.currentTime + 0.15;
      while (nextT < ahead) { scheduleStep(step++, nextT); nextT += STEP; }
    }
    let nextT = 0;
    return {
      start() {
        ensureCtx();
        if (ctx.state === 'suspended') ctx.resume();
        stopped = false;
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setValueAtTime(muted ? 0 : 0.9, ctx.currentTime);
        step = 0; nextT = ctx.currentTime + 0.05;
        clearInterval(timer);
        timer = setInterval(loop, 40);
      },
      pause() { if (ctx && !stopped) ctx.suspend(); },
      resume() { if (ctx && !stopped) ctx.resume(); },
      stop(fadeSec = 1.4) {
        if (!ctx || stopped) return;
        stopped = true;
        clearInterval(timer);
        const t = ctx.currentTime;
        master.gain.cancelScheduledValues(t);
        master.gain.setValueAtTime(master.gain.value, t);
        master.gain.linearRampToValueAtTime(0.0001, t + fadeSec);
      },
      toggleMute() {
        muted = !muted;
        try { localStorage.setItem('promoMuted', muted ? '1' : '0'); } catch (e) {}
        if (ctx && master && !stopped) master.gain.setTargetAtTime(muted ? 0 : 0.9, ctx.currentTime, 0.05);
        return muted;
      },
      muted: () => muted,
    };
  }

  // ---------- плеер
  // Таймлайн — накопление дельт между кадрами (капы на случай фоновой вкладки:
  // rAF там замирает, и при возврате ролик продолжится с места, а не прыгнет).
  let raf = null, elapsed = 0, lastTs = null, curScene = -1;
  const music = makeMusic(() => elapsed);

  function fmt(t) {
    t = Math.max(0, Math.round(t));
    return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
  }

  function renderScene(idx) {
    curScene = idx;
    const sc = scenes[idx];
    stage.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'promo-scene';
    stage.appendChild(wrap);
    sc.build(wrap);
    captionEl.textContent = sc.cap;
  }

  function sceneAt(t) {
    let acc = 0, idx = 0;
    for (; idx < scenes.length - 1; idx++) { if (t < acc + scenes[idx].dur) break; acc += scenes[idx].dur; }
    return idx;
  }
  function updateUI() {
    progressEl.style.width = `${(elapsed / TOTAL) * 100}%`;
    timeEl.textContent = `${fmt(elapsed)} / ${fmt(TOTAL)}`;
  }

  function tick(ts) {
    if (lastTs !== null) elapsed += Math.min((ts - lastTs) / 1000, 0.1);
    lastTs = ts;
    if (elapsed >= TOTAL) return finish();
    const idx = sceneAt(elapsed);
    if (idx !== curScene) renderScene(idx);
    updateUI();
    raf = requestAnimationFrame(tick);
  }

  let wasPaused = false;
  function play() {
    overlay.classList.add('hidden');
    player.dataset.playing = '1';
    lastTs = null;
    // пересобрать текущую сцену, чтобы CSS-анимации стартовали корректно
    curScene = -1;
    if (wasPaused) { music.resume(); wasPaused = false; } else { music.start(); }
    raf = requestAnimationFrame(tick);
  }
  function pause() {
    player.dataset.playing = '0';
    cancelAnimationFrame(raf);
    wasPaused = true;
    music.pause();
    overlay.classList.remove('hidden');
    overlayBtn.textContent = T.watch;
  }
  function finish() {
    player.dataset.playing = '0';
    cancelAnimationFrame(raf);
    elapsed = 0; lastTs = null; curScene = -1; wasPaused = false;
    music.stop();
    progressEl.style.width = '100%';
    overlay.classList.remove('hidden');
    overlayBtn.textContent = T.replay;
  }

  overlay.addEventListener('click', () => { if (overlayBtn.textContent === T.replay) elapsed = 0; play(); });
  stage.addEventListener('click', () => { if (player.dataset.playing === '1') pause(); });

  // перемотка кликом по таймлайну
  const track = player.querySelector('.promo-track');
  track.addEventListener('click', (e) => {
    const r = track.getBoundingClientRect();
    if (!r.width) return;
    elapsed = Math.min(TOTAL - 0.05, Math.max(0, ((e.clientX - r.left) / r.width) * TOTAL));
    lastTs = null;
    renderScene(sceneAt(elapsed));
    updateUI();
    if (player.dataset.playing !== '1') { overlay.classList.remove('hidden'); overlayBtn.textContent = T.watch; }
  });
  // вкладка ушла в фон — ставим ролик (и музыку) на паузу, как обычное видео
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && player.dataset.playing === '1') pause();
  });

  // кнопка звука
  const muteBtn = player.querySelector('.promo-mute');
  if (muteBtn) {
    const icon = () => { muteBtn.textContent = music.muted() ? '🔇' : '🔊'; };
    icon();
    muteBtn.addEventListener('click', (e) => { e.stopPropagation(); music.toggleMute(); icon(); });
  }

  timeEl.textContent = `0:00 / ${fmt(TOTAL)}`;
  renderScene(0); // постер-кадр
})();
