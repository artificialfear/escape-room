// ⚠️ SPOILERS — Death at Blackwood Hall: the case, the clues, and the solution logic. Players: don't read this!
// The TV (host) runs this. Phones only ever receive their own "view".
(function () {
  const ROLES = ['mat', 'emily'];
  const NAME = { mat: 'Mat', emily: 'Emily' };
  const TITLE = { mat: 'Inspector', emily: 'Dr.' };
  const other = (r) => (r === 'mat' ? 'emily' : 'mat');
  const PHASES = ['lobby', 'hide', 'intro', 'roles', 'body', 'letter', 'hunt1', 'interview', 'diary', 'hunt2', 'accuse', 'end'];
  const PUZZLES = ['roles', 'body', 'letter', 'hunt1', 'interview', 'diary', 'hunt2', 'accuse'];

  const SUSPECTS = [
    { id: 'margaret', name: 'Lady Margaret Ashcombe', short: 'Lady Margaret', role: 'the victim’s wife', pro: 'she', hand: 'R', boot: 'S',
      handNote: 'pours the tea with her right hand, a ring on every finger', bootNote: 'small, narrow ankle boots with a little heel',
      motive: 'Edmund meant to divorce her and leave her with nothing.', secret: 'she had slipped into the garden to burn love letters from an old admirer before Edmund could find them' },
    { id: 'hale', name: 'Captain Julian Hale', short: 'Captain Hale', role: 'an old army friend', pro: 'he', hand: 'L', boot: 'L',
      handNote: 'lost two fingers of his right hand in Afghanistan, so he does everything with his left', bootNote: 'large, well-worn cavalry riding boots',
      motive: 'He owed Edmund a ruinous gambling debt, due on Monday.', secret: 'he was out in the garden burying a tin box of gambling IOUs' },
    { id: 'finch', name: 'Miss Clara Finch', short: 'Miss Finch', role: 'Lord Ashcombe’s private secretary', pro: 'she', hand: 'L', boot: 'S',
      handNote: 'writes with her left hand; her left cuff is always ink-stained', bootNote: 'small, neat lace-up boots',
      motive: 'Edmund had discovered she was forging his signature on cheques.', secret: 'she had crept out to the garden to meet the stable boy, whom she secretly loves' },
    { id: 'crane', name: 'Mr. Silas Crane', short: 'Mr. Crane', role: 'the family solicitor', pro: 'he', hand: 'R', boot: 'L',
      handNote: 'signs every document with a flourish of his right hand', bootNote: 'large, heavy galoshes over his town shoes',
      motive: 'He had been quietly embezzling from the estate for years.', secret: 'he was in the garden hiding the estate’s missing account books in the potting shed' },
    { id: 'pell', name: 'Mrs. Agnes Pell', short: 'Mrs. Pell', role: 'the housekeeper', pro: 'she', hand: 'R', boot: 'L',
      handNote: 'keeps the household keys on her right hip and pours with her right hand', bootNote: 'her late husband’s large, heavy boots, stuffed with newspaper',
      motive: 'After thirty years of service, Edmund was about to dismiss her without a pension.', secret: 'she was in the garden feeding a stray dog Lord Ashcombe had ordered drowned' },
    { id: 'jenkins', name: 'Mr. Thomas Jenkins', short: 'Jenkins', role: 'the butler', pro: 'he', hand: 'R', boot: 'L',
      handNote: 'right-handed; he carries the salver on his left arm to keep his right hand free', bootNote: 'large, polished black boots',
      motive: 'Edmund had learned he once served time in Newgate under another name.', secret: 'he was in the garden having a forbidden pipe in the rain' },
  ];
  const S = Object.fromEntries(SUSPECTS.map((s) => [s.id, s]));
  const cap = (t) => t[0].toUpperCase() + t.slice(1);

  const WEAPONS = [
    { id: 'poker', name: 'fireplace poker',
      wound: 'A single crushing blow to the back of the skull. There are flecks of <b>soot and ash</b> in the wound.',
      inv: ['Fireplace poker — in its stand, black with soot like the tongs beside it.', 'Fireplace poker — back in its stand, but <b>wiped spotlessly clean</b>, unlike the sooty tongs beside it.'],
      found: 'Wrapped in a wet rag behind a loose panel on the servants’ stair: the library’s <b>fireplace poker</b>. It has been wiped — but not well enough. There is blood on the hook.',
      act: 'struck him from behind with the fireplace poker, then wiped it and set it back in its stand' },
    { id: 'candlestick', name: 'brass candlestick',
      wound: 'A heavy blow to the temple. Spots of <b>old candle wax</b> are caught in his hair.',
      inv: ['Brass candlesticks (a pair) — both on the mantel, thick with old wax.', 'Brass candlesticks (a pair) — one stands on the mantel. <b>Its twin is missing.</b>'],
      found: 'Buried in the coal scuttle by the kitchen stove: the missing <b>brass candlestick</b>, its base dented and stained dark.',
      act: 'snatched a brass candlestick from the mantel and struck him on the temple' },
    { id: 'opener', name: 'silver letter opener',
      wound: 'One narrow stab wound beneath the ribs — a <b>thin, double-edged blade</b>.',
      inv: ['Silver letter opener — on the desk blotter, beside the inkwell.', 'Silver letter opener — <b>not on the desk</b>, where it always lies.'],
      found: 'Inside a hollowed-out book in the morning room: the <b>silver letter opener</b>, its blade wiped but still tacky.',
      act: 'took the silver letter opener from his own desk and stabbed him beneath the ribs' },
    { id: 'cord', name: 'curtain cord',
      wound: 'A thin band of bruising around the throat. A few <b>crimson velvet fibres</b> are caught in the skin.',
      inv: ['Velvet curtain cords (crimson) — both tiebacks in place.', 'Velvet curtain cords (crimson) — the left curtain hangs loose. <b>Its tieback cord is gone.</b>'],
      found: 'Stuffed down the back of a drawing room sofa: a <b>crimson velvet curtain cord</b>, twisted and frayed.',
      act: 'pulled the cord from the library curtain and strangled him from behind' },
  ];
  const W = Object.fromEntries(WEAPONS.map((w) => [w.id, w]));
  const ROOMS = ['Drawing room', 'Billiard room', 'Dining room', 'Morning room', 'Conservatory', 'Kitchen', 'Chapel', 'Gun room', 'Smoking room'];
  const WITNESSES = [{ n: 'Arthur', r: 'the footman' }, { n: 'Lucy', r: 'the housemaid' }, { n: 'Mrs. Dabney', r: 'the cook' }, { n: 'Will', r: 'the stable boy' }];

  // The torn letter: each line split between the two phones; the first letters spell the desk word
  const LETTERS = [
    { word: 'GREED', lines: [
      ['Greater fools than I have trusted', 'their households — but no longer.'],
      ['Ruin comes to this house from', 'within its own walls, I am certain.'],
      ['Every one of them smiles at my', 'table and counts my money in secret.'],
      ['Edward, tomorrow I change my will,', 'and the vultures will get nothing.'],
      ['Do not trust anyone here. My', 'desk opens only to the word these lines begin with.'],
    ] },
    { word: 'HEIRS', lines: [
      ['Harder than any war, brother, is', 'living among people who wait for you to die.'],
      ['Every face at my table hides', 'a reason to wish me gone.'],
      ['In the morning I shall change my will', 'and send the whole flock packing.'],
      ['Remember: if anything should befall me,', 'look to those closest, not to strangers.'],
      ['Seek my proofs in the desk. It opens', 'to the word that begins these lines.'],
    ] },
    { word: 'TRUTH', lines: [
      ['Tonight I finally know the', 'names of those who have betrayed me.'],
      ['Robbed, lied to, and flattered — I', 'have been a fool in my own house.'],
      ['Under this roof sit six people', 'who would be glad to see me buried.'],
      ['Tomorrow the will is rewritten, and', 'every one of them will learn the cost.'],
      ['Hide nothing from the police, Edward. My desk', 'keeps my proof, locked with the word my lines begin with.'],
    ] },
  ];
  const DIARIES = [
    { text: 'SOMEONE HAS COPIED THE KEY TO THE GARDEN DOOR', answer: 'DOOR', access: 'through the garden door with a copied key', after: 'So that is how the killer came and went unseen: a copied key to the library’s garden door.' },
    { text: 'THE SERVANTS STAIR LEADS STRAIGHT TO THE LIBRARY', answer: 'LIBRARY', access: 'up the servants’ stair, which leads straight to the library', after: 'The servants’ stair — a hidden way into the library that no one in the drawing room would see.' },
    { text: 'I WILL CHANGE MY WILL AT DAWN AND TELL NOBODY', answer: 'NOBODY', access: 'through the garden door, unseen in the storm', after: 'Lord Ashcombe told no one about the new will — yet someone knew. Someone who could read his letters.' },
  ];
  const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

  function rng(seed) { let a = seed >>> 0; return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const fmtT = (m) => { let h = Math.floor(m / 60) % 24; const mm = String(m % 60).padStart(2, '0'); const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return `${h}:${mm} ${ap}`; };
  const shiftText = (t, n) => t.replace(/[A-Z]/g, (c) => String.fromCharCode(((c.charCodeAt(0) - 65 + n) % 26) + 65));

  function generate(seed) {
    const r = rng(seed);
    const pick = (a) => a[Math.floor(r() * a.length)];
    const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const ids = SUSPECTS.map((s) => s.id);
    // the killer: weighted toward suspects who share both traits with others, so alibis matter
    const K = r() < 0.6 ? pick(['crane', 'pell', 'jenkins']) : pick(['margaret', 'hale', 'finch']);
    const innocents = ids.filter((x) => x !== K);
    const F = pick(innocents); // framed by the smashed watch: lied about 11:15
    const T = pick([21 * 60, 21 * 60 + 30, 22 * 60, 22 * 60 + 30]);
    const weapon = pick(WEAPONS).id;
    const letter = Math.floor(r() * LETTERS.length);
    const diary = Math.floor(r() * DIARIES.length);
    const shift = 3 + Math.floor(r() * 7);

    // statements: where each suspect says they were at T and at 11:15 (no two suspects claim the same room at T)
    const roomsT = shuffle(ROOMS);
    const claims = {};
    ids.forEach((s, i) => { const t = roomsT[i]; let l; do { l = pick(ROOMS); } while (l === t); claims[s] = { t, l }; });

    // who has to be cleared by an alibi (shares the killer's hand and boot), who can be cleared by traits alone
    const matches = innocents.filter((s) => S[s].hand === S[K].hand && S[s].boot === S[K].boot);
    const confirmT = new Set(matches);
    innocents.forEach((s) => { if (!matches.includes(s) && r() < 0.45) confirmT.add(s); });
    const nonMatch = innocents.filter((s) => !matches.includes(s));
    if (nonMatch.length && nonMatch.every((s) => confirmT.has(s))) confirmT.delete(pick(nonMatch)); // make the traits matter
    const confirmL = new Set(innocents.filter((s) => s !== F && r() < 0.3));

    // spread the testimony across three sources: the Inspector's servants, the bell-board log (hidden card), the Doctor's memory.
    // Nobody can be in two places at once: the Doctor remembers at most one thing per moment, and each witness appears once per moment.
    const items = { servants: [], bells: [], memory: [] };
    const used = {}; // "source|time" -> Set of witness names (or 'you')
    const free = (src, when) => { const k = src + '|' + when; used[k] = used[k] || new Set(); return src === 'memory' ? (used[k].size ? [] : ['you']) : WITNESSES.filter((w) => !used[k].has(w.n)); };
    const add = (prefer, kind, s, when) => {
      const order = [prefer, ...shuffle(['servants', 'bells', 'memory'].filter((x) => x !== prefer))];
      for (const src of order) {
        const opts = free(src, when);
        if (!opts.length) continue;
        const w = src === 'memory' ? { n: 'you', r: '' } : pick(opts);
        used[src + '|' + when].add(w.n);
        items[src].push({ kind, s, when, w });
        return true;
      }
      return false;
    };
    const sources = shuffle(['servants', 'bells', 'memory']);
    add(sources[0], 'liarT', K, T);
    add(sources[1], 'liarL', F, 23 * 60 + 15);
    shuffle([...confirmT]).forEach((s) => add(pick(['servants', 'bells', 'memory']), 'okT', s, T));
    [...confirmL].forEach((s) => add(pick(['servants', 'bells', 'memory']), 'okL', s, 23 * 60 + 15));
    Object.values(items).forEach((list) => list.sort((a, b) => a.when - b.when));
    return { K, F, T, weapon, letter, diary, shift, claims, confirmT: [...confirmT], matches, items };
  }

  // ---------- text builders ----------
  function testimony(it, claims, as) {
    const s = S[it.s], c = claims[it.s], w = it.w;
    const at = fmtT(it.when);
    if (as === 'servants') {
      switch (it.kind) {
        case 'liarT': return `<b>${w.n}</b>, ${w.r}: “I was laying the fire in the ${c.t.toLowerCase()} from ${fmtT(it.when - 30)} until well after ${at}. There was nobody else in there.”`;
        case 'liarL': return `<b>${w.n}</b>, ${w.r}: “At a quarter past eleven I saw ${s.short} out in the garden in the rain, with a lantern.”`;
        case 'okT': return `<b>${w.n}</b>, ${w.r}: “At ${at} I brought ${s.short} a pot of tea in the ${c.t.toLowerCase()}, and ${s.pro} was still there when I went back for the tray.”`;
        case 'okL': return `<b>${w.n}</b>, ${w.r}: “At a quarter past eleven, ${s.short} rang for more coal in the ${c.l.toLowerCase()}. I took it up myself.”`;
      }
    }
    if (as === 'bells') {
      switch (it.kind) {
        case 'liarT': return [at, `${w.n} sent to bank the fire in the ${c.t.toLowerCase()}: <b>room empty</b>, lamps out.`];
        case 'liarL': return ['11:15 PM', `Garden door bell. ${w.n}: ${s.short} came in <b>dripping wet from the garden</b>, wanting a towel.`];
        case 'okT': return [at, `${c.t} bell. ${w.n}: brandy for ${s.short}.`];
        case 'okL': return ['11:15 PM', `${c.l} bell. ${w.n}: more coal for ${s.short}.`];
      }
    }
    if (as === 'memory') {
      switch (it.kind) {
        case 'liarT': return `At ${at} you looked into the ${c.t.toLowerCase()} for a book. It was <b>empty and dark</b>.`;
        case 'liarL': return `At 11:15 PM, from your bedroom window, you saw <b>${s.short} crossing the lawn</b> with a lantern.`;
        case 'okT': return `At ${at} you were in the ${c.t.toLowerCase()} with ${s.short}, who complained of a headache. You stayed a good quarter of an hour.`;
        case 'okL': return `At 11:15 PM you passed ${s.short} in the ${c.l.toLowerCase()} and said goodnight.`;
      }
    }
  }
  const doc = (title, body) => `<div class="doc"><h4>${title}</h4>${body}</div>`;

  const STORY = {
    intro: { act: 'Prologue', title: 'Death at Blackwood Hall', text: [
      'Yorkshire, November 1893. A storm has battered the moors since nightfall, and the only bridge to the village has washed away.',
      'Six guests and servants are trapped at Blackwood Hall for the night — along with two more weekend guests: an inspector from Scotland Yard and a physician.',
      'At one o’clock in the morning, a scream wakes the house. <b>Lord Edmund Ashcombe</b> lies dead on the library floor.',
      'No one can leave. No one can send for help. The killer is still inside.',
    ] },
    roles: { act: 'I · The Library', title: 'The Investigators', text: ['Your phones hold your own notes and your own memories — and they are not the same.', 'Neither of you can solve this alone. Say everything out loud.'],
      after: 'Inspector and Doctor exchange a grim nod over the body. Outside, the thunder rolls on. The investigation begins.' },
    body: { act: 'I · The Library', title: 'The Body', text: ['Lord Ashcombe lies face-down beside his desk. His gold pocket watch lies smashed beside him, its hands frozen.', 'The fire has burned down to embers.'],
      after: (g) => `The Doctor is certain: Lord Ashcombe died at <b>${fmtT(g.T)}</b> — long before the time on the smashed watch.<br>Someone broke that watch to tell a lie.` },
    letter: { act: 'I · The Library', title: 'The Torn Letter', text: ['Half-burned in the grate: a letter in Lord Ashcombe’s hand to his brother Edward — torn clean down the middle.', 'One half lies on the hearth. The other was kicked under the desk.'],
      after: 'The desk drawer clicks open. Inside: an unsigned new will — and a list in Lord Ashcombe’s hand of every grudge in the house.<br><b>Everyone here had a reason to want him dead.</b> (Their motives are in your casebooks.)' },
    hunt1: { act: 'II · The House', title: 'The Search', text: ['The household is herded into the drawing room under the Captain’s watch. While they wait, you search the house.', 'Something was left for each of you to find. Follow your phones, and scan the evidence when you find it.'],
      after: 'Two new pieces of evidence for the casebooks. Now it’s time to hear what the household has to say for itself.' },
    interview: { act: 'II · The House', title: 'The Statements', text: ['One by one, the household gives its account of the night.'],
      after: (g) => `Two of them lied to your face: <b>${S[g.K].short}</b> and <b>${S[g.F].short}</b>.<br>But lying is not the same as murder.` },
    diary: { act: 'II · The House', title: 'The Diary', text: ['Beneath the will in the desk lies Lord Ashcombe’s private diary — every page written in cipher.'],
      after: (g) => DIARIES[g.diary].after },
    hunt2: { act: 'III · The Accusation', title: 'The Last Evidence', text: ['The storm is easing. Before dawn, two last pieces of evidence wait somewhere in the house.', 'Follow your phones.'],
      after: 'Everything you need is in your casebooks now. Gather the household in the library.' },
    accuse: { act: 'III · The Accusation', title: 'The Accusation', text: ['The household waits in the library. The fire has been relit. Every eye is on you.', 'Name the killer — and the weapon.'] },
    end: { act: 'Epilogue', title: 'Case Closed', text: [] },
  };

  const HINTS = {
    roles: () => ['Both of you, press and hold the button on your phone at the same time.', 'Keep holding together for a few seconds.'],
    body: (g) => ['The watch may be lying. The Doctor can measure something a killer can’t fake: the body’s temperature.', 'The body cools about 1.5 °F per hour from 98.6 °F. Work out how many hours before 1:00 AM he died.'],
    letter: (g) => ['Read the letter out loud together, line by line — one of you has the start of each line, the other has the end.', 'The last line tells you how the desk opens: take the first letter of each line.'],
    interview: (g) => ['Compare each statement on the TV with the testimony on the Inspector’s phone, the bell-board log, and the Doctor’s own memories. Two stories don’t hold up.', `One liar was caught out about ${fmtT(g.T)}; the other about 11:15 PM.`],
    diary: (g) => ['The Roman numeral on the clasp is the key. The Inspector’s cipher wheel shifts the whole alphabet.', `Set the wheel to ${g.shift}. Read each letter of the diary on the top row and write down the letter beneath it.`],
    accuse: (g) => ['The killer was in the library at the true time of death, wears the boots that left the print, and struck with the hand the glove was made for.', `Rule out everyone with a confirmed alibi at ${fmtT(g.T)}, then everyone whose boots or hand don’t match. One person remains. The weapon matches the Doctor’s findings.`],
  };

  class BWGame {
    constructor(saved) {
      this.listeners = {};
      this.st = saved && saved.v === 'bw1' ? saved : BWGame.fresh();
      this.st.conn = { mat: false, emily: false };
      if (this.st.p && this.st.p.hold) this.st.p.hold = { mat: 0, emily: 0 };
    }
    static fresh() {
      const seed = (Math.random() * 2 ** 31) | 0;
      return {
        v: 'bw1', seed, gen: generate(seed), phase: 'lobby', solved: false,
        ready: { mat: false, emily: false }, hideStep: 'mat', hides: {}, foundBy: {},
        startedAt: null, endedAt: null, paused: false, pausedAt: null, pausedTotal: 0, log: {}, hintLv: {}, hintsUsed: 0, skips: 0, wrong: 0,
        lastHint: null, p: {}, conn: { mat: false, emily: false }, accused: null,
      };
    }
    on(ev, fn) { (this.listeners[ev] = this.listeners[ev] || []).push(fn); }
    emit(ev, data) { (this.listeners[ev] || []).forEach((fn) => fn(data)); }
    get g() { return this.st.gen; }
    changed() { this.emit('change'); }
    sound(name, arg) { this.emit('sound', { name, arg }); }
    flash(role, kind, text) { this.emit('flash', { role, kind, text }); }

    elapsed(now = Date.now()) {
      const st = this.st; if (!st.startedAt) return 0;
      const end = st.endedAt || (st.paused ? st.pausedAt : now);
      return Math.max(0, (end - st.startedAt - (st.pausedTotal || 0)) / 1000);
    }
    canPause() { const st = this.st; return !!st.startedAt && !st.endedAt; }
    setPaused(on) {
      const st = this.st;
      if (on && !st.paused && this.canPause()) { st.paused = true; st.pausedAt = Date.now(); if (st.p.hold) st.p.hold = { mat: 0, emily: 0 }; }
      else if (!on && st.paused) { st.pausedTotal = (st.pausedTotal || 0) + (Date.now() - st.pausedAt); st.paused = false; st.pausedAt = null; }
      else return;
      this.emit('pause', st.paused); this.changed();
    }

    // ---- flow ----
    goto(phase) {
      const st = this.st;
      st.phase = phase; st.solved = false; st.p = {}; st.lastHint = null;
      if (phase === 'intro' && !st.startedAt) st.startedAt = Date.now();
      if (phase === 'roles') st.p.hold = { mat: 0, emily: 0 };
      if (['body', 'letter', 'interview', 'diary'].includes(phase)) st.p.tries = 0;
      if (PUZZLES.includes(phase)) { st.log[phase] = { start: this.elapsed(), end: null, hints: 0, skipped: false }; }
      if (phase === 'end') { if (st.paused) this.setPaused(false); st.endedAt = Date.now(); this.sound('ending'); }
      this.sound('enter', phase);
      if (phase === 'hunt1' || phase === 'hunt2') this.checkHunt();
      this.changed();
    }
    next() { const i = PHASES.indexOf(this.st.phase); if (i < PHASES.length - 1) this.goto(PHASES[i + 1]); }
    logEntry() { const st = this.st; return st.log[st.phase] || (st.log[st.phase] = { start: this.elapsed(), end: null, hints: 0, skipped: false }); }
    solve(skipped) {
      const st = this.st;
      if (st.solved) return;
      if (skipped) st.skips++;
      if (PUZZLES.includes(st.phase)) { const e = this.logEntry(); e.end = this.elapsed(); if (skipped) e.skipped = true; }
      if (st.phase === 'accuse') { st.accused = { killer: this.g.K, weapon: this.g.weapon }; this.sound('bigsolve'); this.goto('end'); return; }
      st.solved = true; st.lastHint = null;
      this.sound('solve');
      this.changed();
    }
    huntSlot() { return this.st.phase === 'hunt1' ? 'I' : 'II'; }
    huntTarget(seeker) { const hider = other(seeker); return CARDS.find((c) => c.hider === hider && c.slot === this.huntSlot()); }
    checkHunt() {
      if (!(this.st.phase === 'hunt1' || this.st.phase === 'hunt2') || this.st.solved) return;
      if (ROLES.every((r) => this.st.foundBy[this.huntTarget(r).code])) this.solve();
    }
    holdProgress() { const h = this.st.p.hold; if (!h || !h.mat || !h.emily) return 0; return Math.min(1, (Date.now() - Math.max(h.mat, h.emily)) / 3000); }
    tick() {
      const st = this.st;
      if (st.paused) return null;
      if (st.phase === 'roles' && !st.solved) {
        const h = st.p.hold;
        if (h.mat && h.emily) { const p = (Date.now() - Math.max(h.mat, h.emily)) / 3000; if (p >= 1) { this.solve(); return true; } return p; }
        return 0;
      }
      return null;
    }

    // ---- input ----
    handle(role, m) {
      const st = this.st, g = this.g, ph = st.phase;
      if (m.t === 'pause') { this.setPaused(!!m.on); return; }
      if (st.paused && m.t !== 'testsound') return;
      switch (m.t) {
        case 'ready':
          if (ph !== 'lobby') return;
          st.ready[role] = !!m.on; this.changed();
          if (st.ready.mat && st.ready.emily) this.goto('hide');
          return;
        case 'hide':
          if (ph !== 'hide' || st.hideStep !== role) return;
          st.hides[role] = m.cards; st.hideStep = role === 'mat' ? 'emily' : 'done';
          this.sound('solve'); this.changed();
          return;
        case 'continue':
          if (ph === 'intro' || st.solved || (ph === 'hide' && st.hideStep === 'done')) this.next();
          return;
        case 'hold':
          if (ph === 'roles' && !st.solved) { st.p.hold[role] = m.on ? Date.now() : 0; this.changed(); }
          return;
        case 'answer': return this.answer(role, m.value);
        case 'scan': return this.scan(role, m.code);
        case 'hint': return this.hint(role);
        case 'skip': return this.skip(role);
        case 'propose':
          if (ph !== 'accuse' || !S[m.killer] || !W[m.weapon]) return;
          st.p.proposal = { by: role, killer: m.killer, weapon: m.weapon };
          this.sound('ding'); this.changed();
          return;
        case 'agree': {
          const pp = st.p.proposal;
          if (ph !== 'accuse' || !pp) return;
          if (!m.on) { st.p.proposal = null; this.changed(); return; }
          if (pp.by === role) return;
          return this.judge(pp);
        }
        case 'testsound': this.sound('test'); return;
      }
    }
    judge(pp) {
      const st = this.st, g = this.g;
      const okK = pp.killer === g.K, okW = pp.weapon === g.weapon;
      st.p.proposal = null;
      if (okK && okW) { st.accused = { killer: pp.killer, weapon: pp.weapon }; this.solve(); return; }
      st.wrong++;
      const who = S[pp.killer].short;
      const msg = !okK && !okW ? `${who} is led away in handcuffs… and released at dawn. Wrong person — and wrong weapon.`
        : !okK ? `Right weapon — but ${who} could not have done it. The real killer breathes again.`
          : `${who} goes pale… but the ${W[pp.weapon].name} doesn’t fit the wounds. The accusation collapses.`;
      st.p.lastWrong = msg;
      this.sound('wrong'); this.flash(null, 'bad', msg); this.emit('shake'); this.changed();
    }
    answer(role, value) {
      const st = this.st, g = this.g, ph = st.phase;
      if (st.solved) return;
      let ok = false, msg = 'That doesn’t fit the evidence.';
      if (ph === 'body') { ok = Number(value) === g.T; if (Number(value) === 23 * 60 + 15) msg = 'That’s what the watch says… but the body disagrees.'; }
      else if (ph === 'letter') { ok = String(value).toUpperCase().replace(/[^A-Z]/g, '') === LETTERS[g.letter].word; msg = 'The drawer stays locked.'; }
      else if (ph === 'interview') { const v = (value || []).slice().sort(); ok = JSON.stringify(v) === JSON.stringify([g.K, g.F].sort()); msg = 'The household looks on, unimpressed. Check every statement again.'; }
      else if (ph === 'diary') { ok = String(value).toUpperCase().replace(/[^A-Z]/g, '') === DIARIES[g.diary].answer; msg = 'The words still make no sense.'; }
      else return;
      if (ok) this.solve();
      else { st.p.tries = (st.p.tries || 0) + 1; this.sound('wrong'); this.flash(null, 'bad', msg); this.emit('shake'); this.changed(); }
    }
    scan(role, raw) {
      const st = this.st;
      const code = String(raw || '').toUpperCase().replace(/^LR-/, '').replace(/[^A-Z0-9]/g, '');
      const card = CARDS.find((c) => c.code === code);
      if (!card) { this.flash(role, 'bad', 'That isn’t evidence.'); return; }
      if (card.hider === role) { this.flash(role, 'bad', `You hid this one yourself. Put it back for ${NAME[other(role)]}!`); return; }
      if (!(st.phase === 'hunt1' || st.phase === 'hunt2')) { this.flash(role, 'bad', 'Not yet — leave it where it is for now.'); return; }
      if (card.slot === 'II' && st.phase === 'hunt1') {
        if (!st.foundBy[card.code]) { st.foundBy[card.code] = role; this.flash(role, 'page', card.code); this.sound('ding'); this.changed(); }
        return;
      }
      if (st.foundBy[card.code]) { this.flash(role, 'good', 'You already logged this evidence.'); return; }
      st.foundBy[card.code] = role;
      this.flash(role, 'page', card.code); this.sound('page'); this.changed(); this.checkHunt();
    }
    hintKey(role) { const ph = this.st.phase; return ph.startsWith('hunt') ? ph + ':' + role : ph; }
    hint(role) {
      const st = this.st, ph = st.phase;
      if (!PUZZLES.includes(ph) || st.solved) return;
      const k = this.hintKey(role), lv = st.hintLv[k] || 0;
      if (lv >= 2) return;
      st.hintLv[k] = lv + 1; st.hintsUsed++; this.logEntry().hints++;
      if (!ph.startsWith('hunt')) { st.lastHint = { level: lv + 1, text: HINTS[ph](this.g)[lv] }; this.sound('hint'); }
      this.changed();
    }
    skip(role) {
      const st = this.st, ph = st.phase;
      if (!PUZZLES.includes(ph) || st.solved) return;
      if ((st.hintLv[this.hintKey(role)] || 0) < 2) return;
      if (ph.startsWith('hunt')) {
        const t = this.huntTarget(role);
        if (!st.foundBy[t.code]) { st.foundBy[t.code] = role; st.skips++; this.logEntry().skipped = true; this.flash(role, 'page', t.code); this.changed(); this.checkHunt(); }
        return;
      }
      this.solve(true);
    }

    // ---- documents ----
    evidenceFor(code) {
      const g = this.g, card = CARDS.find((c) => c.code === code); if (!card) return null;
      const seeker = other(card.hider);
      const key = seeker + card.slot;
      if (key === 'matI') return { code, title: 'The Bell-Board Log', html: `<p>A page torn from the servants’ bell-board log, kept by the footman. It shows which bells rang last night, and who answered.</p><table>${this.bellRows().map(([t, x]) => `<tr><td style="white-space:nowrap">${t}</td><td>${x}</td></tr>`).join('')}</table>` };
      if (key === 'emilyI') return { code, title: 'The Boot Print', html: `<p>A plaster cast of a boot print, taken from the mud just outside the library’s garden door. It was made after the rain began, at nine o’clock.</p><p><b>${S[g.K].boot === 'L' ? 'A large, heavy boot — a big man’s size, or near it.' : 'A small, narrow boot — no bigger than a lady’s size 5.'}</b></p>` };
      if (key === 'matII') return { code, title: 'The Weapon', html: `<p>${W[g.weapon].found}</p>` };
      if (key === 'emilyII') return { code, title: 'The Glove', html: `<p>Stuffed into a Chinese vase in the front hall: a single dark leather glove for the <b>${S[g.K].hand === 'L' ? 'left' : 'right'} hand</b>. There is blood on the knuckles.</p>` };
    }
    bellRows() {
      const g = this.g, rows = g.items.bells.map((it) => [it.when, testimony(it, g.claims, 'bells')]);
      rows.push([20 * 60 + 45, ['8:45 PM', 'Dining room bell. Jenkins: dinner cleared.']], [21 * 60 + 5, ['9:05 PM', 'Front door bell. Arthur: no one there — the wind.']], [24 * 60 + 60, ['1:00 AM', 'Library bell, rung and rung. Jenkins: <b>his Lordship found dead</b>.']]);
      return rows.sort((a, b) => a[0] - b[0]).map((x) => x[1]);
    }
    statementsHTML() {
      const g = this.g;
      return `<ul>${SUSPECTS.map((s) => `<li><b>${s.short}</b>: at ${fmtT(g.T)}, “I was in the ${g.claims[s.id].t.toLowerCase()}.” At 11:15, “I was in the ${g.claims[s.id].l.toLowerCase()}.”</li>`).join('')}</ul>`;
    }
    roleCard(role) {
      return role === 'mat'
        ? doc('Inspector Mat Graham, Scotland Yard', '<p>You came to Blackwood Hall for a quiet weekend as an old friend of Lord Ashcombe. You are off duty — until tonight.</p><p>You notice <b>places, objects and people’s stories</b>. The servants talk to you.</p>')
        : doc('Dr. Emily Graham, physician', '<p>You are Lord Ashcombe’s personal physician, invited for the weekend.</p><p>You notice <b>bodies, hands and wounds</b> — and you remember where you were, and with whom, all evening.</p>');
    }
    bodyDocs(role) {
      const g = this.g, wpn = W[g.weapon];
      if (role === 'mat') {
        const inv = WEAPONS.map((w) => `<li>${w.inv[w.id === g.weapon ? 1 : 0]}</li>`).join('');
        return doc('Your notes at the scene', `<ul><li>Jenkins the butler found the body at <b>1:00 AM</b>.</li><li>The gold pocket watch is smashed. Its hands are stopped at <b>11:15</b>.</li><li>The library’s garden door is unlocked. Rain has blown in across the rug.</li></ul>`) + doc('Inventory of the library', `<ul>${inv}<li>Inkwell, blotter, a decanter of brandy — untouched.</li></ul>`);
      }
      return null;
    }
    examReveals() {
      const g = this.g, hours = (25 * 60 - g.T) / 60, temp = (98.6 - 1.5 * hours).toFixed(1);
      return [
        { label: 'Body temperature', html: `Your thermometer reads <b>${temp} °F</b>, taken at 1:00 AM.` },
        { label: 'Your medical training', html: 'After death, a body cools by about <b>1.5 °F every hour</b>, from its normal 98.6 °F.' },
        { label: 'The wound', html: W[g.weapon].wound },
        { label: 'The hands', html: 'No defensive wounds. He never saw it coming — he knew and trusted his killer enough to turn his back.' },
        { label: 'The pockets', html: 'A handkerchief, a few coins, and a key ring. The <b>garden door key is missing</b> from it.' },
      ];
    }
    letterDoc(role) {
      const L = LETTERS[this.g.letter];
      const lines = L.lines.map((x) => `<div>${role === 'mat' ? x[0] + ' …' : '… ' + x[1]}</div>`).join('');
      return doc(role === 'mat' ? 'Torn letter — left half' : 'Torn letter — right half', `<div class="torn">${lines}</div><p style="font-size:.85em;margin:.4em 0 0">${role === 'mat' ? '(The beginnings of each line.)' : '(The ends of each line. The signature reads “— E.”)'}</p>`);
    }
    motivesDoc() { return doc('Lord Ashcombe’s list of grudges', `<ul>${SUSPECTS.map((s) => `<li><b>${s.short}</b>, ${s.role}: ${s.motive}</li>`).join('')}</ul>`); }
    casebook(role) {
      const st = this.st, g = this.g, idx = PHASES.indexOf(st.phase), past = (ph) => idx > PHASES.indexOf(ph) || (st.phase === ph && st.solved);
      const at = (ph) => idx >= PHASES.indexOf(ph);
      const out = [];
      const add = (code, title, html) => out.push({ code, title, html });
      if (at('roles')) add('role', 'Who you are', this.roleCard(role).replace(/<\/?div[^>]*>/g, ''));
      if (at('body')) {
        if (role === 'mat') add('scene', 'At the scene', this.bodyDocs('mat'));
        else add('exam', 'Your examination', `<ul>${this.examReveals().map((r) => `<li><b>${r.label}:</b> ${r.html}</li>`).join('')}</ul>`);
      }
      if (past('body')) add('tod', 'Time of death', `Lord Ashcombe died at <b>${fmtT(g.T)}</b>. The smashed watch (11:15) was staged.`);
      if (at('letter')) add('letter', 'The torn letter', this.letterDoc(role));
      if (past('letter')) add('motives', 'Motives', this.motivesDoc());
      Object.keys(st.foundBy).filter((c) => st.foundBy[c] === role).forEach((c) => { const e = this.evidenceFor(c); if (e) out.push(e); });
      if (at('interview')) {
        add('statements', 'The statements', this.statementsHTML());
        if (role === 'mat') {
          add('testimony', 'What the servants told you', `<ul>${g.items.servants.map((it) => `<li>${testimony(it, g.claims, 'servants')}</li>`).join('') || '<li>Nothing useful.</li>'}</ul>`);
          add('boots', 'The boot room', `<p>Everyone’s outdoor boots are lined up by the back door:</p><ul>${SUSPECTS.map((s) => `<li><b>${s.short}</b>: ${s.bootNote}</li>`).join('')}</ul>`);
        } else {
          add('memory', 'Your own memories of the evening', `<ul>${g.items.memory.map((it) => `<li>${testimony(it, g.claims, 'memory')}</li>`).join('') || '<li>You spent the evening alone with a book.</li>'}</ul>`);
          add('hands', 'What you’ve noticed about their hands', `<ul>${SUSPECTS.map((s) => `<li><b>${s.short}</b> ${s.handNote}.</li>`).join('')}</ul>`);
        }
      }
      if (past('interview')) add('liars', 'Caught lying', `${S[g.K].short} and ${S[g.F].short} both lied in their statements.`);
      if (at('diary') && role === 'emily') add('cipher', 'The diary’s last line', `<p class="cipher-text">${shiftText(DIARIES[g.diary].text, g.shift)}</p><p>The clasp is stamped <b>${ROMAN[g.shift]}</b>.</p>`);
      if (past('diary')) add('decoded', 'The diary, decoded', `“${cap(DIARIES[g.diary].text.toLowerCase())}.”`);
      return out;
    }

    // ---- what each phone sees ----
    viewFor(role) {
      const st = this.st, g = this.g, ph = st.phase, o = other(role);
      const v = {
        role, name: NAME[role], other: NAME[o], phase: ph, solved: st.solved, paused: !!st.paused, canPause: this.canPause(),
        otherConnected: !!st.conn[o], act: (STORY[ph] || {}).act || '', title: (STORY[ph] || {}).title || '',
        prompt: '', info: '', widget: { type: 'watch' }, pages: this.casebook(role), hint: null,
        labels: {
          pages: 'Casebook', pagesTitle: 'Your casebook', noPages: 'Nothing in your casebook yet.', otherPages: 'has a different casebook. Compare notes out loud.',
          foundTitle: 'Evidence found!', foundText: 'It’s been added to your casebook. Tell your partner what you found.', keep: 'Log it',
          guide: 'the Yard', huntPoint: 'Your search leads you toward…', scan: 'Scan the evidence', found: '✦ Evidence found ✦', bothFound: 'Both pieces of evidence are found!',
          skipPuzzle: 'step? The answer will be given to you.', skipHunt: 'search? The evidence will appear without finding it.',
          endLine: 'Case closed.', endNote: 'The full case file is on the TV.', timeWord: 'Time on the case', pageWord: 'evidence card', PageWord: 'Card', noMic: true,
        },
      };
      if (PUZZLES.includes(ph) && !st.solved) { const lv = st.hintLv[this.hintKey(role)] || 0; v.hint = { level: lv, canSkip: lv >= 2 }; }
      if (ph === 'lobby') { v.widget = { type: 'lobby', ready: !!st.ready[role], otherReady: !!st.ready[o] }; return v; }
      if (ph === 'hide') {
        if (st.hideStep === 'done') { v.widget = { type: 'continue', label: 'Begin the investigation' }; v.prompt = 'All four evidence cards are hidden. Sit down together in front of the TV.'; }
        else if (st.hideStep === role) v.widget = { type: 'hideform', rooms: ROOMS_HIDE, cards: CARDS.filter((c) => c.hider === role).map((c) => c.slot) };
        else v.widget = { type: 'wait', text: `${NAME[st.hideStep]} is hiding evidence. Stay where you are and don’t peek!` };
        return v;
      }
      if (ph === 'end') { v.widget = { type: 'end', program: this.program() }; return v; }
      if (st.solved || ph === 'intro') { v.widget = { type: 'continue', label: ph === 'intro' ? 'Enter Blackwood Hall' : 'Continue' }; v.prompt = 'Read the TV together, then continue.'; return v; }

      switch (ph) {
        case 'roles':
          v.prompt = 'This is who you are tonight:'; v.info = this.roleCard(role);
          v.widget = { type: 'hold', label: 'Take the case', mine: !!st.p.hold[role], theirs: !!st.p.hold[o], progress: this.holdProgress() };
          break;
        case 'body':
          if (role === 'mat') { v.prompt = 'You survey the library.'; v.info = this.bodyDocs('mat'); }
          else { v.prompt = 'You kneel beside the body. Examine him:'; v.reveals = this.examReveals(); }
          v.widget = { type: 'time', hours: [8, 9, 10, 11, 12, 1], label: 'Record the time of death', tries: st.p.tries || 0 };
          break;
        case 'letter':
          v.prompt = role === 'mat' ? 'You fish half of the letter from the hearth:' : 'You find the other half under the desk:';
          v.info = this.letterDoc(role);
          v.widget = { type: 'word', label: 'Try the desk lock', tries: st.p.tries || 0 };
          break;
        case 'hunt1':
        case 'hunt2': {
          const t = this.huntTarget(role), hider = o, hide = (st.hides[hider] || {})[t.slot] || {}, lv = st.hintLv[this.hintKey(role)] || 0, done = !!st.foundBy[t.code];
          const room = hide.room === 'Other' ? (hide.other || 'somewhere unexpected') : (hide.room || 'somewhere in the house');
          let whisper = '';
          if (lv >= 1) whisper = hide.hint ? `A note in ${NAME[hider]}’s hand: <i>“${esc(hide.hint)}”</i>` : `${NAME[hider]} left no clue for this one.`;
          if (lv >= 2) whisper += `<br><br>Ask ${NAME[hider]} to guide you — but they may only say <b>“warmer”</b> or <b>“colder.”</b>`;
          v.prompt = done ? `You found your evidence! Help ${NAME[o]} find theirs.` : 'A piece of evidence is waiting for you.';
          v.widget = { type: 'hunt', done, room, whisper, otherDone: !!st.foundBy[this.huntTarget(o).code] };
          if (done) v.hint = null;
          break;
        }
        case 'interview':
          v.prompt = role === 'mat' ? 'The servants have been talking to you. Check every statement on the TV.' : 'Check every statement on the TV against your own memories.';
          v.info = role === 'mat'
            ? doc('What the servants told you', `<ul>${g.items.servants.map((it) => `<li>${testimony(it, g.claims, 'servants')}</li>`).join('') || '<li>Nothing useful.</li>'}</ul>`) + '<p class="muted" style="font-size:.85em">Don’t forget the bell-board log in your casebook.</p>'
            : doc('Your own memories of the evening', `<ul>${g.items.memory.map((it) => `<li>${testimony(it, g.claims, 'memory')}</li>`).join('') || '<li>You spent the evening alone with a book.</li>'}</ul>`);
          v.widget = { type: 'multi', count: 2, label: 'Name the two liars', options: SUSPECTS.map((s) => ({ id: s.id, label: s.short })), tries: st.p.tries || 0 };
          break;
        case 'diary':
          if (role === 'mat') { v.prompt = 'Your old cipher wheel from the Yard is in your coat pocket.'; v.tool = 'cipher'; }
          else { v.prompt = 'You open the diary to its last entry:'; v.info = doc('The last line', `<p class="cipher-text">${shiftText(DIARIES[g.diary].text, g.shift)}</p>`); }
          v.widget = { type: 'word', label: 'What is the last word?', tries: st.p.tries || 0 };
          break;
        case 'accuse': {
          const pp = st.p.proposal;
          v.prompt = 'Everything you know is in your casebook. Agree on one accusation.';
          v.widget = { type: 'accuse', suspects: SUSPECTS.map((s) => ({ id: s.id, name: s.name })), weapons: WEAPONS.map((w) => ({ id: w.id, name: cap(w.name) })), wrong: st.wrong,
            proposal: pp ? { by: pp.by, killerName: S[pp.killer].name, weaponName: W[pp.weapon].name } : null };
          break;
        }
      }
      return v;
    }

    // ---- ending ----
    reconstruction() {
      const g = this.g, k = S[g.K], f = S[g.F];
      return [
        `At <b>${fmtT(g.T)}</b>, while the house believed ${k.short} was in the ${g.claims[g.K].t.toLowerCase()}, ${k.pro} slipped into the library ${DIARIES[g.diary].access}.`,
        `Lord Ashcombe turned his back on someone he trusted. ${cap(k.short)} ${W[g.weapon].act}.`,
        `Then ${k.pro} smashed Lord Ashcombe’s pocket watch with its hands at a quarter past eleven, to make the murder look later than it was — at a time when ${k.pro} would be seen by half the house.`,
        `The motive? ${k.motive}`,
        `And ${f.short}? At 11:15, ${f.secret}. Embarrassing — but not murder.`,
      ];
    }
    program() {
      const st = this.st, log = st.log || {};
      const rows = PUZZLES.map((ph) => { const e = log[ph] || {}; return { title: STORY[ph].title, act: STORY[ph].act, secs: e.end != null && e.start != null ? Math.max(0, Math.round(e.end - e.start)) : null, hints: e.hints || 0, skipped: !!e.skipped }; });
      return { rows, total: Math.round(this.elapsed()), hints: st.hintsUsed, skips: st.skips, wrong: st.wrong || 0, rating: this.rating() };
    }
    rating() {
      const st = this.st, mins = this.elapsed() / 60, score = mins + 3 * st.hintsUsed + 8 * st.skips + 6 * (st.wrong || 0);
      const tiers = [
        [40, 5, 'Master Detective', 'Sherlock Holmes himself would tip his hat.'],
        [55, 4, 'Chief Inspector', 'A clean arrest. Scotland Yard is impressed.'],
        [70, 3, 'Detective Sergeant', 'Solid police work, with a few wrong turns.'],
        [90, 2, 'Police Constable', 'You got there — eventually.'],
        [Infinity, 1, 'Bumbling Bystander', 'The killer very nearly caught the morning train.'],
      ];
      const t = tiers.find((x) => score <= x[0]);
      return { title: t[2], stars: t[1], blurb: t[3], clean: st.hintsUsed === 0 && st.skips === 0 && !st.wrong };
    }
  }
  const ROOMS_HIDE = ['Kitchen', 'Dining room', 'Hallway', 'Bedroom', 'Guest room', 'Bathroom', 'Office', 'Laundry', 'Closet', 'Garage', 'Other'];
  function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  window.BWGame = BWGame;
  window.BWData = { STORY, HINTS, PHASES, PUZZLES, NAME, SUSPECTS, WEAPONS, S, W, LETTERS, DIARIES, ROMAN, fmtT, shiftText, other, esc, generate };
})();
