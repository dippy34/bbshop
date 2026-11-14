// The site's piano piece, written out as text, and the "pianist" that turns it into timed key strikes.
// render.mjs plays those strikes on recordings of a real concert grand and writes audio/footsteps.mp3.
//
// One row per 4/4 bar: [right hand, left hand].
//   F5q Ab3e. rh       note or rest + length: w h q e s t (whole … 32nd), dots allowed;
//                      no length = same as the note before
//   [F2 C3 Ab3]h       chord                 ( … )x4   repeat a group
//   !  '  *  %C6       accent · staccato · rolled chord · trill with C6
//   {p} {<mf} {>pp}    dynamic from here · swell or fade that arrives here
//   {t138} {~112}      tempo from here · tempo that eases in to arrive here
//   {hold.7}           fermata, in seconds   {ped2}    re-pedal every 2 beats ({ped0} = no pedal)
//   {v.8} {a.5}        balance of this hand · how long its notes are held (1 = full length)

export const TITLE = 'Rondo agitato in F minor, “Footsteps”';

// ---- the theme: four staccato footsteps, a jolt, and a scurry downwards ----
const bass = text => text.replace(/\[[^\]]*\]\S*|\S+/g, token => token.replace(/^([A-G]b?)([1-3])(.*)$/, (_, name, octave, rest) => `[${name}${octave - 1} ${name}${octave}]${rest}`));
const theme = ({ first, second = first, heavy = [false, false], tail = 'rs C5s D5 E5', tailLevel = 'p' }) => [
  [`{${first}} F5e' Ab5' C6' Ab5' F6q! Eb6s Db6 C6 Bb5`,   'F2e [Ab3 C4] [Ab3 C4] [Ab3 C4] C3 [Ab3 C4] [Ab3 C4] [Ab3 C4]'],
  ["E5e' G5' Bb5' G5' Db6q! C6s Bb5 Ab5 G5",                'C3e [G3 Bb3] [G3 Bb3] [G3 Bb3] E3 [G3 Bb3] [G3 Bb3] [G3 Bb3]'],
  ["F5e' Ab5' C6s Bb5 Ab5 G5 F5e' Bb5' Db6s C6 Bb5 Ab5",    'F2e [Ab3 C4] [Ab3 C4] [Ab3 C4] Bb2 [Bb3 Db4] [Bb3 Db4] [Bb3 Db4]'],
  [`G5s F5 E5 F5 G5 Ab5 Bb5 B5 C6e'! re {${second}} rs C5s D5 E5`, 'Db3e [F3 Bb3] B2 [F3 Ab3 D4] [C3 E3 G3 C4]q! rq'],
  [`{${second}} F5e' Ab5' C6' Ab5' F6q! Eb6s Db6 C6 Bb5`,  'F2e [Ab3 C4] [Ab3 C4] [Ab3 C4] C3 [Ab3 C4] [Ab3 C4] [Ab3 C4]'],
  ["E5e' G5' Bb5' G5' Db6q! C6s Bb5 Ab5 G5",                'C3e [G3 Bb3] [G3 Bb3] [G3 Bb3] E3 [G3 Bb3] [G3 Bb3] [G3 Bb3]'],
  ["F5e' Ab5' C6s Bb5 Ab5 G5 Ab5e' F5' G5' E5'",            'F2e [Ab3 C4] [Ab3 C4] [Ab3 C4] C3 [F3 Ab3] C3 [G3 Bb3]'],
  [`[Ab4 C5 F5]e'! re [Ab4 C5 F5]e' re rq {${tailLevel}} ${tail}`, "[F2 F3]e' re [F2 C3 F3]e' re rh"]
].map(([right, left], index) => [right, index < 7 && heavy[index < 4 ? 0 : 1] ? bass(left) : left]);

