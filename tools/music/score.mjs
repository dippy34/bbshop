// The site's music, written out as text, and the "players" that turn it into timed notes:
// a concerto movement in the Baroque manner for piano and string orchestra.
// render.mjs has those notes played on recordings of real instruments and writes audio/concerto.mp3.
//
// Each bar is an object with one line per part (a missing part rests):
//   pr pl   piano, right and left hand        v1 v2 va vc cb   violins I and II, violas, cellos, basses
//   F5q Ab3e. rh       note or rest + length: w h q e s t (whole … 32nd), dots allowed;
//                      no length = same as the note before
//   [D3 A3 D4]w        chord                 ( … )x4   repeat a group
//   !  '  *  %F5       accent · staccato · rolled chord · trill with F5
//   {p} {<f}           the strings' dynamic from here · swell or fade that arrives here (the piano keeps the level set in PARTS)
//   {t100} {~72}       tempo from here · tempo that eases in to arrive here
//   {hold1.5}          fermata, in seconds
//   {l.9} {l~.95}      the piano's own loudness from here · a swell or fade that arrives here
//   {ped2}             sustain pedal, changed every 2 beats ({ped0} = no pedal)

export const TITLE = 'Concerto in D minor for piano and strings';

export const PARTS = [
  { id: 'pr', channel: 0, level: .74, held: 1, sing: true },   // the right hand sings out, a little more as it climbs
  { id: 'pl', channel: 0, level: .6, held: .8 },
  { id: 'v1', channel: 1, gain: 1, held: .82, early: .055 },   // bowed strings speak later than a hammered one,
  { id: 'v2', channel: 2, gain: .92, held: .82, early: .055 },  // so they start a touch ahead to land together
  { id: 'va', channel: 3, gain: .86, held: .78, early: .06 },
  { id: 'vc', channel: 4, gain: .96, held: .78, early: .075 },
  { id: 'cb', channel: 5, gain: .84, held: .78, early: .085 }
];

