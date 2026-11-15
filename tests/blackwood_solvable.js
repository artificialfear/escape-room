global.window = {}; global.CARDS = [];
require(require('path').join(__dirname, '..', 'js', 'blackwood.js'));
const { generate, SUSPECTS, S } = window.BWData;
let bad = 0, kc = {}, mt = {};
for (let seed = 1; seed < 5000; seed++) {
  const g = generate(seed * 7919);
  const all = [...g.items.servants, ...g.items.bells, ...g.items.memory];
  const liars = [...new Set(all.filter((i) => i.kind.startsWith('liar')).map((i) => i.s))].sort();
  const okT = new Set(all.filter((i) => i.kind === 'okT').map((i) => i.s));
  const cand = SUSPECTS.filter((s) => !okT.has(s.id) && s.hand === S[g.K].hand && s.boot === S[g.K].boot).map((s) => s.id);
  const rooms = SUSPECTS.map((s) => g.claims[s.id].t);
  const roomOk = new Set(rooms).size === rooms.length;
  const traitsMatter = SUSPECTS.some((s) => s.id !== g.K && !okT.has(s.id));
  if (JSON.stringify(liars) !== JSON.stringify([g.K, g.F].sort()) || cand.length !== 1 || cand[0] !== g.K || !roomOk || okT.has(g.K)) { bad++; if (bad < 5) console.log('BAD', seed, g.K, g.F, liars, cand); }
  kc[g.K] = (kc[g.K] || 0) + 1; mt[traitsMatter] = (mt[traitsMatter] || 0) + 1;
}
console.log('bad', bad, kc, 'traits needed:', mt);
// no impossible presence
let conflicts = 0;
for (let seed = 1; seed < 5000; seed++) {
  const g = window.BWData.generate(seed * 7919);
  for (const src of ['servants', 'bells', 'memory']) {
    const seen = {};
    for (const it of g.items[src]) { const k = it.when + '|' + it.w.n; if (seen[k]) conflicts++; seen[k] = 1; }
  }
  const all = [...g.items.servants, ...g.items.bells, ...g.items.memory];
  if (!all.some((i) => i.kind === 'liarT') || !all.some((i) => i.kind === 'liarL')) conflicts += 1000;
  const okT = new Set(all.filter((i) => i.kind === 'okT').map((i) => i.s));
  g.matches.forEach((m) => { if (!okT.has(m)) conflicts += 100; });
}
console.log('conflicts', conflicts);
