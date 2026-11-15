// TV / host controller. ⚠️ Contains spoilers via game.js.
(function () {
  const { STORY, NAME, NUMERALS, PC_NAME, esc } = GameData;
  const $ = (s) => document.querySelector(s);
  const ROLES = ['mat', 'emily'];
  const ROOM_KEY = 'lr-room', STATE_KEY = 'lr-state';

  // ---------- room code & state ----------
  let room = localStorage.getItem(ROOM_KEY);
  if (!room) { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; room = Array.from({ length: 4 }, () => A[(Math.random() * A.length) | 0]).join(''); localStorage.setItem(ROOM_KEY, room); }
  let saved = null; try { saved = JSON.parse(localStorage.getItem(STATE_KEY) || 'null'); } catch (e) {}
  const game = new Game(saved);
  const joinUrl = new URL('play.html?r=' + room, location.href).href;

  // ---------- networking ----------
  const roleConn = { mat: null, emily: null };
  const lastSeen = { mat: 0, emily: 0 };
  let netStatus = { text: '', ok: false };
  const host = new Net.Host(room, {
    onStatus(text, ok) { netStatus = { text, ok }; const el = $('#netstatus'); if (el) { el.textContent = ok ? `Ready for phones · room ${room}` : text; el.className = 'status' + (ok ? ' ok' : ''); } },
    onMessage(conn, m) {
      if (m.t === 'hello') {
        if (!ROLES.includes(m.role)) return;
        const old = roleConn[m.role];
        if (old && old !== conn) { host.send(old, { t: 'replaced' }); setTimeout(() => { try { old.close(); } catch (e) {} }, 300); }
        roleConn[m.role] = conn; conn._role = m.role; lastSeen[m.role] = Date.now();
        setConn(m.role, true); sendView(m.role);
        return;
      }
      const role = conn._role; if (!role) return;
      lastSeen[role] = Date.now();
      if (!game.st.conn[role]) setConn(role, true);
      if (m.t === 'ping') { host.send(conn, { t: 'pong' }); return; }
      game.handle(role, m);
    },
    onClose(conn) { if (conn._role && roleConn[conn._role] === conn) { roleConn[conn._role] = null; setConn(conn._role, false); } },
  });
  function setConn(role, on) { if (game.st.conn[role] !== on) { game.st.conn[role] = on; onChange(); } }
  setInterval(() => { ROLES.forEach((r) => { if (game.st.conn[r] && Date.now() - lastSeen[r] > 14000) { setConn(r, false); } }); }, 3000);

  function sendView(role) { const c = roleConn[role]; if (c) host.send(c, { t: 'view', view: game.viewFor(role) }); }
  function broadcast() { ROLES.forEach(sendView); }

  // ---------- game events ----------
  function onChange() {
    try { localStorage.setItem(STATE_KEY, JSON.stringify(game.st)); } catch (e) {}
    broadcast(); render();
  }
  game.on('change', onChange);
  game.on('flash', ({ role, kind, text }) => {
    ROLES.forEach((r) => { if (!role || role === r) { const c = roleConn[r]; if (c) host.send(c, { t: 'flash', kind, text }); } });
    if (!role && kind === 'bad') showFlash(text);
  });
  game.on('pause', (on) => { applyPauseAudio(on); });
  function applyPauseAudio(on) {
    if (!Sound.unlocked()) return;
    if (on) { AudioBank.setDuck(0.18); if (Sound.ambientOn()) Sound.startAmbient(0.25); }
    else applyMusic();
  }
  game.on('shake', () => { const s = $('#stage'); s.classList.remove('shake'); void s.offsetWidth; s.classList.add('shake'); });
  game.on('sound', ({ name, arg }) => {
    if (name === 'solve' || name === 'bigsolve') Scenes.shimmer();
    if (name === 'wrong') { Scenes.lightning(); if (Sound.unlocked()) Sound.thunder(0.35); }
    if (name === 'hint') Scenes.ghost('left', 8000, .55);
    playSound(name, arg);
  });

  function ghostMidi(pc) { return pc <= 5 ? 60 + pc : 48 + pc; }

  // ---------- music & custom sounds (see Soundboard) ----------
  const MUSIC_FOR = { lobby: 'music_title', hide: 'music_hiding', intro: 'music_act1', seance: 'music_act1', lock: 'music_act1', hunt1: 'music_act1', melody: 'music_act2', harmony: 'music_act2', rhythm: 'music_act2', hunt2: 'music_act2', portraits: 'music_act3', finale: 'music_act3', release: 'music_act3' };
  const DUCK = { melody: 0.12, harmony: 0.05, finale: 0.12, release: 0.6 };
  const SYNTH_LEVEL = { hide: 0.5, release: 0.6 };
  function applyMusic() {
    if (!Sound.unlocked()) return;
    const ph = game.st.phase;
    if (ph === 'end') return;
    AudioBank.setDuck(DUCK[ph] || 1);
    const id = MUSIC_FOR[ph];
    if (id && AudioBank.has(id)) { Sound.stopAmbient(); AudioBank.music(id); }
    else { AudioBank.stopMusic(); if (ph === 'lobby') Sound.stopAmbient(); else Sound.startAmbient(SYNTH_LEVEL[ph] || 1); }
  }
  AudioBank.loadAll().then(applyMusic);
  AudioBank.onChange = (slot) => { if (slot.kind === 'music') { AudioBank.stopMusic(0.5); setTimeout(applyMusic, 700); } };
  const fx = (id, fallback) => { if (!AudioBank.sfx(id)) fallback(); };
  setInterval(() => {
    const ph = game.st.phase;
    if (!Sound.unlocked() || ph === 'lobby' || ph === 'end' || Math.random() > 0.15) return;
    const house = ['sfx_house1', 'sfx_house2', 'sfx_house3'].filter(AudioBank.has);
    if (house.length) AudioBank.sfx(house[(Math.random() * house.length) | 0]);
    else if (!Sound.ambientOn()) Sound.creak();
  }, 7000);

  function playSound(name, arg) {
    if (!Sound.unlocked()) return;
    switch (name) {
      case 'enter':
        applyMusic();
        if (arg === 'intro') fx('sfx_transition', () => Sound.whoosh(0.25));
        else if (arg === 'seance') fx('sfx_heartbeat', Sound.heartbeat);
        else if (arg === 'melody') setTimeout(() => Sound.melody(game.g.melody), 2500);
        else if (arg === 'harmony') setTimeout(() => Sound.hum(ghostMidi(game.g.ghostPc), 4.5), 2000);
        else if (arg === 'hunt1' || arg === 'hunt2') fx('sfx_transition', () => Sound.whoosh(0.2));
        else if (arg === 'rhythm' || arg === 'portraits') fx('sfx_transition', Sound.creak);
        else if (arg === 'release') fx('sfx_heartbeat', Sound.heartbeat);
        break;
      case 'solve': fx('sfx_solve', Sound.chime); break;
      case 'bigsolve': fx('sfx_climax', Sound.bigChime); break;
      case 'ending': {
        fx('sfx_climax', Sound.bigChime);
        setTimeout(() => { Sound.stopAmbient(); AudioBank.stopMusic(3); }, 2500);
        const notes = [...game.g.melody, ...game.g.finale.map((pc) => 60 + pc)];
        setTimeout(() => Sound.melody(notes, 0.7), 4500);
        setTimeout(() => { AudioBank.setDuck(1); AudioBank.music('music_ending'); }, 4500 + notes.length * 700 + 2000);
        break;
      }
      case 'wrong': fx('sfx_wrong', Sound.wrong); break;
      case 'fizzle': fx('sfx_reset', () => Sound.bell(48, 0, 0.8, 0.15)); break;
      case 'ding': fx('sfx_progress', () => Sound.bell(79, 0, 1.5, 0.25)); break;
      case 'page': fx('sfx_page', () => { [67, 71, 74, 79].forEach((m, i) => Sound.bell(m, i * 0.12, 2, 0.2)); Sound.whoosh(0.12); }); break;
      case 'hint': fx('sfx_hint', () => Sound.whoosh(0.18)); break;
      case 'test': fx('sfx_test', Sound.chime); break;
      case 'melody': Sound.melody(arg); break;
      case 'hum': Sound.hum(ghostMidi(arg), 4.5); break;
    }
  }


  // ---------- rendering ----------
  let lastKey = '', lastPhase = null;
  function render() {
    const st = game.st;
    const key = [st.phase, st.solved, st.hideStep].join('|');
    if (key !== lastKey) {
      const first = lastKey === '';
      lastKey = key;
      const scene = Scenes.sceneForPhase(st.phase);
      const phaseChanged = st.phase !== lastPhase; lastPhase = st.phase;
      const show = () => { Scenes.setScene(scene, first); renderStage(); stageMoments(st.phase, st.solved); updateDynamic(); };
      if (first) show();
      else if (phaseChanged) Scenes.transition(scene !== Scenes.current ? 'ink' : 'snuff', show);
      else show();
    }
    updateDynamic();
  }
  // Eleanor's appearances tied to story beats
  let momentT = 0;
  function stageMoments(ph, solved) {
    clearTimeout(momentT);
    if (ph === 'intro') { Scenes.hideGhost(); momentT = setTimeout(() => Scenes.ghost('right', 12000, .8), 5200); }
    else if (ph === 'release' && !solved) Scenes.ghost('center', 0, 1);
    else if (ph === 'end') { Scenes.ghost('center', 0, 1); momentT = setTimeout(() => Scenes.hideGhost(true), 2600); }
    else if (solved) momentT = setTimeout(() => Scenes.ghost(Math.random() < .5 ? 'left' : 'right', 7000, .65), 600);
    else Scenes.hideGhost(); // she keeps out of the way while you work
  }
  function storyBlock(ph, withPrompt) {
    const s = STORY[ph];
    return `<h2 class="scene-title fadein">${s.title}</h2><div class="narr">${s.text.map((t) => `<p>${t}</p>`).join('')}</div>${withPrompt ? `<div class="prompt fadein" style="animation-delay:2s">${withPrompt}</div>` : ''}`;
  }
  function qrSVG(text, cell) { const q = qrcode(0, 'M'); q.addData(text); q.make(); return q.createSvgTag({ cellSize: cell || 6, margin: 1, scalable: true }); }

  function renderStage() {
    const st = game.st, g = game.g, ph = st.phase, el = $('#stage');
    $('#act').textContent = (STORY[ph] || {}).act || '';
    if (ph === 'lobby') {
      el.innerHTML = `<div class="lobby fadein">
        <div style="text-align:left">
          <h1>The Last<br>Recital</h1>
          <div class="sub">A haunted escape room for two · about an hour</div>
          <div class="slots"><div class="slot" id="slot-mat"><div class="n">Mat</div><div class="s">not joined</div></div><div class="slot" id="slot-emily"><div class="n">Emily</div><div class="s">not joined</div></div></div>
          <div class="btns">
            <a class="btn" href="cards.html" target="_blank">Print the pages</a>
            <button class="btn" id="fs">Full screen</button>
            <a class="btn small" href="soundboard.html" target="_blank">Soundboard</a>
            <button class="btn small" id="newgame">New game (fresh puzzles)</button>
          </div>
          <div class="testbox"><div>Systems check: on each phone, tap <b>Test camera</b> and point it at one of the printed pages, <b>Test microphone</b> and hum, and <b>Test TV sound</b>. These checks reveal nothing about the game.</div></div>
          <div class="note-sm">When you’re both joined and ready, tap <b>We’re ready</b> on your phones. · <a href="blackwood.html" style="color:var(--dim)">Another case: Death at Blackwood Hall →</a></div>
        </div>
        <div style="text-align:center">
          <div class="join"><div class="qr">${qrSVG(joinUrl, 6)}</div><div class="code">Scan to join · ${room}</div></div>
          <div id="netstatus" class="status${netStatus.ok ? ' ok' : ''}">${netStatus.ok ? `Ready for phones · room ${room}` : netStatus.text}</div>
        </div>
      </div>`;
      $('#fs').onclick = () => { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); };
      $('#newgame').onclick = () => { if (confirm('Start over with freshly randomized puzzles?')) restart(); };
      return;
    }
    if (ph === 'hide') {
      el.innerHTML = st.hideStep === 'done'
        ? `<h2 class="scene-title fadein">The house is ready</h2><div class="narr"><p>Every page is hidden. Sit together in front of the screen.</p><p>Turn the lights down low. Keep your phones in hand.</p></div><div class="prompt fadein" style="animation-delay:2s">Tap “Begin the game” on either phone</div>`
        : `<h2 class="scene-title fadein">Preparing the house…</h2><div class="narr"><p><b>${NAME[st.hideStep]}</b> is hiding two pages somewhere in the house.</p><p>${NAME[GameData.other(st.hideStep)]} — stay here, and no peeking.</p></div><div class="prompt fadein">Follow the instructions on ${NAME[st.hideStep]}’s phone</div>`;
      return;
    }
    if (ph === 'end') {
      const secs = Math.round(game.elapsed());
      el.innerHTML = `${storyBlock('end')}<div class="endstats fadein" style="animation-delay:4.5s"><div><b>${fmt(secs)}</b><span>ESCAPE TIME</span></div><div><b>${st.hintsUsed}</b><span>HINTS</span></div><div><b>${st.skips}</b><span>SKIPS</span></div></div>`;
      // after the epilogue, the evening's concert program
      const delay = Math.max(0, 13000 - (Date.now() - st.endedAt));
      clearTimeout(programT);
      programT = setTimeout(() => { if (game.st.phase === 'end') Scenes.transition('snuff', () => { el.innerHTML = programHTML(game.program()); }); }, delay);
      return;
    }
    if (ph === 'intro') { el.innerHTML = storyBlock('intro', 'Tap “Enter the house” when you’re ready'); return; }
    if (st.solved) {
      const a = STORY[ph].after; const txt = typeof a === 'function' ? a(g) : a;
      el.innerHTML = `<div class="after fadein"><div class="solved-mark">✦ ${STORY[ph].title.toUpperCase()} ✦</div>${txt}<div class="cont">CONTINUE ON EITHER PHONE</div></div>`;
      return;
    }
    let vis = '', prompt = '';
    switch (ph) {
      case 'seance':
      case 'release':
        prompt = ph === 'seance' ? 'Light the candles — together' : 'Hold on together';
        vis = `<div><div class="candles">${ROLES.map((r) => `<div class="candle-wrap" id="cw-${r}"><div class="candle" id="cd-${r}"><div class="wick"></div><div class="flame"></div><div class="wax"></div></div><div class="lbl">${NAME[r]}</div></div>`).join('')}</div><div class="holdbar"><div id="holdbar"></div></div></div>`;
        break;
      case 'lock':
        prompt = 'Open the music box';
        vis = `<div><div class="musicbox"><div class="box-lid"></div><div class="box-body">${[0, 1, 2, 3].map(() => '<div class="dial">?</div>').join('')}</div></div><div class="tries" id="tries"></div></div>`;
        break;
      case 'hunt1':
      case 'hunt2':
        prompt = 'Search the house · follow your phones';
        vis = `<div class="pages">${ROLES.map((r) => `<div style="text-align:center"><div class="page-ico" id="pg-${r}">?</div><div class="page-who">${NAME[r]}’s page</div></div>`).join('')}</div>`;
        break;
      case 'melody':
        prompt = 'Play the music box tune together';
        vis = `<div><div class="piano">${pianoHTML()}</div><div class="orbs" id="orbs">${g.melody.map(() => '<div class="orb"></div>').join('')}</div></div>`;
        break;
      case 'harmony':
        prompt = 'Sing with her';
        vis = `<div class="voices"><div class="voice" id="v-mat"><div class="wave">Mat</div></div><div class="voice ghost"><div class="wave">Eleanor</div></div><div class="voice" id="v-emily"><div class="wave">Emily</div></div></div>`;
        break;
      case 'rhythm':
        prompt = 'Decode the word';
        vis = `<div><div class="parchment"><div class="ms-title">Requiem — for my father</div>${Notation.rhythmSVG(g.word.split('').map((ch) => GameData.MORSE[ch].split('').map((x) => (x === '-' ? 'q' : 'e'))))}</div><div class="tries" id="tries"></div></div>`;
        break;
      case 'portraits': {
        const f = g.family;
        const fam = ['A', 'B', 'C', 'D'].map((k) => f[k]).sort((a, b) => a.name.localeCompare(b.name));
        prompt = 'Seat the family where they belong';
        vis = `<div><div class="family">${fam.map((p) => `<div class="portrait"><div class="frame"><span class="cinzel">${p.name[0]}</span></div><div class="pn">${p.name}</div><div class="pi">${p.inst}</div></div>`).join('')}</div><div class="note-sm">The portraits are leaning against the wall in no particular order. The four chairs behind them are numbered 1 to 4, from left to right.</div><div class="tries" id="tries"></div></div>`;
        break;
      }
      case 'finale':
        prompt = 'Play the Requiem’s final notes';
        vis = `<div><div class="piano">${pianoHTML()}</div><div class="orbs" id="orbs">${NUMERALS.map((n) => `<div class="orb">${n}</div>`).join('')}</div></div>`;
        break;
    }
    el.innerHTML = `${storyBlock(ph)}<div class="visual fadein" style="animation-delay:1.6s">${vis}</div><div class="prompt fadein" style="animation-delay:2.2s">${prompt}</div>`;
  }
  let programT = 0;
  function programHTML(pr) {
    const stars = '★'.repeat(pr.rating.stars) + '<span class="dim">' + '★'.repeat(5 - pr.rating.stars) + '</span>';
    let lastAct = '';
    const rows = pr.rows.map((r) => {
      const act = r.act !== lastAct ? `<div class="pg-act">${r.act}</div>` : ''; lastAct = r.act;
      const marks = (r.hints ? `<span class="pg-h">${'♪'.repeat(r.hints)}</span>` : '') + (r.skipped ? '<span class="pg-s">with Eleanor’s help</span>' : '');
      return `${act}<div class="pg-row"><span class="pg-t">${r.title}</span>${marks}<span class="pg-dots"></span><span class="pg-time">${r.secs == null ? '—' : fmt(r.secs)}</span></div>`;
    }).join('');
    return `<div class="program fadein">
      <div class="pg-head">The Vane House · Savannah</div>
      <div class="pg-title">The Last Recital</div>
      <div class="pg-sub">performed tonight by <b>Mat</b> &amp; <b>Emily</b></div>
      <div class="pg-rule"></div>
      <div class="pg-body">
        <div class="pg-rows">${rows}</div>
        <div class="pg-side">
          <div class="pg-total"><span>Total performance</span><b>${fmt(pr.total)}</b></div>
          <div class="pg-meta">${pr.hints} hint${pr.hints === 1 ? '' : 's'} (♪) · ${pr.skips} skip${pr.skips === 1 ? '' : 's'}${pr.rating.clean ? '<br><b>No hints at all — you sight-read the whole thing!</b>' : ''}</div>
          <div class="pg-review"><div class="pg-stars">${stars}</div><div class="pg-rank">${pr.rating.title}</div><div class="pg-blurb">“${pr.rating.blurb}”</div><div class="pg-critic">— The Savannah Spectral Review</div></div>
        </div>
      </div>
    </div>`;
  }
  function pianoHTML() {
    const keys = [60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72];
    return keys.map((m) => (m === 66 ? '<div class="crack"></div>' : '') + `<div class="k${[1, 3, 6, 8, 10].includes(m % 12) ? ' b' : ''}"></div>`).join('');
  }
  function instIcon(inst) { return `<span class="music-glyph">${{ Violin: '𝄞', Viola: '𝄡', Cello: '𝄢', Piano: '𝄐' }[inst] || ''}</span>`; }

  let lastIdx = 0;
  function updateDynamic() {
    const st = game.st, ph = st.phase;
    ROLES.forEach((r) => {
      $('#dot-' + r).classList.toggle('on', !!st.conn[r]);
      const slot = $('#slot-' + r);
      if (slot) {
        slot.classList.toggle('on', !!st.conn[r]); slot.classList.toggle('ready', !!st.ready[r]);
        slot.querySelector('.s').textContent = st.ready[r] ? 'ready' : st.conn[r] ? 'joined' : 'not joined';
      }
    });
    $('#hintcount').textContent = st.startedAt ? `Hints ${st.hintsUsed}` : '';
    if (ph === 'seance' || ph === 'release') ROLES.forEach((r) => {
      const held = !!(st.p.hold && st.p.hold[r]);
      const cw = $('#cw-' + r); if (cw) cw.classList.toggle('held', held);
      const cd = $('#cd-' + r); if (cd) cd.classList.toggle('lit', held);
    });
    if (ph === 'hunt1' || ph === 'hunt2') ROLES.forEach((r) => {
      const el = $('#pg-' + r); if (!el) return;
      const t = game.huntTarget(r); const f = !!st.foundBy[t.code];
      el.classList.toggle('found', f); el.textContent = f ? 'found' : '?';
    });
    if (ph === 'melody' || ph === 'finale') {
      const orbs = document.querySelectorAll('#orbs .orb');
      orbs.forEach((o, i) => o.classList.toggle('on', i < (st.p.idx || 0)));
      const wrap = $('#orbs');
      if (wrap && (st.p.idx || 0) < lastIdx && !st.solved) { wrap.classList.remove('fizz'); void wrap.offsetWidth; wrap.classList.add('fizz'); }
      lastIdx = st.p.idx || 0;
    }
    if (ph === 'harmony') ROLES.forEach((r) => { const v = $('#v-' + r); if (v) { v.classList.toggle('done', !!st.p.sang[r]); v.querySelector('.wave').textContent = st.p.sang[r] ? `${NAME[r]} ✓` : NAME[r]; } });
    const tr = $('#tries'); if (tr) tr.textContent = st.p.tries ? `Failed attempts: ${st.p.tries}` : '';
    $('#paused').classList.toggle('hidden', !st.paused);
    renderBanner();
    const h = $('#hint');
    if (st.lastHint && !st.solved) { h.innerHTML = `<b>ELEANOR WHISPERS · HINT ${st.lastHint.level} OF 2</b>${st.lastHint.text}`; h.classList.remove('hidden'); }
    else h.classList.add('hidden');
  }

  // Connection banner: only after a short grace period, so brief blips don't flash on screen
  const lostSince = { net: 0, mat: 0, emily: 0 };
  function renderBanner() {
    const st = game.st, now = Date.now(), b = $('#banner'); if (!b) return;
    const inGame = st.phase !== 'lobby';
    lostSince.net = netStatus.ok ? 0 : (lostSince.net || now);
    ROLES.forEach((r) => { lostSince[r] = st.conn[r] || !inGame ? 0 : (lostSince[r] || now); });
    const msgs = [];
    if (lostSince.net && now - lostSince.net > 4000) msgs.push('Reconnecting to the connection service… Your progress is saved.');
    ROLES.forEach((r) => { if (lostSince[r] && now - lostSince[r] > 4000) msgs.push(`${NAME[r]}’s phone lost its connection. Reopen the game page on that phone — progress is saved.`); });
    b.innerHTML = msgs.join('<br>'); b.classList.toggle('hidden', !msgs.length);
  }
  function fmt(secs) { const neg = secs < 0; secs = Math.abs(secs); return (neg ? '+' : '') + Math.floor(secs / 60) + ':' + String(secs % 60).padStart(2, '0'); }
  let flashT = 0;
  function showFlash(text) { const f = $('#flash'); f.textContent = text; f.classList.add('show'); clearTimeout(flashT); flashT = setTimeout(() => f.classList.remove('show'), 2600); }

  // timer + hold loop
  let lastProgSent = 0;
  setInterval(() => {
    const st = game.st, t = $('#timer');
    if (st.startedAt) {
      const el = st.endedAt ? Math.round(game.elapsed()) : Math.floor(game.elapsed());
      const left = 60 * 60 - el;
      t.textContent = st.endedAt ? fmt(el) : (left >= 0 ? fmt(left) : fmt(-left));
      t.classList.toggle('over', left < 0 && !st.endedAt);
      Scenes.tension(st.endedAt ? 0 : left < 0 ? 2 : left < 600 ? 1 : 0);
      t.title = left < 0 ? 'Over the hour — keep going!' : 'Time remaining';
      t.classList.toggle('paused', !!st.paused);
    } else t.textContent = '';
    renderBanner();
    const p = game.tick();
    if (typeof p === 'number') {
      const b = $('#holdbar'); if (b) b.style.width = Math.round(p * 100) + '%';
      if (Date.now() - lastProgSent > 200) { lastProgSent = Date.now(); ROLES.forEach((r) => { const c = roleConn[r]; if (c) host.send(c, { t: 'prog', p }); }); }
    }
  }, 100);

  function restart() {
    localStorage.removeItem(STATE_KEY);
    const conn = game.st.conn;
    game.st = Game.fresh(); game.st.conn = conn;
    lastKey = ''; onChange(); applyMusic();
  }

  $('#gear').onclick = () => {
    const c = prompt('Game menu:\n1 = Restart from the lobby (fresh puzzles)\n2 = Replay the current sound\n3 = Pause / resume\n\nType a number:');
    if (c === '3') game.setPaused(!game.st.paused);
    if (c === '1' && confirm('Really restart? Progress will be lost.')) restart();
    if (c === '2') { const ph = game.st.phase; if (ph === 'melody') playSound('melody', game.g.melody); if (ph === 'harmony') playSound('hum', game.g.ghostPc); }
  };
  document.addEventListener('keydown', (e) => { if ((e.key === 'p' || e.key === 'P') && !e.metaKey && !e.ctrlKey) game.setPaused(!game.st.paused); });
  // keep the Mac's screen awake while the game is open (otherwise the cast can drop)
  let wakeLock = null;
  async function keepAwake() { try { if ('wakeLock' in navigator && !wakeLock && document.visibilityState === 'visible') { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); } } catch (e) {} }
  document.addEventListener('visibilitychange', keepAwake);
  // Opening: the house sits dark until you wake it; then thunder, lightning, and the lights come on one by one
  function lightsOff() { document.querySelectorAll('#scene .flick-win, #scene .flick, #scene .flame-shape').forEach((e) => e.classList.add('off')); }
  function lightsOn() {
    const els = [...document.querySelectorAll('#scene .off')];
    const groups = []; els.forEach((e) => { const k = Math.round((e.getBBox ? (e.getBBox().x || 0) : 0) / 120); (groups[k] = groups[k] || []).push(e); });
    groups.filter(Boolean).forEach((g, i) => setTimeout(() => g.forEach((e) => { e.classList.remove('off'); e.classList.add('ignite'); setTimeout(() => e.classList.remove('ignite'), 950); }), 250 + i * 420));
  }
  setTimeout(lightsOff, 30);
  $('#wakebtn').onclick = () => {
    keepAwake();
    Sound.ensure();
    Sound.ctx().resume().then(() => {
      Sound.thunder(0.55); Scenes.lightning();
      setTimeout(() => { applyMusic(); if (game.st.paused) applyPauseAudio(true); }, 1400);
    }, applyMusic);
    $('#wake').classList.add('leaving');
    setTimeout(() => document.body.classList.remove('asleep'), 1200);
    setTimeout(lightsOn, 900);
    setTimeout(() => { const w = $('#wake'); if (w) w.remove(); }, 2000);
  };
  render();
  // expose for automated tests only
  window.__game = game;
})();
