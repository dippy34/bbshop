// NO REHEARSAL — the piano part of an original phonk track in G minor at 128 beats a minute.
// The beat, the 808s and the cowbell are made by make.py beside this file; this is only the dark piano that
// opens the track, haunts the break, sings a counter-line over the second drop and closes it.
// The notation is explained at the top of ../rhapsody/engine.mjs. make.py records it with ../rhapsody/render.mjs.
//
// Form (bars): 1-8 intro · 9-24 first drop · 25-32 break · 33-48 second drop · 49-52 outro.
// Every four bars the harmony goes G minor · E flat · C minor · D.

export const TITLE = 'NO REHEARSAL (piano)';

export const PARTS = [
  { id: 'pr', piano: true, sing: true },   // right hand
  { id: 'pl', piano: true }                // left hand
];

const LOOP = ['Gm', 'Eb', 'Cm', 'D'];
// the opening's rolling arpeggios, one bar each
const ARPEGGIO = { Gm: 'G4e Bb4 D5 G5 D5 Bb4 G4 D4', Eb: 'G4e Bb4 Eb5 G5 Eb5 Bb4 G4 Eb4', Cm: 'G4e C5 Eb5 G5 Eb5 C5 G4 Eb4', D: 'F#4e A4 C5 D5 F#5 D5 C5 A4' };
const OCTAVE = { Gm: '[G1 G2]w', Eb: '[Eb1 Eb2]w', Cm: '[C2 C3]w', D: '[D2 D3]w' };
const OPEN = { Gm: '[G2 D3]w', Eb: '[Eb2 Bb2]w', Cm: '[C3 G3]w', D: '[D3 A3]w' };   // bare fifths for the break
// the break's slow, high tune, and the counter-line the piano sings in octaves over the second drop
const BREAK = ['D6h Bb5q A5q', 'G5h. Bb5q', 'Eb6h D6q C6q', 'F#5h A5h', 'D6h Bb5q A5q', 'G5h Bb5q Eb6q', 'D6q. C6e Eb6q D6q', '{ped0} F#5h. rq'];
const COUNTER = ['[Bb4 Bb5]h [A4 A5]h', '[G4 G5]w', '[G4 G5]h [F4 F5]h', '[F#4 F#5]w'];
const rest = { pr: 'rw', pl: 'rw' };

export const SCORE = [
  // intro: arpeggios over deep octaves; on the eighth bar one chord, then a beat of silence before the drop
  ...[0, 1, 2, 3, 4, 5, 6].map(i => ({ pr: (i ? '' : '{t128}{mp}') + (i === 4 ? '{p}' : '') + `{ped4} ${ARPEGGIO[LOOP[i % 4]]}`, pl: (i ? '' : '{mf}') + OCTAVE[LOOP[i % 4]] })),
  { pr: '{ped0}{mf} [D4 F#4 A4 C5]h. rq', pl: '[D2 D3]h. rq' },
  // first drop: the beat takes over; the piano only strikes the first chord
  { pr: '{ff}{ped4} [G3 Bb3 D4 G4]q! rq rh', pl: '{ff} [G1 G2]q! rq rh' },
  ...Array(15).fill(rest),
  // break
  ...BREAK.map((tune, i) => ({ pr: (i ? '' : '{mp}{ped4} ') + tune, pl: (i ? '' : '{p} ') + (i === 7 ? '[D3 A3]h. rq' : OPEN[LOOP[i % 4]]) })),
  // second drop: a counter-line in octaves, and a low strike at the top of each eight bars
  ...Array.from({ length: 16 }, (_, i) => ({
    pr: (i ? '' : '{mf}{ped2} ') + (i === 15 ? '{ped0} [F#4 F#5]h. rq' : COUNTER[i % 4]),
    pl: i % 8 ? 'rw' : (i ? '' : '{ff} ') + '[G1 G2]q! rq rh'
  })),
  // outro: the arpeggios once more, home to G minor, and a long last chord
  { pr: '{p}{ped4} ' + ARPEGGIO.Gm, pl: '{mp} ' + OCTAVE.Gm },
  { pr: ARPEGGIO.Eb, pl: OCTAVE.Eb },
  { pr: '{ped2} G4e C5 Eb5 G5 F#4 A4 C5 D5', pl: '[C2 C3]h [D2 D3]h' },
  { pr: '{ped4} [G4 Bb4 D5 G5]w{hold2.5}', pl: '[G1 D2 G2]w' }
];
