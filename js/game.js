// ⚠️ SPOILERS — this file contains the story, puzzles, and answer logic. Players: don't read it!
// The TV (host) runs this. Phones only ever receive their own "view" of the game.
(function () {
  const ROLES = ['mat', 'emily'];
  // Player names: each phone types a first name when it joins; until then, Player 1 / Player 2.
  const DEFAULT_NAME = { mat: 'Player 1', emily: 'Player 2' };
  const NAME = Object.assign({}, DEFAULT_NAME);
  const cleanName = (s) => { const w = String(s || '').trim().split(/\s+/)[0].replace(/[^\p{L}'’-]/gu, '').slice(0, 14); return w ? w[0].toUpperCase() + w.slice(1) : ''; };
  const applyNames = (n) => { Object.keys(DEFAULT_NAME).forEach((r) => { NAME[r] = (n && cleanName(n[r])) || DEFAULT_NAME[r]; }); };
  const other = (r) => (r === 'mat' ? 'emily' : 'mat');
  const PHASES = ['lobby', 'hide', 'intro', 'seance', 'lock', 'hunt1', 'melody', 'harmony', 'rhythm', 'hunt2', 'portraits', 'finale', 'release', 'end'];
  const PUZZLES = ['seance', 'lock', 'hunt1', 'melody', 'harmony', 'rhythm', 'hunt2', 'portraits', 'finale', 'release'];

  const MORSE = { A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..' };
  const GLYPHS = ['Ψ', 'Ω', 'Δ', 'Σ', 'Φ', 'Λ', 'Ξ', 'Π', 'Θ', 'Γ', 'Ж', 'ϟ'];
  const WORDS = ['GRAVE', 'RAVEN', 'DIRGE', 'CRYPT', 'MOURN', 'SHADE', 'GHOST', 'KNELL', 'TOMB', 'VEIL'];
  const NAME_POOL = ['Thomas', 'Margaret', 'Josiah', 'Clara', 'Ambrose', 'Lucinda', 'Silas', 'Harriet'];
  const INSTR = [
    { inst: 'Violin', player: 'violinist' }, { inst: 'Viola', player: 'violist' },
    { inst: 'Cello', player: 'cellist' }, { inst: 'Piano', player: 'pianist' },
  ];
  const NATURALS = [0, 2, 4, 5, 7, 9, 11];
  const PC_NAME = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
  const NUMERALS = ['I', 'II', 'III', 'IV'];
  const MAT_KEYS = [60, 61, 62, 63, 64, 65];
  const EMILY_KEYS = [66, 67, 68, 69, 70, 71, 72];

  function rng(seed) {
    let a = seed >>> 0;
    return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  function generate(seed) {
    const r = rng(seed);
    const pick = (arr) => arr[Math.floor(r() * arr.length)];
    const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

    const glyphs = shuffle(GLYPHS).slice(0, 10); // glyphs[digit]
    let lock;
    do { lock = [0, 0, 0, 0].map(() => Math.floor(r() * 10)); } while (new Set(lock).size < 3);

    const scale = [60, 62, 64, 65, 67, 69, 71, 72];
    let melody;
    for (;;) {
      melody = [];
      for (let i = 0; i < 5; i++) { let n; do { n = pick(scale); } while (melody.length && n === melody[melody.length - 1]); melody.push(n); }
      const low = melody.filter((n) => n <= 65).length;
      if (low >= 2 && low <= 3) break;
    }

    const ghostPc = pick([0, 2, 4, 5, 7, 9]);
    const word = pick(WORDS);
    const names = shuffle(NAME_POOL).slice(0, 4);
    const inst = shuffle(INSTR);
    const family = {};
    ['A', 'B', 'C', 'D'].forEach((k, i) => { family[k] = { name: names[i], inst: inst[i].inst, player: inst[i].player }; });

    let pcs;
    do { pcs = shuffle(NATURALS).slice(0, 4); } while (false);
    const clefs = shuffle(['treble', 'bass', 'alto', 'tenor']);
    const codes = shuffle(CARDS.map((c) => c.code));
    const fragments = {};
    codes.forEach((code, i) => { fragments[code] = { num: i + 1, pc: pcs[i], clef: clefs[i] }; });

    return { glyphs, lock, melody, ghostPc, word, family, fragments, finale: pcs };
  }

  // ---------- Story text ----------
  const STORY = {
    intro: {
      act: 'Prologue', title: 'The Last Recital',
      text: [
        'Savannah, 1891. On the night before the premiere of her Requiem, the composer <b>Eleanor Vane</b> sat down at her piano, played four notes — and never stood up again.',
        'The Vane house has stood empty ever since. Neighbors say that at midnight a music box still plays in the parlor, and that the last measures of the Requiem were torn from the score and hidden somewhere in the house.',
        'Tonight, you have come to the parlor at midnight. The door has just locked behind you. The candles have gone out.',
        'Somewhere in the dark, someone is waiting for her music to be finished.',
      ],
    },
    seance: {
      act: 'I · The Parlor', title: 'The Candles',
      text: ['It is too dark to see. Two cold candles stand on the mantel.', 'Eleanor will not show herself to just one of you.'],
      after: 'The wicks catch at the same instant. In the trembling light you see the parlor: dust sheets, a portrait turned to the wall — and on the side table, a small rosewood music box, locked tight.',
    },
    lock: {
      act: 'I · The Parlor', title: 'The Music Box',
      text: ['The lid is sealed by a brass lock with four dials, each carved with a strange mark.', 'Beside the box lies Eleanor’s diary, open to a page of scrawled symbols.'],
      after: 'The lock clicks. A thin melody spills out of the box… then stops mid-phrase. Inside, where the cylinder should be, is a note in faded ink:<br><i>“My pages are hidden in this house. Find them before the clock strikes one.”</i>',
    },
    hunt1: {
      act: 'I · The Parlor', title: 'The First Pages',
      text: ['Eleanor has hidden two torn pages of her Requiem somewhere in this house — one for each of you.', 'Your phone knows where she points. Take it with you, and scan the page when you find it.'],
      after: 'Two torn pages, each holding a single note in Eleanor’s careful hand, a Roman numeral in the corner. Keep them safe.<br>In the next room, a piano begins to play.',
    },
    melody: {
      act: 'II · The Music Room', title: 'The Music Box Tune',
      text: ['The music room is freezing. The piano’s keyboard is split by a crack straight down the middle — the low keys answer to one of you, the high keys to the other.', 'From the parlor, the music box plays its tune once more, as if asking you to finish it.'],
      after: 'The last note rings out, and the crack in the piano glows and seals itself. Somewhere above you, a cold voice begins to hum — one long, wavering note.',
    },
    harmony: {
      act: 'II · The Music Room', title: 'The Ghost’s Note',
      text: ['Eleanor is singing. She holds a single note, and waits.', 'She always sang in harmony with her family: <b>one voice with her</b> — and <b>one voice a perfect fifth above</b>.'],
      after: 'Three voices, for a moment, perfectly in tune. The room grows warmer. A sheet of manuscript slides from the music stand and lands at your feet.',
    },
    rhythm: {
      act: 'II · The Music Room', title: 'The Manuscript',
      text: ['This page has no pitches at all — only rhythms, on a single line.', 'Eleanor’s father was a telegraph operator. She wrote her secrets the way he taught her.'],
      after: (g) => `You speak the word aloud — <b>${g.word}</b> — and every clock in the house begins to tick at once.<br>Two more pages have come loose somewhere in the house.`,
    },
    hunt2: {
      act: 'II · The Music Room', title: 'The Last Pages',
      text: ['Two pages of the Requiem remain hidden — one more for each of you.', 'Follow your phone. Scan the page when you find it.'],
      after: 'All four pages are found. Above you, slow footsteps cross the attic floor… and stop.',
    },
    portraits: {
      act: 'III · The Attic', title: 'The Family Quartet',
      text: ['In the attic, four chairs face an empty music stand. Four portraits lean against the wall: the Vane Family Quartet.', 'Eleanor will not play until her family is seated where they belong. Each of you remembers half of what she told you.'],
      after: 'As the last portrait is set in place, four pale figures settle into the chairs, instruments raised. They are waiting for the Requiem’s final notes.',
    },
    finale: {
      act: 'III · The Attic', title: 'The Requiem',
      text: ['Eleanor’s last four notes are written on the four torn pages, numbered <b>I</b> to <b>IV</b>.', 'Play them, in order, on the cracked keyboard — and finish the piece she never could.'],
      after: 'The final note hangs in the air. For the first time in a hundred and thirty-five years, Eleanor Vane stands up from her piano.',
    },
    release: {
      act: 'III · The Attic', title: 'Let Her Go',
      text: ['She is tired. She has waited so long.', 'Hold on to each other — and let her go.'],
    },
    end: {
      act: 'Epilogue', title: 'Rest',
      text: ['The candles go out. When the lights return, it is only your living room.', 'But somewhere, very faintly, a music box plays the Requiem all the way through to the end.', '<i>“Thank you for finishing my music.” — E.V.</i>'],
    },
  };

  const HINTS = {
    seance: (g) => ['Both of you must hold your candles at the same time — and keep holding.', 'Press and hold the candle on both phones together for a few seconds without letting go.'],
    lock: (g) => ['The marks mean nothing alone. One of you can see the marks on the box; the other has the diary. Talk it through.', 'Each symbol in the diary stands for one digit. Read the box’s four marks left to right and translate each into its digit.'],
    melody: (g) => ['Neither of you can play the tune alone. Replay it from your phone as often as you like, and work out which notes are on whose half.', `It is five notes long. ${NAME.mat} has the low keys, ${NAME.emily} the high keys. Take turns in order; a wrong note starts the tune over. Watch the five lights on the TV.`],
    harmony: (g) => [`Tap “Hear her note” on your phone. ${NAME.mat} sings her note (any octave). ${NAME.emily} sings a perfect fifth above it. Hold steady until your bar fills.`, `Her note is ${PC_NAME[g.ghostPc]}. ${NAME.mat} sings ${PC_NAME[g.ghostPc]}; ${NAME.emily} sings ${PC_NAME[(g.ghostPc + 7) % 12]}.`],
    rhythm: (g) => ['The manuscript is a message. One of you has the rule for reading it; the other has a chart.', 'Quarter notes are dashes, eighth notes are dots, and each measure is one letter. Look each pattern up in the telegraph chart.'],
    portraits: (g) => ['Say every clue out loud. Use the TV to match each name to an instrument — some clues name the person, some only the instrument.', `Start from what is certain. Chair 1 belonged to ${g.family.C.name}.`],
    finale: (g) => ['Gather all four pages from both phones (tap “Pages”). Each shows one note and its order, I to IV.', 'Mind the clefs — not every page is treble clef. Read each note, put them in order I–IV, and play them on the split keyboard (any octave is fine).'],
    release: (g) => ['Both of you, press and hold “Let her go” at the same time.', 'Keep holding together for a few seconds.'],
  };

  class Game {
    constructor(saved) {
      this.listeners = {};
      this.st = saved && saved.v === 1 ? saved : Game.fresh();
      this.st.conn = { mat: false, emily: false };
      if (this.st.p && this.st.p.hold) this.st.p.hold = { mat: 0, emily: 0 };
      this.st.names = this.st.names || {}; applyNames(this.st.names);
    }
    static fresh() {
      const seed = (Math.random() * 2 ** 31) | 0;
      return {
        v: 1, seed, gen: generate(seed), phase: 'lobby', solved: false,
        ready: { mat: false, emily: false }, hideStep: 'mat', hides: {}, foundBy: {},
        startedAt: null, endedAt: null, paused: false, pausedAt: null, pausedTotal: 0, log: {}, hintLv: {}, hintsUsed: 0, skips: 0, lastHint: null, p: {}, conn: { mat: false, emily: false },
      };
    }
    setName(role, name) {
      const n = cleanName(name); this.st.names = this.st.names || {};
      if (!n || this.st.names[role] === n) return false;
      this.st.names[role] = n; applyNames(this.st.names); this.changed(); return true;
    }
    on(ev, fn) { (this.listeners[ev] = this.listeners[ev] || []).push(fn); }
    emit(ev, data) { (this.listeners[ev] || []).forEach((fn) => fn(data)); }
    get g() { return this.st.gen; }
    changed() { this.emit('change'); }
    sound(name, arg) { this.emit('sound', { name, arg }); }
    flash(role, kind, text) { this.emit('flash', { role, kind, text }); }

    // ---- flow ----
    goto(phase) {
      const st = this.st;
      st.phase = phase; st.solved = false; st.p = {}; st.lastHint = null;
      if (phase === 'intro' && !st.startedAt) st.startedAt = Date.now();
      if (phase === 'seance' || phase === 'release') st.p.hold = { mat: 0, emily: 0 };
      if (phase === 'melody' || phase === 'finale') st.p.idx = 0;
      if (phase === 'harmony') st.p.sang = { mat: false, emily: false };
      if (phase === 'lock' || phase === 'rhythm' || phase === 'portraits') st.p.tries = 0;
      if (PUZZLES.includes(phase)) { st.log = st.log || {}; st.log[phase] = { start: this.elapsed(), end: null, hints: 0, skipped: false }; }
      if (phase === 'end') { if (st.paused) this.setPaused(false); st.endedAt = Date.now(); this.sound('ending'); }
      this.sound('enter', phase);
      if (phase === 'hunt1' || phase === 'hunt2') this.checkHunt();
      this.changed();
    }
    next() { const i = PHASES.indexOf(this.st.phase); if (i < PHASES.length - 1) this.goto(PHASES[i + 1]); }
    logEntry() { const st = this.st; st.log = st.log || {}; return st.log[st.phase] || (st.log[st.phase] = { start: this.elapsed(), end: null, hints: 0, skipped: false }); }
    solve(skipped) {
      if (this.st.solved) return;
      if (skipped) this.st.skips++;
      if (PUZZLES.includes(this.st.phase)) { const e = this.logEntry(); e.end = this.elapsed(); if (skipped) e.skipped = true; }
      if (this.st.phase === 'release') { this.goto('end'); return; }
      this.st.solved = true; this.st.lastHint = null;
      this.sound(this.st.phase === 'finale' ? 'bigsolve' : 'solve');
      this.changed();
    }

    huntSlot() { return this.st.phase === 'hunt1' ? 'I' : 'II'; }
    huntTarget(seeker) { const hider = other(seeker); return CARDS.find((c) => c.hider === hider && c.slot === this.huntSlot()); }
    checkHunt() {
      if (!(this.st.phase === 'hunt1' || this.st.phase === 'hunt2') || this.st.solved) return;
      if (ROLES.every((r) => this.st.foundBy[this.huntTarget(r).code])) this.solve();
    }

    // ---- input ----
    // seconds of actual play (pauses don't count)
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
    handle(role, m) {
      const st = this.st, g = this.g, ph = st.phase;
      if (m.t === 'pause') { this.setPaused(!!m.on); return; }
      if (st.paused && m.t !== 'testsound') return; // the house holds its breath
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
          if ((ph === 'seance' || ph === 'release') && !st.solved) { st.p.hold[role] = m.on ? Date.now() : 0; this.changed(); }
          return;
        case 'answer': return this.answer(role, m.value);
        case 'note': return this.note(role, m.midi);
        case 'sang':
          if (ph === 'harmony' && !st.solved) {
            st.p.sang[role] = true; this.sound('ding'); this.changed();
            if (st.p.sang.mat && st.p.sang.emily) this.solve();
          }
          return;
        case 'scan': return this.scan(role, m.code);
        case 'hint': return this.hint(role);
        case 'skip': return this.skip(role);
        case 'replay':
          if (ph === 'melody') this.sound('melody', g.melody);
          if (ph === 'harmony') this.sound('hum', g.ghostPc);
          return;
        case 'testsound': this.sound('test'); return;
      }
    }
    answer(role, value) {
      const st = this.st, g = this.g, ph = st.phase;
      if (st.solved) return;
      let ok = false;
      if (ph === 'lock') ok = String(value).replace(/\D/g, '') === g.lock.join('');
      else if (ph === 'rhythm') ok = String(value).toUpperCase().replace(/[^A-Z]/g, '') === g.word;
      else if (ph === 'portraits') { const f = g.family; ok = JSON.stringify(value) === JSON.stringify([f.C.name, f.A.name, f.D.name, f.B.name]); }
      else return;
      if (ok) this.solve();
      else {
        st.p.tries = (st.p.tries || 0) + 1;
        const msgs = { lock: 'The dials refuse to turn.', rhythm: 'The ink blurs. That is not the word.', portraits: 'The portraits’ eyes follow you. Something is wrong.' };
        this.sound('wrong'); this.flash(null, 'bad', msgs[ph]); this.emit('shake'); this.changed();
      }
    }
    note(role, midi) {
      const st = this.st, g = this.g, ph = st.phase;
      if (st.solved || (ph !== 'melody' && ph !== 'finale')) return;
      const seq = ph === 'melody' ? g.melody : g.finale;
      const eq = (a, b) => (ph === 'melody' ? a === b : ((a % 12) + 12) % 12 === b);
      if (eq(midi, seq[st.p.idx])) {
        st.p.idx++;
        if (st.p.idx >= seq.length) { this.solve(); return; }
      } else {
        const was = st.p.idx;
        st.p.idx = eq(midi, seq[0]) ? 1 : 0;
        if (was > 0) this.sound('fizzle');
      }
      this.changed();
    }
    scan(role, raw) {
      const st = this.st;
      const code = String(raw || '').toUpperCase().replace(/^LR-/, '').replace(/[^A-Z0-9]/g, '');
      const card = CARDS.find((c) => c.code === code);
      if (!card) { this.flash(role, 'bad', code === TEST_CODE ? 'That is only the test code.' : 'That page means nothing to the house.'); return; }
      if (card.hider === role) { this.flash(role, 'bad', `You hid this page yourself. Put it back for ${NAME[other(role)]}!`); return; }
      if (!(st.phase === 'hunt1' || st.phase === 'hunt2')) { this.flash(role, 'bad', 'The page is blank… for now. Leave it where it was.'); return; }
      if (card.slot === 'II' && st.phase === 'hunt1') {
        if (!st.foundBy[card.code]) { st.foundBy[card.code] = role; this.flash(role, 'good', 'You found a page early! Eleanor lets you keep it. Keep looking for your other one.'); this.sound('ding'); this.changed(); }
        return;
      }
      if (st.foundBy[card.code]) { this.flash(role, 'good', 'You already have this page.'); return; }
      st.foundBy[card.code] = role;
      this.flash(role, 'page', card.code);
      this.sound('page');
      this.changed();
      this.checkHunt();
    }
    hintKey(role) { const ph = this.st.phase; return ph.startsWith('hunt') ? ph + ':' + role : ph; }
    hint(role) {
      const st = this.st, ph = st.phase;
      if (!PUZZLES.includes(ph) || st.solved) return;
      const k = this.hintKey(role);
      const lv = st.hintLv[k] || 0;
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
    tick() {
      const st = this.st;
      if (st.paused) return null;
      if ((st.phase === 'seance' || st.phase === 'release') && !st.solved) {
        const h = st.p.hold;
        if (h.mat && h.emily) {
          const p = (Date.now() - Math.max(h.mat, h.emily)) / 3000;
          if (p >= 1) { this.solve(); return true; }
          return p;
        }
        return 0;
      }
      return null;
    }

    holdProgress() { const h = this.st.p.hold; if (!h || !h.mat || !h.emily) return 0; return Math.min(1, (Date.now() - Math.max(h.mat, h.emily)) / 3000); }

    // ---- end-of-game program ----
    program() {
      const st = this.st, log = st.log || {};
      const rows = PUZZLES.map((ph) => { const e = log[ph] || {}; return { title: STORY[ph].title, act: STORY[ph].act, secs: e.end != null && e.start != null ? Math.max(0, Math.round(e.end - e.start)) : null, hints: e.hints || 0, skipped: !!e.skipped }; });
      return { rows, total: Math.round(this.elapsed()), hints: st.hintsUsed, skips: st.skips, rating: this.rating() };
    }
    rating() {
      const st = this.st, mins = this.elapsed() / 60, score = mins + 3 * st.hintsUsed + 8 * st.skips;
      const tiers = [
        [40, 5, 'Maestro', 'A standing ovation from beyond the grave.'],
        [55, 4, 'Virtuoso', 'Eleanor would have given you a solo.'],
        [70, 3, 'First Chair', 'Steady hands, sharp ears. A fine performance.'],
        [90, 2, 'Section Player', 'You found your way through — with a little help from the conductor.'],
        [Infinity, 1, 'Tone-Deaf Intruder', 'Eleanor is grateful… and only slightly concerned.'],
      ];
      const t = tiers.find((x) => score <= x[0]);
      return { title: t[2], stars: t[1], blurb: t[3], clean: st.hintsUsed === 0 && st.skips === 0 };
    }

    // ---- what each phone sees ----
    viewFor(role) {
      const st = this.st, g = this.g, ph = st.phase, o = other(role);
      const v = {
        role, name: NAME[role], other: NAME[o], phase: ph, solved: st.solved, paused: !!st.paused, canPause: this.canPause(),
        otherConnected: !!st.conn[o], act: (STORY[ph] || {}).act || '', title: (STORY[ph] || {}).title || '',
        prompt: '', info: '', widget: { type: 'watch' },
        pages: Object.keys(st.foundBy).filter((c) => st.foundBy[c] === role).map((c) => Object.assign({ code: c }, g.fragments[c])).sort((a, b) => a.num - b.num),
        hint: null,
      };
      if (PUZZLES.includes(ph) && !st.solved) {
        const lv = st.hintLv[this.hintKey(role)] || 0;
        v.hint = { level: lv, canSkip: lv >= 2 };
      }
      if (ph === 'lobby') { v.widget = { type: 'lobby', ready: !!st.ready[role], otherReady: !!st.ready[o] }; return v; }
      if (ph === 'hide') {
        if (st.hideStep === 'done') { v.widget = { type: 'continue', label: 'Begin the game' }; v.prompt = 'All four pages are hidden. Sit down together in front of the TV.'; }
        else if (st.hideStep === role) { v.widget = { type: 'hideform', rooms: ROOMS, cards: CARDS.filter((c) => c.hider === role).map((c) => c.slot) }; }
        else v.widget = { type: 'wait', text: `${NAME[st.hideStep]} is hiding pages. Stay in the living room and don’t peek!` };
        return v;
      }
      if (ph === 'end') { v.widget = { type: 'end', program: this.program() }; return v; }
      if (st.solved || ph === 'intro') { v.widget = { type: 'continue', label: ph === 'intro' ? 'Enter the house' : 'Continue' }; v.prompt = 'Read the TV together, then continue.'; return v; }

      switch (ph) {
        case 'seance':
        case 'release': {
          v.prompt = ph === 'seance' ? 'Light your candle.' : 'Hold on together.';
          v.widget = { type: 'hold', label: ph === 'seance' ? 'Hold to light' : 'Let her go', mine: !!st.p.hold[role], theirs: !!st.p.hold[o], progress: this.holdProgress() };
          break;
        }
        case 'lock': {
          if (role === 'mat') {
            v.prompt = 'Eleanor’s diary, open to a page of symbols.';
            v.info = `<div class="diary"><div class="diary-h">— my private cipher —</div><div class="glyph-grid">${g.glyphs.map((s, d) => `<div><span class="gl">${s}</span><span class="dg">${d}</span></div>`).join('')}</div></div>`;
          } else {
            v.prompt = 'You lean close to the music box. Above its four dials are carved these marks, left to right:';
            v.info = `<div class="boxmarks">${g.lock.map((d) => `<span>${g.glyphs[d]}</span>`).join('')}</div>`;
          }
          v.widget = { type: 'code', digits: 4, tries: st.p.tries || 0 };
          break;
        }
        case 'hunt1':
        case 'hunt2': {
          const t = this.huntTarget(role);
          const hider = other(role);
          const hide = (st.hides[hider] || {})[t.slot] || {};
          const lv = st.hintLv[this.hintKey(role)] || 0;
          const done = !!st.foundBy[t.code];
          const room = hide.room === 'Other' ? (hide.other || 'somewhere unexpected') : (hide.room || 'somewhere in the house');
          let whisper = '';
          if (lv >= 1) whisper = hide.hint ? `The house whispers: <i>“${esc(hide.hint)}”</i>` : `${NAME[hider]} left no whisper for this one.`;
          if (lv >= 2) whisper += `<br><br>Ask ${NAME[hider]} to guide you — but they may only say <b>“warmer”</b> or <b>“colder.”</b>`;
          v.prompt = done ? `You found your page! Help ${NAME[o]} find theirs.` : 'A page of the Requiem was hidden for you.';
          v.widget = { type: 'hunt', done, room, whisper, otherDone: !!st.foundBy[this.huntTarget(o).code] };
          if (done) v.hint = null;
          break;
        }
        case 'melody':
        case 'finale': {
          v.prompt = ph === 'melody' ? 'Your half of the cracked keyboard. Play the music box tune together.' : 'Play Eleanor’s final four notes, I → IV, together.';
          v.widget = { type: 'keys', keys: role === 'mat' ? MAT_KEYS : EMILY_KEYS, replay: ph === 'melody', progress: st.p.idx, total: (ph === 'melody' ? g.melody : g.finale).length };
          break;
        }
        case 'harmony': {
          const target = role === 'mat' ? g.ghostPc : (g.ghostPc + 7) % 12;
          v.prompt = role === 'mat' ? 'Sing <b>with</b> her — match her note, in any octave.' : 'Sing <b>a perfect fifth above</b> her note, in any octave.';
          v.widget = { type: 'sing', target, ghostPc: g.ghostPc, done: !!st.p.sang[role], otherDone: !!st.p.sang[o] };
          break;
        }
        case 'rhythm': {
          if (role === 'mat') {
            v.prompt = 'Tucked inside the manuscript is a note in Eleanor’s hand:';
            v.info = `<div class="letter"><p>Father taught me that every message is only <b>long</b> and <b>short</b>.</p><p>A note that lasts the whole beat is long. A note that lasts half a beat is short.</p><p>Each bar holds one letter.</p></div>`;
          } else {
            v.prompt = 'In the desk drawer you find her father’s telegraph chart:';
            v.info = `<div class="morse">${Object.keys(MORSE).map((k) => `<div><b>${k}</b><span>${MORSE[k].replace(/\./g, '•').replace(/-/g, '▬')}</span></div>`).join('')}</div>`;
          }
          v.widget = { type: 'word', tries: st.p.tries || 0 };
          break;
        }
        case 'portraits': {
          const f = g.family;
          const clues = role === 'mat'
            ? [`${f.A.name} always sat directly beside the ${f.C.player}.`, `The ${f.B.player} insisted on an end chair.`, `${f.D.name} refused to sit next to ${f.C.name}.`]
            : [`The ${f.C.player} sat somewhere to the left of the ${f.D.player}.`, `${f.B.name} never once sat in chair 1.`, `The ${f.B.player} and ${f.A.name} quarreled, and never sat side by side.`];
          v.prompt = 'What you remember Eleanor telling you about her family:';
          v.info = `<ol class="clues">${clues.map((c) => `<li>${c}</li>`).join('')}</ol>`;
          v.widget = { type: 'chairs', names: ['A', 'B', 'C', 'D'].map((k) => f[k].name).sort(), tries: st.p.tries || 0 };
          break;
        }
      }
      return v;
    }
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  window.Game = Game;
  window.GameData = { STORY, HINTS, PHASES, PUZZLES, NAME, MORSE, PC_NAME, NUMERALS, other, esc };
})();
