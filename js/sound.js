/* =====================================================================
   SOUND — the ambience is synthesised live (no audio files):
   the fluorescent hum, footsteps on carpet, a low dread drone, breathing,
   a heartbeat and tape static. main.js turns the knobs as you scroll.
   The piano music is a recording; music.js starts and stops it with this switch.
   ===================================================================== */
window.Sound = (() => {
  let ctx = null, master, humBus, droneBus, staticBus, breathBus, noiseBuf, on = false, heartTimer = null, bpm = 0;
  const VOLUME = .55;

  function build() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    const comp = ctx.createDynamicsCompressor(); comp.connect(ctx.destination);
    master = ctx.createGain(); master.gain.value = 0; master.connect(comp);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const noise = () => { const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; s.start(); return s; };
    const filt = (type, f, q = .7) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; };
    const gain = v => { const g = ctx.createGain(); g.gain.value = v; return g; };
    const osc = (type, f) => { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.start(); return o; };

    // fluorescent hum: 60 Hz mains, the 120 Hz ballast buzz, a little hiss, and a slow wobble
    humBus = gain(1); humBus.connect(master);
    osc('sawtooth', 60).connect(filt('lowpass', 420)).connect(gain(.05)).connect(humBus);
    osc('square', 120).connect(filt('bandpass', 2600, 1.4)).connect(gain(.016)).connect(humBus);
    noise().connect(filt('highpass', 6500)).connect(gain(.005)).connect(humBus);
    const wob = gain(.1); osc('sine', .17).connect(wob); wob.connect(humBus.gain);

    // dread: two low tones rubbing against each other + rumble
    droneBus = gain(0); droneBus.connect(master);
    osc('sine', 43.65).connect(gain(.5)).connect(droneBus);
    osc('sine', 46.25).connect(gain(.5)).connect(droneBus);
    noise().connect(filt('lowpass', 110)).connect(gain(.4)).connect(droneBus);

    // tape static
    staticBus = gain(0); staticBus.connect(master);
    noise().connect(filt('bandpass', 1800, .4)).connect(staticBus);

    // breathing while you run: filtered noise swelling in and out
    breathBus = gain(0); breathBus.connect(master);
    const amp = gain(.5); noise().connect(filt('bandpass', 900, 1.6)).connect(amp).connect(breathBus);
    const lfo = gain(.5); osc('sine', 1.15).connect(lfo); lfo.connect(amp.gain);
  }

  const now = () => ctx.currentTime;
  const to = (param, v, t = .08) => param.setTargetAtTime(v, now(), t);

  function enable(yes) {
    if (yes && !ctx) build();
    if (!ctx) return;
    on = yes;
    if (yes) { ctx.resume(); to(master.gain, VOLUME, .6); }
    else to(master.gain, 0, .15);
    if (!yes) heart(0);
    if (yes) window.Music?.play(); else window.Music?.pause();
  }

  // called on every scroll update with the story's state (all 0…1)
  function scene({ hum = 1, dread = 0, loss = 0, run = 0 }) {
    if (!ctx) return;
    to(humBus.gain, hum, .05); to(droneBus.gain, dread * .16, .3); to(staticBus.gain, loss * .22, .05); to(breathBus.gain, run * .09, .25);
  }

  function step(strength = 1) {
    if (!on) return;
    const t = now(), s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; f.type = 'lowpass'; f.frequency.value = 200 + strength * 160;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.32 * strength, t + .012); g.gain.exponentialRampToValueAtTime(.0005, t + .17);
    s.connect(f).connect(g).connect(master); s.start(t, Math.random() * 1.5); s.stop(t + .2);
  }

  // the lights stutter: the hum drops out and the tube ticks
  function flick() {
    if (!on) return;
    const t = now();
    humBus.gain.cancelScheduledValues(t); humBus.gain.setValueAtTime(.12, t); humBus.gain.setTargetAtTime(1, t + .07, .03);
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; f.type = 'highpass'; f.frequency.value = 3000;
    g.gain.setValueAtTime(.12, t); g.gain.exponentialRampToValueAtTime(.0005, t + .04);
    s.connect(f).connect(g).connect(master); s.start(t); s.stop(t + .05);
  }

  function thump(t, loud) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(62, t); o.frequency.exponentialRampToValueAtTime(36, t + .13);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(loud, t + .012); g.gain.exponentialRampToValueAtTime(.0005, t + .22);
    o.connect(g).connect(master); o.start(t); o.stop(t + .25);
  }
  function heart(newBpm) {
    bpm = newBpm;
    if (heartTimer || !bpm || !on) return;
    const beat = () => {
      if (!bpm || !on) { heartTimer = null; return; }
      const t = now(); thump(t, .5); thump(t + .21, .32);
      heartTimer = setTimeout(beat, 60000 / bpm);
    };
    beat();
  }

  return { enable, scene, step, flick, heart, get on() { return on; } };
})();
