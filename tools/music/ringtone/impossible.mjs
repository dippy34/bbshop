// Impossible Étude in A minor — a 25-second piano solo written to be the wildest possible ringtone.
// It is deliberately beyond what one pianist could play: four "hands" are written out, the fills run at about
// 26 notes a second in each hand, and glissandos cross the whole keyboard. It is still a piece in A minor with a riff:
// a six-note cell hammered out between the hands and carried through Am · F · C · G, then Am · F · Dm · E7.
// The notation is explained at the top of ../rhapsody/engine.mjs. Record it with:
//   SCORE=tools/music/ringtone/impossible.mjs HALL=-15 node tools/music/rhapsody/render.mjs <piano> "" impossible.wav
import { midi } from '../rhapsody/engine.mjs';

export const TITLE = 'Impossible Étude in A minor';

export const PARTS = [
  { id: 'pm', piano: true, held: 1, sing: true },   // the tune
  { id: 'pr', piano: true, held: 1, sing: true },   // a right hand
  { id: 'pl', piano: true, held: 1 },               // a left hand
  { id: 'pb', piano: true, held: 1 }                // and a third hand for the bass
];

/* ---------- helpers ---------- */
const SPELL = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];
const spell = key => SPELL[key % 12] + (Math.floor(key / 12) - 1);
const pitchClass = name => midi(name + '4') % 12;
const QUALITY = { '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10] };
const SCALES = { white: [0, 2, 4, 5, 7, 9, 11], 'A harmonic': [9, 11, 0, 2, 4, 5, 8] };
const chord = symbol => { const [, root, quality] = symbol.match(/^([A-G][b#]?)(m|7|)$/); return { tones: QUALITY[quality].map(step => (pitchClass(root) + step) % 12), root: pitchClass(root) }; };
const members = kind => SCALES[kind] ?? chord(kind).tones;
const first = (list, length) => list.map((note, i) => note + (i ? '' : length)).join(' ');
const shift = (text, octaves) => text.replace(/([A-G][b#]?)(\d)/g, (_, name, octave) => name + (+octave + octaves));
// every note of a scale or chord from one note to another, as 32nd notes
const run = (kind, from, to, length = 't') => {
  const out = [], last = midi(to), step = midi(from) <= last ? 1 : -1;
  for (let key = midi(from); key !== last + step; key += step) if (members(kind).includes(key % 12)) out.push(spell(key));
  return first(out, length);
};
const walk = (kind, key, steps) => { for (let left = Math.abs(steps); left > 0;) { key += Math.sign(steps); if (members(kind).includes(key % 12)) left--; } return key; };   // so many scale steps from a key
const below = (symbol, top, count) => { const out = []; for (let key = midi(top) - 1; out.length < count; key--) if (chord(symbol).tones.includes(key % 12)) out.unshift(spell(key)); return out; };
const near = (symbol, around) => { for (let d = 0; d < 12; d++) for (const key of [around - d, around + d]) if (key % 12 === chord(symbol).root) return key; };
const middle = symbol => { const key = near(symbol, 48); return `[${spell(key)} ${spell(key + 7)} ${spell(key + 12)}]`; };                 // root, fifth, octave below middle C
const deep = symbol => { const key = near(symbol, 33); return key - 12 >= 21 ? `[${spell(key - 12)} ${spell(key)}]` : `[${spell(key)} ${spell(key + 12)}]`; };   // the lowest octave the keyboard has for it
// a chord swept up and back (or down and back) in 32nd notes
const sweep = (symbol, from, direction = 1, turn = 9, total = 16) => {
  const out = [];
  for (let key = midi(from); out.length < turn; key += direction) if (chord(symbol).tones.includes(key % 12)) out.push(key);
  return first([...out, ...out.slice(0, -1).reverse().slice(0, total - turn)].map(spell), 't');
};
// eight very fast notes that arrive one step short of where the next bar begins
const fill = (kind, target, rising) => { const end = walk(kind, midi(target), rising ? -1 : 1); return run(kind, spell(walk(kind, end, rising ? -7 : 7)), spell(end)); };

/* ---------- the riff ---------- */
// Six tune notes hammered out on the beat-halves by one hand, with the other hand answering in between,
// a held bass octave under them, and on the fourth beat both hands tearing apart in opposite directions.
const riff = (symbol, tops, next, { thick = false, scale = 'white' } = {}) => {
  const rising = midi(tops[5]) < midi(next.top);
  return {
    pm: tops.map((top, i) => (thick ? `[${shift(top, -1)} ${top}]` : top) + (i ? '' : 's') + ' r').join(' ') + ' rq',
    pr: tops.map((top, i) => `[${below(symbol, top, 2).join(' ')}]` + (i ? '' : 's') + ' r').join(' ') + ' ' + fill(scale, next.top, rising),
    pl: 'rs ' + Array(6).fill(middle(symbol)).join(' r ') + ' ' + fill(scale, spell(near(next.chord, 48)), !rising),
    pb: `${deep(symbol)}h.! rq`
  };
};
const CELLS = [
  ['Am', ['A5', 'C6', 'B5', 'C6', 'E6', 'D6']], ['F', ['F6', 'A6', 'G6', 'A6', 'C7', 'B6']], ['C', ['C6', 'E6', 'D6', 'E6', 'G6', 'F6']], ['G', ['G6', 'B6', 'A6', 'B6', 'D7', 'C7']],
  ['Am', ['A5', 'C6', 'B5', 'C6', 'E6', 'D6']], ['F', ['F6', 'A6', 'G6', 'A6', 'C7', 'B6']], ['Dm', ['D6', 'F6', 'E6', 'F6', 'A6', 'G6']], ['E7', ['E6', 'G#6', 'F6', 'G#6', 'B6', 'A6']]
];
const riffs = CELLS.map(([symbol, tops], i) => riff(symbol, tops, i < 7 ? { top: CELLS[i + 1][1][0], chord: CELLS[i + 1][0] } : { top: 'C6', chord: 'Am' }, { thick: i >= 4, scale: symbol === 'E7' ? 'A harmonic' : 'white' }));
riffs[0] = { pm: '{ff}{ped1} ' + riffs[0].pm, pr: '{mf} ' + riffs[0].pr, pl: '{f} ' + riffs[0].pl, pb: '{f} ' + riffs[0].pb };
riffs[4] = { pm: '{fff} ' + riffs[4].pm, pr: '{f} ' + riffs[4].pr, pl: '{ff} ' + riffs[4].pl, pb: '{ff} ' + riffs[4].pb };

// a rally: on every sixteenth the sound is thrown to the other end of the keyboard, octaves climbing out of the bass
// against full chords coming down from the top, the two hands closing in on each other
const duo = note => midi(note) - 12 >= 21 ? `[${shift(note, -1)} ${note}]` : `[${note} ${shift(note, 1)}]`;
const pong = (...halves) => ({
  pl: '{fff} ' + halves.flatMap(([, lows]) => lows.split(' ').map(duo)).map((octave, i) => octave + (i ? '' : 's') + ' r').join(' '),
  pr: '{fff} rs ' + halves.flatMap(([symbol, , tops]) => tops.split(' ').map(top => `[${below(symbol, top, 3).join(' ')} ${top}]`)).join(' r ')
});

// both hands shaking a chord between them, 26 strokes a second, climbing an octave every beat
const shake = hand => [0, 1, 2, 3].map(beat => { const mine = hand ? `[${['G#3', 'B3', 'D4', 'E4'].map(note => shift(note, beat)).join(' ')}]` : `[${['E2', 'B2', 'E3'].map(note => shift(note, beat)).join(' ')}]`; return Array(4).fill(hand ? `r ${mine}` : `${mine} r`).join(' '); }).join(' ');

export const SCORE = [
  // the whole keyboard in one swipe…
  { pr: `{mf}{ped4} ${run('white', 'A2', 'D7')} {<fff}`, pl: '{t400} rw', pb: '{fff} [A0 A1]w!' },
  // …two crashes at opposite ends of it, and both hands tearing apart
  { pr: `{fff}{ped1} [A5 C6 E6 A6]q.! [E6 A6 C7 E7]q.! ${fill('white', 'A5', false)}`, pl: `{t192}{fff} [A2 E3 A3]q.! [A3 C4 E4]q.! ${fill('white', 'A2', true)}`, pb: '[A0 A1]q.! [A1 A2]q.! rq' },

  // the riff, through A minor, F, C and G; then again in octaves, turning for home through D minor and E
  ...riffs,

  // four hands: the tune in octaves on top, chords swept up and down in both directions at once under it, and the bass
  { pm: '{fff}{ped2} [C6 C7]h [A5 A6]h', pr: `{mf} ${sweep('Am', 'A3')} ${sweep('F', 'A3')}`, pl: `{mf} ${sweep('Am', 'E4', -1)} ${sweep('F', 'F4', -1)}`, pb: '{ff} [A0 A1]h! [F1 F2]h!' },
  { pm: '[F6 F7]h [E6 E7]h', pr: `${sweep('Dm', 'A3')} ${sweep('E7', 'G#3')}`, pl: `${sweep('Dm', 'F4', -1)} ${sweep('E7', 'E4', -1)}`, pb: '[D1 D2]h! [E1 E2]h!' },

  // the same four chords again as a rally between the two ends of the keyboard
  { ...pong(['Am', 'A1 C2 E2 A2', 'A6 E6 C6 A5'], ['F', 'F2 A2 C3 F3', 'C7 A6 F6 C6']), pm: '{ped1} rw' },
  pong(['Dm', 'D2 F2 A2 D3', 'D7 A6 F6 D6'], ['E7', 'E2 G#2 B2 E3', 'E7 B6 G#6 E6']),

  // a fan: chromatic thirds flying out from the middle of the keyboard to both ends at once…
  { pr: `{f}{ped0} ${first(Array.from({ length: 32 }, (_, i) => `[${spell(69 + i)} ${spell(72 + i)}]`), 't')} {<fff}`, pl: `{f} ${first(Array.from({ length: 32 }, (_, i) => `[${spell(64 - i)} ${spell(67 - i)}]`), 't')} {<fff}` },
  // …and two glissandos coming back, straight through each other
  { pr: `{ff}{ped4} ${run('white', 'G7', 'D3')}`, pl: `{ff} ${run('white', 'A1', 'D6')}` },
  // the dominant shaken between the hands, climbing
  { pr: `{f}{ped1} ${shake(1).replace(/^r /, 'rt ')} {<fff}`, pl: `{f} ${shake(0).replace(/\] r/, ']t r')} {<fff}`, pb: '{fff} [E1 E2]w!' },
  // home: three crashes
  { pr: '{fff}{ped4} [A5 C6 E6 A6]q.! [A4 C5 E5 A5]q.! [A6 C7 E7 A7]q!', pl: '{t192}{fff} [A2 E3 A3]q.! [A1 E2 A2]q.! [A3 C4 E4 A4]q! {~168}', pb: '[A0 A1]q.! [A0 A1]q.! [A0 A1]q!' },
  // one last swipe in both directions, and every register at once
  { pm: '{fff} rh [A6 C7 E7 A7]h!', pr: `{ff}{ped4} ${run('white', 'A3', 'B5')} {fff} [C6 E6 A6]h!`, pl: `{ff} ${run('white', 'G3', 'F1')} {fff} [A2 E3 A3 C4]h!`, pb: 'rh [A0 A1]h!{hold1.3}' }
];

// the tune a listener would know it by, for tune-check
export const THEMES = { 'The riff': CELLS.flatMap(([, tops]) => tops) };
