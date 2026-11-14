/* =====================================================================
   MUSIC — Concerto in D minor for harpsichord and strings: an original
   piece in the Baroque manner, written for this site. audio/concerto.mp3
   is a recording of it; the score, and how the recording was made, are
   in tools/music/. This file only starts and stops that recording with
   the site's sound switch, and brings it round again after a breath.
   ===================================================================== */
window.Music = (() => {
  const FILE = 'audio/concerto.mp3', VOLUME = .85, GAP = 2000;   // milliseconds of quiet before it plays again
  let audio = null, again = null, fader = null, playing = false;

  // a fifth of a second up or down, so starting and stopping never clicks
  function fade(to, done) {
    clearInterval(fader);
    const from = audio.volume;
    let step = 0;
    fader = setInterval(() => {
      audio.volume = from + (to - from) * (++step / 8);
      if (step === 8) { clearInterval(fader); done?.(); }
    }, 25);
  }

  function play() {
    if (playing) return;
    playing = true;
    if (!audio) {
      audio = new Audio(FILE);   // fetched only once someone asks for sound
      audio.addEventListener('ended', () => {
        again = setTimeout(() => { if (playing) { audio.currentTime = 0; audio.play().catch(() => {}); } }, GAP);
      });
    }
    clearTimeout(again); clearInterval(fader);
    if (audio.ended) audio.currentTime = 0;
    audio.volume = 0;
    audio.play().then(() => { if (playing) fade(VOLUME); }, () => { playing = false; });
  }

  function pause() {
    if (!playing) return;
    playing = false;
    clearTimeout(again);
    fade(0, () => audio.pause());   // it picks up from the same spot next time
  }

  return { title: 'Concerto in D minor for harpsichord and strings', play, pause, get playing() { return playing; } };
})();
