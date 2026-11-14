// Has the score in score.mjs played on recordings of real instruments and writes the result as audio.
//
//   node tools/music/render.mjs <piano> [strings.sf2] [out.mp3]
//
// <piano> is the unpacked "Salamander Grand Piano V3" (44.1 kHz, 16 bit) folder that holds A0v1.wav … C8v16.wav:
// a Yamaha C5 concert grand recorded note by note at 16 loudness levels by Alexander Holm (CC BY 3.0), from
// https://freepats.zenvoid.org/Piano/acoustic-grand-piano.html
// [strings.sf2] is a General MIDI SoundFont with a string section. The recording in audio/ used
// MuseScore_General_Full.sf2 (S. Christian Collins and others, MIT licence):
//   apt install fluidsynth ffmpeg musescore-general-soundfont-lossless
// Nothing here synthesises sound. Every piano note is one of the grand's recordings, started, held and damped
// when the score says, followed by the instrument's own string-resonance and key-release recordings;
// the strings are the SoundFont's recordings, played by FluidSynth; ffmpeg puts both in one hall.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { perform, TITLE } from './score.mjs';

const [grand, soundfont = '/usr/share/sounds/sf2/MuseScore_General_Full.sf2', out = 'audio/concerto.mp3'] = process.argv.slice(2);
if (!grand || !existsSync(path.join(grand, 'C4v8.wav')) || !existsSync(soundfont)) {
  console.error('usage: node tools/music/render.mjs <folder with A0v1.wav … C8v16.wav> [strings.sf2] [out.mp3]');
  process.exit(1);
}

const RATE = 44100, LEAD = .4, TAIL = 3.5;
const piece = perform(), seconds = LEAD + piece.length + TAIL, total = Math.ceil(seconds * RATE);
const work = mkdtempSync(path.join(tmpdir(), 'concerto-'));
const decibels = value => 10 ** (value / 20);

/* ---- the strings: written out as MIDI and played by FluidSynth ---- */
// [General MIDI programme, volume, left-right position] per section, in the old seating with the violins facing each other
const STRINGS = { 1: [48, 120, 28], 2: [48, 114, 100], 3: [48, 108, 80], 4: [48, 122, 50], 5: [48, 112, 58] };   // violins I · violins II · violas · cellos · basses
const TICKS_PER_SECOND = 960;   // 480 ticks per beat at 120 beats a minute: the score's own tempo is already in the timings
const number = value => { const bytes = [value & 127]; while (value >>= 7) bytes.unshift(value & 127 | 128); return bytes; };   // MIDI variable-length number
const chunk = (id, bytes) => Buffer.concat([Buffer.from(id), Buffer.from([bytes.length >>> 24, bytes.length >>> 16 & 255, bytes.length >>> 8 & 255, bytes.length & 255]), Buffer.from(bytes)]);
const tracks = Object.entries(STRINGS).map(([channel, [programme, volume, position]]) => {
  const events = [[0, [0xB0 | channel, 7, volume]], [0, [0xB0 | channel, 10, position]], [0, [0xB0 | channel, 91, 70]], [0, [0xC0 | channel, programme]]];
  for (const { m, t, off, v } of piece.notes.filter(note => note.channel === +channel)) {
    events.push([Math.round((LEAD + t) * TICKS_PER_SECOND), [0x90 | channel, m, Math.max(1, Math.round(v * 127))]]);
    events.push([Math.round((LEAD + off) * TICKS_PER_SECOND), [0x80 | channel, m, 0]]);
  }
  events.sort((a, b) => a[0] - b[0] || (a[1][0] & 0xF0) - (b[1][0] & 0xF0));   // at the same instant, note-offs go first
  const bytes = [];
  let last = 0;
  for (const [tick, message] of events) { bytes.push(...number(tick - last), ...message); last = tick; }
  return chunk('MTrk', [...bytes, 0, 0xFF, 0x2F, 0]);
});
writeFileSync(path.join(work, 'strings.mid'), Buffer.concat([chunk('MThd', [0, 1, 0, tracks.length, 480 >> 8, 480 & 255]), ...tracks]));
execFileSync('fluidsynth', ['-ni', '-q', '-r', String(RATE), '-g', '0.7', '-F', path.join(work, 'strings.wav'),
  '-o', 'synth.chorus.active=0', '-o', 'synth.reverb.active=1', '-o', 'synth.reverb.room-size=0.82', '-o', 'synth.reverb.damp=0.35', '-o', 'synth.reverb.width=1', '-o', 'synth.reverb.level=0.75',
  soundfont, path.join(work, 'strings.mid')], { stdio: ['ignore', 'ignore', 'inherit'] });

