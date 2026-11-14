// Has the score in score.mjs played by sampled instruments and writes the result as audio.
//
//   node tools/music/render.mjs [soundfont.sf2] [out.mp3]
//
// Needs fluidsynth and ffmpeg on the PATH, and a General MIDI SoundFont with a harpsichord and a string section.
// The recording in audio/ was made with MuseScore_General_Full.sf2 (by S. Christian Collins and others, MIT licence):
//   apt install fluidsynth ffmpeg musescore-general-soundfont-lossless
// Nothing here synthesises sound: it writes the performance out as a MIDI file, and FluidSynth plays that
// with the SoundFont's recordings of a real harpsichord and real strings, in a hall.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { perform, TITLE } from './score.mjs';

const [soundfont = '/usr/share/sounds/sf2/MuseScore_General_Full.sf2', out = 'audio/concerto.mp3'] = process.argv.slice(2);
if (!existsSync(soundfont)) { console.error(`No SoundFont at ${soundfont}\nusage: node tools/music/render.mjs [soundfont.sf2] [out.mp3]`); process.exit(1); }

// who sits where: [General MIDI programme, volume, left-right position] per channel, in the old seating with the violins facing each other
const ORCHESTRA = [
  [6, 114, 64],    // harpsichord, centre
  [48, 120, 28],   // violins I, left
  [48, 114, 100],  // violins II, right
  [48, 108, 80],   // violas
  [48, 122, 50],   // cellos
  [48, 112, 58]    // basses
];
const LEAD = .4, TICKS_PER_SECOND = 960;   // 480 ticks per beat at 120 beats a minute: the score's own tempo is already in the timings

const piece = perform();
const number = value => { const bytes = [value & 127]; while (value >>= 7) bytes.unshift(value & 127 | 128); return bytes; };   // MIDI variable-length number
const chunk = (id, bytes) => Buffer.concat([Buffer.from(id), Buffer.from([bytes.length >>> 24, bytes.length >>> 16 & 255, bytes.length >>> 8 & 255, bytes.length & 255]), Buffer.from(bytes)]);
const tracks = ORCHESTRA.map(([programme, volume, position], channel) => {
  const events = [[0, [0xB0 | channel, 7, volume]], [0, [0xB0 | channel, 10, position]], [0, [0xB0 | channel, 91, channel ? 70 : 46]], [0, [0xC0 | channel, programme]]];
  for (const { m, t, off, v } of piece.notes.filter(note => note.channel === channel)) {
    events.push([Math.round((LEAD + t) * TICKS_PER_SECOND), [0x90 | channel, m, Math.max(1, Math.round(v * 127))]]);
    events.push([Math.round((LEAD + off) * TICKS_PER_SECOND), [0x80 | channel, m, 0]]);
  }
  events.sort((a, b) => a[0] - b[0] || (a[1][0] & 0xF0) - (b[1][0] & 0xF0));   // at the same instant, note-offs go first
  const bytes = [];
  let last = 0;
  for (const [tick, message] of events) { bytes.push(...number(tick - last), ...message); last = tick; }
  return chunk('MTrk', [...bytes, 0, 0xFF, 0x2F, 0]);
});
const work = mkdtempSync(path.join(tmpdir(), 'concerto-'));
writeFileSync(path.join(work, 'score.mid'), Buffer.concat([chunk('MThd', [0, 1, 0, tracks.length, 480 >> 8, 480 & 255]), ...tracks]));

execFileSync('fluidsynth', ['-ni', '-q', '-r', '44100', '-g', '0.7', '-F', path.join(work, 'played.wav'),
  '-o', 'synth.chorus.active=0', '-o', 'synth.reverb.active=1', '-o', 'synth.reverb.room-size=0.82', '-o', 'synth.reverb.damp=0.35', '-o', 'synth.reverb.width=1', '-o', 'synth.reverb.level=0.75',
  soundfont, path.join(work, 'score.mid')], { stdio: ['ignore', 'ignore', 'inherit'] });

// bring it up to full level; the limiter only catches the very tips of the loudest chords
const loudest = +/max_volume: (-?[\d.]+) dB/.exec(spawnSync('ffmpeg', ['-hide_banner', '-i', path.join(work, 'played.wav'), '-af', 'volumedetect', '-f', 'null', '-'], { encoding: 'utf8' }).stderr)[1];
const seconds = LEAD + piece.length + 3.5;
const master = `atrim=end=${seconds.toFixed(2)},highpass=f=28,volume=${(.3 - loudest).toFixed(2)}dB,alimiter=limit=0.86:attack=4:release=80:level=disabled,afade=t=out:st=${(seconds - 1.2).toFixed(2)}:d=1.2`;
const codec = out.endsWith('.wav') ? ['-c:a', 'pcm_s16le'] : ['-c:a', 'libmp3lame', '-b:a', '192k'];
execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', path.join(work, 'played.wav'), '-af', master, '-ar', '44100', ...codec,
  '-metadata', `title=${TITLE}`, '-metadata', 'genre=Classical', '-metadata', 'comment=Instruments: MuseScore_General SoundFont (MIT licence), played by FluidSynth', out], { stdio: 'inherit' });
if (process.env.KEEP_MIDI) writeFileSync(process.env.KEEP_MIDI, Buffer.concat([chunk('MThd', [0, 1, 0, tracks.length, 480 >> 8, 480 & 255]), ...tracks]));
rmSync(work, { recursive: true, force: true });
console.log(`${out}: ${piece.notes.length} notes, ${seconds.toFixed(1)} s`);
