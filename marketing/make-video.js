// Вертикальное видео 1080×1920 для TikTok: 3 слайда (hook → points → CTA)
// с лёгким zoom-in + синтезированный саундтрек (та же прогрессия Am–F–C–G,
// что в промо-ролике на лендинге). Нужен ffmpeg (есть в GitHub Actions ubuntu).

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { renderSlide } = require('./render-card');

const SLIDE_SEC = 5;
const FPS = 25;

// ---------- саундтрек: 16-bit mono WAV без зависимостей ----------

const SR = 44100;
const BPM = 112;
const BEAT = 60 / BPM;
// Am, F, C, G (частоты нот), бас — корень октавой ниже
const CHORDS = [
  [220.0, 261.63, 329.63],
  [174.61, 220.0, 261.63],
  [261.63, 329.63, 392.0],
  [196.0, 246.94, 293.66],
];

function synthTrack(seconds) {
  const n = Math.floor(seconds * SR);
  const buf = new Float64Array(n);
  const barLen = BEAT * 4;

  const tone = (start, dur, freq, gain, decay) => {
    const s0 = Math.floor(start * SR);
    const s1 = Math.min(n, Math.floor((start + dur) * SR));
    for (let i = s0; i < s1; i++) {
      const t = (i - s0) / SR;
      const env = Math.min(1, t / 0.02) * Math.exp(-t * decay);
      buf[i] += Math.sin(2 * Math.PI * freq * t) * gain * env;
    }
  };

  for (let bar = 0; bar * barLen < seconds; bar++) {
    const t0 = bar * barLen;
    const chord = CHORDS[bar % 4];
    // пад — аккорд на весь такт
    for (const f of chord) tone(t0, barLen, f, 0.10, 0.35);
    for (let beat = 0; beat < 4; beat++) {
      const bt = t0 + beat * BEAT;
      // бас на каждую долю
      tone(bt, BEAT * 0.9, chord[0] / 2, 0.22, 2.5);
      // кик: короткий свип вниз
      const k0 = Math.floor(bt * SR);
      for (let i = k0; i < Math.min(n, k0 + SR * 0.12); i++) {
        const t = (i - k0) / SR;
        buf[i] += Math.sin(2 * Math.PI * (100 - 500 * t) * t) * 0.5 * Math.exp(-t * 28);
      }
      // арпеджио восьмыми
      tone(bt, BEAT * 0.45, chord[beat % 3] * 2, 0.07, 6);
      tone(bt + BEAT / 2, BEAT * 0.45, chord[(beat + 1) % 3] * 2, 0.07, 6);
    }
  }

  // фейд-аут в конце + мягкий клип
  const fade = SR * 1.2;
  const pcm = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) {
    let v = Math.tanh(buf[i]);
    if (i > n - fade) v *= (n - i) / fade;
    pcm.writeInt16LE(Math.round(v * 32767 * 0.9), i * 2);
  }

  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(SR, 24);
  header.writeUInt32LE(SR * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

// ---------- сборка видео ----------

async function makeVideo(post, outPath) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mlsim-video-'));
  try {
    const slides = [
      path.join(tmp, 's1.png'),
      path.join(tmp, 's2.png'),
      path.join(tmp, 's3.png'),
    ];
    await renderSlide('hook', post.card, slides[0]);
    await renderSlide('points', post.card, slides[1]);
    await renderSlide('cta', post.card, slides[2]);

    const wav = path.join(tmp, 'track.wav');
    fs.writeFileSync(wav, synthTrack(slides.length * SLIDE_SEC));

    // Каждый слайд — ОДИН входной кадр; zoompan размножает его в d кадров
    // с плавным зумом к центру.
    const d = SLIDE_SEC * FPS;
    const zoom = (i) =>
      `[${i}:v]zoompan=z='min(1+0.0007*on,1.1)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${d}:s=1080x1920:fps=${FPS},format=yuv420p[v${i}]`;
    const filter = `${slides.map((_, i) => zoom(i)).join(';')};${slides.map((_, i) => `[v${i}]`).join('')}concat=n=${slides.length}:v=1:a=0[v]`;

    execFileSync('ffmpeg', [
      '-y',
      ...slides.flatMap((s) => ['-i', s]),
      '-i', wav,
      '-filter_complex', filter,
      '-map', '[v]', '-map', `${slides.length}:a`,
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '22',
      '-c:a', 'aac', '-b:a', '128k',
      '-shortest', outPath,
    ], { stdio: ['ignore', 'ignore', 'pipe'] });
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

module.exports = { makeVideo, synthTrack };
