// Screenshot a page at several scroll positions with headless Chrome (no installs needed).
// usage: node shoot.mjs <url> <outPrefix> <width> <height> <mobile 0|1> <pos...>
//   pos: "123" px | "vh:2.5" | "go:<sectionId>:<progress 0-1>" (uses window.__go from the site)
import { spawn } from 'node:child_process';
import { writeFileSync, mkdtempSync, rmSync, readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const [url, prefix, w, h, mobile] = process.argv.slice(2);
mkdirSync(path.dirname(prefix), { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const port = 9400 + Math.floor(Math.random() * 500);
const profile = mkdtempSync(path.join(process.env.TMPDIR || '/tmp', 'shoot-'));
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
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
  if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error' ) problems.push('LOG: ' + m.params.entry.text + ' ' + (m.params.entry.url || ''));
  waiters.forEach(wt => wt(m));
});
const send = (method, params = {}) => new Promise(res => { const id = ++seq; pending.set(id, res); ws.send(JSON.stringify({ id, method, params })); });
const waitFor = method => new Promise(res => { const fn = m => { if (m.method === method) { waiters.splice(waiters.indexOf(fn), 1); res(m); } }; waiters.push(fn); });

if (process.env.QA_REDUCED) await send('Emulation.setEmulatedMedia', { features: [{name:'prefers-reduced-motion', value:'reduce'}] });
await send('Page.bringToFront');
await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable');
await send('Emulation.setDeviceMetricsOverride', { width: +w, height: +h, deviceScaleFactor: 1, mobile: mobile === '1' });
if (mobile === '1') await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
const loaded = waitFor('Page.loadEventFired');
await send('Page.navigate', { url });
await Promise.race([loaded, sleep(20000).then(()=>{throw new Error('Page load timeout');})]);

const checks = [];
const evaluate = async expression => {
  const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true });
  if (response.result?.exceptionDetails) throw new Error(response.result.exceptionDetails.exception?.description);
  return response.result.result.value;
};
const check = async (name, expression) => {
  const result = await evaluate(expression);
  checks.push({ name, result });
  console.log(name, JSON.stringify(result));
};
const key = async (value, code, shift = false) => {
  const params = {key:value,code:value,windowsVirtualKeyCode:code,nativeVirtualKeyCode:code,modifiers:shift?8:0};
  await send('Input.dispatchKeyEvent',{...params,type:'keyDown'});
  await send('Input.dispatchKeyEvent',{...params,type:'keyUp'});
};
await check('Gate isolates background and focuses entry', "document.querySelector('main').inert && document.activeElement.matches('[data-enter]')");
await check('Entry logo preserves artwork proportions', "(()=>{const photo=document.querySelector('.gate-logo');const rect=photo.getBoundingClientRect();return Math.abs(rect.width/rect.height-photo.naturalWidth/photo.naturalHeight)<.01})()");
await key('Tab', 9, true);
await check('Gate wraps backward keyboard focus', "document.activeElement.matches('[data-enter=\"mute\"]')");
await key('Tab', 9);
await check('Gate wraps forward keyboard focus', "document.activeElement.matches('[data-enter=\"sound\"]')");
await key('Escape', 27);
await check('Escape enters silently', "document.documentElement.classList.contains('entered') && !Sound.on && !document.querySelector('main').inert && document.querySelector('.gate').hidden");
await evaluate("document.querySelector('.sound-toggle').click()");
await check('Sound starts only on request', "Sound.on && document.querySelector('.sound-toggle').getAttribute('aria-pressed') === 'true'");
await evaluate("document.querySelector('.sound-toggle').click()");
await check('Sound control mutes', "!Sound.on && document.querySelector('.sound-toggle').getAttribute('aria-pressed') === 'false'");
await sleep(900);
await check('All internal links resolve', "[...document.querySelectorAll('a[href^=\"#\"]')].every(anchor => document.getElementById(anchor.hash.slice(1)))");
await evaluate("document.querySelector('.hero-actions a[href=\"#bonegrit\"]').click()");
await sleep(1200);
await check('Entity navigation scrolls and moves focus', "document.activeElement.id === 'bonegrit' && Math.abs(document.querySelector('#bonegrit').getBoundingClientRect().top - 32) < 5");
await check('No horizontal overflow', "document.documentElement.scrollWidth <= innerWidth");
await check('Provided images load with descriptions', "[...document.images].filter(photo => photo.getBoundingClientRect().height > 0).every(photo => photo.complete && photo.naturalWidth > 0 && photo.alt.trim())");
await check('Page logos preserve artwork proportions', "[...document.querySelectorAll('img[src*=\"logo\"]')].filter(photo=>photo.getBoundingClientRect().height>0).every(photo=>{const rect=photo.getBoundingClientRect();return Math.abs(rect.width/rect.height-photo.naturalWidth/photo.naturalHeight)<.01})");
await check('Unique element IDs', "(()=>{const ids=[...document.querySelectorAll('[id]')].map(element=>element.id);return new Set(ids).size===ids.length})()");
await check('Unsupported sections remain hidden', "['trailer','official'].every(id=>document.getElementById(id).hidden) && document.querySelector('.map-gallery').hidden");
await check('Correct game name and no old claims', "document.title.startsWith('Containment Breach') && !/backrooms|the hum|stalker|smiler|crawler|partygoer|night vision|camcorder|spring 2027|four.player|microphone/i.test(document.querySelector('main').innerText)");
const lore = "Bonegrit was a normal monke, very healthy. But he was soon taken out by the virus, the one that wiped out most people. He held onto some medication beforehand, but it was contaminated with parasites. Bonegrit had nothing to lose, so he took some to knock him out instantly. Instead, the parasites and the virus worked together to eat around his head. Bonegrit is now blind and deaf. He gets nutrients by absorbing blood through his skin. He only knows you're there because of vibrations through the ground.";
await check('Bonegrit lore matches owner text exactly', "document.querySelector('.lore-copy').textContent.replace(/\\s+/g,' ').trim() === " + JSON.stringify(lore));
await send('Emulation.setEmulatedMedia', { features: [{name:'prefers-reduced-motion', value:'reduce'}] });
await sleep(150);
await check('Reduced motion disables smooth scrolling', "document.documentElement.classList.contains('no-motion') && !window.__lenis && ScrollTrigger.getAll().length === 0");
await evaluate("document.querySelector('.footer a[href=\"#home\"]').click()");
await check('Reduced motion keeps navigation usable', "document.activeElement.id === 'home' && scrollY === 0");
if (process.env.QA_AXE) {
  await evaluate(readFileSync(process.env.QA_AXE, 'utf8'));
  const violations = await evaluate("axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}).then(result=>result.violations.map(violation=>({id:violation.id,impact:violation.impact,nodes:violation.nodes.map(node=>({target:node.target,summary:node.failureSummary}))})))");
  checks.push({name:'Accessibility audit',result:violations.length===0,violations});
  console.log('Accessibility violations', JSON.stringify(violations));
}
const reload = waitFor('Page.loadEventFired');
await send('Page.reload');
await reload;
await check('Return visit skips gate and stays silent', "document.querySelector('.gate').hidden && !Sound.on");
await send('Emulation.setScriptExecutionDisabled', {value:true});
const staticReload = waitFor('Page.loadEventFired');
await send('Page.reload');
await staticReload;
await check('No-JavaScript content remains accessible', "document.documentElement.classList.contains('no-js') && getComputedStyle(document.querySelector('.gate')).display === 'none' && document.querySelector('.lore-copy').getBoundingClientRect().height > 0");
const result = { checks, problems:[...new Set(problems)] };
writeFileSync(prefix + '.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify({passed:checks.filter(check=>check.result===true).length,total:checks.length,problems:result.problems}));
ws.close();
chrome.kill();
try { rmSync(profile, {recursive:true,force:true}); } catch {}
process.exit(checks.every(check=>check.result===true) && !problems.length ? 0 : 1);
