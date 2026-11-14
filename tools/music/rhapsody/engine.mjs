// The "players": turns a score (bars of text, one line per instrument) into timed notes.
//
// A score is { PARTS, SCORE }. Each bar of SCORE is an object with one line per part (a missing part rests):
//   F5q Ab3e. rh       note or rest + length: w h q e s t (whole … 32nd), dots allowed;
//                      no length = same as the note before
//   [D3 A3 D4]w        chord                 ( … )x4   repeat a group
//   !  '  *  %F5       accent · staccato · rolled chord · trill with F5
//   {t138} {~92}       tempo from here · tempo that eases in to arrive here      {hold1.5}  fermata, seconds
//   {f} {<ff}          dynamic from here · swell or fade that arrives here. In the `dyn` line it sets the
//                      orchestra's dynamic; in a piano line it sets the piano's own
//   {b.7}              balance: this part plays at .7 of the orchestra's dynamic until told otherwise
//   {l.8} {l~.9}       the piano's loudness as a number, set or arrived at
//   {ped2}             (piano) sustain pedal, changed every 2 beats; {ped0} = no pedal
const STEP = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const LENGTH = { w: 4, h: 2, q: 1, e: .5, s: .25, t: .125 };
const ORCHESTRA = { pp: .3, p: .42, mp: .54, mf: .66, f: .8, ff: .92, fff: 1 };   // how strongly the orchestra plays, 0…1
const PIANO = { pp: .4, p: .5, mp: .58, mf: .66, f: .76, ff: .86, fff: .94 };     // how hard the piano keys are struck
const TICKS = 8;                                                                   // the clock counts 32nd notes

