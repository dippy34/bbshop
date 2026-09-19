// Screenshot a page at several scroll positions with headless Chrome (no installs needed).
// usage: node shoot.mjs <url> <outPrefix> <width> <height> <mobile 0|1> <pos...>
//   pos: "123" px | "vh:2.5" | "go:<sectionId>:<progress 0-1>" (uses window.__go from the site)
import { spawn } from 'node:child_process';
import { writeFileSync, mkdtempSync, rmSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const [url, prefix, w, h, mobile, ...positions] = process.argv.slice(2);
mkdirSync(path.dirname(prefix), { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const port = 9400 + Math.floor(Math.random() * 500);
const profile = mkdtempSync(path.join(process.env.TMPDIR || '/tmp', 'shoot-'));
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  ...(process.env.QA_NO_WEBGL ? ['--disable-webgl'] : []),
  '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--mute-audio', 'about:blank'
], { stdio: 'ignore' });

let wsUrl;
for (let i = 0; i < 100 && !wsUrl; i++) {
  try { const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); wsUrl = list.find(t => t.type === 'page' && t.url === 'about:blank')?.webSocketDebuggerUrl; } catch {}
  if (!wsUrl) await sleep(100);
}
if (!wsUrl) { console.error('chrome did not start'); process.exit(1); }

const ws = new WebSocket(wsUrl);
await new Promise(r => ws.addEventListener('open', r, { once: true }));
let seq = 0; const pending = new Map(); const waiters = []; const problems = [];
ws.addEventListener('message', e => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
  if (m.method === 'Runtime.exceptionThrown') problems.push('EXCEPTION: ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
  if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(m.params.type)) problems.push(m.params.type.toUpperCase() + ': ' + m.params.args.map(a => a.value ?? a.description).join(' '));
  if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') problems.push('LOG: ' + m.params.entry.text + ' ' + (m.params.entry.url || ''));
  waiters.forEach(wt => wt(m));
});
const send = (method, params = {}) => new Promise(res => { const id = ++seq; pending.set(id, res); ws.send(JSON.stringify({ id, method, params })); });
const waitFor = method => new Promise(res => { const fn = m => { if (m.method === method) { waiters.splice(waiters.indexOf(fn), 1); res(m); } }; waiters.push(fn); });

if (process.env.QA_REDUCED) await send('Emulation.setEmulatedMedia', { features: [{name:'prefers-reduced-motion', value:'reduce'}] });
await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable');
await send('Emulation.setDeviceMetricsOverride', { width: +w, height: +h, deviceScaleFactor: 1, mobile: mobile === '1' });
if (mobile === '1') await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
const loaded = waitFor('Page.loadEventFired');
const navigation = await send('Page.navigate', { url });
if (navigation.result?.errorText) { ws.close(); chrome.kill(); throw new Error(navigation.result.errorText); }
await Promise.race([loaded, sleep(20000).then(()=>{throw new Error('Page load timeout');})]);
const enter = async () => { for (let i = 0; i < 120; i++) { const b = document.querySelector('[data-enter="mute"]'); if (!b) return 'no gate'; if (!b.disabled) { b.click(); return 'entered after ' + i * 250 + 'ms'; } await new Promise(r => setTimeout(r, 250)); } return 'gate never opened'; };
const g = await send('Runtime.evaluate', { expression: `(${enter})()`, awaitPromise: true });
console.log('gate:', g.result?.result?.value);
if (g.result?.result?.value === 'no gate') { ws.close(); chrome.kill(); throw new Error('Expected entry gate was not found'); }
await sleep(2600);


const scrollFn = async pos => {
  let y;
  if (pos.startsWith('vh:')) y = parseFloat(pos.slice(3)) * innerHeight;
  else if (pos.startsWith('go:')) { const [, id, p] = pos.split(':'); y = window.__go ? window.__go(id, parseFloat(p)) : 0; }
  else y = parseFloat(pos);
  if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true, force: true }); else window.scrollTo(0, y);
  await new Promise(r => setTimeout(r, 60));
  window.ScrollTrigger && window.ScrollTrigger.update();
  return Math.round(y);
};
for (const [i, pos] of positions.entries()) {
  const r = await send('Runtime.evaluate', { expression: `(${scrollFn})(${JSON.stringify(pos)})`, awaitPromise: true });
  await sleep(1100);
  const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 80 });
  const file = `${prefix}-${String(i).padStart(2, '0')}.jpg`;
  writeFileSync(file, Buffer.from(shot.result.data, 'base64'));
  const audit = await send('Runtime.evaluate', { expression: `JSON.stringify({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,scrollY,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,visibleSections:[...document.querySelectorAll('main section')].filter(section=>{const rect=section.getBoundingClientRect();return !section.hidden&&rect.bottom>0&&rect.top<innerHeight}).map(section=>section.id),images:[...document.images].map(photo=>({src:photo.getAttribute('src'),loaded:photo.complete&&photo.naturalWidth>0,alt:photo.alt}))})` });
  writeFileSync(file.replace('.jpg','.json'), audit.result?.result?.value || '{}');
  console.log(file, pos, '→ y', r.result?.result?.value);
}
console.log(problems.length ? 'PROBLEMS:\n' + [...new Set(problems)].join('\n') : 'no console errors');
ws.close(); chrome.kill(); try { rmSync(profile, { recursive: true, force: true }); } catch {}
process.exit(problems.length ? 1 : 0);
