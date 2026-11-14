// Rhapsody in D minor for piano and orchestra — the score, written out as text.
// engine.mjs turns it into timed notes; render.mjs has them played and writes audio/rhapsody.mp3.
// The notation is explained at the top of engine.mjs. Most accompaniment lines are not typed out note by note:
// each bar names its harmony ("Dm", "A7", "F/C" …) and small helpers below voice it for each instrument.
import { midi } from './engine.mjs';

export const TITLE = 'Rhapsody in D minor for piano and orchestra';

// who plays: General MIDI programme, volume (0-127), left-right position (0-127), and how far ahead of the beat
// each instrument has to start so that its sound, which swells in, lands on the beat
export const PARTS = [
  { id: 'pr', piano: true, held: 1, sing: true }, { id: 'pl', piano: true, held: .85 },
  { id: 'fl', channel: 0, program: 73, volume: 100, pan: 54, early: .02, held: .9 },
  { id: 'ob', channel: 1, program: 68, volume: 92, pan: 70, early: .06, held: .9 },
  { id: 'cl', channel: 2, program: 71, volume: 110, pan: 48, early: .04, held: .9 },
  { id: 'bn', channel: 3, program: 70, volume: 100, pan: 76, early: .02, held: .85 },
  { id: 'hn', channel: 4, program: 60, volume: 104, pan: 40, early: .05, held: .9 },
  { id: 'tp', channel: 5, program: 56, volume: 108, pan: 84, early: .005, held: .88 },
  { id: 'tb', channel: 6, program: 57, volume: 86, pan: 92, early: .07, held: .9 },
  { id: 'tu', channel: 7, program: 58, volume: 92, pan: 88, early: .035, held: .9 },
  { id: 'tm', channel: 8, program: 47, volume: 127, pan: 60, early: 0, held: 1, loose: .006 },
  { id: 'pc', channel: 9, drums: 48, volume: 112, pan: 64, early: 0, held: 1, loose: .004 },   // orchestral percussion: C2 bass drum, B3 cymbals
  { id: 'v1', channel: 10, program: 48, volume: 127, pan: 26, early: .055, held: .84 },
  { id: 'v2', channel: 11, program: 48, volume: 122, pan: 46, early: .055, held: .84 },
  { id: 'va', channel: 12, program: 48, volume: 118, pan: 80, early: .06, held: .8 },
  { id: 'vc', channel: 13, program: 48, volume: 127, pan: 96, early: .075, held: .8 },
  { id: 'cb', channel: 14, program: 48, volume: 118, pan: 104, early: .085, held: .8 },
  { id: 'tr', channel: 15, program: 44, volume: 112, pan: 64, early: .1, held: 1 }                 // the strings playing tremolo
];
const ORCHESTRA = PARTS.filter(part => !part.piano).map(part => part.id);