export const midi = name => {
  const [, letter, accidental, octave] = name.match(/^([A-G])([b#]?)(-?\d)$/);
  return 12 * (+octave + 1) + STEP[letter] + (accidental === 'b' ? -1 : accidental === '#' ? 1 : 0);
};

// Returns { notes: [{ part, channel?, m, t, off, end, v }], curves: { partId: [[seconds, level]] }, bars, length }.
export function perform({ PARTS, SCORE }) {
  const tempo = [], holds = [], pedal = [{ beat: 0, value: 0 }], strikes = [], problems = [];
  const orchestra = [{ beat: 0, value: ORCHESTRA.mf, glide: false }];
  const own = Object.fromEntries(PARTS.filter(part => part.piano).map(part => [part.id, [{ beat: 0, value: PIANO.mf, glide: false }]]));
  const balance = Object.fromEntries(PARTS.map(part => [part.id, [{ beat: 0, value: 1 }]]));
  [{ id: 'dyn', silent: true }, ...PARTS].forEach(part => {
    let length = 1;
    SCORE.forEach((bar, number) => {
      let beat = number * 4;
      const text = (bar[part.id] ?? 'rw').replace(/\(([^()]*)\)x(\d+)/g, (_, group, times) => Array(+times).fill(group).join(' '));
      for (const token of text.match(/\{[^}]*\}|\[[^\]]*\][^\s{]*|[^\s{]+/g)) {
        if (token[0] === '{') {
          const mark = token.slice(1, -1), value = parseFloat(mark.replace(/^[^\d.]+/, '')), name = mark.replace(/^[<>]/, '');
          if (mark[0] === 't' || mark[0] === '~') tempo.push({ beat, value, glide: mark[0] === '~' });
          else if (mark.startsWith('hold')) holds.push({ beat, value });
          else if (mark.startsWith('ped')) pedal.push({ beat, value });
          else if (mark[0] === 'b') balance[part.id].push({ beat, value });
          else if (mark[0] === 'l') own[part.id].push({ beat, value, glide: mark[1] === '~' });
          else if (part.piano && name in PIANO) own[part.id].push({ beat, value: PIANO[name], glide: /^[<>]/.test(mark) });
          else if (name in ORCHESTRA) orchestra.push({ beat, value: ORCHESTRA[name], glide: /^[<>]/.test(mark) });
          else problems.push(`bar ${number + 1}, ${part.id}: unknown mark ${token}`);
          continue;
        }
        const found = token.match(/^(\[[^\]]*\]|r|[A-G][b#]?-?\d)([whqest]?)(\.*)(.*)$/);
        if (!found) { problems.push(`bar ${number + 1}, ${part.id}: cannot read "${token}"`); continue; }
        const [, body, letter, dots, flags] = found;
        if (letter) length = LENGTH[letter] * (2 - .5 ** dots.length);
        if (body !== 'r' && !part.silent) strikes.push({ part, beat, length, flags, pitches: body.replace(/[[\]]/g, '').split(' ').map(midi).sort((a, b) => a - b) });
        beat += length;
      }
      if (Math.abs(beat - number * 4 - 4) > 1e-6) problems.push(`bar ${number + 1}, ${part.id} is ${beat - number * 4} beats long`);
    });
  });
  if (problems.length) throw new Error('Score does not add up:\n  ' + problems.join('\n  '));

  // tempo and dynamics are curves: a mark either sets a value or is the far end of a glide
  const curve = marks => {
    marks.sort((a, b) => a.beat - b.beat || (b.glide ?? 0) - (a.glide ?? 0));
    return beat => {
      let i = 0;
      while (i + 1 < marks.length && marks[i + 1].beat <= beat) i++;
      const here = marks[i], next = marks[i + 1];
      return next?.glide && next.beat > here.beat ? here.value + (next.value - here.value) * (beat - here.beat) / (next.beat - here.beat) : here.value;
    };
  };
  const bpm = curve(tempo), loud = curve(orchestra), ticks = SCORE.length * 4 * TICKS, clock = new Float64Array(ticks + 2);
  for (let tick = 0, seconds = 0; tick <= ticks + 1; tick++) {
    holds.forEach(hold => { if (Math.round(hold.beat * TICKS) === tick) seconds += hold.value; });
    clock[tick] = seconds;
    seconds += 60 / bpm((tick + .5) / TICKS) / TICKS;
  }
  const time = beat => { const at = Math.min(ticks, beat * TICKS), tick = Math.floor(at + 1e-9); return clock[tick] + (tick < ticks ? (clock[tick + 1] - clock[tick]) * Math.max(0, at - tick) : 0); };
  const level = Object.fromEntries(PARTS.map(part => { const mine = part.piano ? curve(own[part.id]) : loud, share = curve(balance[part.id]); return [part.id, beat => Math.min(1, mine(beat) * share(beat))]; }));

  // a piano key let go while the pedal is down keeps ringing until the next pedal change
  pedal.sort((a, b) => a.beat - b.beat);
  const lift = beat => {
    let i = 0;
    while (i + 1 < pedal.length && pedal[i + 1].beat < beat) i++;
    const { beat: from, value: every } = pedal[i], until = pedal[i + 1]?.beat ?? SCORE.length * 4;
    return every ? Math.min(until, from + Math.ceil((beat - from) / every - 1e-9) * every) : beat;
  };

  // a fixed seed: the same small human unevenness every time, so a render is repeatable
  let seed = 18301892;
  const random = () => {
    seed = seed + 0x6D2B79F5 | 0;
    let x = Math.imul(seed ^ seed >>> 15, 1 | seed);
    x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x;
    return ((x ^ x >>> 14) >>> 0) / 4294967296;
  };
  const notes = [];
  // fast notes are placed more exactly than slow ones, as good players' are
  const add = (part, m, t, off, v, end = off) => notes.push({ part: part.id, channel: part.channel, m, off, end: Math.max(off, end),
    t: Math.max(0, t + (random() - .5) * Math.min(part.piano ? .007 : part.loose ?? .014, (off - t) * .08)),
    v: Math.max(.05, Math.min(1, v * (part.sing ? 1 + Math.max(-.08, Math.min(.1, (m - 76) * .005)) : 1) * (.96 + random() * .08))) });
  for (const { part, beat, length, flags, pitches } of strikes) {
    const pulse = beat % 4 === 0 ? 1.07 : beat % 2 === 0 ? 1.04 : beat % 1 === 0 ? 1 : beat % .5 === 0 ? .95 : .9;   // lean on the strong beats
    const voice = level[part.id](beat) * pulse * (flags.includes('!') ? 1.2 : 1) * (part.piano ? pitches.length ** -.12 : 1);
    const start = time(beat), end = time(beat + length), ring = part.piano ? time(lift(beat + length)) : 0, trill = flags.match(/%(\w+)/), early = part.early ?? 0;
    if (trill) {   // about twelve notes a second, beginning on the upper note and closing on the main one
      const pair = [midi(trill[1]), pitches[0]], count = Math.max(2, 2 * Math.round((end - start) * 6));
      for (let i = 0; i < count; i++) add(part, pair[i % 2], time(beat + length * i / count) - early, time(beat + length * (i + 1) / count) - early, voice * (i ? .85 : 1));
      continue;
    }
    const share = flags.includes("'") ? .45 : length >= 1.5 ? 1 : part.held ?? .85;   // detached short notes, sustained long ones
    pitches.forEach((pitch, i) => {
      const at = start + (flags.includes('*') ? i * .045 : 0) - early;
      add(part, pitch, at, at + (end - at) * share, voice, ring);
    });
  }
  notes.sort((a, b) => a.t - b.t);
  const sounding = {};   // striking a piano key that is still ringing replaces the old sound instead of stacking on it
  for (const note of notes.filter(note => !('channel' in note) || note.channel === undefined)) {
    const last = sounding[note.m];
    if (last && last.end > note.t) { last.end = note.t; last.off = Math.min(last.off, note.t); }
    sounding[note.m] = note;
  }
  // how loud each orchestral part is meant to be at every moment, for swells on held notes
  const curves = Object.fromEntries(PARTS.filter(part => !part.piano).map(part => {
    const points = [];
    for (let tick = 0; tick <= ticks; tick++) { const value = level[part.id](tick / TICKS); if (!points.length || Math.abs(points.at(-1)[1] - value) > .004) points.push([clock[tick], value]); }
    return [part.id, points];
  }));
  return { notes, curves, bars: SCORE.map((_, number) => time(number * 4)), length: Math.max(...notes.map(note => note.end)) };
}