/* ---- the piano: the grand's own recordings, placed note by note ---- */
const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const name = key => NAMES[key % 12] + (Math.floor(key / 12) - 1);
const nearest = key => 21 + 3 * Math.round((key - 21) / 3);                          // the piano was recorded every minor third
const LAYERS = [26, 34, 36, 43, 46, 50, 56, 64, 72, 80, 88, 96, 104, 112, 120, 127];   // loudness level → which recording
const track = (velocity, amount) => 1 - amount + amount * (velocity / 127) ** 2;

const loaded = new Map();
function recording(file) {
  if (loaded.has(file)) return loaded.get(file);
  const bytes = readFileSync(path.join(grand, file));
  let at = 12, data = null;
  while (at < bytes.length - 8) {
    const id = bytes.toString('latin1', at, at + 4), size = bytes.readUInt32LE(at + 4);
    if (id === 'data') { data = new Int16Array(bytes.buffer.slice(bytes.byteOffset + at + 8, bytes.byteOffset + at + 8 + size - size % 4)); break; }
    at += 8 + size + size % 2;
  }
  const frames = data.length / 2, left = new Float32Array(frames), right = new Float32Array(frames);
  let peak = 0;
  for (let i = 0; i < frames; i++) { left[i] = data[2 * i] / 32768; right[i] = data[2 * i + 1] / 32768; peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i])); }
  let start = 0;                                                                     // skip any silence before the hammer lands, so rhythm stays tight
  while (start < frames && Math.abs(left[start]) < peak * .01 && Math.abs(right[start]) < peak * .01) start++;
  const sound = { left, right, frames, start: Math.max(0, start - 48) };
  loaded.set(file, sound);
  return sound;
}

const mixLeft = new Float32Array(total), mixRight = new Float32Array(total);
// add one recording to the mix: from `from` seconds, re-pitched by `ratio`, with a loudness that can change over time
function place(file, from, ratio, level) {
  const { left, right, frames, start } = recording(file), first = Math.round(from * RATE);
  for (let i = 0; first + i < total; i++) {
    const gain = level(i / RATE);
    if (gain < 0) break;
    const position = start + i * ratio, index = Math.floor(position), mu = position - index;
    if (index + 2 >= frames) break;
    for (const [source, target] of [[left, mixLeft], [right, mixRight]]) {           // 4-point Hermite interpolation between samples
      const a = source[Math.max(0, index - 1)], b = source[index], c = source[index + 1], d = source[index + 2];
      target[first + i] += gain * (b + .5 * mu * (c - a + mu * (2 * a - 5 * b + 4 * c - d + mu * (3 * (b - c) + d - a))));
    }
  }
}

const PIANO = 1.05, STRINGS_LEVEL = -2.5;   // the balance: the piano's gain, and the strings' level in dB, so the piano leads
for (const { m, t, off, v } of piece.notes.filter(note => note.channel === 0)) {
  const velocity = Math.max(1, Math.min(127, Math.round(v * 127))), centre = nearest(m), ratio = 2 ** ((m - centre) / 12);
  const held = off - t, damped = m < 89, fade = damped ? (m < 48 ? .14 : .1) : .6;   // the top octave and a half has no dampers
  const loud = PIANO * track(velocity, .73);
  place(`${name(centre)}v${LAYERS.findIndex(top => velocity <= top) + 1}.wav`, LEAD + t, ratio, time => time > held + fade * 8 ? -1 : time > held ? loud * Math.exp(-(time - held) / fade) : loud);
  if (!damped) continue;
  // what the real instrument does when the damper lands: the strings' after-ring, and the key coming back up
  const quiet = decay => decibels(-decay * held), after = (file, level, pitch = ratio) => existsSync(path.join(grand, file)) && place(file, LEAD + off, pitch, time => time > 2.5 ? -1 : PIANO * level);
  if (velocity >= 45) after(`harmL${name(centre)}.wav`, decibels(-4) * track(velocity, .92) * quiet(m < 29 ? 6 : m < 38 ? 7 : m < 50 ? 8 : 9));
  else after(`harmS${name(centre)}.wav`, track(velocity, m < 44 ? .95 : .9) * quiet(7));
  after(`harmV3${name(centre)}.wav`, track(velocity, .96) * quiet(2));
  after(`rel${m - 20}.wav`, decibels(-37) * track(velocity, .82) * quiet(2), 1);
}

