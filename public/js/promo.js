/* ML Career Simulator — промо-ролик (код-анимация, ~60 сек, RU/EN)
   Арка: классический ML → агентная инженерия → уровень архитектора,
   плюс собеседования и переход из разработки в AI. */
(function () {
  const player = document.getElementById('promoPlayer');
  if (!player) return;
  const LANG = player.dataset.lang === 'en' ? 'en' : 'ru';

  const T = {
    ru: {
      watch: '▶ Смотреть промо · 1:00',
      replay: '↻ Смотреть ещё раз',
      cta: 'Начать бесплатно',
      scenes: {
        hook: [
          'Классический ML — вход в профессию.',
          'Агентные системы — то, что бизнес автоматизирует сегодня.',
          'Архитектура — уровень, где решение видно целиком.',
        ],
        hookCap: 'Путь от первой ML-задачи до архитектуры уровня enterprise',

        mlTask: 'Лена, тимлид: выручка растёт, прибыль — нет. Ответ нужен бизнесу к пятнице.',
        mlTitle: 'eda_report.py — задача №1',
        mlInsight: '💡 Рост куплен скидками. Маржа −15%. Это ответ бизнесу, а не график.',
        mlCap: 'Трек 1 · Классический ML: 23 модуля на реальных задачах Datacore',

        agQuote: 'Марина, CEO: хочу маркетинговую фабрику — агент ведёт исходящие сам.',
        agNodes: ['координатор', 'поиск', 'черновик', 'проверка', 'человек ✓'],
        agResult: 'Операционный процесс закрыт агентом. Человек остаётся только на подтверждении.',
        agCap: 'Трек 2 · Агентная инженерия: 20 кейсов, Junior AI → Senior AI Engineer',

        arTitle: 'Уровень Solution Architect: систему видно целиком',
        arTiles: ['Агентная архитектура', 'Инструменты и MCP', 'Процессы разработки', 'Промптинг и данные', 'Контекст и надёжность'],
        arResult: 'Пробный экзамен: 60 вопросов за 120 минут, отчёт по доменам — как на настоящем.',
        arCap: 'Трек 3 · Подготовка к Claude Certified Architect: 20 модулей и пробный экзамен',

        ivIntro: 'Вы уже software-инженер? Код — не ваша проблема.',
        ivQ: 'Вопрос интервьюера: «Accuracy 99% — это хорошо?»',
        ivThink: '🎤 Отвечаете вслух…',
        ivA: '«Зависит от баланса классов и цены ошибки» — эталонный разбор внутри',
        ivCap: 'Симулятор собеседований: Junior, Middle, System Design — и переход из разработки в AI',

        outLines: ['Не конспект теории. Не пачка ноутбуков.', 'Готовность решать задачу бизнеса — и защитить решение.'],
        outCap: 'Чем вы отличаетесь от выпускника курса',

        certs: ['Middle-track ML Engineer', 'AI Agent Engineer', 'CCAR-F Exam Ready'],
        certEyebrow: 'CERTIFICATE',
        finalTitle: 'Ваш путь в AI начинается здесь',
        finalSub: 'Первые 2 модуля каждого трека — бесплатно, без карты.',
        finalCap: 'Три трека — три сертификата. Одна подписка.',
      },
    },
    en: {
      watch: '▶ Watch the promo · 1:00',
      replay: '↻ Watch again',
      cta: 'Start for free',
      scenes: {
        hook: [
          'Classic ML is how you get in.',
          'Agentic systems are what business automates today.',
          'Architecture is where the whole solution is visible.',
        ],
        hookCap: 'From your first ML task to enterprise-level architecture',

        mlTask: 'Lena, team lead: revenue is up, profit is not. Business needs an answer by Friday.',
        mlTitle: 'eda_report.py — task #1',
        mlInsight: '💡 Growth was bought with discounts. Margin −15%. That is an answer, not a chart.',
        mlCap: 'Track 1 · Classic ML: 23 modules on real Datacore problems',

        agQuote: 'Marina, CEO: I want a marketing factory — an agent running outbound on its own.',
        agNodes: ['coordinator', 'search', 'draft', 'check', 'human ✓'],
        agResult: 'An operational process, run by an agent. A human stays only on approval.',
        agCap: 'Track 2 · Agentic engineering: 20 cases, Junior AI → Senior AI Engineer',

        arTitle: 'Solution Architect level: you see the whole system',
        arTiles: ['Agentic architecture', 'Tools & MCP', 'Dev workflows', 'Prompting & data', 'Context & reliability'],
        arResult: 'Mock exam: 60 questions in 120 minutes, a per-domain report — like the real one.',
        arCap: 'Track 3 · Claude Certified Architect prep: 20 modules and a mock exam',

        ivIntro: 'Already a software engineer? Code is not your problem.',
        ivQ: 'Interviewer: “Is 99% accuracy good?”',
        ivThink: '🎤 You answer out loud…',
        ivA: '“It depends on class balance and the cost of errors” — model answer inside',
        ivCap: 'Interview simulator: Junior, Middle, System Design — and the switch from dev into AI',

        outLines: ['Not lecture notes. Not a pile of notebooks.', 'Readiness to solve a business problem — and defend the solution.'],
        outCap: 'What sets you apart from a course graduate',

        certs: ['Middle-track ML Engineer', 'AI Agent Engineer', 'CCAR-F Exam Ready'],
        certEyebrow: 'CERTIFICATE',
        finalTitle: 'Your path into AI starts here',
        finalSub: 'The first 2 modules of each track are free, no card.',
        finalCap: 'Three tracks — three certificates. One subscription.',
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
  // Дуга: хук → классический ML → агентная инженерия → уровень архитектора →
  // собеседования → что остаётся на выходе → сертификаты и призыв. Всего 60 сек.
  const scenes = [
    { dur: 6, cap: S.hookCap, build (el) {
      el.innerHTML = `<div class="sc-hook">
        ${S.hook.map((line, i) => `<div class="sc-hook-line" style="animation-delay:${0.2 + i * 1.7}s">${esc(line)}</div>`).join('')}
      </div>`;
    }},
    { dur: 10, cap: S.mlCap, build (el) {
      const lines = [
        'df.groupby("month")[["revenue","profit"]].sum()',
        'df["discount_pct"].mean()             # 4.2% → 16.8%',
        'df.duplicated("order_id").sum()       # 412',
      ];
      el.innerHTML = `<div class="sc-track">
        <div class="sc-task" style="animation-delay:.2s">${esc(S.mlTask)}</div>
        <div class="sc-code">
          <div class="sc-code-head"><span class="dot r"></span><span class="dot y"></span><span class="dot g"></span>
            <span class="sc-code-title">${esc(S.mlTitle)}</span></div>
          ${lines.map((l, i) => `<div class="sc-code-line" style="animation-delay:${1.6 + i * 1.6}s"><span class="ln">${i + 1}</span>${esc(l)}</div>`).join('')}
          <div class="sc-insight" style="animation-delay:6.8s">${esc(S.mlInsight)}</div>
        </div>
      </div>`;
    }},
    { dur: 10, cap: S.agCap, build (el) {
      el.innerHTML = `<div class="sc-track">
        <div class="sc-task accent" style="animation-delay:.2s">${esc(S.agQuote)}</div>
        <div class="sc-agents">
          ${S.agNodes.map((n, i) => `${i ? `<span class="sc-agent-arrow" style="animation-delay:${1.5 + i * 0.8}s">→</span>` : ''}<span class="sc-agent-node${i === S.agNodes.length - 1 ? ' done' : ''}" style="animation-delay:${1.8 + i * 0.8}s">${esc(n)}</span>`).join('')}
        </div>
        <div class="sc-result" style="animation-delay:7s">${esc(S.agResult)}</div>
      </div>`;
    }},
    { dur: 10, cap: S.arCap, build (el) {
      el.innerHTML = `<div class="sc-track">
        <div class="sc-arch-title" style="animation-delay:.2s">${esc(S.arTitle)}</div>
        <div class="sc-arch">
          ${S.arTiles.map((t, i) => `<div class="sc-arch-tile" style="animation-delay:${1.4 + i * 0.7}s">${esc(t)}</div>`).join('')}
        </div>
        <div class="sc-result" style="animation-delay:6.6s">${esc(S.arResult)}</div>
      </div>`;
    }},
    { dur: 10, cap: S.ivCap, build (el) {
      el.innerHTML = `<div class="sc-iv">
        <div class="sc-iv-intro" style="animation-delay:.2s">${esc(S.ivIntro)}</div>
        <div class="sc-iv-q" style="animation-delay:1.8s">${esc(S.ivQ)}</div>
        <div class="sc-iv-think" style="animation-delay:4.2s">${esc(S.ivThink)}</div>
        <div class="sc-iv-a" style="animation-delay:6.6s">${esc(S.ivA)}</div>
      </div>`;
    }},
    { dur: 6, cap: S.outCap, build (el) {
      el.innerHTML = `<div class="sc-hook sc-out">
        ${S.outLines.map((line, i) => `<div class="sc-hook-line" style="animation-delay:${0.2 + i * 2}s">${esc(line)}</div>`).join('')}
      </div>`;
    }},
    { dur: 8, cap: S.finalCap, build (el) {
      el.innerHTML = `<div class="sc-cert">
        <div class="sc-cert-row">
          ${S.certs.map((c, i) => `<div class="sc-cert-card" style="animation-delay:${0.3 + i * 0.7}s">
            <div class="sc-cert-eyebrow">${esc(S.certEyebrow)}</div>
            <div class="sc-cert-track">${esc(c)}</div>
          </div>`).join('')}
        </div>
        <div class="sc-final" style="animation-delay:4.4s">
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
      tone('triangle', mtof(chord[ARP[pos]] + 12), t0, STEP * 0.9, T > 7 ? 0.085 : 0.055);         // арпеджио
      if (T > 7 && pos % 4 === 0) tone('square', mtof(BASS[bar] + 12), t0, SPB * 0.85, 0.06, 500); // бас
      if (T > 16 && pos % 2 === 0) kick(t0);                                                        // бочка
      if (T > 28 && pos % 2 === 1) hat(t0);                                                         // хэты
      if (T > 44 && pos === 4) kick(t0 + STEP / 2);                                                 // драйв-синкопа
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