export const SCORE = [
  // two blows, and a run up to the door
  ["{ff} [Ab4 C5 F5]q'! rq [Bb4 C5 E5]q'! {p} rs C5s D5 E5",    "{t138}{ped0}{a.5} [F1 F2]q'! rq [C2 C3]q'! rq"],

  // the theme, on tiptoe, then again at full weight
  ...theme({ first: 'p', tailLevel: 'f' }),
  ...theme({ first: 'f', heavy: [true, true], tail: 'rq' }),

  // dolce, A-flat major: a singing tune over a running left hand…
  ['{mf} C6q. Bb5e Ab5q Eb5q',                 '{ped2}{a1}{v.9} (Ab3s Eb4 C4 Eb4)x4'],
  ['Db6q. C6e Bb5q Eb5q',                      '(G3s Eb4 Db4 Eb4)x4'],
  ['Eb6q. Db6e C6q Ab5q',                      '(Ab3s Eb4 C4 Eb4)x4'],
  ["C6e Bb5 A5 Bb5 Eb6q rq",                   "(D3s Bb3 F3 Bb3)x2 Eb3e' [G3 Bb3 Eb4]' rq"],
  ['{mf} C6q. Bb5e Ab5q Eb5q',                 '(Ab3s Eb4 C4 Eb4)x4'],
  ['{<f} F6q. Eb6e Db6q Ab5q',                 '(Db3s Ab3 F3 Ab3)x4'],
  ['C6e Eb6 Ab5 C6 Bb5q.%C6 Ab5s Bb5',         '(Eb3s C4 Ab3 C4)x2 (Eb3s Db4 G3 Db4)x2'],
  // …that breaks into scales and arpeggios
  ['{f} Ab5s Bb5 C6 Db6 Eb6 F6 G6 Ab6 G6 F6 Eb6 Db6 C6 Bb5 Ab5 G5',                    '{ped0}{a.5}{v1} [Ab2 Ab3]q [C4 Eb4] [Ab2 Ab3] [C4 Eb4]'],
  ['F5s Ab5 Db6 F6 Db6 Ab5 F5 Ab5 G5 Bb5 Db6 Eb6 Db6 Bb5 G5 Eb5',                      '[Db2 Db3]q [F3 Ab3 Db4] [Eb2 Eb3] [G3 Bb3 Db4]'],
  ['Ab5s C6 Eb6 C6 Ab6 Eb6 C6 Eb6 F6 Db6 Ab5 Db6 F6 Db6 Bb5 Db6',                      '[C3 C4]q [Ab3 Eb4] [Db3 Db4] [F3 Bb3 Db4]'],
  ['{f} Eb6s C6 Ab5 Eb5 C6 Ab5 Eb5 C5 G5 Bb5 Db6 Eb6 Db6 Bb5 G5 Bb5 {<ff}',            '[Eb2 Eb3]q [Ab3 C4 Eb4] [Eb2 Eb3] [G3 Bb3 Db4]'],
  ["[C5 Eb5 Ab5]e'! re [C5 Eb5 Ab5]e' re rh",                                           "[Ab1 Ab2]e'! re [Ab2 Eb3 Ab3]e' re rh"],
  // a diminished chord falls through the floor, and the footsteps are back
  ["{ff} E6s Db6 Bb5 G5 E5 Db5 Bb4 G4 [E4 Bb4 C5]e'! re {p} rs C5s D5 E5",              '{a1} [C2 C3]h! {a.5} [C2 C3]e! re rq'],
  ...theme({ first: 'mf', tail: 'rq' }),

  // the storm: harmonies falling by fifths…
  ['{f}{v.85} A4s C5 Eb5 C5 A5 Eb5 C5 Eb5 C5 Eb5 A5 Eb5 C6 A5 Eb5 A5',                  '{ped2}{v1.15} [F1 F2]q [A3 C4 Eb4] [F2 F3] [A3 C4 Eb4]'],
  ['Db5s F5 Bb5 F5 Db6 Bb5 F5 Bb5 Db5 G5 Bb5 G5 Eb6 Bb5 G5 Bb5',                        '[Bb1 Bb2]q [F3 Bb3 Db4] [Eb2 Eb3] [G3 Bb3 Db4]'],
  ['C5s Eb5 Ab5 Eb5 C6 Ab5 Eb5 Ab5 Db5 F5 Ab5 F5 Db6 Ab5 F5 Ab5',                       '[Ab1 Ab2]q [Ab3 C4 Eb4] [Db2 Db3] [F3 Ab3 Db4]'],
  ['Bb4s Db5 G5 Db5 Bb5 G5 Db5 G5 Bb4 E5 G5 E5 C6 G5 E5 G5',                            '[G1 G2]q [G3 Bb3 Db4] [C2 C3] [G3 Bb3 E4]'],
  ['{f} Ab4s C5 F5 C5 Ab5 F5 C5 F5 A4 C5 Eb5 C5 A5 Eb5 C5 Eb5 {<ff}',                   '[F1 F2]q [Ab3 C4 F4] [F2 F3] [A3 C4 Eb4]'],
  // …then the footsteps come up through the bass
  ['{ff} (Db5s F5 Bb5 F5)x2 {v1} Bb5q! Ab5s Gb5 F5 Eb5',                                "{ped0}{v1.12} [Bb1 Bb2]e' [Db2 Db3]' [F2 F3]' [Db2 Db3]' [Bb1 Bb2]q! rq"],
  ['{v.85} (C5s Eb5 A5 Eb5)x2 {v1} Gb5q! F5s Eb5 Db5 C5',                               "[A1 A2]e' [C2 C3]' [Eb2 Eb3]' [C2 C3]' [F1 F2]q! rq"],
  ['{v.85} Db6s Bb5 F5 Bb5 Db6 Bb5 F5 Bb5 Db6 B5 Ab5 F5 Db6 B5 Ab5 F5',                 '{ped2}{v1.15} [Db2 Db3]q [F3 Bb3 Db4] [Db2 Db3]q! [F3 Ab3 B3]q'],
  // hammering on the dominant, a long fall, and a held breath
  ['{ff} C5s E5 G5 E5 C6 G5 E5 G5 E5 G5 Bb5 G5 Db6 Bb5 G5 Bb5',                         '([C2 C3]e)x8'],
  ['C5s F5 Ab5 F5 C6 Ab5 F5 Ab5 Bb4 E5 G5 E5 Bb5 G5 E5 G5',                             '([C2 C3]e)x8'],
  ['{v1} G6s F6 E6 Db6 C6 Bb5 Ab5 G5 F5 E5 Db5 C5 Bb4 Ab4 G4 E4',                       '{t138}{ped4}{a1}{v1} [C2 C3]w! {~112}'],
  ['{ff} [G4 Bb4 C5 E5]h!{hold.8} rq {p} rs C5s D5 E5',                                 '{ped0}{a1} [C2 G2 C3]h! {a.5} rq {t138} rq'],

  // the theme a last time: quiet, then with everything
  ...theme({ first: 'p', second: 'f', heavy: [false, true], tail: 'rq' }),

  // coda: both hands stamp it out together
  ["{ff} [F4 F5]e' [Ab4 Ab5]' [C5 C6]' [Ab4 Ab5]' [F5 F6]q! rq",                        "{t146}{v1.1} [F2 F3]e' [Ab2 Ab3]' [C3 C4]' [Ab2 Ab3]' [F2 F3]q! rq"],
  ["[E4 E5]e' [G4 G5]' [Bb4 Bb5]' [G4 G5]' [Db5 Db6]q! rq",                             "[E2 E3]e' [G2 G3]' [Bb2 Bb3]' [G2 G3]' [Db3 Db4]q! rq"],
  ["[Ab4 Ab5]e' [F4 F5]' [G4 G5]' [E4 E5]' [Ab4 Ab5]' [F4 F5]' [G4 G5]' [E4 E5]'",      '[C2 C3]e [F3 Ab3] [C2 C3] [G3 Bb3] [C2 C3] [F3 Ab3] [C2 C3] [G3 Bb3]'],
  ["[Ab4 C5 F5]e'! re {a1} F6s C6 Ab5 F5 C5 Ab4 F4 C4 rq",                              "[F1 F2]e'! re rh {t146} [F1 F2]q'! {~120}"],
  ["[E5 G5 Bb5 C6]q'! rq [F5 Ab5 C6 F6]q'! rq",                                         "[C2 C3]q'! rq [F2 F3]q'! rq"],
  ['[Ab4 C5 F5]w!{hold1.4}',                                                            '{ped4}{a1} [F1 F2]w!']
];

