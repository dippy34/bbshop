(() => {
  const CONFIG = {
    photoLabels: false,
    photoFormats: ['png', 'jpg', 'jpeg', 'webp'],
    trailerYouTubeID: '',
    officialLinks: []
  };

  const root = document.documentElement;
  const gate = document.querySelector('.gate');
  const soundButton = document.querySelector('.sound-toggle');
  const background = [...document.querySelectorAll('.nav, main, .footer, .skip-link')];
  const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
  let entered = false;
  let lenis = null;
  let motionContext = null;

  function setSound(enabled) {
    try {
      window.Sound?.enable(enabled);
      window.Sound?.scene({ hum: .1, dread: .16, loss: 0, run: 0 });
    } catch {
      window.Sound?.enable(false);
    }
    const playing = Boolean(window.Sound?.on);
    soundButton.setAttribute('aria-pressed', String(playing));
    soundButton.setAttribute('aria-label', playing ? 'Mute website music and ambient sound' : 'Enable website music and ambient sound');
    soundButton.querySelector('span').textContent = playing ? 'Sound on' : 'Sound off';
  }

  function setupMotion() {
    motionContext?.revert();
    motionContext = null;
    lenis?.destroy();
    lenis = null;
    window.__lenis = null;
    const enabled = !motionQuery.matches && Boolean(window.gsap && window.ScrollTrigger);
    root.classList.toggle('motion', enabled);
    root.classList.toggle('no-motion', !enabled);
    if (!enabled) return;
    gsap.registerPlugin(ScrollTrigger);
    if (window.Lenis) {
      lenis = new Lenis({ autoRaf: true, duration: .85, smoothWheel: true });
      lenis.on('scroll', ScrollTrigger.update);
      window.__lenis = lenis;
    }
    motionContext = gsap.context(() => {
      document.querySelectorAll('.section h2, .feature, .entity-info, .lore-copy p').forEach(element => {
        gsap.from(element, {
          y: 22, duration: .75, ease: 'power2.out',
          scrollTrigger: { trigger: element, start: 'top 94%', once: true }
        });
      });
      if (innerWidth > 820) {
        gsap.to('.hero-entity img', {
          y: 45, ease: 'none',
          scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
        });
      }
    });
  }

  function focusTarget(target) {
    if (!target.hasAttribute('tabindex')) target.tabIndex = -1;
    target.focus({ preventScroll: true });
  }

  function enter(withSound, remember = true) {
    if (entered) return;
    entered = true;
    gate.hidden = true;
    root.classList.add('entered');
    background.forEach(element => { element.inert = false; });
    document.body.style.overflowY = '';
    if (remember) {
      try { sessionStorage.setItem('containment-breach-entered', 'true'); } catch {}
    }
    setSound(withSound);
    setupMotion();
    let target = document.querySelector('#home');
    if (location.hash) target = document.getElementById(location.hash.slice(1)) || target;
    focusTarget(target);
  }

  background.forEach(element => { element.inert = true; });
  document.body.style.overflowY = 'hidden';
  gate.querySelectorAll('[data-enter]').forEach(button => {
    button.addEventListener('click', () => enter(button.dataset.enter === 'sound'));
  });
  gate.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      enter(false);
    }
    if (event.key !== 'Tab') return;
    const buttons = [...gate.querySelectorAll('button')];
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus();
    }
  });
  soundButton.addEventListener('click', () => setSound(!window.Sound?.on));
  document.addEventListener('visibilitychange', () => { if (document.hidden) setSound(false); });
  window.addEventListener('pagehide', () => setSound(false));
  motionQuery.addEventListener('change', () => { if (entered) setupMotion(); });

  window.__go = (id, progress = 0) => {
    const target = document.getElementById(id);
    if (!target) return 0;
    return Math.max(0, target.getBoundingClientRect().top + scrollY - 32 +
      Math.max(0, target.offsetHeight - innerHeight) * progress);
  };
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', event => {
      const target = document.getElementById(anchor.hash.slice(1));
      if (!target) return;
      event.preventDefault();
      const top = window.__go(target.id);
      if (lenis) lenis.scrollTo(top);
      else window.scrollTo({ top, behavior: motionQuery.matches ? 'instant' : 'smooth' });
      history.replaceState(null, '', anchor.hash);
      focusTarget(target);
    });
  });

  const found = new Map();
  const imageIndex = fetch('images/').then(response => response.ok ? response.text() : '')
    .then(html => /<title>Directory listing/.test(html)
      ? new Set([...html.matchAll(/href="([^"]+)"/g)].map(match => 'images/' + decodeURIComponent(match[1])))
      : null).catch(() => null);

  function findPhoto(base) {
    if (!found.has(base)) {
      found.set(base, imageIndex.then(async index => {
        for (const format of CONFIG.photoFormats) {
          const source = base + '.' + format;
          if (index && !index.has(source)) continue;
          const exists = await new Promise(resolve => {
            const photo = new Image();
            photo.onload = () => resolve(true);
            photo.onerror = () => resolve(false);
            photo.src = source;
          });
          if (exists) return source;
        }
        return null;
      }));
    }
    return found.get(base);
  }

  document.querySelectorAll('.slot[data-file]').forEach(async slot => {
    const source = await findPhoto(slot.dataset.file);
    if (!source) return;
    const photo = slot.querySelector('img') || new Image();
    photo.alt = slot.dataset.alt || photo.alt;
    photo.decoding = 'async';
    photo.src = source;
    if (!photo.parentElement) {
      photo.loading = 'lazy';
      slot.prepend(photo);
    }
    slot.hidden = false;
    slot.classList.add('has-photo');
    const gallery = slot.closest('.map-gallery');
    if (gallery) gallery.hidden = false;
    if (CONFIG.photoLabels) {
      const label = document.createElement('span');
      label.className = 'slot-tag';
      label.textContent = source;
      label.setAttribute('aria-hidden', 'true');
      slot.append(label);
    }
    if (slot.dataset.file === 'images/logo') document.querySelector('.gate-logo').src = source;
    window.ScrollTrigger?.refresh();
  });

  const trailer = document.querySelector('.trailer-frame');
  const videoID = CONFIG.trailerYouTubeID || trailer.dataset.youtube;
  if (/^[\w-]{11}$/.test(videoID)) {
    document.querySelector('#trailer').hidden = false;
    trailer.querySelector('button').addEventListener('click', () => {
      setSound(false);
      const player = document.createElement('iframe');
      player.src = 'https://www.youtube-nocookie.com/embed/' + videoID + '?autoplay=1';
      player.title = 'Containment Breach game trailer';
      player.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      player.allowFullscreen = true;
      trailer.replaceChildren(player);
      player.focus();
    });
  }
  CONFIG.officialLinks.forEach(({ label, url }) => {
    try {
      const address = new URL(url);
      if (address.protocol !== 'https:' || !label?.trim()) return;
      const anchor = document.createElement('a');
      anchor.className = 'btn';
      anchor.href = address.href;
      anchor.textContent = label;
      document.querySelector('.official-actions').append(anchor);
      document.querySelector('#official').hidden = false;
    } catch {}
  });

  let returning = false;
  try { returning = sessionStorage.getItem('containment-breach-entered') === 'true'; } catch {}
  if (returning) enter(false, false);
  else gate.querySelector('[data-enter="sound"]').focus();
})();