/* ---------- harmony: a chord symbol becomes notes for whoever needs them ---------- */
const SPELL = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];
const spell = key => SPELL[key % 12] + (Math.floor(key / 12) - 1);
const pitchClass = name => midi(name + '4') % 12;
const QUALITY = { '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], m7: [0, 3, 7, 10], dim7: [0, 3, 6, 9], m7b5: [0, 3, 6, 10], m6: [0, 3, 7, 9] };
const SCALES = { 'D harmonic': [2, 4, 5, 7, 9, 10, 1], 'G harmonic': [7, 9, 10, 0, 2, 3, 6], 'D major': [2, 4, 6, 7, 9, 11, 1], 'F major': [5, 7, 9, 10, 0, 2, 4], chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] };
const chord = symbol => {
  const [, root, quality, bass] = symbol.match(/^([A-G][b#]?)(m7b5|dim7|m7|m6|m|7|)(?:\/([A-G][b#]?))?$/);
  return { tones: QUALITY[quality].map(step => (pitchClass(root) + step) % 12), bass: pitchClass(bass ?? root) };
};
const belongs = kind => SCALES[kind] ?? chord(kind).tones;
const bars = harmony => typeof harmony === 'string' ? [[harmony, 4]] : harmony;          // a bar's harmony: one chord, or [[chord, beats], …]
const sounding = (harmony, beat) => { let from = 0; for (const [symbol, beats] of bars(harmony)) { if (beat < from + beats) return symbol; from += beats; } };
const LONG = { 4: 'w', 3: 'h.', 2: 'h', 1: 'q' }, SHORT = { h: 2, q: 1, e: .5, s: .25, t: .125 };
const repeat = (token, unit, beats) => token + unit + ` ${token}`.repeat(beats / SHORT[unit] - 1);

// `count` different chord tones nearest to a pitch, low to high
const stack = (symbol, around, count) => {
  const { tones } = chord(symbol), keys = [];
  for (let key = around - 16; key <= around + 16; key++) if (tones.includes(key % 12)) keys.push(key);
  return keys.sort((a, b) => Math.abs(a - around) - Math.abs(b - around) || a - b).slice(0, count).sort((a, b) => a - b).map(spell);
};
const low = (symbol, around) => { const { bass } = chord(symbol); for (let d = 0; d < 12; d++) for (const key of [around - d, around + d]) if (key % 12 === bass) return spell(key); };
const group = notes => notes.length > 1 ? `[${notes.join(' ')}]` : notes[0];

const held = (harmony, around, count = 1) => bars(harmony).map(([symbol, beats]) => group(stack(symbol, around, count)) + LONG[beats]).join(' ');            // sustained
const pulse = (harmony, around, count = 2, unit = 'e') => bars(harmony).map(([symbol, beats]) => repeat(group(stack(symbol, around, count)), unit, beats)).join(' ');   // repeated
const bass = (harmony, around, unit = 'q') => bars(harmony).map(([symbol, beats]) => repeat(low(symbol, around), unit, beats)).join(' ');
const bassHeld = (harmony, around) => bars(harmony).map(([symbol, beats]) => low(symbol, around) + LONG[beats]).join(' ');
const stab = (harmony, around, count, on = [0]) => [0, 1, 2, 3].map(beat => on.includes(beat) ? group(stack(sounding(harmony, beat), around, count)) + "q'" : 'rq').join(' ');   // short chords on some beats
const stabBass = (harmony, around, on = [0]) => [0, 1, 2, 3].map(beat => on.includes(beat) ? low(sounding(harmony, beat), around) + "q'" : 'rq').join(' ');
const again = (note, times = 8, unit = 'e') => note + unit + ` ${note}`.repeat(times - 1);
const roll = note => again(note, 16, 's');                                                                    // a timpani roll
const timpani = (harmony, on = [0]) => [0, 1, 2, 3].map(beat => { const { bass: root } = chord(sounding(harmony, beat)); return on.includes(beat) && (root === 2 || root === 9) ? (root === 2 ? 'D2q' : 'A2q!') : 'rq'; }).join(' ');

/* ---------- lines: moving a tune between instruments, and the piano's figurations ---------- */
const shift = (text, octaves) => text.replace(/([A-G][b#]?)(\d)/g, (_, name, octave) => name + (+octave + octaves));
const doubled = (text, down = 0) => text.replace(/([A-G][b#]?)(\d)/g, (_, name, octave) => `[${name}${octave - down} ${name}${+octave + 1 - down}]`);   // in octaves
const first = (list, length) => list.map((note, i) => note + (i ? '' : length)).join(' ');
// every note of a scale or chord from one note to another
const run = (kind, from, to, length = 't') => {
  const out = [], last = midi(to), step = midi(from) <= last ? 1 : -1;
  for (let key = midi(from); key !== last + step; key += step) if (belongs(kind).includes(key % 12)) out.push(spell(key));
  return first(out, length);
};
// a chord rolled up from a bass note and part of the way back down
const surge = (symbol, from, up = 10, total = 16, length = 's') => {
  const rising = [];
  for (let key = midi(from); rising.length < up; key++) if (chord(symbol).tones.includes(key % 12)) rising.push(key);
  return first([...rising, ...rising.slice(0, -1).reverse().slice(0, total - up)].map(spell), length);
};
const wave = (harmony, around, length = 's') => bars(harmony).map(([symbol, beats]) => surge(symbol, low(symbol, around), Math.ceil(beats / SHORT[length] * .56), beats / SHORT[length], length)).join(' ');
const octave = note => midi(note) - 12 >= 21 ? `[${shift(note, -1)} ${note}]` : `[${note} ${shift(note, 1)}]`;   // a bass octave that stays on the keyboard
const deep = (harmony, around = 38) => bars(harmony).map(([symbol, beats]) => octave(low(symbol, around)) + LONG[beats]).join(' ');   // the left hand's bass octave
const strike = (harmony, around = 38, on = [0, 2]) => [0, 1, 2, 3].map(beat => on.includes(beat) ? octave(low(sounding(harmony, beat), around)) + "q'" : 'rq').join(' ');
const crash = harmony => [62, 74, 86, 74].map((around, beat) => group(stack(sounding(harmony, beat), around, 4)) + 'q').join(' ');   // full chords up and down the keyboard

/* ---------- putting bars together ---------- */
const mix = (bar, levels = {}) => { const out = { ...bar }; for (const id of ORCHESTRA) out[id] = `{b${levels[id] ?? 1}} ${out[id] ?? 'rw'}`; return out; };   // set every section's balance
const everyone = (symbol, { cymbal = false, drum = false } = {}) => ({   // one short chord from the whole orchestra
  fl: group(stack(symbol, 86, 1)) + "q'! rh.", ob: group(stack(symbol, 79, 1)) + "q'! rh.", cl: group(stack(symbol, 72, 1)) + "q'! rh.", bn: low(symbol, 45) + "q'! rh.",
  hn: group(stack(symbol, 60, 2)) + "q'! rh.", tp: group(stack(symbol, 74, 2)) + "q'! rh.", tb: group(stack(symbol, 53, 2)) + "q'! rh.", tu: low(symbol, 36) + "q'! rh.",
  v1: group(stack(symbol, 80, 2)) + "q'! rh.", v2: group(stack(symbol, 70, 2)) + "q'! rh.", va: group(stack(symbol, 60, 2)) + "q'! rh.", vc: low(symbol, 48) + "q'! rh.", cb: low(symbol, 36) + "q'! rh.",
  tm: timpani(symbol), pc: cymbal || drum ? group([drum && 'C2', cymbal && 'B3'].filter(Boolean)) + 'q rh.' : 'rw'
});

/* ================= the music ================= */

// --- the two tunes ---
// first theme: a stamped motto (a note, its lower neighbour, a leap), in D minor
const T1 = ['D5q D5e C#5 D5q F5q', 'A5q. G5e E5q C#5q', 'G5q G5e F#5 G5q Bb5q', 'A5q. F5e G5q E5q', 'D6q D6e C#6 D6q F6q', 'E6q. D6e Bb5q G5q', 'A5q A5e G#5 A5q C#6q', 'D6h. rq'];
const H1 = ['Dm', 'A7', 'Gm', 'A7', 'Dm', 'Em7b5/G', 'A7', 'Dm'];
// second theme: a long-breathed melody, first in F major
const T2 = ['A5h C6q F6q', 'E6q. D6e D6h', 'Bb5h D6q G6q', 'F6q. E6e E6h', 'A5q C6q F6q A6q', 'Bb6h G6q A6q', 'F6h D6q. E6e', 'C6w'];
const H2 = ['F', 'Dm', 'Bb', 'C7', 'F/A', [['Bb', 2], ['G7/B', 2]], [['F/C', 2], ['C7', 2]], 'F'];

// --- Maestoso: a drum roll, then the orchestra and the piano throw chords at each other ---
const gesture = (symbol, bassOctave, sweep, climb, chordNotes) => ({
  ...everyone(symbol, { cymbal: true, drum: true }), tr: `rq ${group(stack(symbol, 64, 3))}h.`,
  dyn: '{ff} rq {p} rh.',
  pr: `{ff}{ped4} [${chordNotes}]q! ${sweep} ${climb}`, pl: `{ff} ${bassOctave}q! rh.`
});
const intro = [
  { dyn: '{t84}{pp} rw {<f}', tm: again('D2', 32, 't'), tr: '[D3 A3 D4]w', vc: 'D2w', cb: 'D2w', bn: 'D2w' },
  gesture('Dm', '[D1 D2]', run('Dm', 'D7', 'D2'), '[D2 D3]s [F2 F3] [A2 A3] [D3 D4]', 'D5 F5 A5 D6'),
  gesture('Bb', '[Bb0 Bb1]', run('Bb', 'D7', 'D2'), '[D2 D3]s [F2 F3] [Bb2 Bb3] [D3 D4]', 'D5 F5 Bb5 D6'),
  gesture('Em7b5', '[E1 E2]', run('Em7b5', 'D7', 'E3'), '[E2 E3]s [G2 G3] [Bb2 Bb3] [D3 D4]', 'E5 G5 Bb5 D6'),
  gesture('A7', '[A0 A1]', run('A7', 'G6', 'A2'), run('A7', 'C#3', 'A4'), 'E5 G5 A5 C#6'),
  { dyn: '{t84}{p} rw {<ff}{~98}{hold.25}', tr: '[A3 C#4 E4 G4]w', tm: again('A2', 32, 't'), hn: '[E4 G4]w', tb: '[A2 E3]w', tu: 'A1w', vc: 'A2w', cb: 'A1w', bn: 'A2w',
    pr: `{mf}{ped0} ${run('chromatic', 'A4', 'E7')} {<fff}`, pl: `{mf} ${run('chromatic', 'A3', 'E6')} {<fff}` }
].map((bar, i) => i ? bar : mix(bar));

// --- Allegro con fuoco: the motto in the piano's octaves over driving strings ---
const drive = T1.map((line, i) => ({
  pr: (i ? '' : '{ff}{ped1} ') + doubled(line), pl: (i ? '' : '{ff} ') + doubled(line, 2),
  v1: pulse(H1[i], 69, 2), v2: pulse(H1[i], 62, 2), va: pulse(H1[i], 55, 2), vc: bass(H1[i], 50), cb: bass(H1[i], 38),
  cl: held(H1[i], 65, 2), hn: held(H1[i], 57, 2), bn: bassHeld(H1[i], 45), tm: timpani(H1[i])
}));
drive[0] = mix({ ...drive[0], dyn: '{t138}{mf} rw' }, { cl: .8, hn: .8 });

// …then the whole orchestra takes the motto, and the piano sweeps the keyboard under it
const blaze = T1.map((line, i) => ({
  v1: line, v2: shift(line, -1), fl: shift(line, i < 4 ? 1 : 0), ob: shift(line, i < 4 ? 0 : -1), cl: shift(line, -1), tp: shift(line, i < 4 ? 0 : -1),
  va: pulse(H1[i], 58, 2, 'q'), hn: pulse(H1[i], 60, 2, 'q'), tb: pulse(H1[i], 52, 2, 'q'), tu: bass(H1[i], 36), bn: bass(H1[i], 45), vc: bass(H1[i], 48), cb: bass(H1[i], 36),
  tm: timpani(H1[i], [0, 2]), pc: i ? 'rw' : '[C2 B3]q rh.',
  pr: (i ? '' : '{ff}{ped2} ') + surge(H1[i], low(H1[i], 50)), pl: (i ? '' : '{ff} ') + strike(H1[i])
}));
blaze[0] = mix({ ...blaze[0], dyn: '{ff} rw' }, { hn: .85, tb: .8, va: .9 });

// --- the motto wanders off towards F major, and everything slows ---
const turn = [
  mix({ dyn: '{f} rw', fl: 'F5q F5e E5 F5q Bb5q', ob: 'F5q F5e E5 F5q Bb5q', cl: 'F4q F4e E4 F4q Bb4q', v1: held('Bb', 70), v2: held('Bb', 65), va: held('Bb', 58), vc: bassHeld('Bb', 46), cb: bassHeld('Bb', 34), hn: held('Bb', 58, 2),
    pr: `{f}{ped0} ${run('F major', 'D4', 'E6', 's')}`, pl: '{mf} [Bb1 Bb2]h rh' }),
  { v1: 'G5q G5e F#5 G5q Bb5q', v2: 'G4q G4e F#4 G4q Bb4q', va: held('Gm', 58), vc: bassHeld('Gm', 43), cb: bassHeld('Gm', 31), cl: held('Gm', 62, 2), bn: bassHeld('Gm', 43),
    pr: run('F major', 'F6', 'E4', 's'), pl: '[G1 G2]h rh' },
  { dyn: '{mf} rw {>p}', fl: 'E5q E5e D#5 E5q G5q', ob: 'E5q E5e D#5 E5q G5q', cl: 'E4q E4e D#4 E4q G4q', v1: held('C7', 70), v2: held('C7', 64), va: held('C7', 58), vc: bassHeld('C7', 48), cb: bassHeld('C7', 36), hn: held('C7', 58, 2),
    pr: `{mf} ${run('C7', 'C3', 'Bb6', 's')} {>p}`, pl: '[C2 C3]w' },
  { dyn: '{t138}{p} rw {~92}', hn: held('C7', 58, 2), v1: held('C7', 70), v2: held('C7', 64), va: held('C7', 58), vc: bassHeld('C7', 48), cb: bassHeld('C7', 36),
    pr: '{p}{ped4} G6e E6 C6 Bb5 G5 E5 C5 Bb4 {>pp}', pl: '{p} [C2 G2 E3]w' }
];

// --- Andante cantabile: the long tune, first on a single oboe over the piano's slow arpeggios ---
const song = T2.map((line, i) => {
  const [low3, mid3, high3] = [0, 1, 2].map(voice => bars(H2[i]).map(([symbol, beats]) => stack(symbol, 62, 3)[voice] + LONG[beats]).join(' '));
  return { ob: shift(line, -1), fl: i >= 4 ? line : 'rw', hn: i >= 4 ? held(H2[i], 58) : 'rw', v1: high3, v2: mid3, va: low3, vc: bassHeld(H2[i], 46), cb: bassHeld(H2[i], 34),
    pr: (i ? '' : '{pp}') + `{ped${bars(H2[i]).length > 1 ? 2 : 4}} ` + wave(H2[i], 41), pl: (i ? '' : '{pp} ') + deep(H2[i], 41) };
});
song[0] = mix({ ...song[0], dyn: '{t92}{p} rw' }, { ob: 2.1, fl: 1.4, cb: .9, hn: .8 });

// …then on all the violins, with the piano rippling up and down under them, to the first big climax
const T2b = [...T2.slice(0, 6), 'F6h G6q. E6e', 'F6w'];
const bloom = T2b.map((line, i) => ({
  v1: line, fl: line, v2: shift(line, -1), ob: shift(line, -1), cl: shift(line, -1),
  va: held(H2[i], 60, 2), hn: held(H2[i], 57, 2), tb: held(H2[i], 50, 2), bn: bassHeld(H2[i], 43), tu: bassHeld(H2[i], 36), vc: bass(H2[i], 46), cb: bassHeld(H2[i], 34),
  tm: i === 6 ? roll('C3') : 'rw', pc: i === 5 ? 'B3q rh.' : 'rw',
  pr: (i ? '' : '{mf}') + `{ped${bars(H2[i]).length > 1 ? 2 : 4}} ` + bars(H2[i]).map(([symbol, beats]) => Array(beats / 2).fill(surge(symbol, low(symbol, 43), 9, 16, 't')).join(' ')).join(' '),
  pl: (i ? '' : '{mf} ') + deep(H2[i], 41)
}));
bloom[0] = mix({ ...bloom[0], dyn: '{t92}{mf} rw' }, { tb: .6, hn: .8, cl: .8, tu: .8 });
bloom[4].dyn = '{mf} rw {<ff}'; bloom[4].pr += ' {<ff}';
bloom[5].dyn = '{t92}{ff} rw {~84}';
bloom[6].dyn = '{ff} rw {>mf}'; bloom[6].pr = '{ff}' + bloom[6].pr + ' {>mf}';
bloom[7].dyn = '{t84}{mf} rw {>p}{~70}'; bloom[7].pr += ' {>p}';

// --- Tempo I: the motto as a fugue subject, entering section by section from the basses upwards ---
const subject = { D: ['D3q D3e C#3 D3q F3q', 'A3q. G3e E3q C#3q'], A: ['A3q A3e G#3 A3q C4q', 'E4q. D4e B3q G#3q'], G: ['G4q G4e F#4 G4q Bb4q', 'D5q. C5e A4q F#4q'] };
const fugue = [
  mix({ dyn: '{t138}{p} rw', vc: subject.D[0], bn: subject.D[0], cb: shift(subject.D[0], -1) }, { v1: 1.3, v2: 1.3, va: 1.3, vc: 1.3, cb: 1.2, fl: .8, ob: .8, cl: .8, bn: .8 }),
  { vc: subject.D[1], bn: subject.D[1], cb: shift(subject.D[1], -1) },
  { va: subject.A[0], cl: shift(subject.A[0], 1), vc: again('A2'), cb: again('A1'), bn: 'A2w' },
  { va: subject.A[1], cl: shift(subject.A[1], 1), vc: again('E2'), cb: again('E2'), bn: 'E2w' },
  { dyn: '{mp} rw', v2: shift(subject.D[0], 1), ob: shift(subject.D[0], 2), va: again('A3'), vc: again('D3'), cb: again('D2'), bn: 'D3w', cl: 'F4w', tm: 'D2q rh.' },
  { v2: shift(subject.D[1], 1), ob: shift(subject.D[1], 2), va: again('G3'), vc: again('A2'), cb: again('A1'), bn: 'A2w', cl: 'E4w', tm: 'A2q rh.' },
  { dyn: '{mf} rw', v1: subject.G[0], fl: shift(subject.G[0], 1), v2: again('D4'), va: again('Bb3'), vc: again('G2'), cb: again('G2'), bn: 'G2w', cl: 'Bb4w', ob: 'D5w', hn: '[G3 D4]w',
    pr: `{mf}{ped0} ${run('G harmonic', 'G3', 'A5', 's')}`, pl: `{mf} ${run('G harmonic', 'G2', 'A4', 's')}` },
  { dyn: '{mf} rw {<f}', v1: subject.G[1], fl: shift(subject.G[1], 1), v2: again('C4'), va: again('A3'), vc: again('D3'), cb: again('D2'), bn: 'D3w', cl: 'F#4w', ob: 'C5w', hn: '[F#3 D4]w',
    pr: `${run('G harmonic', 'Bb5', 'A3', 's')} {<f}`, pl: `${run('G harmonic', 'Bb4', 'A2', 's')} {<f}` }
];

// …then passed between strings and winds down a chain of fifths, the piano racing underneath
const MOTTO = { Gm: 'G4q G4e F#4 G4q Bb4q', C7: 'E5q E5e D#5 E5q G5q', F: 'F4q F4e E4 F4q A4q', Bb: 'D5q D5e C#5 D5q F5q', 'Em7b5': 'E4q E4e D#4 E4q G4q', A7: 'A4q A4e G#4 A4q C#5q' };
const chase = Object.entries(MOTTO).map(([symbol, line], i) => ({
  ...(i % 2 ? { fl: shift(line, 1), ob: line, cl: shift(line, -1), v1: pulse(symbol, 69, 2), v2: pulse(symbol, 62, 2), va: pulse(symbol, 55, 2) }
            : { v1: shift(line, 1), v2: line, va: shift(line, -1), fl: held(symbol, 81), ob: held(symbol, 74), cl: held(symbol, 67) }),
  hn: stab(symbol, 60, 2), tb: stab(symbol, 52, 2), tp: i === 5 ? shift(line, 0) : 'rw', bn: stabBass(symbol, 45, [0, 2]), tu: stabBass(symbol, 36), vc: stabBass(symbol, 48, [0, 2]), cb: stabBass(symbol, 36, [0, 2]), tm: timpani(symbol),
  pr: (i ? '' : '{f}{ped2} ') + surge(symbol, low(symbol, 50)), pl: (i ? '' : '{f} ') + strike(symbol)
}));
chase[0] = mix({ ...chase[0], dyn: '{f} rw' });

// …and everything piles up on the dominant
const PEDAL = ['A7', 'Dm/A', 'A7', 'Dm/A'];
const climb = ['E5w', 'F5w', 'G5w', 'A5w'], under = ['C#5w', 'D5w', 'E5w', 'F5w'];
const siege = [
  ...PEDAL.map((symbol, i) => ({
    tr: held(symbol, 64, 3), tm: roll('A2'), vc: again('A2'), cb: again('A1'), bn: again('A2'), tu: 'A1w', hn: held(symbol, 57, 2), tb: held(symbol, 50, 2), tp: i > 1 ? held(symbol, 69, 2) : 'rw',
    v1: climb[i], fl: shift(climb[i], 1), v2: under[i], ob: under[i], cl: shift(under[i], -1),
    pr: (i ? '' : '{mf}{ped1} ') + `re ${group(stack(symbol, 76, 3))}e`.repeat(1) + ` r ${group(stack(symbol, 76, 3))}`.repeat(3), pl: (i ? '' : '{mf} ') + '[A1 A2]e r [A1 A2] r [A1 A2] r [A1 A2] r'
  })),
  { tr: held('A7', 64, 4), tm: roll('A2'), vc: again('A2'), cb: again('A1'), bn: again('A2'), tu: 'A1w', hn: held('A7', 57, 2), tb: held('A7', 50, 2), tp: held('A7', 69, 2), v1: 'G5w', fl: 'G6w', v2: 'E5w', ob: 'E5w', cl: 'C#5w',
    pr: `{ped0} ${run('D harmonic', 'A3', 'Bb5', 's')}`, pl: run('D harmonic', 'A2', 'Bb4', 's') },
  { tr: held('A7', 67, 4), tm: roll('A2'), pc: 'C2q C2 C2 C2', vc: again('A2', 4, 'q'), cb: again('A1', 4, 'q'), bn: again('A2', 4, 'q'), tu: again('A1', 4, 'q'), hn: pulse('A7', 57, 2, 'q'), tb: pulse('A7', 50, 2, 'q'), tp: pulse('A7', 69, 2, 'q'),
    v1: again('A5', 4, 'q'), fl: again('A6', 4, 'q'), v2: again('E5', 4, 'q'), ob: again('G5', 4, 'q'), cl: again('C#5', 4, 'q'),
    pr: '{ped1} [A5 C#6 E6 A6]q! [A5 C#6 E6 A6]! [A5 C#6 E6 A6]! [A5 C#6 E6 A6]! {<fff}', pl: '[A1 A2]q! [A1 A2]! [A1 A2]! [A1 A2]! {<fff}' }
];
siege[0] = mix({ ...siege[0], dyn: '{mp} rw' }, { tr: 1.1 });
siege[5].dyn = '{f} rw {<fff}';
siege[3].dyn = '{mf} rw {<f}'; siege[1].dyn = '{mp} rw {<mf}';

// --- the motto returns with everything: orchestra and piano together ---
const unmixed = bar => Object.fromEntries(Object.entries(bar).map(([id, line]) => [id, line.replace(/\{b[\d.]+\} /, '')]));
const storm = T1.slice(0, 6).map((line, i) => ({ ...unmixed(blaze[i]), pr: (i ? '' : '{fff}{ped1} ') + doubled(line), pl: (i ? '' : '{fff} ') + doubled(line, 2) }));
storm[0] = mix({ ...storm[0], dyn: '{fff} rw', pc: '[C2 B3]q rh.' }, { hn: 1.1, tp: 1.1 });
// …and breaks off on one chord, which the piano tears open
const breach = { ...everyone('Dm/A', { cymbal: true, drum: true }), dyn: '{t138}{fff} rw {~110}',
  pr: `{fff}{ped4} [D5 F5 A5 D6]q! ${run('Dm', 'D7', 'D2')} [D2 D3]s [F2 F3] [A2 A3] [D3 D4]`, pl: '{fff} [A0 A1]q! rh.' };

// --- cadenza: the long tune remembered very quietly, then the keyboard set alight ---
const HC = ['F', 'Dm', 'Bb', 'C7'];
const cadenza = [
  ...HC.map((symbol, i) => ({ dyn: i ? 'rw' : '{t76}{pp} rw', pr: (i ? '' : '{p}{ped4} ') + shift(T2[i], -1), pl: (i ? '' : '{pp} ') + surge(symbol, low(symbol, 41), 5, 8, 'e') })),
  { dyn: '{t96} rw {~126}', pr: `{f}{ped4} ${run('C#dim7', 'C#2', 'Bb5')} ${run('C#dim7', 'C#6', 'E2')} {<ff}`, pl: '{f} [C#1 C#2]w!' },
  { dyn: '{t126} rw', pr: `{ff}{ped1} ${doubled(T1[0])}`, pl: `{ff} ${doubled(T1[0], 2)}` },
  { pr: doubled(T1[1]), pl: doubled(T1[1], 2) },
  { dyn: '{t104} rw {~116}', pr: `{mf}{ped4} ${run('Dm', 'D2', 'D7')} ${run('Dm', 'A6', 'A1')} {<f}`, pl: '{f} D1w!' },
  { dyn: '{t112} rw', pr: `{f}{ped0} ${run('D harmonic', 'D7', 'A2')}`, pl: "{f} [D2 A2 D3]q'! rq rh" },
  { pr: `{mf} ${run('D harmonic', 'A2', 'D7')} {<fff}`, pl: "[A1 A2]q'! rq rh" },
  { dyn: '{t108} rw {~92}', pr: `{mf}{ped0} ${run('chromatic', 'C#5', 'E6')} {ped2}{<ff} E6h%F6`, pl: '{f} rh [A2 E3 G3 C#4]h*' },
  { dyn: '{t92}{pp} rw {<ff}{~84}', pr: '{ped4} E6h..%F6 D6s E6', pl: '[A1 A2]w', tr: '[A3 C#4 E4 G4]w', tm: roll('A2'), vc: 'A2w', cb: 'A1w', hn: '[E4 G4]w', tb: '[A2 E3]w', tu: 'A1w', bn: 'A2w' }
];
cadenza[0] = mix(cadenza[0]);

// --- Maestoso: the long tune comes back in D major, on the whole orchestra, with the piano crashing through it ---
const TD = T2b.map(line => shift(line.replace(/([A-G][b#]?)(\d)/g, (_, name, octave) => spell(midi(name + octave) - 3)), 0));   // the same tune a minor third lower
const HD = ['D', 'Bm', 'G', 'A7', 'D/F#', [['G', 2], ['E7/G#', 2]], [['D/A', 2], ['A7', 2]], 'D'];
const glory = TD.map((line, i) => ({
  v1: line, fl: line, v2: shift(line, -1), ob: shift(line, -1), cl: shift(line, -1), tp: shift(line, -1),
  hn: held(HD[i], 62, 3), tb: held(HD[i], 52, 2), tu: bassHeld(HD[i], 36), bn: bassHeld(HD[i], 43), va: pulse(HD[i], 60, 2), vc: bass(HD[i], 45, 'e'), cb: bass(HD[i], 36),
  tm: i === 3 || i === 6 ? roll('A2') : timpani(HD[i], [0, 2]), pc: i === 0 || i === 5 ? '[C2 B3]q rh.' : 'rw',
  pr: (i ? '' : '{fff}') + (i < 4 ? '{ped1} ' + crash(HD[i]) : `{ped${bars(HD[i]).length > 1 ? 2 : 4}} ` + bars(HD[i]).map(([symbol, beats]) => Array(beats / 2).fill(surge(symbol, low(symbol, 43), 9, 16, 't')).join(' ')).join(' ')),
  pl: (i ? '' : '{fff} ') + (i < 4 ? strike(HD[i], 38, [0, 1, 2, 3]) : deep(HD[i], 38))
}));
glory[0] = mix({ ...glory[0], dyn: '{t88}{ff} rw' }, { tp: 1.25, tb: .9, va: .85 });
glory[4].dyn = '{ff} rw {<fff}';
glory[6].dyn = '{t88}{fff} rw {~80}';
glory[7].dyn = '{t80} rw {~76}';

// --- Presto: the motto, now in the major, and the door slammed shut ---
const MD = ['D5q D5e C#5 D5q F#5q', 'A5q. G5e E5q C#5q'], HP = ['D', 'A7'];
const unison = (line, i, lift) => ({
  v1: shift(line, lift), fl: shift(line, lift + 1 > 1 ? 1 : lift + 1), v2: shift(line, lift - 1), ob: line, cl: shift(line, lift - 1), tp: line, va: shift(line, -1), hn: shift(line, -1), tb: shift(line, -2), bn: shift(line, -2), vc: shift(line, -2), cb: shift(line, -3), tu: shift(line, -3),
  tm: timpani(HP[i], [0, 2]), pr: doubled(shift(line, lift)), pl: doubled(shift(line, lift), 2)
});
const finish = [
  mix({ ...unison(MD[0], 0, 0), dyn: '{t160}{ff} rw', pc: '[C2 B3]q rh.' }), unison(MD[1], 1, 0), unison(MD[0], 0, 1), unison(MD[1], 1, 1),
  { dyn: '{ff} rw {<fff}', v1: run('D major', 'B3', 'C#6', 's'), v2: run('D major', 'B3', 'C#6', 's'), fl: run('D major', 'B4', 'C#7', 's'), va: held('G', 59, 2), hn: held('G', 59, 2), tb: held('G', 50, 2), tp: held('G', 67, 2), tu: bassHeld('G', 31), bn: bassHeld('G', 43), vc: bassHeld('G', 43), cb: bassHeld('G', 31),
    pr: `{ped0} ${run('D major', 'B4', 'C#7', 's')}`, pl: run('D major', 'B2', 'C#5', 's') },
  { v1: 'E6s F#6 G6 A6 G6 F#6 E6 D6 C#6 B5 A5 G5 F#5 E5 D5 C#5', v2: 'E5s F#5 G5 A5 G5 F#5 E5 D5 C#5 B4 A4 G4 F#4 E4 D4 C#4', fl: 'E6s F#6 G6 A6 G6 F#6 E6 D6 C#6 B5 A5 G5 F#5 E5 D5 C#5', va: held('A7', 60, 2), hn: held('A7', 60, 2), tb: held('A7', 52, 2), tp: held('A7', 69, 2), tu: bassHeld('A7', 33), bn: bassHeld('A7', 45), vc: bassHeld('A7', 45), cb: bassHeld('A7', 33), tm: roll('A2'),
    pr: 'E6s F#6 G6 A6 G6 F#6 E6 D6 C#6 B5 A5 G5 F#5 E5 D5 C#5', pl: 'E4s F#4 G4 A4 G4 F#4 E4 D4 C#4 B3 A3 G3 F#3 E3 D3 C#3' },
  (() => { const cadence = [['D/A', 2], ['A7', 2]], all = [0, 1, 2, 3]; return {
    fl: stab(cadence, 86, 1, all), ob: stab(cadence, 79, 1, all), cl: stab(cadence, 72, 1, all), bn: stabBass(cadence, 45, all), hn: stab(cadence, 60, 2, all), tp: stab(cadence, 74, 2, all), tb: stab(cadence, 53, 2, all), tu: stabBass(cadence, 33, all),
    v1: stab(cadence, 80, 2, all), v2: stab(cadence, 70, 2, all), va: stab(cadence, 60, 2, all), vc: stabBass(cadence, 45, all), cb: stabBass(cadence, 33, all), tm: 'A2q A2 A2 A2', pc: 'C2q C2 C2 C2',
    pr: `{ped1} ${[74, 74, 76, 76].map((around, beat) => group(stack(sounding(cadence, beat), around, 4)) + "q'!").join(' ')}`, pl: "[A1 A2]q'! [A1 A2]'! [A1 A2]'! [A1 A2]'!" }; })(),
  { ...everyone('D', { cymbal: true, drum: true }), fl: "F#6q'! rq F#6q'! rq", ob: "D6q'! rq D6q'! rq", cl: "A5q'! rq A5q'! rq", bn: "D3q'! rq D3q'! rq", hn: "[F#4 A4]q'! rq [F#4 A4]q'! rq", tp: "[A4 D5]q'! rq [A4 D5]q'! rq", tb: "[D3 A3]q'! rq [D3 A3]q'! rq", tu: "D2q'! rq D2q'! rq",
    v1: "[A5 D6]q'! rq [A5 D6]q'! rq", v2: "[F#5 A5]q'! rq [F#5 A5]q'! rq", va: "[D4 A4]q'! rq [D4 A4]q'! rq", vc: "D3q'! rq D3q'! rq", cb: "D2q'! rq D2q'! rq", tm: 'D2q! rq D2q! rq', pc: '[C2 B3]q rq C2q rq',
    pr: "[D5 F#5 A5 D6]q'! rq [D5 F#5 A5 D6]q'! rq", pl: "[D1 D2]q'! rq [D1 D2]q'! rq" },
  { dyn: '{t120}{fff} rw {hold1.8}', fl: 'F#6w', ob: 'D6w', cl: 'A5w', bn: 'D3w', hn: '[F#4 A4]w', tp: '[A4 D5]w', tb: '[D3 A3]w', tu: 'D2w', v1: '[A5 D6]w', v2: '[F#5 A5]w', va: '[D4 A4]w', vc: 'D3w', cb: 'D2w', tm: again('D2', 16, 's'), pc: '[C2 B3]w',
    pr: '{ped4} [F#5 A5 D6 F#6]w!', pl: '[D1 D2]w!' }
];

export const SCORE = [...intro, ...drive, ...blaze, ...turn, ...song, ...bloom, ...fugue, ...chase, ...siege, ...storm, breach, ...cadenza, ...glory, ...finish];
// where each part of the piece begins (bar numbers from 1), for the listening guide and for checking the balance
let at = 1;
export const SECTIONS = Object.fromEntries([['Maestoso', intro], ['The motto', drive], ['The orchestra takes it', blaze], ['Turning away', turn], ['The long tune', song], ['The tune in full', bloom], ['Fugue', fugue], ['Chase', chase], ['Siege', siege], ['The motto returns', [...storm, breach]], ['Cadenza', cadenza], ['Glory', glory], ['Presto', finish]].map(([name, list]) => { const entry = [name, at]; at += list.length; return entry; }));
// the tunes a listener would know the piece by, for tune-check
const pitches = text => text.match(/[A-G][b#]?\d/g);
export const THEMES = { 'The motto (first theme)': pitches(T1.slice(0, 4).join(' ')), 'The long tune (second theme)': pitches(T2.join(' ')), 'The long tune in D major': pitches(TD.join(' ')) };
