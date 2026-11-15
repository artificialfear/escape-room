// Custom sounds: the game uses your own audio files when you add them, and falls back to built-in sounds otherwise.
// Where files come from (first match wins):
//   1. Files added on the Soundboard page (stored in this browser's IndexedDB on this computer)
//   2. Files in the repo's sounds/ folder named <slot id>.mp3 / .m4a / .ogg / .wav
(function () {
  const SLOTS = [
    { id: 'music_title', kind: 'music', loop: true, label: 'Title music', desc: 'Plays on the join screen before the game starts. Mysterious, inviting. Loops. (Built-in: silence.)' },
    { id: 'music_hiding', kind: 'music', loop: true, label: 'Hiding music', desc: 'Plays while each of you hides your pages. Sneaky, tiptoeing tension. Loops.' },
    { id: 'music_act1', kind: 'music', loop: true, label: 'Act I background', desc: 'Underscore for the first third of the game. Dark, sparse, eerie. Loops. Keep it quiet and not too busy, since you’ll be reading and talking over it.' },
    { id: 'music_act2', kind: 'music', loop: true, label: 'Act II background', desc: 'Underscore for the middle third. More unsettled than Act I. Loops. The game automatically turns this down very low during listening moments.' },
    { id: 'music_act3', kind: 'music', loop: true, label: 'Act III background', desc: 'Underscore for the final third. Building dread toward a climax. Loops. Also gets turned down automatically at times.' },
    { id: 'music_ending', kind: 'music', loop: false, label: 'Ending music', desc: 'Plays once over the ending and score screen. Bittersweet, peaceful release. Does not loop. Starts a few seconds after the ending begins.' },
    { id: 'sfx_transition', kind: 'sfx', label: 'Scene transition', desc: 'Plays as new scenes begin. A ghostly whoosh or swell, about 2 seconds.' },
    { id: 'sfx_solve', kind: 'sfx', label: 'Puzzle solved', desc: 'Short eerie/magical success sting, 1–3 seconds.' },
    { id: 'sfx_climax', kind: 'sfx', label: 'Climax sting', desc: 'The biggest success moment of the night. Grand and haunting, 3–6 seconds.' },
    { id: 'sfx_wrong', kind: 'sfx', label: 'Wrong answer', desc: 'Low, ominous fail sound, under 1 second.' },
    { id: 'sfx_reset', kind: 'sfx', label: 'Fizzle', desc: 'A tiny, subtle “fizzle” when a streak of inputs gets broken partway. Very short.' },
    { id: 'sfx_progress', kind: 'sfx', label: 'Small progress', desc: 'A small ding or shimmer when one of you finishes your part of something.' },
    { id: 'sfx_page', kind: 'sfx', label: 'Page found', desc: 'Plays on the TV when someone finds a hidden page. Paper rustle + shimmer, about 2 seconds.' },
    { id: 'sfx_hint', kind: 'sfx', label: 'Hint appears', desc: 'A whisper or breathy swell when a hint shows on the TV, about 2 seconds.' },
    { id: 'sfx_heartbeat', kind: 'sfx', label: 'Heartbeat', desc: 'A heavy double heartbeat for tense moments.' },
    { id: 'sfx_house1', kind: 'sfx', label: 'House noise 1', desc: 'Played at random every so often during the game: a creak, a distant knock, settling floorboards. Short and quiet.' },
    { id: 'sfx_house2', kind: 'sfx', label: 'House noise 2', desc: 'Another random house noise, for variety.' },
    { id: 'sfx_house3', kind: 'sfx', label: 'House noise 3', desc: 'Another random house noise, for variety.' },
    { id: 'sfx_test', kind: 'sfx', label: 'TV sound test', desc: 'Played when a phone taps “Test TV sound” in the lobby.' },
  ];
  const EXTS = ['mp3', 'm4a', 'ogg', 'wav'];
  const SET_KEY = 'lr-sound-settings';
  const DB = 'lr-sounds', STORE = 'files';

  // ---------- settings ----------
  let settings = { music: 0.6, sfx: 1, vol: {} };
  try { settings = Object.assign(settings, JSON.parse(localStorage.getItem(SET_KEY) || '{}')); } catch (e) {}
  function saveSettings() { try { localStorage.setItem(SET_KEY, JSON.stringify(settings)); } catch (e) {} }
  const slotVol = (id) => (settings.vol[id] != null ? settings.vol[id] : 1);

  // ---------- IndexedDB ----------
  function idb() {
    return new Promise((res, rej) => {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE);
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
  }
  async function tx(mode, fn) {
    const db = await idb();
    return new Promise((res, rej) => { const t = db.transaction(STORE, mode); const st = t.objectStore(STORE); const r = fn(st); t.oncomplete = () => res(r && r.result); t.onerror = () => rej(t.error); });
  }
  const getLocal = (id) => tx('readonly', (s) => s.get(id));
  const putLocal = (id, blob, name) => tx('readwrite', (s) => s.put({ blob, name }, id));
  const delLocal = (id) => tx('readwrite', (s) => s.delete(id));

  // List the repo's sounds/ folder once (GitHub API on the live site; sounds/manifest.json as a fallback).
  let listing = null;
  function repoListing() {
    if (listing) return listing;
    listing = (async () => {
      const names = new Set();
      const m = location.hostname.match(/^([^.]+)\.github\.io$/);
      const repo = location.pathname.split('/').filter(Boolean)[0];
      if (m && repo) {
        try {
          const r = await fetch(`https://api.github.com/repos/${m[1]}/${repo}/contents/sounds`, { cache: 'no-cache' });
          if (r.ok) { (await r.json()).forEach((f) => f.type === 'file' && names.add(f.name)); return names; }
        } catch (e) {}
      }
      try { const r = await fetch('sounds/manifest.json', { cache: 'no-cache' }); if (r.ok) (await r.json()).forEach((n) => names.add(n)); } catch (e) {}
      return names;
    })();
    return listing;
  }
  async function probeRepo(id) {
    const names = await repoListing();
    for (const ext of EXTS) if (names.has(`${id}.${ext}`)) return { url: `sounds/${id}.${ext}`, name: `${id}.${ext}` };
    return null;
  }

  // ---------- bank ----------
  const bank = {}; // id -> { src: 'local'|'repo', url, name, buffer }
  let ready = false; const readyFns = [];
  async function loadSlot(slot) {
    if (cur && cur.id === slot.id) stopMusic(0.3);
    if (bank[slot.id] && bank[slot.id].src === 'local') URL.revokeObjectURL(bank[slot.id].url);
    delete bank[slot.id];
    let entry = null;
    try { const loc = await getLocal(slot.id); if (loc && loc.blob) entry = { src: 'local', url: URL.createObjectURL(loc.blob), name: loc.name }; } catch (e) {}
    if (!entry) { const rep = await probeRepo(slot.id); if (rep) entry = Object.assign({ src: 'repo' }, rep); }
    if (!entry) return null;
    if (slot.kind === 'sfx') {
      try { const ab = await (await fetch(entry.url)).arrayBuffer(); entry.buffer = await Sound.ctx().decodeAudioData(ab); }
      catch (e) { console.warn('Could not decode', slot.id, e); entry.error = 'Could not read this file'; }
    }
    bank[slot.id] = entry;
    return entry;
  }
  async function loadAll() {
    try { const r = await fetch('sounds/loops.json', { cache: 'no-cache' }); if (r.ok) loopInfo = await r.json(); } catch (e) {}
    await Promise.all(SLOTS.map(loadSlot));
    ready = true; readyFns.splice(0).forEach((f) => f());
  }
  function onReady(f) { ready ? f() : readyFns.push(f); }
  const has = (id) => !!(bank[id] && !bank[id].error);

  // ---------- playback ----------
  function sfx(id, volMult = 1) {
    const e = bank[id]; if (!e || !e.buffer) return false;
    const c = Sound.ctx();
    const src = c.createBufferSource(); src.buffer = e.buffer;
    const g = c.createGain(); g.gain.value = settings.sfx * slotVol(id) * volMult;
    src.connect(g); g.connect(Sound.master()); src.start();
    return src;
  }
  // Music plays from decoded buffers so loop points (sounds/loops.json) are sample-accurate and gapless.
  let loopInfo = {};
  let cur = null; // { id, src, gain, token }
  let duckLevel = 1;
  function musicLevel(id) { return settings.music * slotVol(id) * duckLevel; }
  function loopFor(id) { const e = bank[id]; return e && e.src === 'repo' ? loopInfo[id] || null : null; }
  function decodeMusic(id) {
    const e = bank[id];
    if (!e.bufP) e.bufP = fetch(e.url).then((r) => r.arrayBuffer()).then((ab) => Sound.ctx().decodeAudioData(ab));
    return e.bufP;
  }
  async function music(id, opts = {}) {
    if (cur && cur.id === id && !opts.restart) { setDuck(duckLevel); return true; }
    stopMusic(opts.restart ? 0.2 : 1.5);
    const e = bank[id]; if (!e || e.error) return false;
    const token = {}; cur = { id, token };
    let buf;
    try { buf = await decodeMusic(id); } catch (err) { console.warn('Could not decode', id, err); e.error = 'Could not read this file'; if (cur && cur.token === token) cur = null; return false; }
    if (!cur || cur.token !== token) return false; // something else started meanwhile
    // free memory held by tracks that aren't playing
    SLOTS.forEach((s) => { if (s.kind === 'music' && s.id !== id && bank[s.id]) delete bank[s.id].bufP; });
    const c = Sound.ctx(), slot = SLOTS.find((s) => s.id === id), lp = loopFor(id);
    const src = c.createBufferSource(); src.buffer = buf;
    if (slot.loop) { src.loop = true; if (lp) { src.loopStart = Math.min(lp.start, buf.duration); src.loopEnd = Math.min(lp.end, buf.duration); } }
    const g = c.createGain(); g.gain.value = 0.0001;
    src.connect(g); g.connect(Sound.master());
    src.start(0, Math.max(0, Math.min(opts.offset || 0, buf.duration - 0.1)));
    g.gain.setTargetAtTime(Math.max(0.0001, musicLevel(id)), c.currentTime, opts.offset ? 0.05 : 0.6);
    cur = { id, src, gain: g, token };
    src.onended = () => { if (cur && cur.src === src) cur = null; };
    return true;
  }
  function stopMusic(fade = 1.5) {
    if (!cur) return;
    const { src, gain } = cur; cur = null;
    if (!src) return;
    const c = Sound.ctx();
    gain.gain.cancelScheduledValues(c.currentTime);
    gain.gain.setTargetAtTime(0.0001, c.currentTime, fade / 3);
    setTimeout(() => { try { src.stop(); } catch (e) {} }, fade * 1000 + 200);
  }
  function setDuck(level) {
    duckLevel = level;
    if (cur && cur.gain) { const c = Sound.ctx(); cur.gain.gain.cancelScheduledValues(c.currentTime); cur.gain.gain.setTargetAtTime(Math.max(0.0001, musicLevel(cur.id)), c.currentTime, 0.5); }
  }
  function playingId() { return cur ? cur.id : null; }

  // Live updates from the Soundboard page (same computer, same browser)
  let chan = null;
  try {
    chan = new BroadcastChannel('lr-soundboard');
    chan.onmessage = async (e) => {
      const m = e.data || {};
      if (m.t === 'settings') { try { Object.assign(settings, JSON.parse(localStorage.getItem(SET_KEY) || '{}')); } catch (err) {} setDuck(duckLevel); }
      if (m.t === 'slot') { const slot = SLOTS.find((s) => s.id === m.id); if (slot) { await loadSlot(slot); AudioBank.onChange && AudioBank.onChange(slot); } }
    };
  } catch (e) {}
  function announce(msg) { try { chan && chan.postMessage(msg); } catch (e) {} }

  window.AudioBank = { announce, loopFor, SLOTS, settings, saveSettings, slotVol, loadAll, loadSlot, onReady, has, bank, sfx, music, stopMusic, setDuck, playingId, putLocal, delLocal };
})();
