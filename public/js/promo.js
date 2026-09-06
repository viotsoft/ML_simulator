/* ML Career Simulator — промо-ролик (код-анимация, ~120 сек, RU/EN)
   Арка: классический ML → агентная инженерия → уровень архитектора,
   собеседования на реальных вопросах продукта, переход из разработки в AI.
   Плеер умеет паузу с читаемым кадром, покадровую навигацию и озвучку
   синтезом речи браузера (с тихим откатом, если голоса нет). */
(function () {
  const player = document.getElementById('promoPlayer');
  if (!player) return;
  const LANG = player.dataset.lang === 'en' ? 'en' : 'ru';

  const T = {
    ru: {
      watch: '▶ Смотреть промо · 2:00',
      replay: '↻ Смотреть ещё раз',
      cta: 'Начать бесплатно',
      paused: '❚❚ Пауза — можно читать',
      prev: 'Предыдущая сцена',
      next: 'Следующая сцена',
      chapters: 'Сцены',
      scenes: {
        n1: 'Классический ML — это только вход. Дальше начинается то, за что платит бизнес.',
        n2: 'Вас нанимают джуниором. Задача приходит не из учебника, а от тимлида.',
        n3: 'Второй трек — про агентов, которые закрывают операционные процессы. Смотрите, как это работает.',
        n4: 'Третий трек готовит к сертификации. В конце — пробный экзамен с отчётом по доменам.',
        n5: 'Вопросы в симуляторе настоящие. Вот как выглядит джуниорский.',
        n6: 'На мидле спрашивают уже не определения, а расследование.',
        n7: 'А на системном дизайне метрика измеряется прямо в деньгах.',
        n8: 'Если вы уже пишете код, вам не хватает не синтаксиса.',
        n9: 'На выходе — не конспект, а готовность отвечать за решение.',
        n10: 'Три трека, три сертификата, одна подписка. Первые два модуля каждого — бесплатно.',

        hook: [
          'Классический ML — вход в профессию.',
          'Агентные системы — то, что бизнес автоматизирует сегодня.',
          'Архитектура — уровень, где решение видно целиком.',
        ],
        hookCap: 'Путь от первой ML-задачи до архитектуры уровня enterprise',

        mlTask: 'Лена, тимлид: выручка растёт, прибыль — нет. Ответ нужен бизнесу к пятнице.',
        mlTitle: 'eda_report.py — задача №1',
        mlInsight: '💡 Рост куплен скидками. Маржа −15%.',
        mlCap: 'Трек 1 · Классический ML: 23 модуля на реальных задачах Datacore',

        agQuote: 'Марина, CEO: хочу маркетинговую фабрику — агент ведёт исходящие сам.',
        agSteps: [
          ['search_leads(icp="финтех, 50–200 чел.")', '20 лидов', 'ok'],
          ['draft_email(lead_id=7)', 'черновик готов', 'ok'],
          ['send_email(...)', 'заблокировано гейтом: нужна подпись человека', 'block'],
          ['request_approval(...)', 'отправлено на подтверждение', 'ok'],
        ],
        agResult: 'Операционный процесс закрыт агентом. Человек — только на подтверждении.',
        agCap: 'Трек 2 · Агентная инженерия: 20 кейсов, Junior AI → Senior AI Engineer',

        exQuestion: 'Вопрос',
        exOf: 'из',
        exScore: 'Балл',
        exThreshold: 'порог 720',
        exDomains: ['Агентная архитектура', 'Инструменты и MCP', 'Процессы разработки', 'Промптинг и вывод', 'Контекст и надёжность'],
        exVerdict: '✅ Порог пройден. Отчёт показывает, какой домен подтянуть.',
        exCap: 'Трек 3 · Подготовка к Claude Certified Architect: 20 модулей и пробный экзамен',

        ivWho: 'Интервьюер',
        ivThink: '🎤 Отвечаете вслух…',
        ivModel: 'Эталонный разбор',
        iv1Q: 'Accuracy модели 99%. Это хорошая модель?',
        iv1A: 'Зависит от баланса классов и цены ошибки. При фроде в 1% константа «всегда нет» даст те же 99%.',
        iv1Cap: 'Симулятор собеседований · Junior ML Engineer',
        iv2Q: 'Модель показала ROC-AUC 0.97 офлайн и провалилась в проде. Ваши гипотезы и план расследования?',
        iv2A: 'Слишком хорошая офлайн-метрика — сама по себе улика. Утечка таргета, утечка времени, утечка препроцессинга.',
        iv2Cap: 'Симулятор собеседований · Middle ML Engineer',
        iv3Q: 'Спроектируйте антифрод-систему для платёжного сервиса (400 тыс. транзакций/день, фрод ~0.1%, решение за 200 мс).',
        iv3A: 'пойманный фрод ($) − стоимость ложных блокировок ($) − операционные расходы',
        iv3Metric: 'Метрика',
        iv3Note: 'Не «какая модель», а «сколько это стоит бизнесу».',
        iv3Cap: 'Симулятор собеседований · ML System Design',

        swLines: ['Вы уже software-инженер? Код — не ваша проблема.', 'Не хватает контекста задач и ответственности за результат.'],
        swCap: 'Переход из разработки в AI',

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
      watch: '▶ Watch the promo · 2:00',
      replay: '↻ Watch again',
      cta: 'Start for free',
      paused: '❚❚ Paused — take your time',
      prev: 'Previous scene',
      next: 'Next scene',
      chapters: 'Scenes',
      scenes: {
        n1: 'Classic ML is only the entry point. What business pays for starts after it.',
        n2: 'You are hired as a junior. The task comes from a team lead, not a textbook.',
        n3: 'The second track is about agents that close operational processes. Watch it run.',
        n4: 'The third track prepares you for certification, ending with a mock exam and a per-domain report.',
        n5: 'The questions in the simulator are real. Here is what a junior one looks like.',
        n6: 'At middle level they ask for an investigation, not a definition.',
        n7: 'And in system design the metric is measured directly in money.',
        n8: 'If you already write code, syntax is not what you are missing.',
        n9: 'What you leave with is not notes, but readiness to own a decision.',
        n10: 'Three tracks, three certificates, one subscription. The first two modules of each are free.',

        hook: [
          'Classic ML is how you get in.',
          'Agentic systems are what business automates today.',
          'Architecture is where the whole solution is visible.',
        ],
        hookCap: 'From your first ML task to enterprise-level architecture',

        mlTask: 'Lena, team lead: revenue is up, profit is not. Business needs an answer by Friday.',
        mlTitle: 'eda_report.py — task #1',
        mlInsight: '💡 Growth was bought with discounts. Margin −15%.',
        mlCap: 'Track 1 · Classic ML: 23 modules on real Datacore problems',

        agQuote: 'Marina, CEO: I want a marketing factory — an agent running outbound on its own.',
        agSteps: [
          ['search_leads(icp="fintech, 50–200 staff")', '20 leads', 'ok'],
          ['draft_email(lead_id=7)', 'draft ready', 'ok'],
          ['send_email(...)', 'blocked by gate: human sign-off required', 'block'],
          ['request_approval(...)', 'sent for approval', 'ok'],
        ],
        agResult: 'An operational process, run by an agent. A human only approves.',
        agCap: 'Track 2 · Agentic engineering: 20 cases, Junior AI → Senior AI Engineer',

        exQuestion: 'Question',
        exOf: 'of',
        exScore: 'Score',
        exThreshold: 'threshold 720',
        exDomains: ['Agentic architecture', 'Tools & MCP', 'Dev workflows', 'Prompting & output', 'Context & reliability'],
        exVerdict: '✅ Passing score reached. The report shows which domain to work on.',
        exCap: 'Track 3 · Claude Certified Architect prep: 20 modules and a mock exam',

        ivWho: 'Interviewer',
        ivThink: '🎤 You answer out loud…',
        ivModel: 'Model answer',
        iv1Q: 'The model\'s accuracy is 99%. Is that a good model?',
        iv1A: 'It depends on class balance and the cost of errors. With 1% fraud, a constant “always no” gives the same 99%.',
        iv1Cap: 'Interview simulator · Junior ML Engineer',
        iv2Q: 'The model showed 0.97 ROC-AUC offline and flopped in production. Your hypotheses and investigation plan?',
        iv2A: 'A too-good offline metric is itself a clue. Target leakage, time leakage, preprocessing leakage.',
        iv2Cap: 'Interview simulator · Middle ML Engineer',
        iv3Q: 'Design an anti-fraud system for a payment service (400K transactions/day, ~0.1% fraud, a decision in 200 ms).',
        iv3A: 'caught fraud ($) − false-block cost ($) − operating cost',
        iv3Metric: 'Metric',
        iv3Note: 'Not “which model”, but “what it costs the business”.',
        iv3Cap: 'Interview simulator · ML System Design',

        swLines: ['Already a software engineer? Code is not your problem.', 'What is missing is task context and ownership of the outcome.'],
        swCap: 'The switch from software engineering into AI',

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
  const clamp01 = (x) => Math.max(0, Math.min(1, x));

  // ---------- сцены
  // {dur, cap, say (реплика диктора), build(el) -> опциональный update(tScene)}
  // update вызывается каждым кадром с временем внутри сцены: так числовые
  // демонстрации (таймер, балл) перематываются и замирают вместе с плеером.
  const scenes = [
    { dur: 10, cap: S.hookCap, say: S.n1, build (el) {
      el.innerHTML = `<div class="sc-hook">
        ${S.hook.map((line, i) => `<div class="sc-hook-line" style="animation-delay:${0.3 + i * 3.3}s">${esc(line)}</div>`).join('')}
      </div>`;
    }},

    { dur: 14, cap: S.mlCap, say: S.n2, build (el) {
      const lines = [
        'df.groupby("month")[["revenue","profit"]].sum()',
        'df["discount_pct"].mean()             # 4.2% → 16.8%',
        'df.duplicated("order_id").sum()       # 412',
      ];
      el.innerHTML = `<div class="sc-track">
        <div class="sc-task" style="animation-delay:.3s">${esc(S.mlTask)}</div>
        <div class="sc-code">
          <div class="sc-code-head"><span class="dot r"></span><span class="dot y"></span><span class="dot g"></span>
            <span class="sc-code-title">${esc(S.mlTitle)}</span></div>
          ${lines.map((l, i) => `<div class="sc-code-line" style="animation-delay:${4.3 + i * 0.9}s"><span class="ln">${i + 1}</span>${esc(l)}</div>`).join('')}
        </div>
        <div class="sc-result" style="animation-delay:9.3s">${esc(S.mlInsight)}</div>
      </div>`;
    }},

    { dur: 20, cap: S.agCap, say: S.n3, build (el) {
      el.innerHTML = `<div class="sc-track">
        <div class="sc-task accent" style="animation-delay:.3s">${esc(S.agQuote)}</div>
        <div class="sc-log">
          ${S.agSteps.map(([call, res, kind], i) => `
            <div class="sc-log-row ${kind}" style="animation-delay:${4.3 + i * 3.3}s">
              <span class="sc-log-mark">${kind === 'block' ? '⛔' : '✓'}</span>
              <span class="sc-log-call">${esc(call)}</span>
              <span class="sc-log-res">${esc(res)}</span>
            </div>`).join('')}
        </div>
        <div class="sc-result" style="animation-delay:17.3s">${esc(S.agResult)}</div>
      </div>`;
    }},

    { dur: 20, cap: S.exCap, say: S.n4, build (el) {
      const D = S.exDomains, PCT = [88, 82, 75, 91, 67];
      el.innerHTML = `<div class="sc-track">
        <div class="sc-exam-head">
          <span class="sc-exam-q">${esc(S.exQuestion)} <b id="exQ">1</b> ${esc(S.exOf)} 60</span>
          <span class="sc-exam-clock" id="exClock">1:12:44</span>
        </div>
        <div class="sc-exam-dots" id="exDots">${Array.from({ length: 60 }, (_, i) => `<i data-i="${i}"></i>`).join('')}</div>
        <div class="sc-exam-score">
          <span class="sc-exam-score-num" id="exScore">100</span>
          <span class="sc-exam-score-lbl">${esc(S.exScore)} · ${esc(S.exThreshold)}</span>
        </div>
        <div class="sc-exam-domains">
          ${D.map((d, i) => `<div class="sc-exam-row">
            <span class="sc-exam-dname">${esc(d)}</span>
            <span class="sc-exam-dbar"><i data-p="${PCT[i]}"></i></span>
            <span class="sc-exam-dnum" data-p="${PCT[i]}">0%</span>
          </div>`).join('')}
        </div>
        <div class="sc-result" id="exVerdict" style="opacity:0">${esc(S.exVerdict)}</div>
      </div>`;

      const qEl = el.querySelector('#exQ'), clockEl = el.querySelector('#exClock');
      const scoreEl = el.querySelector('#exScore'), verdictEl = el.querySelector('#exVerdict');
      const dots = [...el.querySelectorAll('#exDots i')];
      const bars = [...el.querySelectorAll('.sc-exam-dbar i')];
      const nums = [...el.querySelectorAll('.sc-exam-dnum')];
      const START = 4364; // 1:12:44

      return function update (t) {
        // шапка и таймер идут всю сцену
        const left = Math.max(0, START - Math.floor(t * 3));
        clockEl.textContent = `${Math.floor(left / 3600)}:${String(Math.floor(left % 3600 / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`;
        // 0–8 c: отвечаем на вопросы, отметки зеленеют
        const answered = Math.floor(clamp01(t / 8) * 42);
        qEl.textContent = String(Math.min(60, answered + 1));
        dots.forEach((d, i) => d.classList.toggle('done', i < answered));
        // 8–13 c: балл набегает до 742
        const sc = 100 + (742 - 100) * clamp01((t - 8) / 5);
        scoreEl.textContent = String(Math.round(sc));
        scoreEl.classList.toggle('pass', sc >= 720);
        // 13–18 c: полосы доменов заполняются
        bars.forEach((b, i) => {
          const p = Number(b.dataset.p) * clamp01((t - 13 - i * 0.25) / 4);
          b.style.width = `${p}%`;
          b.classList.toggle('weak', Number(b.dataset.p) < 70);
          nums[i].textContent = `${Math.round(p)}%`;
        });
        // 18 c: вердикт
        verdictEl.style.opacity = t >= 18 ? '1' : '0';
      };
    }},

    { dur: 11, cap: S.iv1Cap, say: S.n5, build (el) { el.innerHTML = ivMarkup(S.iv1Q, S.iv1A); }},
    { dur: 11, cap: S.iv2Cap, say: S.n6, build (el) { el.innerHTML = ivMarkup(S.iv2Q, S.iv2A); }},

    { dur: 12, cap: S.iv3Cap, say: S.n7, build (el) {
      el.innerHTML = `<div class="sc-iv">
        <div class="sc-iv-q" style="animation-delay:.3s"><b>${esc(S.ivWho)}:</b> ${esc(S.iv3Q)}</div>
        <div class="sc-iv-a" style="animation-delay:5.3s"><b>${esc(S.iv3Metric)}:</b> ${esc(S.iv3A)}</div>
        <div class="sc-iv-note" style="animation-delay:9.3s">${esc(S.iv3Note)}</div>
      </div>`;
    }},

    { dur: 7, cap: S.swCap, say: S.n8, build (el) {
      el.innerHTML = `<div class="sc-hook sc-out">
        ${S.swLines.map((l, i) => `<div class="sc-hook-line" style="animation-delay:${0.3 + i * 3.3}s">${esc(l)}</div>`).join('')}
      </div>`;
    }},

    { dur: 7, cap: S.outCap, say: S.n9, build (el) {
      el.innerHTML = `<div class="sc-hook sc-out">
        ${S.outLines.map((l, i) => `<div class="sc-hook-line" style="animation-delay:${0.3 + i * 3.3}s">${esc(l)}</div>`).join('')}
      </div>`;
    }},

    { dur: 8, cap: S.finalCap, say: S.n10, build (el) {
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

  function ivMarkup (q, a) {
    return `<div class="sc-iv">
      <div class="sc-iv-q" style="animation-delay:.3s"><b>${esc(S.ivWho)}:</b> ${esc(q)}</div>
      <div class="sc-iv-think" style="animation-delay:4.3s">${esc(S.ivThink)}</div>
      <div class="sc-iv-a" style="animation-delay:7.3s"><b>${esc(S.ivModel)}:</b> ${esc(a)}</div>
    </div>`;
  }

  const TOTAL = scenes.reduce((a, s) => a + s.dur, 0);
  // ---------- музыка (Web Audio, синтез на лету — без аудиофайлов)
  // Мотивационный луп ~112 BPM, Am–F–C–G. Слои включаются по мере развития
  // сюжета (getT — текущая секунда ролика): пэд → бас → бочка → хэты.
  function makeMusic(getT) {
    const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
    if (!AC) return { start() {}, pause() {}, resume() {}, stop() {}, toggleMute() { return true; }, muted: () => true };

    let ctx = null, master = null, comp = null, timer = null, step = 0, stopped = true;
    let muted = false;
    let ducked = false;                       // приглушение под реплику диктора
    const level = () => (muted ? 0 : (ducked ? 0.28 : 0.9));
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
      master.gain.value = level();
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
        master.gain.setValueAtTime(level(), ctx.currentTime);
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
        if (ctx && master && !stopped) master.gain.setTargetAtTime(level(), ctx.currentTime, 0.05);
        return muted;
      },
      duck (on) {
        ducked = !!on;
        if (ctx && master && !stopped) master.gain.setTargetAtTime(level(), ctx.currentTime, 0.08);
      },
      muted: () => muted,
    };
  }


  // ---------- озвучка (синтез речи браузера; нет голоса — идём молча)
  function makeNarrator (lang) {
    const synth = typeof window !== 'undefined' && window.speechSynthesis;
    const noop = { say () {}, pause () {}, resume () {}, stop () {}, setMuted () {}, available: () => false };
    if (!synth || typeof SpeechSynthesisUtterance === 'undefined') return noop;

    let voice = null, muted = false, speaking = false;
    function pick () {
      const vs = synth.getVoices() || [];
      // точное совпадение локали, иначе любой голос нужного языка
      voice = vs.find((v) => v.lang && v.lang.toLowerCase().replace('_', '-') === (lang === 'ru' ? 'ru-ru' : 'en-us'))
           || vs.find((v) => v.lang && v.lang.toLowerCase().startsWith(lang))
           || null;
    }
    pick();
    if (typeof synth.addEventListener === 'function') synth.addEventListener('voiceschanged', pick);

    return {
      say (text) {
        if (muted || !voice || !text) return;
        try {
          synth.cancel();
          const u = new SpeechSynthesisUtterance(text);
          u.voice = voice; u.lang = voice.lang; u.rate = 1.02; u.pitch = 1;
          u.onstart = () => { speaking = true; music.duck(true); };
          u.onend = u.onerror = () => { speaking = false; music.duck(false); };
          synth.speak(u);
        } catch (e) { /* озвучка необязательна */ }
      },
      pause () { try { if (speaking) synth.pause(); } catch (e) {} },
      resume () { try { synth.resume(); } catch (e) {} },
      stop () { try { synth.cancel(); } catch (e) {} speaking = false; music.duck(false); },
      setMuted (v) { muted = v; if (v) this.stop(); },
      available: () => !!voice,
    };
  }

  // ---------- плеер
  // Таймлайн — накопление дельт между кадрами (капы на случай фоновой вкладки:
  // rAF там замирает, и при возврате ролик продолжится с места, а не прыгнет).
  let raf = null, elapsed = 0, lastTs = null, curScene = -1, sceneStart = 0, sceneUpdate = null, curRevealed = false;
  let started = false, finished = false;
  const music = makeMusic(() => elapsed);
  const narrator = makeNarrator(LANG);

  function fmt (t) {
    t = Math.max(0, Math.round(t));
    return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
  }
  function startOf (idx) {
    let acc = 0;
    for (let i = 0; i < idx; i++) acc += scenes[i].dur;
    return acc;
  }
  function sceneAt (t) {
    let acc = 0, idx = 0;
    for (; idx < scenes.length - 1; idx++) { if (t < acc + scenes[idx].dur) break; acc += scenes[idx].dur; }
    return idx;
  }

  // revealed — показать сцену целиком (все элементы на местах, анимации завершены).
  // Нужно для навигации на паузе: «остановился и вчитался».
  function renderScene (idx, revealed) {
    curScene = idx;
    sceneStart = startOf(idx);
    const sc = scenes[idx];
    stage.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'promo-scene' + (revealed ? ' revealed' : '');
    stage.appendChild(wrap);
    curRevealed = !!revealed;
    sceneUpdate = sc.build(wrap) || null;
    if (sceneUpdate) sceneUpdate(revealed ? sc.dur : 0);
    captionEl.textContent = sc.cap;
    markChapter(idx);
  }

  function updateUI () {
    progressEl.style.width = `${(elapsed / TOTAL) * 100}%`;
    timeEl.textContent = `${fmt(elapsed)} / ${fmt(TOTAL)}`;
  }

  function tick (ts) {
    if (lastTs !== null) elapsed += Math.min((ts - lastTs) / 1000, 0.1);
    lastTs = ts;
    if (elapsed >= TOTAL) return finish();
    const idx = sceneAt(elapsed);
    if (idx !== curScene) { renderScene(idx); narrator.say(scenes[idx].say); }
    if (sceneUpdate) sceneUpdate(elapsed - sceneStart);
    updateUI();
    raf = requestAnimationFrame(tick);
  }

  function setPausedUI (on) {
    stage.classList.toggle('frozen', on);   // останавливает CSS-анимации сцены
    pauseChip.textContent = T.paused;
    pauseChip.hidden = !on;
  }

  function play () {
    finished = false;
    overlay.classList.add('hidden');
    player.dataset.playing = '1';
    setPausedUI(false);
    lastTs = null;
    // сцена, показанная раскрытой (постер или переход на паузе), пересобирается,
    // иначе анимации не проиграют; обычное продолжение после паузы — без пересборки
    if (curScene < 0 || curRevealed) { renderScene(sceneAt(elapsed)); narrator.say(scenes[curScene].say); }
    if (started) { music.resume(); narrator.resume(); } else { music.start(); started = true; }
    raf = requestAnimationFrame(tick);
  }

  function pause () {
    player.dataset.playing = '0';
    cancelAnimationFrame(raf);
    music.pause();
    narrator.pause();
    setPausedUI(true);      // оверлей НЕ показываем: кадр должен остаться читаемым
  }

  function finish () {
    player.dataset.playing = '0';
    finished = true;
    cancelAnimationFrame(raf);
    elapsed = TOTAL; lastTs = null;
    music.stop(); narrator.stop();
    setPausedUI(false);
    progressEl.style.width = '100%';
    timeEl.textContent = `${fmt(TOTAL)} / ${fmt(TOTAL)}`;
    overlay.classList.remove('hidden');
    overlayBtn.textContent = T.replay;
  }

  // Переход к сцене. На паузе — сразу раскрытой, чтобы можно было читать.
  function goToScene (idx) {
    idx = Math.max(0, Math.min(scenes.length - 1, idx));
    const playing = player.dataset.playing === '1';
    elapsed = startOf(idx);
    lastTs = null;
    narrator.stop();
    if (finished) { finished = false; overlay.classList.add('hidden'); }
    renderScene(idx, !playing);
    updateUI();
    if (playing) narrator.say(scenes[idx].say);
  }

  // ---------- элементы управления, которых нет в разметке страницы
  const bar = player.querySelector('.promo-bar');
  const mkBtn = (label, title) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'promo-nav'; b.textContent = label; b.title = title;
    return b;
  };
  const prevBtn = mkBtn('⏮', T.prev), nextBtn = mkBtn('⏭', T.next);
  bar.insertBefore(prevBtn, bar.firstChild);
  bar.insertBefore(nextBtn, bar.firstChild.nextSibling);
  prevBtn.addEventListener('click', (e) => { e.stopPropagation(); goToScene(curScene - 1); });
  nextBtn.addEventListener('click', (e) => { e.stopPropagation(); goToScene(curScene + 1); });

  const pauseChip = document.createElement('div');
  pauseChip.className = 'promo-paused-chip';
  pauseChip.hidden = true;
  player.appendChild(pauseChip);

  // Полоска глав под плеером: на паузе по ней можно спокойно ходить и читать.
  const chapters = document.createElement('div');
  chapters.className = 'promo-chapters';
  chapters.innerHTML = `<span class="promo-chapters-lbl">${esc(T.chapters)}</span>` +
    scenes.map((sc, i) => `<button type="button" class="promo-chapter" data-i="${i}" title="${esc(sc.cap)}">${i + 1}</button>`).join('');
  player.parentNode.insertBefore(chapters, player.nextSibling);
  const chapterBtns = [...chapters.querySelectorAll('.promo-chapter')];
  chapterBtns.forEach((b) => b.addEventListener('click', () => goToScene(Number(b.dataset.i))));
  function markChapter (idx) { chapterBtns.forEach((b, i) => b.classList.toggle('current', i === idx)); }

  // ---------- события
  overlay.addEventListener('click', () => {
    if (overlayBtn.textContent === T.replay) { elapsed = 0; curScene = -1; }
    play();
  });
  stage.addEventListener('click', () => {
    if (player.dataset.playing === '1') pause();
    else if (!finished) play();
  });

  const track = player.querySelector('.promo-track');
  track.addEventListener('click', (e) => {
    e.stopPropagation();
    const r = track.getBoundingClientRect();
    if (!r.width) return;
    elapsed = Math.min(TOTAL - 0.05, Math.max(0, ((e.clientX - r.left) / r.width) * TOTAL));
    lastTs = null;
    narrator.stop();
    const playing = player.dataset.playing === '1';
    if (finished) { finished = false; overlay.classList.add('hidden'); }
    renderScene(sceneAt(elapsed), !playing);
    updateUI();
    if (playing) narrator.say(scenes[curScene].say);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && player.dataset.playing === '1') pause();
  });

  const muteBtn = player.querySelector('.promo-mute');
  if (muteBtn) {
    const icon = () => { muteBtn.textContent = music.muted() ? '🔇' : '🔊'; };
    icon();
    narrator.setMuted(music.muted());
    muteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      music.toggleMute();
      narrator.setMuted(music.muted());
      icon();
    });
  }

  timeEl.textContent = `0:00 / ${fmt(TOTAL)}`;
  renderScene(0, true); // постер-кадр — сразу читаемый
})();