// the piano's share of the hall: the direct sound plus early reflections and a decaying tail
const hallFrames = Math.round(RATE * 2.6), hall = new Float32Array(hallFrames * 2);
let seed = 7;
const random = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 1073741824 - 1;
for (let channel = 0; channel < 2; channel++) {
  let soft = 0;
  for (let i = Math.round(RATE * .018); i < hallFrames; i++) {
    const time = i / RATE;
    soft += (random() - soft) * (.45 * Math.exp(-time * 2.2) + .05);                 // the hall swallows the treble first
    hall[2 * i + channel] = soft * Math.exp(-time / .36) * Math.min(1, (time - .018) / .03);
  }
  for (const [delay, level] of channel ? [[.013, .1], [.024, -.07], [.037, .05]] : [[.011, .1], [.027, -.07], [.034, .05]]) hall[2 * Math.round(delay * RATE) + channel] += level;
  let energy = 0;
  for (let i = 0; i < hallFrames; i++) energy += hall[2 * i + channel] ** 2;
  for (let i = 0; i < hallFrames; i++) hall[2 * i + channel] *= Math.sqrt(decibels(-9) ** 2 / energy);   // the room sits 9 dB under the piano
  hall[channel] = 1;
}

const wave = (file, interleaved) => {
  const header = Buffer.alloc(44), bytes = Buffer.from(interleaved.buffer, interleaved.byteOffset, interleaved.byteLength);
  header.write('RIFF', 0); header.writeUInt32LE(36 + bytes.length, 4); header.write('WAVEfmt ', 8); header.writeUInt32LE(16, 16);
  header.writeUInt16LE(3, 20); header.writeUInt16LE(2, 22); header.writeUInt32LE(RATE, 24); header.writeUInt32LE(RATE * 8, 28);
  header.writeUInt16LE(8, 32); header.writeUInt16LE(32, 34); header.write('data', 36); header.writeUInt32LE(bytes.length, 40);
  writeFileSync(file, Buffer.concat([header, bytes]));
};
const piano = new Float32Array(total * 2);
for (let i = 0; i < total; i++) { piano[2 * i] = mixLeft[i]; piano[2 * i + 1] = mixRight[i]; }
wave(path.join(work, 'piano.wav'), piano);
wave(path.join(work, 'hall.wav'), hall);

/* ---- together: piano in the hall, plus the strings, brought up to full level ---- */
const stems = process.env.KEEP_STEMS;   // a folder to also save the piano and the strings on their own, for checking the balance
const together = `[0:a][1:a]afir=dry=1:wet=1:gtype=none[piano];[2:a]volume=${STRINGS_LEVEL}dB[strings];[piano][strings]amix=inputs=2:normalize=0:duration=longest,highpass=f=28`;
const inputs = ['-i', path.join(work, 'piano.wav'), '-i', path.join(work, 'hall.wav'), '-i', path.join(work, 'strings.wav')];
execFileSync('ffmpeg', ['-loglevel', 'error', '-y', ...inputs, '-lavfi', together, '-t', seconds.toFixed(2), '-c:a', 'pcm_f32le', path.join(work, 'together.wav')]);
if (stems) {
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', ...inputs.slice(0, 4), '-lavfi', '[0:a][1:a]afir=dry=1:wet=1:gtype=none', '-c:a', 'pcm_s16le', path.join(stems, 'piano.wav')]);
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', path.join(work, 'strings.wav'), '-af', `volume=${STRINGS_LEVEL}dB`, '-c:a', 'pcm_s16le', path.join(stems, 'strings.wav')]);
}
const loudest = +/max_volume: (-?[\d.]+) dB/.exec(spawnSync('ffmpeg', ['-hide_banner', '-i', path.join(work, 'together.wav'), '-af', 'volumedetect', '-f', 'null', '-'], { encoding: 'utf8' }).stderr)[1];
// the limiter only catches the very tips of the loudest chords
const master = `volume=${(-1 - loudest).toFixed(2)}dB,alimiter=limit=0.86:attack=4:release=80:level=disabled,afade=t=out:st=${(seconds - 1.2).toFixed(2)}:d=1.2`;
const codec = out.endsWith('.wav') ? ['-c:a', 'pcm_s16le'] : ['-c:a', 'libmp3lame', '-b:a', '192k'];
execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', path.join(work, 'together.wav'), '-af', master, '-ar', String(RATE), ...codec,
  '-metadata', `title=${TITLE}`, '-metadata', 'genre=Classical',
  '-metadata', 'comment=Piano: Salamander Grand Piano V3 by Alexander Holm (CC BY 3.0). Strings: MuseScore_General SoundFont (MIT), played by FluidSynth.', out], { stdio: 'inherit' });
rmSync(work, { recursive: true, force: true });
console.log(`${out}: ${piece.notes.length} notes, ${seconds.toFixed(1)} s, ${loaded.size} piano recordings used`);
