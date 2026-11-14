// Checks the piece's tunes against a catalogue of existing music, to see how original they are.
//
//   node tools/music/tune-check.mjs [path/to/score.mjs]
//
// The catalogue is RISM Online (https://rism.online): the opening themes ("incipits") of well over a million
// pieces of music surviving from roughly 1600 to 1850, searchable by melody. Matching is by the pattern of
// steps and leaps between notes, so key and rhythm do not matter: it answers "does any catalogued piece
// open with these notes in this order?". Short runs always match something (scales and chords belong to
// everyone); what matters is how long a run is shared.
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const { THEMES } = await import(process.argv[2] ? pathToFileURL(path.resolve(process.argv[2])).href : './score.mjs');

const pae = notes => {   // RISM's "Plaine & Easie" spelling: ' marks the octave, x is a sharp, b a flat
  let out = '', octave = null;
  for (const note of notes) {
    const [, letter, accidental, number] = note.match(/^([A-G])([b#]?)(\d)$/);
    if (+number !== octave) { out += +number >= 4 ? "'".repeat(number - 3) : ','.repeat(4 - number); octave = +number; }
    out += ({ b: 'b', '#': 'x', '': '' })[accidental] + letter;
  }
  return out;
};
const asked = new Map();
async function search(notes) {
  const query = pae(notes);
  if (!asked.has(query)) {
    const reply = await fetch('https://rism.online/search?' + new URLSearchParams({ mode: 'incipits', im: 'intervals', rows: '20', n: query }), { headers: { Accept: 'application/ld+json', 'User-Agent': 'tune-check/1.0' } });
    if (!reply.ok) throw new Error(`RISM Online answered ${reply.status}`);
    asked.set(query, await reply.json());
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  return asked.get(query);
}
const plain = value => { while (value && typeof value === 'object') value = Array.isArray(value) ? value[0] : value.value ?? value.en ?? value.none ?? Object.values(value)[0]; return value ?? ''; };
const describe = item => `${plain(item.summary?.incipitComposer) || 'Anonymous'} — ${plain(item.summary?.sourceTitle)}`;

for (const [name, notes] of Object.entries(THEMES)) {
  console.log(`\n${name}\n  ${notes.join(' ')}`);
  const counts = [];
  for (let size = 5; size <= notes.length; size++) {
    counts.push([size, (await search(notes.slice(0, size))).totalItems]);
    if (!counts.at(-1)[1]) break;
  }
  console.log('  catalogued openings that share its first…  ' + counts.map(([size, count]) => `${size} notes: ${count.toLocaleString('en')}`).join(' · '));
  const shared = counts.filter(([, count]) => count).at(-1)?.[0] ?? 0;
  if (shared >= 8) for (const item of (await search(notes.slice(0, shared))).items.slice(0, 6)) console.log(`    shares the first ${shared}: ${describe(item)}`);
  let longest = 0;
  for (let size = notes.length; size > 5 && !longest; size--)
    for (let start = 0; start + size <= notes.length && !longest; start++)
      if ((await search(notes.slice(start, start + size))).totalItems) longest = size;
  console.log(`  longest run anywhere in it that some catalogued opening also contains: ${longest} of ${notes.length} notes`);
}
