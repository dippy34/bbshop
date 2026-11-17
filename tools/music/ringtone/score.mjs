// Lightning Toccata in D minor — a 25-second piano solo written to be a ringtone.
// Three crashing chords, a scale like a thunderbolt, then a toccata in which a tune rings out on top of
// cascading notes while the left hand stamps a 3+3+2 rhythm, and a run of virtuoso tricks to the last chord.
// The notation is explained at the top of ../rhapsody/engine.mjs. Record it with:
//   SCORE=tools/music/ringtone/score.mjs HALL=-13 node tools/music/rhapsody/render.mjs <piano> "" ringtone.wav
import { midi } from '../rhapsody/engine.mjs';

export const TITLE = 'Lightning Toccata in D minor';

// one pianist, written on three lines: the tune (pm), the fast notes around it (pr), and the left hand (pl)
export const PARTS = [
  { id: 'pm', piano: true, held: 1, sing: true },
  { id: 'pr', piano: true, held: 1, sing: true },
  { id: 'pl', piano: true, held: .9 }
];

/* ---------- harmony helpers ---------- */
const SPELL = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];
const spell = key => SPELL[key % 12] + (Math.floor(key / 12) - 1);
const pitchClass = name => midi(name + '4') % 12;
const QUALITY = { '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], dim7: [0, 3, 6, 9], m7b5: [0, 3, 6, 10] };
const SCALES = { 'D harmonic': [2, 4, 5, 7, 9, 10, 1], white: [0, 2, 4, 5, 7, 9, 11] };
const chord = symbol => {
  const [, root, quality, bass] = symbol.match(/^([A-G][b#]?)(m7b5|dim7|m|7|)(?:\/([A-G][b#]?))?$/);
  return { tones: QUALITY[quality].map(step => (pitchClass(root) + step) % 12), bass: pitchClass(bass ?? root) };
};
const first = (list, length) => list.map((note, i) => note + (i ? '' : length)).join(' ');
const shift = (text, octaves) => text.replace(/([A-G][b#]?)(\d)/g, (_, name, octave) => name + (+octave + octaves));
const pair = key => `[${spell(key - 12)} ${spell(key)}]`;                                 // an octave, named by its top note
// every note of a scale or chord from one note to another
const run = (kind, from, to, length = 's') => {
  const members = SCALES[kind] ?? chord(kind).tones, out = [], last = midi(to), step = midi(from) <= last ? 1 : -1;
  for (let key = midi(from); key !== last + step; key += step) if (members.includes(key % 12)) out.push(spell(key));
  return first(out, length);
};
const below = (symbol, top, count) => { const out = []; for (let key = midi(top) - 1; out.length < count; key--) if (chord(symbol).tones.includes(key % 12)) out.push(spell(key)); return out; };   // the chord, falling away from a note
const middle = symbol => { const keys = []; for (let key = 50; key <= 66; key++) if (chord(symbol).tones.includes(key % 12)) keys.push(key); return `[${keys.slice(0, 4).map(spell).join(' ')}]`; };   // the chord around middle C
const root = (symbol, around = 50) => { for (let d = 0; d < 12; d++) for (const key of [around - d, around + d]) if (key % 12 === chord(symbol).bass) return key; };

/* ---------- the toccata's one idea ---------- */
// Each bar has three tune notes, on a 3+3+2 beat. Every tune note sets off a cascade down its chord,
// and the left hand marks the same three beats: bass octave, chord, bass octave.
const pour = (symbol, [a, b, c], thick = false) => {
  const sung = note => thick ? `[${shift(note, -1)} ${note}]` : note, low = root(symbol);
  return {
    pm: `${sung(a)}q. ${sung(b)}q. ${sung(c)}q`,
    pr: `rs ${below(symbol, a, 5).join(' ')} r ${below(symbol, b, 5).join(' ')} r ${below(symbol, c, 3).join(' ')}`,
    pl: `${pair(low)}q.! ${middle(symbol)}q. ${pair(low + 12)}q`
  };
};
// both hands hammering octaves in turn, climbing by half steps
const locked = (from, bar) => {
  const left = [], right = [];
  for (let i = 0; i < 16; i++) { const key = midi(from) + bar * 16 + i; (i % 2 ? right : left).push(i % 2 ? pair(key + 12) : pair(key)); (i % 2 ? left : right).push('r'); }
  return { pl: first(left, 's'), pr: 'rs ' + right.slice(1).join(' ') };
};

export const SCORE = [
  // three crashes…
  { pr: '{fff}{ped4} [D5 F5 A5 D6]q.! [D5 F5 A5 D6]q.! [F5 A5 D6 F6]q!', pl: '{t172}{fff} [D2 D3]q.! [D2 D3]q.! [A1 A2]q!' },
  // …and the thunderbolt
  { pr: `{ff}{ped0} ${run('D harmonic', 'D7', 'C#5')}`, pl: `{ff} ${run('D harmonic', 'D6', 'C#4')}` },

  // the toccata: a tune on top of cascades, over a stamping left hand
  { ...pour('Dm', ['A5', 'D6', 'E6']), pm: '{ff}{ped4} A5q. D6q. E6q', pr: '{mf} ' + pour('Dm', ['A5', 'D6', 'E6']).pr, pl: '{f} ' + pour('Dm', ['A5', 'D6', 'E6']).pl },
  pour('Bb', ['F6', 'D6', 'Bb5']),
  pour('Gm', ['D6', 'G6', 'A6']),
  pour('A7', ['Bb6', 'A6', 'E6']),
  // the same again, higher and with the tune in octaves
  { ...pour('Dm', ['F6', 'A6', 'D7'], true), pm: '{fff} ' + pour('Dm', ['F6', 'A6', 'D7'], true).pm, pr: '{f} ' + pour('Dm', ['F6', 'A6', 'D7'], true).pr, pl: '{ff} ' + pour('Dm', ['F6', 'A6', 'D7'], true).pl },
  pour('Bb', ['D7', 'Bb6', 'F6'], true),
  pour('Em7b5/G', ['E6', 'G6', 'Bb6'], true),
  pour('A7', ['A6', 'E6', 'C#6'], true),

  // hands hammering octaves in turn, climbing by half steps…
  { pr: '{mf}{ped0} ' + locked('A3', 0).pr, pl: '{mf} ' + locked('A3', 0).pl },
  { pr: locked('A3', 1).pr + ' {<fff}', pl: locked('A3', 1).pl + ' {<fff}' },
  // …a diminished chord falling the length of the keyboard, a scale shot back up it…
  { pr: `{fff}{ped4} ${run('C#dim7', 'Bb6', 'C#3')}`, pl: `{fff} ${run('C#dim7', 'Bb5', 'C#2')}` },
  { pr: `{f}{ped0} ${run('D harmonic', 'A3', 'Bb5')} {<fff}`, pl: `{f} ${run('D harmonic', 'A2', 'Bb4')} {<fff}` },
  // …chords shaken between the hands, a glissando up the white keys…
  { pr: `{fff}{ped4} rs [G4 A4 C#5 E5] r [G4 A4 C#5 E5] r [A4 C#5 E5 G5] r [A4 C#5 E5 G5] {f} ${run('white', 'C5', 'D7', 't')} {<fff}`, pl: '{fff} [A2 E3 A3]s r [A2 E3 A3] r [A2 E3 A3] r [A2 E3 A3] r [A1 A2]h' },
  // …and home: three crashes coming down, and the last chord
  { pr: '{fff}{ped4} [D5 F5 A5 D6]q.! [A4 D5 F5 A5]q.! [F4 A4 D5 F5]q!', pl: '{t172}{fff} [D2 D3]q.! [D2 D3]q.! [D1 D2]q! {~150}' },
  { pr: '{ped4} [D4 F4 A4 D5]w!{hold1.3}', pl: '[D1 D2 A2]w!' }
];

// the tune a listener would know it by, for tune-check
export const THEMES = { 'The toccata tune': ['A5', 'D6', 'E6', 'F6', 'D6', 'Bb5', 'D6', 'G6', 'A6', 'Bb6', 'A6', 'E6', 'F6', 'A6', 'D7', 'D7', 'Bb6', 'F6', 'E6', 'G6', 'Bb6', 'A6', 'E6', 'C#6'] };