const STEP = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const LENGTH = { w: 4, h: 2, q: 1, e: .5, s: .25, t: .125 };
const LEVEL = { pp: .44, p: .55, mp: .6, mf: .66, f: .78, ff: .9 };   // how hard the keys are struck, 0…1
const TICKS = 8;                                                    // the clock counts 32nd notes
export const midi = name => {
  const [, letter, accidental, octave] = name.match(/^([A-G])([b#]?)(\d)$/);
  return 12 * (+octave + 1) + STEP[letter] + (accidental === 'b' ? -1 : accidental === '#' ? 1 : 0);
};

// Reads SCORE and decides when, how long and how hard every key goes down.
// Returns { notes: [{ m: midi key, t: seconds, off: key released, end: dampers fall, v: 0…1 }], bars, length }.
export function perform(score = SCORE) {
  const tempo = [], dynamics = [], holds = [], pedal = [], strikes = [], problems = [];
  [0, 1].forEach(hand => {
    let length = 1, balance = 1, held = 1;
    score.forEach((bar, index) => {
      let beat = index * 4;
      const text = bar[hand].replace(/\(([^()]*)\)x(\d+)/g, (_, group, times) => Array(+times).fill(group).join(' '));
      for (const token of text.match(/\{[^}]*\}|\[[^\]]*\][^\s{]*|[^\s{]+/g)) {
        if (token[0] === '{') {
          const mark = token.slice(1, -1), value = parseFloat(mark.replace(/^[^\d.]+/, ''));
          if (mark[0] === 't' || mark[0] === '~') tempo.push({ beat, value, glide: mark[0] === '~' });
          else if (mark.startsWith('hold')) holds.push({ beat, value });
          else if (mark.startsWith('ped')) pedal.push({ beat, value });
          else if (mark[0] === 'v') balance = value;
          else if (mark[0] === 'a') held = value;
          else dynamics.push({ beat, value: LEVEL[mark.replace(/^[<>]/, '')], glide: /^[<>]/.test(mark) });
          continue;
        }
        const [, body, letter, dots, flags] = token.match(/^(\[[^\]]*\]|r|[A-G][b#]?\d)([whqest]?)(\.*)(.*)$/);
        if (letter) length = LENGTH[letter] * (2 - .5 ** dots.length);
        if (body !== 'r') strikes.push({ hand, beat, length, balance, held, flags, pitches: body.replace(/[[\]]/g, '').split(' ').map(midi).sort((a, b) => a - b) });
        beat += length;
      }
      if (Math.abs(beat - index * 4 - 4) > 1e-6) problems.push(`bar ${index + 1}, hand ${hand + 1} is ${beat - index * 4} beats long`);
    });
  });
  if (problems.length) throw new Error('Score does not add up: ' + problems.join('; '));

  // tempo and dynamics are curves: a mark either sets a value or is the far end of a glide
  const curve = marks => {
    marks.sort((a, b) => a.beat - b.beat || b.glide - a.glide);
    return beat => {
      let i = 0;
      while (i + 1 < marks.length && marks[i + 1].beat <= beat) i++;
      const here = marks[i], next = marks[i + 1];
      return next?.glide && next.beat > here.beat ? here.value + (next.value - here.value) * (beat - here.beat) / (next.beat - here.beat) : here.value;
    };
  };
  const bpm = curve(tempo), loudness = curve(dynamics), ticks = score.length * 4 * TICKS, clock = new Float64Array(ticks + 2);
  for (let tick = 0, seconds = 0; tick <= ticks + 1; tick++) {
    holds.forEach(hold => { if (Math.round(hold.beat * TICKS) === tick) seconds += hold.value; });
    clock[tick] = seconds;
    seconds += 60 / bpm((tick + .5) / TICKS) / TICKS;
  }
  const time = beat => { const at = Math.min(ticks, beat * TICKS), tick = Math.floor(at + 1e-9); return clock[tick] + (clock[tick + 1] - clock[tick]) * Math.max(0, at - tick) * (tick < ticks ? 1 : 0); };

  // a key let go while the pedal is down keeps ringing until the next pedal change
  pedal.sort((a, b) => a.beat - b.beat);
  const lift = beat => {
    let i = 0;
    while (i + 1 < pedal.length && pedal[i + 1].beat < beat) i++;
    const { beat: from, value: every } = pedal[i], until = pedal[i + 1]?.beat ?? score.length * 4;
    return every ? Math.min(until, from + Math.ceil((beat - from) / every - 1e-9) * every) : beat;
  };

  // a fixed seed: the same small human unevenness every time, so a render is repeatable
  let seed = 20261114;
  const random = () => {
    seed = seed + 0x6D2B79F5 | 0;
    let x = Math.imul(seed ^ seed >>> 15, 1 | seed);
    x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x;
    return ((x ^ x >>> 14) >>> 0) / 4294967296;
  };
  const notes = [];
  const add = (m, t, off, end, v) => notes.push({ m, t: Math.max(0, t + (random() - .5) * .006), off, end: Math.max(off, end), v: Math.max(.05, Math.min(1, v * (.97 + random() * .06))) });
  for (const { hand, beat, length, balance, held, flags, pitches } of strikes) {
    const pulse = beat % 4 === 0 ? 1.06 : beat % 2 === 0 ? 1.03 : beat % 1 === 0 ? 1 : beat % .5 === 0 ? .95 : .9;
    const voice = loudness(beat) * balance * (hand ? .74 : 1) * pulse * (flags.includes('!') ? 1.25 : 1) * pitches.length ** -.12;
    const start = time(beat), end = time(beat + length), ring = time(lift(beat + length)), trill = flags.match(/%(\w+)/);
    if (trill) {   // about twelve notes a second, beginning on the upper note and closing on the main one
      const pair = [midi(trill[1]), pitches[0]], count = Math.max(2, 2 * Math.round((end - start) * 6));
      for (let i = 0; i < count; i++) add(pair[i % 2], time(beat + length * i / count), time(beat + length * (i + 1) / count) + .01, 0, voice * (i ? .78 : .9));
      continue;
    }
    pitches.forEach((pitch, i) => {
      const top = i === pitches.length - 1;
      const at = start + (flags.includes('*') ? i * .04 : 0) - (!hand && top ? .006 : 0);            // the melody speaks a hair early
      const sing = hand ? (i ? .9 : 1) : top ? 1 : .84;                                                // sing the top line, lean on the bass
      const share = flags.includes("'") ? .45 : held;
      add(pitch, at, share < 1 ? at + (end - start) * share : end + .012, share < 1 && ring <= end ? 0 : ring, voice * sing);
    });
  }

  // striking a key that is still sounding replaces the old sound instead of stacking on it
  notes.sort((a, b) => a.t - b.t);
  const sounding = {};
  for (const note of notes) {
    const last = sounding[note.m];
    if (last && last.end > note.t) { last.end = note.t; last.off = Math.min(last.off, note.t); }
    sounding[note.m] = note;
  }
  return { notes, bars: score.map((_, index) => time(index * 4)), length: Math.max(...notes.map(note => note.end)) };
}
