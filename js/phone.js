// Phone controller. Renders whatever "view" the TV sends to this player.
(function () {
  const $ = (s) => document.querySelector(s);
  const vib = (p) => { try { if (navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) navigator.vibrate(p); } catch (e) {} };
  const params = new URLSearchParams(location.search);
  const room = (params.get('r') || localStorage.getItem('lr-last-room') || '').toUpperCase();
  if (room) localStorage.setItem('lr-last-room', room);
  // A page scanned with the phone's normal camera opens play.html?scan=CODE
  let pendingScan = (params.get('scan') || '').toUpperCase();
  if (pendingScan) { const u = new URL(location.href); u.searchParams.delete('scan'); u.searchParams.set('r', room); history.replaceState(null, '', u.href); }
  const PC = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
  const NUM = ['', 'I', 'II', 'III', 'IV'];
  let role = params.get('as') || localStorage.getItem('lr-role-' + room) || '';
  let view = null, client = null, lastKey = '', pendingReveal = null, lostT = 0;
  const main = $('#main');

  Sound.audioSession('playback'); // iPhone: play game sounds even when the ringer switch is on silent
  // ---- keep screen awake + unlock audio on first touch ----
  let wakeLock = null;
  async function keepAwake() { try { if ('wakeLock' in navigator && !wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); } } catch (e) {} }
  document.addEventListener('pointerdown', () => { Sound.ensure(); keepAwake(); }, { capture: true });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) keepAwake(); });

  if (!room) { main.innerHTML = `<div class="panel center" style="margin-top:2em">Scan the big QR code on the TV first to join the game. After that, pages you scan will open right here.</div>`; return; }

  function pickRole() {
    $('#footer').classList.add('hidden');
    main.innerHTML = `<div class="title center" style="margin-top:1em">Who is holding this phone?</div>
      <div class="who-pick"><button class="btn primary" data-r="mat">Mat</button><button class="btn primary" data-r="emily">Emily</button></div>
      <p class="muted center">Each of you uses your own phone.</p>`;
    main.querySelectorAll('[data-r]').forEach((b) => (b.onclick = () => { role = b.dataset.r; localStorage.setItem('lr-role-' + room, role); start(); }));
  }

  function start() {
    $('#who').textContent = role === 'mat' ? 'Mat' : 'Emily';
    main.innerHTML = `<div class="panel center muted" style="margin-top:2em">Connecting to the TV…</div>`;
    client = new Net.Client(room, {
      onOpen() {
        client.send({ t: 'hello', role });
        if (pendingScan) { const c = pendingScan; pendingScan = ''; setTimeout(() => handleScan(c), 400); }
      },
      onStatus(ok, text) {
        const c = $('#conn'); c.classList.toggle('ok', ok); c.querySelector('span').textContent = ok ? 'TV' : text;
        clearTimeout(lostT);
        if (ok || client && client.stopped) $('#lostov').classList.add('hidden');
        else if (view) lostT = setTimeout(() => { if (!client.connected && !client.stopped) $('#lostov').classList.remove('hidden'); }, 3500);
      },
      onMessage(m) {
        if (m.t === 'view') { view = m.view; render(); }
        else if (m.t === 'replaced') {
          client.stop();
          $('#footer').classList.add('hidden');
          main.innerHTML = `<div class="title center" style="margin-top:1em">Opened in another tab</div><div class="panel center prompt">The game is now running in another tab on this phone (this happens when you scan a page with the normal camera). Use that tab and close this one.</div><button class="btn big ghost" id="takeback">Use this tab instead</button>`;
          $('#takeback').onclick = () => { lastKey = ''; main.innerHTML = ''; client.resume(); };
        }
        else if (m.t === 'flash') flash(m);
        else if (m.t === 'prog') updateProg(m.p);
      },
    });
  }
  function send(m) { if (!client || !client.send(m)) toast('Not connected to the TV yet…'); }

  // ---------- toast / flash ----------
  let toastT = 0;
  function toast(text, good) { const t = $('#toast'); t.innerHTML = text; t.className = 'show' + (good ? ' good' : ''); clearTimeout(toastT); toastT = setTimeout(() => (t.className = good ? 'good' : ''), 3200); }
  function flash(m) {
    if (m.kind === 'page') { pendingReveal = m.text; closeScanner(); tryReveal(); return; }
    toast(m.text, m.kind === 'good');
    if (m.kind === 'bad') vib([80, 60, 80]);
  }
  function tryReveal() {
    if (!pendingReveal || !view) return;
    const p = view.pages.find((x) => x.code === pendingReveal);
    if (!p) return;
    pendingReveal = null;
    Sound.ensure(); [67, 71, 74, 79].forEach((m, i) => Sound.bell(m, i * 0.1, 1.6, 0.15));
    vib(200);
    openSheet('You found a torn page!', `<p class="center muted">A single note in Eleanor’s hand. Keep it safe — you’ll need it later. (Tap <b>Pages</b> any time to see it again.)</p>${pageCard(p)}<button class="btn big primary" id="pgok">Keep it</button>`);
    $('#pgok').onclick = closeSheet;
  }
  function pageCard(p) { return `<div class="pagecard"><div class="num">${NUM[p.num]}</div><div class="staff">${Notation.fragmentSVG(p.pc, p.clef, { width: 190, space: 12 })}</div></div>`; }

  // ---------- sheets ----------
  function openSheet(title, html) { $('#sheet-title').textContent = title; $('#sheet-body').innerHTML = html; $('#sheet').classList.remove('hidden'); }
  function closeSheet() { $('#sheet').classList.add('hidden'); }
  $('#sheet-x').onclick = closeSheet;
  $('#pagesbtn').onclick = () => {
    const ps = view ? view.pages : [];
    openSheet('Your pages', ps.length ? ps.map(pageCard).join('') + `<p class="center muted">${view.other} has their own pages on their phone.</p>` : `<p class="muted center">You haven’t found any pages yet.</p>`);
  };
  $('#pausebtn').onclick = () => send({ t: 'pause', on: true });
  $('#resumebtn').onclick = () => send({ t: 'pause', on: false });
  $('#hintbtn').onclick = () => {
    if (!view || !view.hint) return;
    if (view.hint.canSkip) {
      if (confirm('Skip this ' + (view.phase.startsWith('hunt') ? 'search? Your page will appear without finding it.' : 'puzzle? Eleanor will solve it for you.'))) send({ t: 'skip' });
      return;
    }
    if (confirm(`Ask Eleanor for hint ${view.hint.level + 1} of 2?`)) {
      send({ t: 'hint' });
      if (!view.phase.startsWith('hunt')) toast('Look at the TV…', true);
    }
  };

  // ---------- scanner ----------
  let scanStream = null, scanRaf = 0, scanCb = null;
  async function openScanner(cb) {
    scanCb = cb;
    $('#scanner').classList.remove('hidden');
    $('#scanmsg').textContent = 'Point your camera at the code on the page.';
    $('#manual').value = '';
    const video = $('#video'), canvas = $('#scancanvas'), ctx = canvas.getContext('2d', { willReadFrequently: true });
    try {
      scanStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      video.srcObject = scanStream; await video.play();
      let last = 0;
      const loop = (ts) => {
        scanRaf = requestAnimationFrame(loop);
        if (ts - last < 150 || video.readyState < 2) return; last = ts;
        const w = 480, h = Math.round(480 * video.videoHeight / video.videoWidth) || 480;
        canvas.width = w; canvas.height = h; ctx.drawImage(video, 0, 0, w, h);
        const img = ctx.getImageData(0, 0, w, h);
        const code = jsQR(img.data, w, h, { inversionAttempts: 'dontInvert' });
        const c = code && code.data ? extractCode(code.data) : null;
        if (c) { closeScanner(); vib(60); scanCb && scanCb(c); }
      };
      scanRaf = requestAnimationFrame(loop);
    } catch (e) {
      $('#scanmsg').textContent = 'Camera unavailable (' + (e.name || 'blocked') + '). Type the code printed under the QR instead.';
    }
  }
  function closeScanner() {
    cancelAnimationFrame(scanRaf);
    if (scanStream) scanStream.getTracks().forEach((t) => t.stop());
    scanStream = null; $('#scanner').classList.add('hidden');
  }
  $('#scan-x').onclick = closeScanner;
  $('#manualgo').onclick = () => { const v = $('#manual').value.trim().toUpperCase().replace(/^LR-/, ''); if (!v) return; closeScanner(); scanCb && scanCb(v); };
  // one path for every scan: in-game scanner, typed code, or a link from the phone's camera
  function handleScan(c) {
    if (c === TEST_CODE) { toast('Camera works! ✓  (The game’s own Scan button works too.)', true); return; }
    send({ t: 'scan', code: c });
  }

  // ---------- render ----------
  function header(v) { return `<div class="act">${v.act || ''}</div>${v.title ? `<div class="title">${v.title}</div>` : ''}${v.prompt ? `<div class="prompt">${v.prompt}</div>` : ''}${v.info ? `<div class="info">${v.info}</div>` : ''}`; }

  function render() {
    const v = view, w = v.widget;
    $('#pausedov').classList.toggle('hidden', !v.paused);
    $('#pausebtn').classList.toggle('hidden', !v.canPause);
    if (v.paused) { stopSing(); closeScanner(); }
    $('#footer').classList.toggle('hidden', ['lobby', 'hide', 'end'].includes(v.phase));
    $('#pagecount').textContent = v.pages.length;
    const hb = $('#hintbtn');
    hb.classList.toggle('hidden', !v.hint);
    if (v.hint) { hb.textContent = v.hint.canSkip ? 'Skip' : `Hint ${v.hint.level + 1}/2`; hb.classList.toggle('skip', v.hint.canSkip); hb.classList.toggle('hint', !v.hint.canSkip); }
    const key = [v.phase, v.solved, w.type, w.ready, w.done, w.whisper, w.otherReady, v.prompt, w.otherDone, w.tries].join('|');
    if (key !== lastKey) {
      const rebuild = !(lastKey.split('|')[0] === v.phase && lastKey.split('|')[2] === w.type && ['code', 'word', 'chairs'].includes(w.type) && !!v.solved === (lastKey.split('|')[1] === 'true'));
      lastKey = key;
      if (rebuild) { stopSing(); build(v); }
      else if (w.type !== 'keys') { const t = $('#triesline'); if (t) t.textContent = w.tries ? `Failed attempts: ${w.tries}` : ''; }
    }
    update(v);
    tryReveal();
  }

  function build(v) {
    const w = v.widget;
    let h = '';
    switch (w.type) {
      case 'lobby':
        h = `<div class="title">Welcome, ${v.name}</div>
          <p class="prompt">Before you begin, test everything. None of these tests reveal anything about the game.</p>
          <button class="btn big ghost" id="tcam">Test camera</button>
          <p class="center muted" style="font-size:.85em;margin:-.3em 0 .6em">Point it at any printed page — the test won’t reveal anything.</p>
          <button class="btn big ghost" id="tmic">Test microphone</button>
          <div id="micout" class="center muted"></div>
          <button class="btn big ghost" id="tsnd">Test TV sound</button>
          <div class="panel muted" style="font-size:.9em">Keep this page open the whole game, and turn your phone’s volume up. If the phone sleeps or disconnects, just reopen this page — it reconnects on its own.</div>
          <button class="btn big ${w.ready ? '' : 'primary'}" id="ready">${w.ready ? 'Ready ✓ (tap to undo)' : 'We’re ready'}</button>
          <p class="center muted" id="otherready"></p>
          <div class="center"><button class="smalllink" id="switch">Not ${v.name}? Switch player</button></div>`;
        break;
      case 'wait':
        h = `<div class="title">Shh…</div><div class="panel prompt">${w.text}</div>`; break;
      case 'hideform':
        h = `<div class="title">Hide your pages</div>
          <div class="prompt">Take the two printed pages whose tabs say <b>HIDDEN BY ${v.name.toUpperCase()}</b>. Hide each one in a <b>different</b> spot anywhere in the house — somewhere safe that ${v.other} can reach. <b>Tear off the tab</b> as you hide each page, and remember which was Page I and Page II.</div>
          <div class="panel muted" style="font-size:.9em">Make them a little tricky, but findable in a few minutes. Then tell the house where you hid them. ${v.other} will only ever see the room — and your whisper, if they ask for help.</div>
          ${w.cards.map((s) => `<div class="panel"><div class="cinzel" style="color:var(--gold2)">Page ${s}</div>
            <label class="l">Room</label><select id="room-${s}"><option value="">Choose a room…</option>${w.rooms.map((r) => `<option>${r}</option>`).join('')}</select>
            <input class="txt hidden" id="other-${s}" placeholder="Where? (e.g. the back porch)" style="margin-top:.5em">
            <label class="l">Whisper (optional cryptic hint)</label><input class="txt" id="hint-${s}" maxlength="80" placeholder="e.g. where cold things sleep"></div>`).join('')}
          <button class="btn big primary" id="hidedone">Both pages are hidden</button>`;
        break;
      case 'continue':
        h = header(v) + `<button class="btn big primary" id="cont" style="margin-top:2em">${w.label}</button>`; break;
      case 'watch':
        h = header(v) + `<div class="panel center muted">Watch the TV.</div>`; break;
      case 'end':
        h = `<div class="title center" style="margin-top:1em">The End</div><div class="panel center prompt">You set Eleanor free. Look at the TV for your escape time.<br><br>Thank you for playing <i>The Last Recital</i>.</div>`; break;
      case 'hold':
        h = header(v) + `<button class="holdbtn" id="hold"><div class="candle"><div class="wick"></div><div class="flame"></div><div class="wax"></div></div>${w.label}</button>
          <p class="center muted" id="theirs"></p><div class="bar"><div id="prog"></div></div>`;
        break;
      case 'code':
        h = header(v) + `<div class="codeshow" id="cshow">${'<span></span>'.repeat(w.digits)}</div>
          <div class="keypad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button data-d="${n}">${n}</button>`).join('')}<button data-d="del">⌫</button><button data-d="0">0</button><button data-d="ok" style="color:var(--gold2)">Try</button></div>
          <p class="center muted" id="triesline">${w.tries ? `Failed attempts: ${w.tries}` : ''}</p>`;
        break;
      case 'hunt':
        h = header(v) + (w.done
          ? `<div class="found">✦ Your page is found ✦</div><p class="center muted">${w.otherDone ? 'Both pages are found!' : `Now help ${v.other} search.`}</p>`
          : `<div class="panel"><div class="center muted">Eleanor points you toward…</div><div class="room">${w.room}</div></div>
             <button class="btn big primary" id="scan">Scan a page</button>
             ${w.whisper ? `<div class="panel whisper">${w.whisper}</div>` : `<p class="center muted" style="font-size:.9em">Stuck? Tap Hint for a whisper from ${v.other}.</p>`}`);
        break;
      case 'keys':
        h = header(v) + `<div class="dots" id="dots">${'<i></i>'.repeat(w.total)}</div><div class="kbd" id="kbd"></div>` +
          (w.replay ? `<button class="btn big ghost" id="replay">Play the music box again (on the TV)</button>` : `<button class="btn big ghost" id="showpages">Look at my pages</button>`);
        break;
      case 'sing':
        h = header(v) + `<button class="btn big ghost" id="hear">Hear her note</button>` +
          (w.done ? `<div class="found">✦ Your voice joins hers ✦</div><p class="center muted">${w.otherDone ? '' : `Waiting for ${v.other}…`}</p>`
            : `<div class="panel tuner"><div class="muted" style="font-size:.85em">You are singing</div><div class="note" id="sungnote">–</div><div class="bar ghostbar"><div id="singprog"></div></div><div class="muted" id="singhelp" style="font-size:.85em">Hold the right note steady until the bar fills.</div></div>
               <button class="btn big primary" id="listen">Start singing</button>`);
        break;
      case 'word':
        h = header(v) + `<input class="word" id="word" maxlength="10" autocomplete="off" autocorrect="off" autocapitalize="characters" spellcheck="false" placeholder="the word"><button class="btn big primary" id="wordgo">Speak the word</button><p class="center muted" id="triesline">${w.tries ? `Failed attempts: ${w.tries}` : ''}</p>`;
        break;
      case 'chairs':
        h = header(v) + `<div class="panel">${[1, 2, 3, 4].map((n) => `<div class="chairrow"><span>Chair ${n}</span><select data-c="${n}"><option value="">—</option>${w.names.map((x) => `<option>${x}</option>`).join('')}</select></div>`).join('')}
          <p class="muted" style="font-size:.85em;margin:.6em 0 0">Chairs are numbered left to right, as shown on the TV.</p></div>
          <button class="btn big primary" id="seat">Seat the family</button><p class="center muted" id="triesline">${w.tries ? `Failed attempts: ${w.tries}` : ''}</p>`;
        break;
    }
    main.innerHTML = h;
    wire(v);
  }

  function wire(v) {
    const w = v.widget;
    const on = (id, fn) => { const el = $('#' + id); if (el) el.onclick = fn; };
    on('cont', () => send({ t: 'continue' }));
    on('ready', () => send({ t: 'ready', on: !w.ready }));
    on('switch', () => { localStorage.removeItem('lr-role-' + room); location.reload(); });
    on('tsnd', () => { send({ t: 'testsound' }); toast('Listen for a chime from the TV.', true); });
    on('tcam', () => openScanner((c) => toast('Camera works! ✓', true)));
    on('tmic', async () => {
      const out = $('#micout');
      if (singing) { stopSing(); out.textContent = ''; return; }
      try {
        await startSing((p) => { out.textContent = p ? `Hearing: ${PC[p.pc]}` : 'Hum or sing something…'; });
        $('#tmic').textContent = 'Stop microphone test';
      } catch (e) { out.textContent = 'Microphone blocked: ' + (e.name || e); }
    });
    on('hidedone', () => {
      const cards = {}; let okAll = true;
      w.cards.forEach((s) => {
        const room = $('#room-' + s).value; const other = $('#other-' + s).value.trim(); const hint = $('#hint-' + s).value.trim();
        if (!room || (room === 'Other' && !other)) okAll = false;
        cards[s] = { room, other, hint };
      });
      if (!okAll) { toast('Choose a room for both pages.'); return; }
      if (confirm('Both pages hidden? Hand the game over to ' + v.other + '.')) send({ t: 'hide', cards });
    });
    w.type === 'hideform' && w.cards.forEach((s) => { $('#room-' + s).onchange = (e) => $('#other-' + s).classList.toggle('hidden', e.target.value !== 'Other'); });

    if (w.type === 'hold') {
      const b = $('#hold');
      const down = (e) => { e.preventDefault(); b.classList.add('on'); send({ t: 'hold', on: true }); vib(30); };
      const up = (e) => { e.preventDefault(); if (b.classList.contains('on')) { b.classList.remove('on'); send({ t: 'hold', on: false }); } };
      b.addEventListener('pointerdown', down); b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up);
      b.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    if (w.type === 'code') {
      let digits = '';
      const show = () => { $('#cshow').querySelectorAll('span').forEach((s, i) => (s.textContent = digits[i] || '')); };
      main.querySelectorAll('[data-d]').forEach((b) => (b.onclick = () => {
        const d = b.dataset.d;
        if (d === 'del') digits = digits.slice(0, -1);
        else if (d === 'ok') { if (digits.length === w.digits) { send({ t: 'answer', value: digits }); digits = ''; } else toast('Enter all ' + w.digits + ' digits.'); }
        else if (digits.length < w.digits) digits += d;
        show();
      }));
    }
    if (w.type === 'hunt' && !w.done) on('scan', () => openScanner(handleScan));
    if (w.type === 'keys') buildKeys(w.keys);
    on('replay', () => { send({ t: 'replay' }); toast('Listen to the TV…', true); });
    on('showpages', () => $('#pagesbtn').click());
    if (w.type === 'sing') {
      const hum = () => { Sound.hum((role === 'mat' ? 48 : 60) + w.ghostPc, 3.5, 0.3); blockMicUntil = Date.now() + 3800; };
      on('hear', hum);
      on('listen', async () => {
        if (singing) { stopSing(); $('#listen').textContent = 'Start singing'; return; }
        try { await startSing((p) => singFrame(p, w.target)); $('#listen').textContent = 'Stop listening'; }
        catch (e) { toast('Microphone blocked. Allow mic access in your browser settings, or use Hint → Skip.'); }
      });
    }
    on('wordgo', () => { const x = $('#word').value.trim(); if (!x) return; send({ t: 'answer', value: x }); $('#word').value = ''; $('#word').blur(); });
    on('seat', () => {
      const vals = [...main.querySelectorAll('select[data-c]')].map((s) => s.value);
      if (vals.some((x) => !x)) { toast('Seat someone in every chair.'); return; }
      if (new Set(vals).size < 4) { toast('Each person can only sit in one chair.'); return; }
      send({ t: 'answer', value: vals });
    });
  }

  function update(v) {
    const w = v.widget;
    if (w.type === 'lobby') { const o = $('#otherready'); if (o) o.textContent = w.otherReady ? `${v.other} is ready.` : (v.otherConnected ? `${v.other} has joined.` : `Waiting for ${v.other} to join…`); }
    if (w.type === 'hold') {
      const t = $('#theirs'); if (t) t.textContent = w.theirs ? `${v.other} is holding…` : `${v.other} is not holding.`;
      updateProg(w.progress);
    }
    if (w.type === 'keys') { const d = $('#dots'); if (d) d.querySelectorAll('i').forEach((x, i) => x.classList.toggle('on', i < w.progress)); }
  }
  function updateProg(p) { const el = $('#prog'); if (el) el.style.width = Math.round((p || 0) * 100) + '%'; }

  // ---------- keyboard ----------
  function buildKeys(keys) {
    const kbd = $('#kbd');
    const isBlack = (m) => [1, 3, 6, 8, 10].includes(m % 12);
    const list = keys.slice();
    const stub = isBlack(list[0]); // Emily's half starts on F♯: show Mat's F as a stub
    const whites = list.filter((m) => !isBlack(m));
    const nW = whites.length + (stub ? 0.5 : 0);
    const ww = 100 / nW;
    let html = '';
    let x = stub ? ww * 0.5 : 0;
    if (stub) html += `<div class="w stub" style="left:0;width:${ww * 0.5}%">Mat</div>`;
    const pos = {};
    whites.forEach((m) => { pos[m] = x; html += `<div class="w" data-m="${m}" style="left:${x}%;width:${ww}%">${PC[m % 12]}</div>`; x += ww; });
    list.filter(isBlack).forEach((m) => {
      const leftWhite = pos[m - 1];
      const cx = leftWhite !== undefined ? leftWhite + ww : (stub ? ww * 0.5 : 0);
      html += `<div class="b" data-m="${m}" style="left:${cx - ww * 0.32}%;width:${ww * 0.64}%">${PC[m % 12]}</div>`;
    });
    kbd.innerHTML = html;
    kbd.querySelectorAll('[data-m]').forEach((k) => {
      k.addEventListener('pointerdown', (e) => {
        e.preventDefault(); const m = +k.dataset.m;
        Sound.key(m); k.classList.add('down'); setTimeout(() => k.classList.remove('down'), 180);
        send({ t: 'note', midi: m });
      });
    });
  }

  // ---------- singing ----------
  let singing = false, holdMs = 0, lastT = 0, badMs = 0, blockMicUntil = 0, sentSang = false;
  async function startSing(cb) {
    Sound.ensure(); holdMs = 0; lastT = performance.now(); badMs = 0; sentSang = false;
    await Pitch.start(cb); singing = true;
  }
  function stopSing() { if (singing) { Pitch.stop(); singing = false; } }
  function singFrame(p, target) {
    const now = performance.now(), dt = now - lastT; lastT = now;
    const note = $('#sungnote'); if (!note) return;
    const blocked = Date.now() < blockMicUntil;
    const good = !blocked && p && p.rms > 0.02 && Math.abs(Pitch.centsFromPc(p.midi, target)) < 50;
    note.textContent = p && !blocked ? PC[p.pc] : '–';
    note.classList.toggle('good', !!good);
    if (good) { holdMs += dt; badMs = 0; } else { badMs += dt; if (badMs > 300) holdMs = Math.max(0, holdMs - dt * 2); }
    const pr = Math.min(1, holdMs / 1500);
    const bar = $('#singprog'); if (bar) bar.style.width = Math.round(pr * 100) + '%';
    const help = $('#singhelp'); if (help && blocked) help.textContent = 'Listening paused while her note plays…'; else if (help) help.textContent = 'Hold the right note steady until the bar fills.';
    if (pr >= 1 && !sentSang) { sentSang = true; stopSing(); vib(120); send({ t: 'sang' }); }
  }

  if (role === 'mat' || role === 'emily') start(); else pickRole();
})();