const STEP = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export const midi = name => {
  const [, letter, accidental, octave] = name.match(/^([A-G])([b#]?)(\d)$/);
  return 12 * (+octave + 1) + STEP[letter] + (accidental === 'b' ? -1 : accidental === '#' ? 1 : 0);
};

// ---- small helpers for the patterns Baroque music is built from ----
const again = (note, times = 4) => `${note}e` + ` ${note}`.repeat(times - 1);                                    // a "drum" bass: repeated quavers
const octaves = note => { const up = note.replace(/\d/, octave => +octave + 1); return `${note}e ${up} ${note} ${up}`; };   // broken octaves, the keyboard player's bass
const lower = text => text.replace(/([A-G][b#]?)(\d)/g, (_, name, octave) => name + (octave - 1));              // the basses play the cello line an octave down
const figure = (tones, shape, length = 's') => { const key = Object.fromEntries(tones.split(' ').map((tone, i) => ['abcd'[i], tone])); return [...shape].map((letter, i) => key[letter] + (i ? '' : length)).join(' '); };
const spread = tones => figure(tones, 'abcbdcbc');    // a four-note chord opened upwards
const rock = tones => figure(tones, 'cbabcbab');      // a three-note chord rocked from the top
// for the cadenza: every note of a scale or chord from one note to another, as a run of 32nd notes
const SPELL = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];
const BELONG = { minor: [2, 4, 5, 7, 9, 10, 1], Dm: [2, 5, 9], A7: [9, 1, 4, 7], diminished: [1, 4, 7, 10], chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] };
const run = (kind, from, to) => {
  const out = [], last = midi(to), step = midi(from) <= last ? 1 : -1;
  for (let key = midi(from); key !== last + step; key += step) if (BELONG[kind].includes(key % 12)) out.push(SPELL[key % 12] + (Math.floor(key / 12) - 1));
  return out.map((note, i) => note + (i ? '' : 't')).join(' ');
};
const flash = tones => figure(tones, 'abcbdcbc', 't');                                                            // a chord opened upwards, twice as fast
const doubled = (text, down = 0) => text.replace(/([A-G][b#]?)(\d)/g, (_, name, octave) => `[${name}${octave - down} ${name}${+octave + 1 - down}]`);   // in octaves

// tutti: violins lead, the piano plays along, cellos and basses drive the bass
const tutti = ({ v1, v2 = v1, va, vc, pr = v1, pl, marks = '', basses = true }) => ({ pr, pl: pl ?? vc, v1: marks + v1, v2, va, vc, cb: basses ? lower(vc) : 'rw' });
// solo: the piano runs, the strings hold soft chords under it
const solo = ({ pr, pl, v1 = 'rw', v2 = 'rw', va = 'rw', vc = 'rw', cb = 'rw', marks = '' }) => ({ pr: marks + pr, pl, v1, v2, va, vc, cb });

const HEAD = 'D5e A5s F5 D6e C#6s D6 A5e Bb5s A5 F5e D5e';          // the ritornello's opening: a zigzag up the chord, long-short-short, and back down
const ANSWER = 'A4e E5s C#5 A5e G#5s A5 E5e F5s E5 C#5e A4e';      // the same on the dominant
const HEAD_MAJOR = 'F5e C6s A5 F6e G6s F6 C6e D6s C6 A5e F5e', ANSWER_MAJOR = 'C5e G5s E5 C6e D6s C6 G5e A5s G5 E5e C5e';   // and in F major
const CADENCE = { v1: 'G5e Bb5s A5 G5e F5e E5q.%F5 D5e', v2: 'D5e G5s F5 E5e D5e C#5h', va: `${again('D4')} ${again('E4')}`, vc: `${again('Bb2')} ${again('A2')}`, pl: `${octaves('Bb2')} ${octaves('A2')}` };

// the ritornello: statement, a soft echo of it, a chain of falling fifths, and a trilled cadence
const ritornello = () => [
  tutti({ marks: '{f}', v1: HEAD, va: again('A4', 8), vc: again('D3', 8), pl: `${octaves('D3')} ${octaves('D3')}` }),
  tutti({ v1: ANSWER, va: again('E4', 8), vc: again('A2', 8), pl: `${octaves('A2')} ${octaves('A2')}` }),
  tutti({ marks: '{mp}', v1: HEAD, pr: 'rw', va: again('A4', 8), vc: again('D3', 8), pl: `${octaves('D3')} ${octaves('D3')}`, basses: false }),
  tutti({ v1: ANSWER, pr: 'rw', va: again('E4', 8), vc: again('A2', 8), pl: `${octaves('A2')} ${octaves('A2')}`, basses: false }),
  tutti({ marks: '{f}', v1: 'A5e F5s G5 A5e D6e Bb5e G5s A5 Bb5e G5e', v2: 'F5e D5s E5 F5e A5e G5e E5s F5 G5e D5e', va: `${again('A4')} ${again('Bb4')}`, vc: `${again('D3')} ${again('G2')}`, pl: `${octaves('D3')} ${octaves('G2')}` }),
  tutti({ v1: 'G5e E5s F5 G5e C6e A5e F5s G5 A5e F5e', v2: 'E5e C5s D5 E5e G5e F5e D5s E5 F5e C5e', va: `${again('G4')} ${again('A4')}`, vc: `${again('C3')} ${again('F2')}`, pl: `${octaves('C3')} ${octaves('F2')}` }),
  tutti({ v1: 'F5e D5s E5 F5e Bb5e G5e E5s F5 G5e E5e', v2: 'D5e Bb4s C5 D5e F5e E5e C5s D5 E5e Bb4e', va: `${again('F4')} ${again('G4')}`, vc: `${again('Bb2')} ${again('E2')}`, pl: `${octaves('Bb2')} ${octaves('E2')}` }),
  tutti({ v1: 'E5e C#5s D5 E5e A5e F5e D5s E5 F5e D5e', v2: 'C#5e A4s B4 C#5e E5e D5e F4s G4 A4e A4e', va: `${again('E4')} ${again('F4')}`, vc: `${again('A2')} ${again('D3')}`, pl: `${octaves('A2')} ${octaves('D3')}` }),
  tutti(CADENCE)
];

export const SCORE = [
  // ritornello, D minor
  ...ritornello().map((bar, index) => index ? bar : { ...bar, pl: '{t100}' + bar.pl }),

  // first solo: the piano takes off over held strings and travels to F major
  solo({ marks: '{pp}', pr: `${spread('D5 F5 A5 D6')} ${spread('D5 F5 A5 D6')}`, pl: `${octaves('D3')} ${octaves('D3')}`, v1: 'A4w', v2: 'F4w', va: 'D4w', vc: 'D3w' }),
  solo({ pr: `${spread('E5 G5 A5 C#6')} ${spread('D5 F5 A5 D6')}`, pl: `${octaves('C#3')} ${octaves('D3')}`, v1: 'A4h A4', v2: 'G4h F4', va: 'E4h D4', vc: 'C#3h D3' }),
  solo({ pr: `${spread('F#5 A5 C6 D6')} ${spread('G5 Bb5 D6 G6')}`, pl: `${octaves('C3')} ${octaves('Bb2')}`, v1: 'A4h Bb4', v2: 'F#4h G4', va: 'D4h D4', vc: 'C3h Bb2' }),
  solo({ pr: 'Bb5s A5 G5 F5 E5 D5 C5 Bb4 C5 D5 E5 F5 G5 A5 Bb5 G5', pl: `${octaves('C3')} ${octaves('C3')}`, v1: 'Bb4w', v2: 'G4w', va: 'E4w', vc: 'C3w' }),
  solo({ pr: `${rock('A5 C6 F6')} ${rock('Bb5 D6 F6')}`, pl: `${octaves('F2')} ${octaves('Bb2')}`, v1: 'A4h Bb4', v2: 'F4h F4', va: 'C4h D4', vc: 'F2h Bb2' }),
  solo({ pr: `${rock('G5 Bb5 E6')} ${rock('A5 C6 E6')}`, pl: `${octaves('E3')} ${octaves('A2')}`, v1: 'Bb4h A4', v2: 'G4h E4', va: 'E4h C4', vc: 'E3h A2' }),
  solo({ pr: `${rock('F5 A5 D6')} ${rock('G5 Bb5 D6')}`, pl: `${octaves('D3')} ${octaves('G2')}`, v1: 'A4h G4', v2: 'F4h D4', va: 'D4h Bb3', vc: 'D3h G2' }),
  solo({ pr: `${rock('E5 G5 C6')} ${rock('F5 A5 C6')}`, pl: `${octaves('C3')} ${octaves('F2')}`, v1: 'G4h F4', v2: 'E4h C4', va: 'Bb3h A3', vc: 'C3h F2' }),
  solo({ pr: 'D5s E5 F5 G5 A5 Bb5 C6 D6 E6 D6 C6 Bb5 A5 G5 F5 E5', pl: `${octaves('Bb2')} ${octaves('C3')}`, v1: '{pp} Bb4h Bb4 {<f}', v2: 'F4h G4', va: 'D4h E4', vc: 'Bb2h C3' }),

  // the ritornello's opening in F major, turning towards G minor
  tutti({ marks: '{f}', v1: HEAD_MAJOR, va: again('A4', 8), vc: again('F3', 8), pl: `${octaves('F2')} ${octaves('F2')}` }),
  tutti({ v1: ANSWER_MAJOR, va: again('G4', 8), vc: again('C3', 8), pl: `${octaves('C3')} ${octaves('C3')}` }),
  tutti({ v1: 'A5e F5s G5 A5e C6e A5e F#5s G5 A5e D5e', v2: 'F5e D5s E5 F5e A5e F#5e D5s E5 F#5e C5e', va: again('C5', 8), vc: `${again('F3')} ${again('F#3')}`, pl: `${octaves('F2')} ${octaves('F#2')}` }),
  tutti({ v1: 'Bb5e G5e C6s Bb5 A5 G5 A5q.%Bb5 G5e', v2: 'D5e Bb4 Eb5 C5 F#5h', va: 'Bb4e Bb4 G4 G4 A4 A4 A4 A4', vc: 'G3e G3 Eb3 Eb3 D3 D3 D3 D3', pl: 'G2e G3 Eb3 Eb2 D3 D2 D3 D2' }),

  // second solo: G minor, scales tumbling down a chain of fifths…
  solo({ marks: '{pp}', pr: 'G5s A5 Bb5 C6 D6 C6 Bb5 A5 G5 Bb5 D6 Bb5 G6 D6 Bb5 D6', pl: `${octaves('G2')} ${octaves('G2')}`, v1: 'Bb4w', v2: 'G4w', va: 'D4w', vc: 'G2w' }),
  solo({ pr: `${spread('F#5 A5 C6 D6')} ${spread('G5 Bb5 D6 G6')}`, pl: `${octaves('F#2')} ${octaves('G2')}`, v1: 'A4h Bb4', v2: 'F#4h G4', va: 'D4h D4', vc: 'F#2h G2' }),
  solo({ pr: 'D6s C6 Bb5 A5 G5 A5 Bb5 G5 G5 F5 Eb5 D5 C5 D5 Eb5 C5', pl: `${octaves('G2')} ${octaves('C3')}`, v1: 'D5h Eb5', v2: 'Bb4h C5', va: 'G4h G4', vc: 'G2h C3' }),
  solo({ pr: 'C6s Bb5 A5 G5 F5 G5 A5 F5 F5 Eb5 D5 C5 Bb4 C5 D5 Bb4', pl: `${octaves('F2')} ${octaves('Bb2')}`, v1: 'C5h D5', v2: 'A4h Bb4', va: 'F4h F4', vc: 'F2h Bb2' }),
  solo({ pr: 'Bb5s A5 G5 F5 Eb5 F5 G5 Eb5 Eb5 D5 C5 Bb4 A4 Bb4 C5 A4', pl: `${octaves('Eb3')} ${octaves('A2')}`, v1: 'Bb4h C5', v2: 'G4h A4', va: 'Eb4h Eb4', vc: 'Eb3h A2' }),
  solo({ pr: 'A5s G5 F#5 E5 D5 E5 F#5 D5 D5 C5 Bb4 A4 G4 A4 Bb4 G4', pl: `${octaves('D3')} ${octaves('G2')}`, v1: 'A4h Bb4', v2: 'F#4h G4', va: 'D4h D4', vc: 'D3h G2' }),
  solo({ pr: `${spread('G5 Bb5 D6 G6')} ${spread('G#5 B5 D6 F6')}`, pl: `${octaves('Bb2')} ${octaves('G#2')}`, v1: '{pp} D5h D5 {<mf}', v2: 'Bb4h B4', va: 'G4h F4', vc: 'Bb2h G#2' }),
  // …then the strings gather on the dominant, one section at a time
  solo({ pr: `${spread('A5 C#6 E6 A6')} ${spread('A5 D6 F6 A6')}`, pl: `${octaves('A2')} ${octaves('A2')}`, va: 'E4e E4 E4 E4 F4 F4 F4 F4', vc: again('A2', 8) }),
  solo({ pr: 'E6s C#6 A5 G5 E6 C#6 A5 G5 D6 A5 F5 A5 D6 A5 F5 A5', pl: `${octaves('A2')} ${octaves('A2')}`, v1: 'E5e E5 E5 E5 F5 F5 F5 F5 {<f}', v2: 'C#5e C#5 C#5 C#5 D5 D5 D5 D5', va: 'G4e G4 G4 G4 A4 A4 A4 A4', vc: again('A2', 8) }),
  solo({ pr: 'A6s G6 F6 E6 D6 C#6 Bb5 A5 G5 F5 E5 D5 C#5 D5 E5 C#5', pl: `${octaves('A2')} ${octaves('A2')}`, v1: 'G5e G5 G5 G5 G5 G5 E5 E5', v2: again('E5', 8), va: again('A4', 8), vc: again('A2', 8), cb: again('A1', 8) }),

  // ritornello, home in D minor — but its cadence is cut off on a held chord…
  ...ritornello().slice(0, 8),
  { pr: 'G5e Bb5s A5 G5e F5e [A4 D5 F5 A5]h!', pl: `{t100} ${octaves('Bb2')} [A1 A2]h! {~88}`, v1: 'G5e Bb5s A5 G5e F5e F5h!', v2: 'D5e G5s F5 E5e D5e D5h!', va: `${again('D4')} A4h!`, vc: `${again('Bb2')} A2h!`, cb: `${again('Bb1')} A1h!` },

  // …and the piano is left alone. Cadenza: the theme in octaves,
  { pr: `{t96}{ped1}{l.86} ${doubled(HEAD)}`, pl: `{l.8} ${doubled(HEAD, 2)}` },
  { pr: doubled(ANSWER), pl: doubled(ANSWER, 2) },
  // five octaves of D minor up and back in a breath, then the same on the dominant,
  { pr: `{t100}{ped4}{l.7} ${run('Dm', 'D2', 'D7')} {~114} ${run('Dm', 'A6', 'A1')} {~102}`, pl: '{l.74} D1w!', vc: '{ppp} A2w', cb: 'A1w' },
  { pr: `{t102} ${run('A7', 'A1', 'G5')} ${run('A7', 'A5', 'A6')} {~114} ${run('A7', 'G6', 'C#4')} {~104}`, pl: 'A0w!', vc: 'A2w', cb: 'A1w' },
  // the whole keyboard as one scale, down and up,
  { pr: `{t110}{ped0}{l.76} ${run('minor', 'D7', 'A2')}`, pl: "[D2 A2 D3]q'! rq rh" },
  { pr: `{l.72} ${run('minor', 'A2', 'D7')} {l~.9}`, pl: "[A1 A2]q'! rq rh" },
  // the ritornello's falling fifths at four times the speed,
  { pr: `{t104}{ped1}{l.76} ${flash('D5 F5 A5 D6')} ${flash('D5 G5 Bb5 D6')} ${flash('C5 E5 G5 C6')} ${flash('C5 F5 A5 C6')}`, pl: "[D2 D3]q' [G2 G3]' [C2 C3]' [F2 F3]'" },
  { pr: `${flash('Bb4 D5 F5 Bb5')} ${flash('Bb4 E5 G5 Bb5')} ${flash('A4 C#5 E5 A5')} ${flash('A4 D5 F5 A5')}`, pl: "[Bb1 Bb2]q' [E2 E3]' [A1 A2]' [D2 D3]'" },
  // a diminished chord falling through the floor, a chromatic climb out of it,
  { pr: `{t104}{ped2}{l.84} ${run('diminished', 'Bb6', 'C#3')} {ped0}{l.66} ${run('chromatic', 'A3', 'C5')}`, pl: '[A1 A2]h! rh', vc: '{ppp} A2w', cb: 'A1w' },
  { pr: `${run('chromatic', 'C#5', 'E6')} {t104}{ped2}{l~.86} E6h%F6 {~92}`, pl: 'rh [A2 E3 G3 C#4]h*', vc: 'A2w', cb: 'A1w' },
  // and a long trill while the strings gather under it
  { pr: '{t92}{ped4} E6h..%F6 D6s E6 {~84}', pl: '[A1 A2]w', v1: `{pp} ${again('G5', 8)} {<ff}`, v2: again('C#5', 8), va: again('E4', 8), vc: again('A2', 8), cb: again('A1', 8) },

  // the orchestra answers with the theme, and the cadence, broadening, reaches the last chord
  tutti({ marks: '{ff}', v1: HEAD, pr: '{l.8} ' + HEAD, va: again('A4', 8), vc: again('D3', 8), pl: `{t100}{ped0}{l.66} ${octaves('D3')} ${octaves('D3')}` }),
  tutti({ ...CADENCE, pl: '{t100}' + CADENCE.pl + ' {~66}' }),
  { pr: '{ped4} [F4 A4 D5]w*{hold1.6}', pl: '[D2 D3 A3]w*', v1: 'D5w', v2: 'A4w', va: 'F4w', vc: 'D3w', cb: 'D2w' }
];

// the tunes a listener would recognise the piece by, for tools/music/tune-check.mjs
const pitches = text => text.match(/[A-G][b#]?\d/g);
export const THEMES = {
  'Opening theme (bar 1)': pitches(HEAD),
  'Its answer (bar 2)': pitches(ANSWER),
  'Opening theme and answer together, as a catalogue would list this piece': pitches(HEAD + ' ' + ANSWER),
  'Opening theme in the major (bar 19)': pitches(HEAD_MAJOR + ' ' + ANSWER_MAJOR),
  'Falling sequence (bars 5-6)': pitches('A5 F5 G5 A5 D6 Bb5 G5 A5 Bb5 G5 G5 E5 F5 G5 C6 A5 F5 G5 A5 F5'),
  'Cadence (bar 9)': pitches(CADENCE.v1.replace(/%\w+/, ''))
};

const LENGTH = { w: 4, h: 2, q: 1, e: .5, s: .25, t: .125 };
const LEVEL = { ppp: .28, pp: .4, p: .46, mp: .56, mf: .66, f: .8, ff: .92 };   // how hard the strings bow, 0…1
const TICKS = 8;                                                        // the clock counts 32nd notes

// Reads SCORE and decides when, how long and how firmly every note is played.
// Returns { notes: [{ channel, m: midi key, t: seconds, off: seconds, v: 0…1 }], bars, length }.
export function perform(score = SCORE) {
  const tempo = [], dynamics = [], holds = [], pedal = [{ beat: 0, value: 0 }], strikes = [], problems = [];
  const own = Object.fromEntries(PARTS.filter(part => part.level).map(part => [part.id, [{ beat: 0, value: part.level, glide: false }]]));
  PARTS.forEach((part, index) => {
    let length = 1;
    score.forEach((bar, number) => {
      let beat = number * 4;
      const text = (bar[part.id] ?? 'rw').replace(/\(([^()]*)\)x(\d+)/g, (_, group, times) => Array(+times).fill(group).join(' '));
      for (const token of text.match(/\{[^}]*\}|\[[^\]]*\][^\s{]*|[^\s{]+/g)) {
        if (token[0] === '{') {
          const mark = token.slice(1, -1), value = parseFloat(mark.replace(/^[^\d.]+/, ''));
          if (mark[0] === 't' || mark[0] === '~') tempo.push({ beat, value, glide: mark[0] === '~' });
          else if (mark.startsWith('hold')) holds.push({ beat, value });
          else if (mark.startsWith('ped')) pedal.push({ beat, value });
          else if (mark[0] === 'l') own[part.id].push({ beat, value, glide: mark[1] === '~' });
          else dynamics.push({ beat, value: LEVEL[mark.replace(/^[<>]/, '')], glide: /^[<>]/.test(mark) });
          continue;
        }
        const [, body, letter, dots, flags] = token.match(/^(\[[^\]]*\]|r|[A-G][b#]?\d)([whqest]?)(\.*)(.*)$/);
        if (letter) length = LENGTH[letter] * (2 - .5 ** dots.length);
        if (body !== 'r') strikes.push({ part, index, beat, length, flags, pitches: body.replace(/[[\]]/g, '').split(' ').map(midi).sort((a, b) => a - b) });
        beat += length;
      }
      if (Math.abs(beat - number * 4 - 4) > 1e-6) problems.push(`bar ${number + 1}, ${part.id} is ${beat - number * 4} beats long`);
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
  const levels = Object.fromEntries(Object.entries(own).map(([id, marks]) => [id, curve(marks)]));
  const bpm = curve(tempo), loudness = curve(dynamics), ticks = score.length * 4 * TICKS, clock = new Float64Array(ticks + 2);
  for (let tick = 0, seconds = 0; tick <= ticks + 1; tick++) {
    holds.forEach(hold => { if (Math.round(hold.beat * TICKS) === tick) seconds += hold.value; });
    clock[tick] = seconds;
    seconds += 60 / bpm((tick + .5) / TICKS) / TICKS;
  }
  const time = beat => { const at = Math.min(ticks, beat * TICKS), tick = Math.floor(at + 1e-9); return clock[tick] + (tick < ticks ? (clock[tick + 1] - clock[tick]) * Math.max(0, at - tick) : 0); };

  // a piano key let go while the pedal is down keeps ringing until the next pedal change
  pedal.sort((a, b) => a.beat - b.beat);
  const lift = beat => {
    let i = 0;
    while (i + 1 < pedal.length && pedal[i + 1].beat < beat) i++;
    const { beat: from, value: every } = pedal[i], until = pedal[i + 1]?.beat ?? score.length * 4;
    return every ? Math.min(until, from + Math.ceil((beat - from) / every - 1e-9) * every) : beat;
  };

  // a fixed seed: the same small human unevenness every time, so a render is repeatable
  let seed = 16851750;
  const random = () => {
    seed = seed + 0x6D2B79F5 | 0;
    let x = Math.imul(seed ^ seed >>> 15, 1 | seed);
    x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x;
    return ((x ^ x >>> 14) >>> 0) / 4294967296;
  };
  const notes = [];
  // fast notes are placed more exactly than slow ones, as a good player's are
  const add = (part, m, t, off, v, end = off) => notes.push({ channel: part.channel, m, off, end: Math.max(off, end),
    t: Math.max(0, t + (random() - .5) * Math.min(part.level ? .007 : .014, (off - t) * .08)),
    v: Math.max(.05, Math.min(1, v * (part.sing ? 1 + Math.max(-.08, Math.min(.1, (m - 76) * .005)) : 1) * (.96 + random() * .08))) });
  for (const { part, beat, length, flags, pitches } of strikes) {
    const pulse = beat % 4 === 0 ? 1.07 : beat % 2 === 0 ? 1.04 : beat % 1 === 0 ? 1 : beat % .5 === 0 ? .95 : .9;   // lean on the strong beats
    const voice = (part.level ? levels[part.id](beat) : loudness(beat) * part.gain) * pulse * (flags.includes('!') ? 1.2 : 1) * (part.level ? pitches.length ** -.12 : 1);
    const start = time(beat), end = time(beat + length), ring = part.level ? time(lift(beat + length)) : 0, trill = flags.match(/%(\w+)/);
    if (trill) {   // about twelve notes a second, beginning on the upper note and closing on the main one
      const pair = [midi(trill[1]), pitches[0]], count = Math.max(2, 2 * Math.round((end - start) * 6));
      for (let i = 0; i < count; i++) add(part, pair[i % 2], time(beat + length * i / count) - (part.early ?? 0), time(beat + length * (i + 1) / count) - (part.early ?? 0), voice * (i ? .85 : 1));
      continue;
    }
    const share = flags.includes("'") ? .45 : length >= 1.5 ? 1 : part.held;   // detached quavers, sustained long notes
    pitches.forEach((pitch, i) => {
      const at = start + (flags.includes('*') ? i * .05 : 0) - (part.early ?? 0);
      add(part, pitch, at, at + (end - at) * share, voice, ring);
    });
  }
  notes.sort((a, b) => a.t - b.t);
  const sounding = {};   // striking a piano key that is still ringing replaces the old sound instead of stacking on it
  for (const note of notes.filter(note => note.channel === 0)) {
    const last = sounding[note.m];
    if (last && last.end > note.t) { last.end = note.t; last.off = Math.min(last.off, note.t); }
    sounding[note.m] = note;
  }
  return { notes, bars: score.map((_, number) => time(number * 4)), length: Math.max(...notes.map(note => note.end)) };
}
