/* =====================================================================
   MUSIC — Fantasia in F minor, "Before the Virus".
   An original piano piece written for this site. Like the ambience in
   sound.js it is not a recording: the score below is performed and the
   piano is synthesised live. It is in F minor because the dread drone in
   sound.js is an F — the floor Bonegrit feels.

   SCORE holds one row per 4/4 bar: [right hand, left hand].
     F5q Ab3e. rh       note or rest + length: w h q e s t (whole … 32nd),
                        dots allowed; no length = same as the note before
     [F2 C3 Ab3]h       chord                 ( … )x4   repeat a group
     !  '  *  %C6       accent · staccato · rolled chord · trill with C6
     {p} {<mf} {>pp}    dynamic from here · swell or fade that arrives here
     {t66} {~54}        tempo from here · tempo that eases in to arrive here
     {hold1.4}          fermata, in seconds   {ped2}    re-pedal every 2 beats
     {v.8}              balance of this hand
   ===================================================================== */
window.Music = (() => {
  const TITLE = 'Fantasia in F minor, “Before the Virus”';
  const VOLUME = .6, GAP = 7;   // seconds of quiet before the piece comes round again

  const SCORE = [
    // Adagio — the floor, felt before anything is heard
    ['{pp} rw',                                        '{t54}{ped2} [F1 F2]h [F1 F2]h'],
    ['rq [Ab3 C4 F4]h.*',                              '[F1 F2]h [F1 F2]h'],
    ['rq [Bb3 Db4 G4]h.*',                             '[F1 F2]h [F1 F2]h'],
    ['{p} rq [G3 C4 E4]h*{hold1.4} rq',                '{t54} [C2 C3]w {~46}'],

    // Andante con moto — the theme, over a falling lament bass: F · Eb · Db · C
    ['{p} F5q C6q. Bb5e Ab5q',                         '{t66}{v1} F3e C4 Ab3 C4 F3 C4 Ab3 C4'],
    ['G5q {<mp} Eb6q. Db6e C6q',                       'Eb3e Bb3 G3 Bb3 Eb3 C4 G3 C4'],
    ['{>p} F5q Db6q. C6e Bb5q',                         'Db3e Ab3 F3 Ab3 Db3 Bb3 F3 Bb3'],
    ['{<mp} C6q. Bb5s Ab5s G5h {>p}',                  'C3e G3 E3 G3 {t66} [C3 E3 G3]q rq {~58}'],
    ['{p} F5q C6q. Bb5e Ab5q',                         '{t66} F3e C4 Ab3 C4 F3 C4 Ab3 C4'],
    ['{p} A5q F6q. Eb6e Db6q',                         'Eb3e C4 A3 C4 Db3 Bb3 F3 Bb3'],
    ['{<mf} Db6q Bb5e Gb5e {mf} F5q E5q {>p}',         '{ped1} Bb2e Gb3 Db3 Gb3 {t66} C3e [F3 Ab3] C3 [G3 Bb3] {~58}'],

    // the theme drops into the bass and walks to the relative major
    ['{p} F5q {v.75} re [Ab4 C5 F5] r [Ab4 C5 F5] r [Ab4 C5 F5]',                  '{t66}{v1.15} [F2 F3]q [C3 C4]q. [Bb2 Bb3]e [Ab2 Ab3]q'],
    ['re [Ab4 Db5 F5] r [Ab4 Db5 F5] r [Ab4 F5] r [Bb4 Db5 F5]',                    '[F2 F3]q [Db3 Db4]q. [C3 C4]e [Bb2 Bb3]q'],
    ['{<mf} re [Bb4 Db5 G5] r [Bb4 Db5 G5] r [Bb4 Db5 Eb5] r [Bb4 Db5 Eb5] {>mp}',  '{t66} [Eb2 Eb3]q [Bb2 Bb3]q. [Ab2 Ab3]e [G2 G3]q {~60}'],

    // dolce, A-flat major — what he was before
    ['{p}{v1} C5q. Db5e Eb5q Ab5q',                    '{t63}{ped2}{v.85} Ab2e ([Ab3 C4 Eb4])x3 Eb3 ([Ab3 C4 Eb4])x3'],
    ['G5q. F5e Eb5h',                                  'Bb2e ([Bb3 Db4 Eb4])x3 Bb2 ([G3 Bb3 Db4])x3'],
    ['{p} Eb5q. F5e Ab5q C6q',                         'C3e ([Ab3 Eb4])x3 C3 ([Ab3 Eb4])x3'],
    ['{<mp} Bb5q. Ab5e F5h',                           'Db3e ([Ab3 Db4 F4])x3 Db3 ([Ab3 Db4 F4])x3'],
    ['{mp} F5q Bb5q B5h',                              'Db3e ([Bb3 Db4 F4])x3 D3 ([Ab3 D4 F4])x3'],
    ['{<mf} C6q Eb6q. Db6e C6q',                       'Eb3e ([Ab3 C4 Eb4])x3 Eb3 ([Ab3 C4 Eb4])x3'],
    ['{mf} Bb5h..%C6 Ab5s Bb5s {>p}',                  '{t63} Eb3e ([G3 Bb3 Db4])x3 Eb3 ([G3 Bb3 Db4])x3 {~54}'],
    ['{p} Ab5h rh {>pp}',                              'Ab2e ([Ab3 C4 Eb4])x3 Ab2 ([Ab3 C4 Eb4])x3'],

    // the same song in the minor — the memory curdles
    ['{pp} Cb5q. Db5e Eb5q Ab5q',                      '{t58} Ab2e ([Ab3 Cb4 Eb4])x3 Eb3 ([Ab3 Cb4 Eb4])x3'],
    ['Gb5q. Fb5e Eb5h',                                'Ab2e ([Ab3 Cb4 Eb4])x3 Ab2 ([Ab3 Cb4 Eb4])x3'],

    // agitato — the virus and the parasites; the theme hammers up through the bass
    ['{pp}{v.8} (C5s Eb5 Gb5 Eb5)x2 (Eb5s Gb5 C6 Gb5)x2',  '{t58}{v1.1} [A1 A2]h [A1 A2]h {~72}'],
    ['{<f} (F5s Bb5 Db6 Bb5)x4',                           '[Bb1 Bb2]q [F2 F3]q. [Eb2 Eb3]e [Db2 Db3]q'],
    ['{f} (F5s Ab5 D6 Ab5)x4',                             '[B1 B2]q! [F2 F3]q. [Eb2 Eb3]e [D2 D3]q'],
    ['{<ff}{v1} [F4 F5]q [C5 C6]q. [Bb4 Bb5]e [Ab4 Ab5]q', '{ped4}{v.85} (C2s C3)x8'],
    ['[G4 G5]q [Db5 Db6]q.! [C5 C6]e [Bb4 Bb5]q',          '(C2s [E3 Bb3])x8'],
    ['[Ab4 Ab5]q [F5 F6]q.! [Eb5 Eb6]e [Db5 Db6]q',        '{t72} (C2s [F3 Ab3])x8 {~58}'],
    ['{ff} [C5 E5 G5 C6]h.!{hold1.6} rq',                  '{v1} [C2 G2 C3]h.! rq'],
    ['{p} C5q. Bb4s Ab4s G4h {>pp}',                       '{t50}{ped2} [C2 C3]h [C2 C3]h {~44}'],

    // Tempo I — the theme returns sotto voce, an octave lower, then lifts
    ['{pp} F4q C5q. Bb4e Ab4q',                        '{t63} F3e C4 Ab3 C4 F3 C4 Ab3 C4'],
    ['G4q Eb5q. Db5e C5q',                             'Eb3e Bb3 G3 Bb3 Eb3 C4 G3 C4'],
    ['F4q Db5q. C5e Bb4q',                             'Db3e Ab3 F3 Ab3 Db3 Bb3 F3 Bb3'],
    ['C5q. Bb4s Ab4s G4h',                             'C3e G3 E3 G3 {t63} [C3 E3 G3]q rq {~56}'],
    ['{p} F5q C6q. Db6t C6 Bb5s Ab5q',                 '{t66}{v.8} (F3s C4 Ab3 C4)x4'],
    ['{p} A5q F6q. Eb6e Db6q',                         '(Eb3s C4 A3 C4)x2 (Db3s Bb3 F3 Bb3)x2'],
    ['{<f} Db6q! Bb5e Gb5e F5q E5q',                   '{ped1} (Bb2s Gb3 Db3 Gb3)x2 {t66} C3s Ab3 F3 Ab3 C3 Bb3 G3 Bb3 {~56}'],

    // …but the cadence is refused (V–VI) and has to be asked for twice
    ['{mp} F5q Db6q. C6e Bb5q',                        '{t60}{ped2} (Db3s Ab3 F3 Ab3)x2 (Db3s Bb3 F3 Bb3)x2'],
    ['{<mf} C6q Ab5q G5q.%Ab5 F5s G5s {>p}',           '{t60} (C3s Ab3 F3 Ab3)x2 (C3s Bb3 E3 Bb3)x2 {~46}'],

    // coda — the floor again
    ['{p} [Ab4 C5 F5]h rh',                            '{t54}{v1} [F1 F2]h [F1 F2]h'],
    ['{pp} F5q C6q. Bb5e Ab5q',                        '[F1 F2]h [F1 F2]h'],
    ['G5q Db6q. C6e Bb5q',                             '[F1 F2]h [F1 F2]h'],
    ['Ab5h F5h',                                       '[F1 F2]h [F1 F2]h'],
    ['[Bb4 Db5]h [Ab4 C5]h',                           '[F1 F2]h [F1 F2]h'],
    ['{pp} [G4 Bb4]h [F4 Ab4]h',                       '{t54} [F1 F2]h [F1 F2]h {~42}'],
    ['{<ppp} [Ab3 C4 F4]w*{hold3}',                    '[F1 F2]w']
  ];

  const STEP = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const LENGTH = { w: 4, h: 2, q: 1, e: .5, s: .25, t: .125 };
  const LEVEL = { ppp: .34, pp: .42, p: .52, mp: .6, mf: .68, f: .78, ff: .88 };
  const TICKS = 8;   // the clock counts 32nd notes
  const midi = name => {
    const [, letter, accidental, octave] = name.match(/^([A-G])([b#]?)(\d)$/);
    return 12 * (+octave + 1) + STEP[letter] + (accidental === 'b' ? -1 : accidental === '#' ? 1 : 0);
  };

  /* ---- the pianist: reads SCORE and decides when and how hard every key goes down ---- */
  function perform() {
    const tempo = [], dynamics = [], holds = [], pedal = [], strikes = [];
    [0, 1].forEach(hand => {
      let length = 1, balance = 1;
      SCORE.forEach((bar, index) => {
        let beat = index * 4;
        const text = bar[hand].replace(/\(([^()]*)\)x(\d+)/g, (_, group, times) => Array(+times).fill(group).join(' '));
        for (const token of text.match(/\{[^}]*\}|\[[^\]]*\][^\s{]*|[^\s{]+/g)) {
          if (token[0] === '{') {
            const mark = token.slice(1, -1), value = parseFloat(mark.replace(/^[^\d.]+/, ''));
            if (mark[0] === 't' || mark[0] === '~') tempo.push({ beat, value, glide: mark[0] === '~' });
            else if (mark.startsWith('hold')) holds.push({ beat, value });
            else if (mark.startsWith('ped')) pedal.push({ beat, value });
            else if (mark[0] === 'v') balance = value;
            else dynamics.push({ beat, value: LEVEL[mark.replace(/^[<>]/, '')], glide: /^[<>]/.test(mark) });
            continue;
          }
          const [, body, letter, dots, flags] = token.match(/^(\[[^\]]*\]|r|[A-G][b#]?\d)([whqest]?)(\.*)(.*)$/);
          if (letter) length = LENGTH[letter] * (2 - .5 ** dots.length);
          if (body !== 'r') strikes.push({ hand, beat, length, balance, flags, pitches: body.replace(/[[\]]/g, '').split(' ').map(midi).sort((a, b) => a - b) });
          beat += length;
        }
        if (Math.abs(beat - index * 4 - 4) > 1e-6) console.warn(`Music: bar ${index + 1}, hand ${hand + 1} is ${beat - index * 4} beats long`);
      });
    });

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
    const bpm = curve(tempo), loudness = curve(dynamics), ticks = SCORE.length * 4 * TICKS, clock = new Float64Array(ticks + 1);
    for (let tick = 0, seconds = 0; tick <= ticks; tick++) {
      holds.forEach(hold => { if (Math.round(hold.beat * TICKS) === tick) seconds += hold.value; });
      clock[tick] = seconds;
      seconds += 60 / bpm((tick + .5) / TICKS) / TICKS;
    }
    const time = beat => clock[Math.round(beat * TICKS)];

    // a key let go while the pedal is down keeps ringing until the next pedal change
    pedal.sort((a, b) => a.beat - b.beat);
    const lift = beat => {
      let i = 0;
      while (i + 1 < pedal.length && pedal[i + 1].beat < beat) i++;
      const { beat: from, value: every } = pedal[i], until = pedal[i + 1]?.beat ?? SCORE.length * 4;
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
    const add = (m, t, off, end, v) => notes.push({ m, t: Math.max(0, t + (random() - .5) * .008), off, end: Math.max(off, end), v: Math.min(1, v * (.97 + random() * .06)) });
    for (const { hand, beat, length, balance, flags, pitches } of strikes) {
      const pulse = beat % 4 === 0 ? 1.05 : beat % 2 === 0 ? 1.02 : beat % 1 === 0 ? 1 : beat % .5 === 0 ? .95 : .9;
      const voice = loudness(beat) * balance * (hand ? .7 : 1) * pulse * (flags.includes('!') ? 1.15 : 1) * pitches.length ** -.15;
      const start = time(beat), end = time(beat + length), ring = time(lift(beat + length)), trill = flags.match(/%(\w+)/);
      if (trill) {   // begins on the upper note, as an 18th-century trill does, and closes on the main one
        const pair = [midi(trill[1]), pitches[0]];
        for (let i = 0; i < length * TICKS; i++) {
          const off = time(beat + (i + 1) / TICKS);
          add(pair[i % 2], time(beat + i / TICKS), off, off, voice * (i ? .8 : .92));
        }
        continue;
      }
      pitches.forEach((pitch, i) => {
        const top = i === pitches.length - 1;
        const at = start + (flags.includes('*') ? i * .045 : 0) - (!hand && top ? .008 : 0);   // the melody speaks a hair early
        const sing = hand ? (i ? .9 : 1) : top ? 1 : .82;                                       // sing the top line, lean on the bass
        add(pitch, at, flags.includes("'") ? at + (end - start) * .45 : end, ring, voice * sing);
      });
    }

    // striking a key that is still ringing replaces the old sound instead of stacking on it
    notes.sort((a, b) => a.t - b.t);
    const ringing = {};
    for (const note of notes) {
      const last = ringing[note.m];
      if (last && last.end > note.t) { last.end = note.t; last.off = Math.min(last.off, note.t); }
      ringing[note.m] = note;
    }
    return { notes, bars: SCORE.map((_, index) => time(index * 4)), length: Math.max(...notes.map(note => note.end)) + 3.5 };
  }

  /* ---- the piano: strings (a mistuned pair, plus stiffer and brighter upper partials), a hammer, a damper, a room ---- */
  function piano(ctx) {
    const out = ctx.createGain(), board = ctx.createBiquadFilter(), room = ctx.createConvolver(), wet = ctx.createGain(), glue = ctx.createDynamicsCompressor();
    out.gain.value = VOLUME;
    glue.threshold.value = -22; glue.knee.value = 18; glue.ratio.value = 2.5; glue.attack.value = .02; glue.release.value = .35;   // keeps the storm from shouting over the theme
    board.type = 'highshelf'; board.frequency.value = 3200; board.gain.value = -5;
    const size = ctx.sampleRate * 2.6 | 0, echo = ctx.createBuffer(2, size, ctx.sampleRate), hiss = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const data = echo.getChannelData(channel);
      for (let i = ctx.sampleRate * .012 | 0, soft = 0; i < size; i++) {
        const t = i / ctx.sampleRate;
        soft += (Math.random() * 2 - 1 - soft) * (.5 * Math.exp(-t * 1.6) + .06);   // the echo darkens as it dies away
        data[i] = soft * Math.exp(-t / .36);
      }
    }
    const grain = hiss.getChannelData(0);
    for (let i = 0; i < grain.length; i++) grain[i] = Math.random() * 2 - 1;
    room.buffer = echo; wet.gain.value = .3;
    board.connect(glue); board.connect(room).connect(wet).connect(glue); glue.connect(out);
    const stage = [-.4, -.2, 0, .2, .4].map(pan => {   // bass to the left, treble to the right, as the player hears it
      const place = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain();
      if (place.pan) place.pan.value = pan;
      place.connect(board);
      return place;
    });

    // each key's tone colour: the hammer hits an eighth of the way along the string, so every eighth partial is weak
    const shapes = {};
    function shape(m, f) {
      if (shapes[m]) return shapes[m];
      const count = Math.max(2, Math.min(40, 9000 / f | 0)), level = [0];
      for (let k = 1; k <= count; k++) level[k] = (.2 + .8 * Math.abs(Math.sin(Math.PI * k / 8.2))) / (1 + (k * f / 1100) ** 2) / k * Math.min(1, k * f / 120) ** 1.2;
      const norm = 1 / Math.hypot(...level);
      const wave = (from, to) => {
        if (from > count) return null;
        const real = new Float32Array(count + 1), imag = new Float32Array(count + 1);
        for (let k = from; k <= Math.min(to, count); k++) { real[k] = level[k] * norm * Math.cos(k * k * 2.4); imag[k] = level[k] * norm * Math.sin(k * k * 2.4); }
        return ctx.createPeriodicWave(real, imag, { disableNormalization: true });
      };
      return shapes[m] = [wave(1, 2), wave(3, 7), wave(8, count)];
    }

    function strike({ m, t, off, end, v }, origin) {
      const at = origin + t, f = 440 * 2 ** ((m - 69) / 12), [low, middle, high] = shape(m, f);
      const power = v ** 1.6 * 2 ** ((60 - m) / 48), decay = 2.8 * .5 ** ((m - 40) / 24), release = m < 50 ? .11 : .07;
      const damper = ctx.createGain();
      damper.gain.setValueAtTime(1, at);
      if (end > off + .02) damper.gain.setTargetAtTime(.5, origin + off, .12);   // key up, pedal down: a softer ring
      damper.gain.setTargetAtTime(0, origin + end, release);
      damper.connect(stage[Math.max(0, Math.min(4, Math.round((m - 36) / 14)))]);
      const string = (wave, pitch, peak, fade, attack) => {
        const osc = ctx.createOscillator(), level = ctx.createGain();
        osc.setPeriodicWave(wave); osc.frequency.value = pitch;
        level.gain.setValueAtTime(0, at); level.gain.linearRampToValueAtTime(peak, at + attack); level.gain.setTargetAtTime(0, at + attack, fade);
        osc.connect(level).connect(damper); osc.start(at); osc.stop(origin + end + release * 7);
      };
      string(low, f, power * .5, decay * 2.2, .005);                                      // the after-sound
      string(low, f * 2 ** ((1 + m % 5 * .4) / 1200), power * .5, decay * .8, .005);      // its unison string, a cent or two off
      if (middle) string(middle, f * 1.0025, power * (.55 + .75 * v), decay, .003);       // stiff strings run sharp up here…
      if (high) string(high, f * 1.006, power * 2.2 * v * v, decay * .4, .002);           // …and a harder blow is a brighter one
      const knock = ctx.createBufferSource(), band = ctx.createBiquadFilter(), thud = ctx.createGain();   // felt on wire
      knock.buffer = hiss; band.type = 'bandpass'; band.frequency.value = Math.max(500, Math.min(3500, f * 3)); band.Q.value = .7;
      thud.gain.setValueAtTime(0, at); thud.gain.linearRampToValueAtTime(power * .1 * (.5 + v), at + .003); thud.gain.exponentialRampToValueAtTime(.0002, at + .04);
      knock.connect(band).connect(thud).connect(damper); knock.start(at, Math.random() * .9); knock.stop(at + .05);
    }
    return { out, strike };
  }

  /* ---- playing it: a little of the score is handed to the piano every tenth of a second ---- */
  const piece = perform();
  let ctx, kit, timer, origin, next, resume = 0, playing = false;

  function pump() {
    while (next < piece.notes.length && origin + piece.notes[next].t < ctx.currentTime + .5) kit.strike(piece.notes[next++], origin);
    if (next === piece.notes.length && ctx.currentTime > origin + piece.length + GAP) { origin = ctx.currentTime + .3; next = 0; }
  }

  function play(context) {
    if (playing) return;
    try {
      ctx = context; kit = piano(ctx);
      kit.out.gain.setValueAtTime(0, ctx.currentTime); kit.out.gain.linearRampToValueAtTime(VOLUME, ctx.currentTime + .3);
      kit.out.connect(ctx.destination);
      const from = piece.bars.filter(bar => bar <= resume).pop() || 0;   // pick up from the top of the bar we stopped in
      origin = ctx.currentTime + .3 - from;
      next = piece.notes.findIndex(note => note.t >= from - .02);
      if (next < 0) next = piece.notes.length;
      playing = true; timer = setInterval(pump, 100); pump();
    } catch (error) { console.warn('Music unavailable', error); }
  }

  function pause() {
    if (!playing) return;
    playing = false; clearInterval(timer);
    const at = ctx.currentTime - origin, old = kit.out;
    resume = at < piece.length ? Math.max(0, at) : 0;
    old.gain.cancelScheduledValues(ctx.currentTime); old.gain.setTargetAtTime(0, ctx.currentTime, .06);
    setTimeout(() => old.disconnect(), 600);
  }

  // the whole piece as an AudioBuffer, for saving to a file: Music.render().then(buffer => …)
  function render(rate = 44100) {
    const offline = new OfflineAudioContext(2, Math.ceil((piece.length + .1) * rate), rate), grand = piano(offline), step = offline.suspend ? 1 : Infinity;
    let index = 0;
    const feed = at => {   // a second of score at a time keeps the render quick; without suspend() it is all handed over at once
      while (index < piece.notes.length && piece.notes[index].t < at + step) grand.strike(piece.notes[index++], .1);
      if (at + step < piece.length) offline.suspend(at + step).then(() => { feed(at + step); offline.resume(); });
    };
    grand.out.connect(offline.destination);
    feed(0);
    return offline.startRendering();
  }

  return { title: TITLE, length: piece.length, notes: piece.notes, bars: piece.bars, play, pause, render, get playing() { return playing; } };
})();
