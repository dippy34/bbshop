/* =====================================================================
   MUSIC — Rondo agitato in F minor, "Footsteps": an original piano piece
   written for this site. audio/footsteps.mp3 is a recording of it played
   on a real concert grand; the score, and how the recording was made,
   are in tools/music/. This file only starts and stops that recording
   with the site's sound switch, and brings it round again after a pause.
   ===================================================================== */
window.Music = (() => {
  const FILE = 'audio/footsteps.mp3', VOLUME = .85, GAP = 6000;   // milliseconds of quiet before it plays again
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

  return { title: 'Rondo agitato in F minor, “Footsteps”', play, pause, get playing() { return playing; } };
})();
