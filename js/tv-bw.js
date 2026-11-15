// TV / host controller for Death at Blackwood Hall. ⚠️ Contains spoilers via blackwood.js.
(function () {
  const { STORY, NAME, SUSPECTS, WEAPONS, S, W, ROMAN, fmtT, esc } = BWData;
  const $ = (s) => document.querySelector(s);
  const ROLES = ['mat', 'emily'];
  const ROOM_KEY = 'bw-room', STATE_KEY = 'bw-state';
  Scenes.setPhaseMap({ lobby: 'manor', hide: 'hallway', intro: 'manor', roles: 'library', body: 'library', letter: 'library', hunt1: 'hallway', interview: 'drawing', diary: 'study', hunt2: 'hallway', accuse: 'library', end: 'manordawn' });

  // ---------- room code & state ----------
  let room = localStorage.getItem(ROOM_KEY);
  if (!room) { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; room = Array.from({ length: 4 }, () => A[(Math.random() * A.length) | 0]).join(''); localStorage.setItem(ROOM_KEY, room); }
  let saved = null; try { saved = JSON.parse(localStorage.getItem(STATE_KEY) || 'null'); } catch (e) {}
  const game = new BWGame(saved);
  const joinUrl = new URL('play.html?r=' + room + '&g=bw', location.href).href;

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
        if (m.name) game.setName(m.role, m.name);
        setConn(m.role, true); sendView(m.role);
        return;
      }
      const role = conn._role; if (!role) return;
      lastSeen[role] = Date.now();
      if (!game.st.conn[role]) setConn(role, true);
      if (m.t === 'ping') { host.send(conn, { t: 'pong' }); return; }
      if (m.t === 'name') { game.setName(role, m.name); return; }
      game.handle(role, m);
    },
    onClose(conn) { if (conn._role && roleConn[conn._role] === conn) { roleConn[conn._role] = null; setConn(conn._role, false); } },
  }, Net.PREFIXES.bw);
  function setConn(role, on) { if (game.st.conn[role] !== on) { game.st.conn[role] = on; onChange(); } }
  setInterval(() => { ROLES.forEach((r) => { if (game.st.conn[r] && Date.now() - lastSeen[r] > 14000) setConn(r, false); }); }, 3000);
  function sendView(role) { const c = roleConn[role]; if (c) host.send(c, { t: 'view', view: game.viewFor(role) }); }
  function broadcast() { ROLES.forEach(sendView); }

  // ---------- game events ----------
  function onChange() { try { localStorage.setItem(STATE_KEY, JSON.stringify(game.st)); } catch (e) {} broadcast(); render(); }
  game.on('change', onChange);
  game.on('flash', ({ role, kind, text }) => {
    ROLES.forEach((r) => { if (!role || role === r) { const c = roleConn[r]; if (c) host.send(c, { t: 'flash', kind, text }); } });
    if (!role && kind === 'bad') showFlash(text);
  });
  game.on('pause', (on) => applyPauseAudio(on));
  game.on('shake', () => { const s = $('#stage'); s.classList.remove('shake'); void s.offsetWidth; s.classList.add('shake'); });
  game.on('sound', ({ name, arg }) => {
    if (name === 'solve' || name === 'bigsolve') Scenes.shimmer();
    if (name === 'wrong') strike(0.4);
    playSound(name, arg);
  });
  function strike(vol) { Scenes.lightning(); if (Sound.unlocked() && !AudioBank.sfx('sfx_house1', vol * 1.6)) Sound.thunder(vol); }

  // ---------- music & sound ----------
  const MUSIC_FOR = { lobby: 'music_title', hide: 'music_hiding', intro: 'music_act1', roles: 'music_act1', body: 'music_act1', letter: 'music_act1', hunt1: 'music_act2', interview: 'music_act2', diary: 'music_act2', hunt2: 'music_act3', accuse: 'music_act3' };
  function applyPauseAudio(on) {
    if (!Sound.unlocked()) return;
    if (on) { AudioBank.setDuck(0.18); if (Sound.ambientOn()) Sound.startAmbient(0.25); AudioBank.playingAmb().forEach((id) => AudioBank.ambSet(id, 0.3)); }
    else applyMusic();
  }
  // the storm bed: your recorded rain/thunder loops if present, otherwise synthesized rain
  function storm(level) {
    if (AudioBank.has('amb_rain')) { Sound.stopRain(); AudioBank.ambStart('amb_rain', level); } else Sound.startRain(level);
    if (AudioBank.has('amb_thunder')) AudioBank.ambStart('amb_thunder', level);
  }
  function applyMusic() {
    if (!Sound.unlocked()) return;
    const ph = game.st.phase;
    if (ph === 'end') return;
    AudioBank.setDuck(1);
    storm(ph === 'lobby' || ph === 'intro' ? 1 : 0.65);
    const id = MUSIC_FOR[ph];
    if (id && AudioBank.has(id)) { Sound.stopAmbient(); AudioBank.music(id); }
    else { AudioBank.stopMusic(); if (ph === 'lobby') Sound.stopAmbient(); else Sound.startAmbient(ph === 'accuse' ? 0.9 : 0.6); }
  }
  AudioBank.loadAll().then(applyMusic);
  AudioBank.onChange = (slot) => { if (slot.kind === 'music' || slot.kind === 'ambience') { AudioBank.stopMusic(0.5); AudioBank.ambStop(slot.id, 0.5); setTimeout(applyMusic, 700); } };
  const fx = (id, fallback) => { if (!AudioBank.sfx(id)) fallback(); };
  // the storm: random thunder and lightning, creaks and wind
  setInterval(() => {
    const ph = game.st.phase;
    if (!Sound.unlocked() || ph === 'end' || game.st.paused || Math.random() > 0.16) return;
    const r = Math.random();
    if (r < 0.45) strike(0.3);
    else { const pick = ['sfx_house2', 'sfx_house3'].filter(AudioBank.has); if (pick.length) AudioBank.sfx(pick[(Math.random() * pick.length) | 0]); }
  }, 7000);
  function playSound(name) {
    if (!Sound.unlocked()) return;
    switch (name) {
      case 'enter': applyMusic(); fx('sfx_transition', () => Sound.whoosh(0.2)); if (game.st.phase === 'accuse') fx('sfx_heartbeat', Sound.heartbeat); break;
      case 'solve': fx('sfx_solve', Sound.chime); break;
      case 'bigsolve': fx('sfx_climax', Sound.bigChime); break;
      case 'ending': setTimeout(() => { Sound.stopAmbient(); AudioBank.stopMusic(3); AudioBank.ambStop('amb_thunder', 6); if (AudioBank.has('amb_rain')) AudioBank.ambSet('amb_rain', 0.3); else Sound.startRain(0.25); }, 2500); setTimeout(() => { AudioBank.setDuck(1); AudioBank.music('music_ending'); }, 6000); break;
      case 'wrong': fx('sfx_wrong', Sound.wrong); break;
      case 'ding': fx('sfx_progress', () => Sound.bell(79, 0, 1.5, 0.25)); break;
      case 'page': fx('sfx_page', () => { [67, 71, 74, 79].forEach((m, i) => Sound.bell(m, i * 0.12, 2, 0.2)); Sound.whoosh(0.12); }); break;
      case 'hint': fx('sfx_hint', () => Sound.whoosh(0.18)); break;
      case 'test': fx('sfx_test', Sound.chime); break;
    }
  }

  // ---------- rendering ----------
  let lastKey = '', lastPhase = null;
  function render() {
    const st = game.st, key = [st.phase, st.solved, st.hideStep].join('|');
    if (key !== lastKey) {
      const first = lastKey === '';
      lastKey = key;
      const scene = Scenes.sceneForPhase(st.phase);
      const phaseChanged = st.phase !== lastPhase; lastPhase = st.phase;
      const show = () => { Scenes.setScene(scene, first); renderStage(); moments(st.phase, st.solved); updateDynamic(); };
      if (first) show();
      else if (phaseChanged) Scenes.transition(scene !== Scenes.current ? 'ink' : 'snuff', show);
      else show();
    }
    updateDynamic();
  }
  let momentT = 0;
  function moments(ph, solved) {
    clearTimeout(momentT);
    if (ph === 'intro') momentT = setTimeout(() => strike(0.5), 6500);
    else if (ph === 'accuse' && !solved) momentT = setTimeout(() => strike(0.4), 2500);
  }
  function storyBlock(title, paras, prompt) {
    return `<h2 class="scene-title fadein">${title}</h2><div class="narr">${paras.map((t) => `<p>${t}</p>`).join('')}</div>${prompt ? `<div class="prompt fadein" style="animation-delay:2s">${prompt}</div>` : ''}`;
  }
  function qrSVG(text, cell) { const q = qrcode(0, 'M'); q.addData(text); q.make(); return q.createSvgTag({ cellSize: cell || 6, margin: 1, scalable: true }); }
  const suspectCard = (s, extra) => `<div class="suspect" data-s="${s.id}"><div class="sp-face"><span class="cinzel">${s.short.replace(/^(Lady|Captain|Miss|Mr\.|Mrs\.) /, '')[0]}</span></div><div class="sp-name">${s.short}</div><div class="sp-role">${s.role}</div>${extra || ''}</div>`;

  function renderStage() {
    const st = game.st, g = game.g, ph = st.phase, el = $('#stage');
    $('#act').textContent = (STORY[ph] || {}).act || '';
    if (ph === 'lobby') {
      el.innerHTML = `<div class="lobby fadein">
        <div style="text-align:left">
          <h1>Death at<br>Blackwood Hall</h1>
          <div class="sub">A Victorian murder mystery for two · about an hour</div>
          <div class="slots"><div class="slot" id="slot-mat"><div class="n">${esc(NAME.mat)}</div><div class="s">not joined</div></div><div class="slot" id="slot-emily"><div class="n">${esc(NAME.emily)}</div><div class="s">not joined</div></div></div>
          <div class="btns">
            <a class="btn" href="cards.html?g=bw" target="_blank">Print the evidence</a>
            <button class="btn" id="fs">Full screen</button>
            <a class="btn small" href="soundboard.html?ep=bw" target="_blank">Soundboard</a>
            <button class="btn small" id="newgame">New case (fresh mystery)</button>
          </div>
          <div class="testbox"><div>Systems check: on each phone, tap <b>Test camera</b> and point it at one of the printed cards, and <b>Test TV sound</b>. These checks reveal nothing about the case. (The cards from <i>The Last Recital</i> work here too.)</div></div>
          <div class="note-sm">When you’re both joined and ready, tap <b>We’re ready</b> on your phones. · <a href="index.html" style="color:var(--dim)">The Last Recital →</a></div>
        </div>
        <div style="text-align:center">
          <div class="join"><div class="qr">${qrSVG(joinUrl, 6)}</div><div class="code">Scan to join · ${room}</div></div>
          <div id="netstatus" class="status${netStatus.ok ? ' ok' : ''}">${netStatus.ok ? `Ready for phones · room ${room}` : netStatus.text}</div>
        </div>
      </div>`;
      $('#fs').onclick = () => { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); };
      $('#newgame').onclick = () => { if (confirm('Start a fresh case? The killer, weapon and clues will all change.')) restart(); };
      return;
    }
    if (ph === 'hide') {
      el.innerHTML = st.hideStep === 'done'
        ? storyBlock('The stage is set', ['All four pieces of evidence are hidden. Sit together in front of the screen.', 'Dim the lights. Keep your phones in hand.'], 'Tap “Begin the investigation” on either phone')
        : storyBlock('Hiding the evidence…', [`<b>${NAME[st.hideStep]}</b> is hiding two evidence cards somewhere in the house.`, `${NAME[BWData.other(st.hideStep)]} — stay here, and no peeking.`], `Follow the instructions on ${NAME[st.hideStep]}’s phone`);
      return;
    }
    if (ph === 'end') {
      el.innerHTML = storyBlock('Case Closed', game.reconstruction(), '');
      const delay = Math.max(0, 22000 - (Date.now() - st.endedAt));
      clearTimeout(fileT);
      fileT = setTimeout(() => { if (game.st.phase === 'end') Scenes.transition('snuff', () => { el.innerHTML = caseFileHTML(game.program()); }); }, delay);
      return;
    }
    if (ph === 'intro') { el.innerHTML = storyBlock(STORY.intro.title, STORY.intro.text, 'Tap “Enter Blackwood Hall” when you’re ready'); return; }
    if (st.solved) {
      const a = STORY[ph].after; const txt = typeof a === 'function' ? a(g) : a;
      el.innerHTML = `<div class="after fadein"><div class="solved-mark">✦ ${STORY[ph].title.toUpperCase()} ✦</div>${txt}<div class="cont">CONTINUE ON EITHER PHONE</div></div>`;
      return;
    }
    let vis = '', prompt = '', compact = false;
    switch (ph) {
      case 'roles':
        prompt = 'Take the case — together';
        vis = `<div><div class="badges"><div class="badge" id="bd-mat"><div class="bd-ico">✦</div><div class="bd-t">Inspector</div><div class="bd-n">${NAME.mat}</div><div class="bd-s">Scotland Yard</div></div><div class="badge" id="bd-emily"><div class="bd-ico">✚</div><div class="bd-t">Doctor</div><div class="bd-n">${NAME.emily}</div><div class="bd-s">Physician</div></div></div><div class="holdbar"><div id="holdbar"></div></div></div>`;
        break;
      case 'body':
        prompt = 'Establish the time of death';
        vis = `<div class="bodyvis"><div>${watchSVG()}<div class="cap">The smashed pocket watch</div></div><div class="plaque"><div>Body discovered</div><b>1:00 AM</b><div>by Jenkins, the butler</div></div></div><div class="tries" id="tries"></div>`;
        break;
      case 'letter':
        prompt = 'Read it together — then open the desk';
        vis = `<div>${letterSVG()}<div class="tries" id="tries"></div></div>`;
        break;
      case 'hunt1':
      case 'hunt2':
        prompt = 'Search the house · follow your phones';
        vis = `<div class="pages">${ROLES.map((r) => `<div style="text-align:center"><div class="evtag" id="pg-${r}">?</div><div class="page-who">${NAME[r]}’s evidence</div></div>`).join('')}</div>`;
        break;
      case 'interview':
        compact = true; prompt = 'Find the two who lied';
        vis = `<div><div class="suspects">${SUSPECTS.map((s) => suspectCard(s, `<div class="sp-st"><div><b>${fmtT(g.T)}</b> “In the ${g.claims[s.id].t.toLowerCase()}.”</div><div><b>11:15 PM</b> “In the ${g.claims[s.id].l.toLowerCase()}.”</div></div>`)).join('')}</div><div class="tries" id="tries"></div></div>`;
        break;
      case 'diary':
        prompt = 'Decode the last line';
        vis = `<div>${diarySVG(ROMAN[g.shift])}<div class="tries" id="tries"></div></div>`;
        break;
      case 'accuse':
        compact = true; prompt = 'Agree on one accusation — on your phones';
        vis = `<div><div class="suspects">${SUSPECTS.map((s) => suspectCard(s)).join('')}</div><div class="weapons">${WEAPONS.map((w) => `<span>${w.name}</span>`).join('')}</div><div class="proposal" id="proposal"></div><div class="tries" id="tries"></div></div>`;
        break;
    }
    const st2 = STORY[ph];
    el.innerHTML = `<h2 class="scene-title fadein${compact ? ' compact' : ''}">${st2.title}</h2>${compact ? '' : `<div class="narr">${st2.text.map((t) => `<p>${t}</p>`).join('')}</div>`}<div class="visual fadein" style="animation-delay:${compact ? .3 : 1.6}s">${vis}</div><div class="prompt fadein" style="animation-delay:${compact ? .6 : 2.2}s">${prompt}</div>`;
  }
  function watchSVG() {
    const hand = (deg, len, w) => `<line x1="100" y1="100" x2="${100 + len * Math.sin(deg * Math.PI / 180)}" y2="${100 - len * Math.cos(deg * Math.PI / 180)}" stroke="#2a1d10" stroke-width="${w}" stroke-linecap="round"/>`;
    let ticks = ''; for (let i = 0; i < 12; i++) { const a = i * 30 * Math.PI / 180; ticks += `<text x="${100 + 62 * Math.sin(a)}" y="${106 - 62 * Math.cos(a)}" text-anchor="middle" font-family="Fell, serif" font-size="15" fill="#2a1d10">${['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'][i]}</text>`; }
    return `<svg viewBox="0 0 200 230" width="230" height="265"><circle cx="100" cy="16" r="10" fill="none" stroke="#c9a24a" stroke-width="5"/><rect x="93" y="22" width="14" height="14" fill="#c9a24a"/>
      <circle cx="100" cy="100" r="86" fill="#c9a24a"/><circle cx="100" cy="100" r="78" fill="#f2ead8"/>${ticks}${hand(232.5, 40, 5)}${hand(90, 58, 3)}<circle cx="100" cy="100" r="5" fill="#2a1d10"/>
      <path d="M60 40 L95 92 L70 120 L100 104 L128 150 M95 92 L140 70" stroke="#6a5a4a" stroke-width="1.6" fill="none" opacity=".8"/></svg>`;
  }
  function letterSVG() {
    const lines = (x0, x1) => Array.from({ length: 6 }, (_, i) => `<path d="M${x0} ${60 + i * 28} q 30 -6 60 0 t 60 0 t ${x1 - x0 - 120} 0" stroke="#4a3220" stroke-width="2" fill="none" opacity=".5"/>`).join('');
    return `<svg viewBox="0 0 520 260" width="560" height="280">
      <path d="M20 20 H245 L232 60 L250 100 L236 150 L252 200 L240 240 H20 Z" fill="#e9dcbc" transform="rotate(-3 130 130)"/>
      <path d="M275 20 H500 V240 H270 L258 200 L274 150 L260 100 L278 60 Z" fill="#e3d4b0" transform="rotate(4 390 130) translate(10 8)"/>
      <g transform="rotate(-3 130 130)">${lines(40, 220)}</g><g transform="rotate(4 390 130) translate(10 8)">${lines(290, 480)}</g>
      <path d="M380 220 Q 420 150 470 230" fill="#3a2010" opacity=".35"/></svg>`;
  }
  function diarySVG(numeral) {
    return `<svg viewBox="0 0 360 240" width="400" height="266"><rect x="40" y="20" width="280" height="200" rx="8" fill="#3a1414"/><rect x="50" y="28" width="262" height="184" rx="6" fill="#4a1a18"/>
      <rect x="300" y="90" width="50" height="60" rx="6" fill="#b8893b"/><rect x="308" y="98" width="34" height="44" rx="4" fill="#e8c66c"/>
      <text x="325" y="128" text-anchor="middle" font-family="Cinzel, serif" font-weight="700" font-size="17" fill="#3a2410">${numeral}</text>
      <text x="175" y="120" text-anchor="middle" font-family="Fell, serif" font-style="italic" font-size="22" fill="#c9a24a" opacity=".8">E. A.</text></svg>`;
  }
  let fileT = 0;
  function caseFileHTML(pr) {
    const stars = '★'.repeat(pr.rating.stars) + '<span class="dim">' + '★'.repeat(5 - pr.rating.stars) + '</span>';
    let lastAct = '';
    const rows = pr.rows.map((r) => {
      const act = r.act !== lastAct ? `<div class="pg-act">${r.act}</div>` : ''; lastAct = r.act;
      const marks = (r.hints ? `<span class="pg-h">${'✎'.repeat(r.hints)}</span>` : '') + (r.skipped ? '<span class="pg-s">with help from the Yard</span>' : '');
      return `${act}<div class="pg-row"><span class="pg-t">${r.title}</span>${marks}<span class="pg-dots"></span><span class="pg-time">${r.secs == null ? '—' : fmt(r.secs)}</span></div>`;
    }).join('');
    return `<div class="program fadein">
      <div class="pg-head">Scotland Yard · Case File No. ${1000 + (game.st.seed % 9000)}</div>
      <div class="pg-title">Death at Blackwood Hall</div>
      <div class="pg-sub">investigated by <b>Inspector ${NAME.mat}</b> &amp; <b>Dr. ${NAME.emily}</b></div>
      <div class="pg-rule"></div>
      <div class="pg-body">
        <div class="pg-rows">${rows}</div>
        <div class="pg-side">
          <div class="pg-total"><span>Time on the case</span><b>${fmt(pr.total)}</b></div>
          <div class="pg-meta">${pr.hints} hint${pr.hints === 1 ? '' : 's'} (✎) · ${pr.skips} skip${pr.skips === 1 ? '' : 's'} · ${pr.wrong} wrong accusation${pr.wrong === 1 ? '' : 's'}${pr.rating.clean ? '<br><b>No hints, no wrong guesses — flawless.</b>' : ''}</div>
          <div class="pg-review"><div class="pg-stars">${stars}</div><div class="pg-rank">${pr.rating.title}</div><div class="pg-blurb">“${pr.rating.blurb}”</div><div class="pg-critic">— The Illustrated Police News</div></div>
        </div>
      </div>
    </div>`;
  }

  function updateDynamic() {
    const st = game.st, ph = st.phase;
    ROLES.forEach((r) => {
      $('#dot-' + r).classList.toggle('on', !!st.conn[r]); $('#dot-' + r).lastChild.textContent = NAME[r];
      const slot = $('#slot-' + r);
      if (slot) { slot.classList.toggle('on', !!st.conn[r]); slot.classList.toggle('ready', !!st.ready[r]); slot.querySelector('.n').textContent = NAME[r]; slot.querySelector('.s').textContent = st.ready[r] ? 'ready' : st.conn[r] ? 'joined' : 'not joined'; }
    });
    $('#hintcount').textContent = st.startedAt ? `Hints ${st.hintsUsed}` : '';
    if (ph === 'roles') ROLES.forEach((r) => { const b = $('#bd-' + r); if (b) b.classList.toggle('held', !!(st.p.hold && st.p.hold[r])); });
    if (ph === 'hunt1' || ph === 'hunt2') ROLES.forEach((r) => {
      const el = $('#pg-' + r); if (!el) return;
      const f = !!st.foundBy[game.huntTarget(r).code];
      el.classList.toggle('found', f); el.textContent = f ? 'logged' : '?';
    });
    if (ph === 'accuse') {
      const pp = st.p.proposal, el = $('#proposal');
      if (el) el.innerHTML = pp ? `<b>${NAME[pp.by]}</b> accuses <b>${S[pp.killer].short}</b> with the <b>${W[pp.weapon].name}</b>… waiting for ${NAME[BWData.other(pp.by)]} to agree.` : (st.p.lastWrong ? `<span class="wrongmsg">${st.p.lastWrong}</span>` : '');
      document.querySelectorAll('.suspect').forEach((c) => c.classList.toggle('accused', !!pp && c.dataset.s === pp.killer));
    }
    const tr = $('#tries'); if (tr) tr.textContent = st.p.tries ? `Failed attempts: ${st.p.tries}` : (ph === 'accuse' && st.wrong ? `Wrong accusations: ${st.wrong}` : '');
    $('#paused').classList.toggle('hidden', !st.paused);
    renderBanner();
    const h = $('#hint');
    if (st.lastHint && !st.solved) { h.innerHTML = `<b>NOTES FROM THE YARD · HINT ${st.lastHint.level} OF 2</b>${st.lastHint.text}`; h.classList.remove('hidden'); }
    else h.classList.add('hidden');
  }

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
  function showFlash(text) { const f = $('#flash'); f.textContent = text; f.classList.add('show'); clearTimeout(flashT); flashT = setTimeout(() => f.classList.remove('show'), 4200); }

  let lastProgSent = 0;
  setInterval(() => {
    const st = game.st, t = $('#timer');
    if (st.startedAt) {
      const el = st.endedAt ? Math.round(game.elapsed()) : Math.floor(game.elapsed());
      const left = 60 * 60 - el;
      t.textContent = st.endedAt ? fmt(el) : (left >= 0 ? fmt(left) : fmt(-left));
      t.classList.toggle('over', left < 0 && !st.endedAt);
      Scenes.tension(st.endedAt ? 0 : left < 0 ? 2 : left < 600 ? 1 : 0);
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
    const conn = game.st.conn, names = game.st.names;
    game.st = BWGame.fresh(); game.st.conn = conn; game.st.names = names || {};
    lastKey = ''; onChange(); applyMusic();
  }
  $('#gear').onclick = () => {
    const c = prompt('Case menu:\n1 = Start a fresh case (back to the lobby)\n2 = Pause / resume\n\nType a number:');
    if (c === '2') game.setPaused(!game.st.paused);
    if (c === '1' && confirm('Really start over? Progress will be lost.')) restart();
  };
  document.addEventListener('keydown', (e) => { if ((e.key === 'p' || e.key === 'P') && !e.metaKey && !e.ctrlKey) game.setPaused(!game.st.paused); });
  let wakeLock = null;
  async function keepAwake() { try { if ('wakeLock' in navigator && !wakeLock && document.visibilityState === 'visible') { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); } } catch (e) {} }
  document.addEventListener('visibilitychange', keepAwake);
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
    Sound.ctx().resume().then(() => { Scenes.lightning(); if (!AudioBank.sfx('sfx_wake')) Sound.thunder(0.6); setTimeout(() => { applyMusic(); if (game.st.paused) applyPauseAudio(true); }, 1200); }, applyMusic);
    $('#wake').classList.add('leaving');
    setTimeout(() => document.body.classList.remove('asleep'), 1200);
    setTimeout(lightsOn, 900);
    setTimeout(() => { const w = $('#wake'); if (w) w.remove(); }, 2000);
  };
  render();
  window.__game = game; // for automated tests only
})();
