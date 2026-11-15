// Soundboard page: assign your own files to each sound slot and preview them.
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const AB = window.AudioBank;
  const BUILTIN = {
    music_title: { text: 'Built-in: silence' },
    music_hiding: { text: 'Built-in: quiet drone', play: () => Sound.startAmbient(0.5) },
    music_act1: { text: 'Built-in: dark drone', play: () => Sound.startAmbient(1) },
    music_act2: { text: 'Built-in: dark drone', play: () => Sound.startAmbient(1) },
    music_act3: { text: 'Built-in: dark drone', play: () => Sound.startAmbient(1) },
    music_ending: { text: 'Built-in: silence (a music-box reprise always plays first)' },
    sfx_transition: { text: 'Built-in: whoosh', play: () => Sound.whoosh(0.25) },
    sfx_solve: { text: 'Built-in: chime', play: Sound.chime },
    sfx_climax: { text: 'Built-in: big chime', play: Sound.bigChime },
    sfx_wrong: { text: 'Built-in: low buzz', play: Sound.wrong },
    sfx_reset: { text: 'Built-in: low bell', play: () => Sound.bell(48, 0, 0.8, 0.15) },
    sfx_progress: { text: 'Built-in: ding', play: () => Sound.bell(79, 0, 1.5, 0.25) },
    sfx_page: { text: 'Built-in: shimmer', play: () => { [67, 71, 74, 79].forEach((m, i) => Sound.bell(m, i * 0.12, 2, 0.2)); Sound.whoosh(0.12); } },
    sfx_hint: { text: 'Built-in: whoosh', play: () => Sound.whoosh(0.18) },
    sfx_heartbeat: { text: 'Built-in: heartbeat', play: Sound.heartbeat },
    sfx_house1: { text: 'Built-in: creak', play: Sound.creak },
    sfx_house2: { text: 'Built-in: creak', play: Sound.creak },
    sfx_house3: { text: 'Built-in: creak', play: Sound.creak },
    sfx_test: { text: 'Built-in: chime', play: Sound.chime },
  };
  let playingSrc = null;

  function stopAll() {
    AB.stopMusic(0.3); Sound.stopAmbient(); Sound.stopRain && Sound.stopRain();
    if (playingSrc) { try { playingSrc.stop(); } catch (e) {} playingSrc = null; }
  }

  function rowHTML(slot) {
    return `<div class="row" id="row-${slot.id}">
      <div class="top"><span class="lbl">${slot.label}</span><span class="id">${slot.id}</span><span class="chip" data-chip></span></div>
      <div class="desc">${slot.desc}</div>
      <div class="ctrl">
        <button class="b gold" data-play>▶ Play</button>
        <button class="b" data-seam style="display:none" title="Starts 8 seconds before the loop point so you can hear the jump back">⟲ Test loop</button>
        <button class="b" data-stop>■ Stop</button>
        <button class="b" data-pick>Choose file…</button>
        <button class="b red" data-del>Remove my file</button>
        <input type="file" accept="audio/*" data-file hidden>
        <span class="vol">Volume <input type="range" min="0" max="1.5" step="0.05" data-vol><span data-volv></span></span>
      </div></div>`;
  }

  const fmt = (t) => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');
  function refresh(slot) {
    const row = $('#row-' + slot.id), e = AB.bank[slot.id];
    const chip = $('[data-chip]', row);
    chip.className = 'chip';
    if (e && e.error) { chip.textContent = '⚠ ' + e.error + ': ' + e.name; chip.classList.add('err'); }
    else if (e && e.src === 'local') { chip.textContent = '✓ Your file: ' + e.name; chip.classList.add('local'); }
    else if (e && e.src === 'repo') { chip.textContent = (e.borrowed ? '↻ Borrowed: ' : '✓ Repo file: ') + e.name; chip.classList.add('repo'); }
    else chip.textContent = BUILTIN[slot.id].text;
    chip.title = chip.textContent;
    $('[data-del]', row).style.display = e && e.src === 'local' ? '' : 'none';
    const lp = AB.loopFor(slot.id);
    $('[data-seam]', row).style.display = lp ? '' : 'none';
    if (lp) chip.textContent += ` · loops ${fmt(lp.start)}–${fmt(lp.end)}`;
    const v = AB.slotVol(slot.id);
    $('[data-vol]', row).value = v; $('[data-volv]', row).textContent = Math.round(v * 100) + '%';
  }

  async function setFile(slot, file) {
    if (!file) return;
    if (!/^audio\//.test(file.type) && !/\.(mp3|m4a|ogg|wav|aac|flac)$/i.test(file.name)) { alert('That doesn’t look like an audio file.'); return; }
    if (file.size > 40 * 1024 * 1024) { if (!confirm('This file is over 40 MB. Use it anyway?')) return; }
    stopAll();
    await AB.putLocal(slot.id, file, file.name);
    await AB.loadSlot(slot);
    refresh(slot);
    AB.announce({ t: 'slot', id: slot.id });
  }

  function build() {
    const groups = { music: $('#music'), sfx: $('#sfx') };
    AB.SLOTS.forEach((slot) => {
      groups[slot.kind].insertAdjacentHTML('beforeend', rowHTML(slot));
      const row = $('#row-' + slot.id);
      $('[data-play]', row).onclick = () => {
        Sound.ensure(); stopAll();
        if (AB.has(slot.id)) {
          if (slot.kind === 'music') { AB.setDuck(1); AB.music(slot.id); }
          else playingSrc = AB.sfx(slot.id);
        } else if (BUILTIN[slot.id].play) BUILTIN[slot.id].play();
      };
      $('[data-stop]', row).onclick = stopAll;
      $('[data-seam]', row).onclick = () => { Sound.ensure(); stopAll(); const lp = AB.loopFor(slot.id); AB.setDuck(1); AB.music(slot.id, { offset: lp.end - 8, restart: true }); };
      const input = $('[data-file]', row);
      $('[data-pick]', row).onclick = () => input.click();
      input.onchange = () => setFile(slot, input.files[0]).then(() => (input.value = ''));
      $('[data-del]', row).onclick = async () => {
        if (!confirm('Remove your file from “' + slot.label + '”?')) return;
        stopAll(); await AB.delLocal(slot.id); await AB.loadSlot(slot); refresh(slot); AB.announce({ t: 'slot', id: slot.id });
      };
      $('[data-vol]', row).oninput = (e) => {
        AB.settings.vol[slot.id] = +e.target.value; AB.saveSettings(); refresh(slot);
        AB.setDuck(1); AB.announce({ t: 'settings' });
      };
      row.addEventListener('dragover', (e) => { e.preventDefault(); row.classList.add('drag'); });
      row.addEventListener('dragleave', () => row.classList.remove('drag'));
      row.addEventListener('drop', (e) => { e.preventDefault(); row.classList.remove('drag'); setFile(slot, e.dataTransfer.files[0]); });
      refresh(slot);
    });
    const mm = $('#mmusic'), ms = $('#msfx');
    mm.value = AB.settings.music; ms.value = AB.settings.sfx;
    mm.oninput = () => { AB.settings.music = +mm.value; AB.saveSettings(); AB.setDuck(1); AB.announce({ t: 'settings' }); };
    ms.oninput = () => { AB.settings.sfx = +ms.value; AB.saveSettings(); AB.announce({ t: 'settings' }); };
    $('#stopall').onclick = stopAll;
    $('#clearlocal').onclick = async () => {
      if (!confirm('Remove every file you added on this page, so the game uses the repo’s sounds folder instead?')) return;
      stopAll();
      for (const slot of AB.SLOTS) { if (AB.bank[slot.id] && AB.bank[slot.id].src === 'local') { await AB.delLocal(slot.id); await AB.loadSlot(slot); refresh(slot); AB.announce({ t: 'slot', id: slot.id }); } }
    };
  }
  // stop the browser from opening a file dropped outside a slot
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => e.preventDefault());

  if (AB.EP === 'bw') {
    document.title = 'Death at Blackwood Hall · Soundboard';
    $('#epname').textContent = '· Death at Blackwood Hall';
    $('#folder1').textContent = 'sounds/blackwood/'; $('#folder2').textContent = 'sounds/blackwood/music_act1.mp3';
    BUILTIN.music_title = { text: 'Built-in: rain', play: () => Sound.startRain && Sound.startRain() };
    ['music_hiding', 'music_act1', 'music_act2', 'music_act3'].forEach((k) => (BUILTIN[k] = { text: 'Built-in: rain + low drone', play: () => { Sound.startRain && Sound.startRain(); Sound.startAmbient(0.6); } }));
    BUILTIN.music_ending = { text: 'Built-in: silence' };
    BUILTIN.sfx_house1 = BUILTIN.sfx_house2 = BUILTIN.sfx_house3 = { text: 'Built-in: thunder', play: () => Sound.thunder(0.5) };
  } else $('#epname').textContent = '· The Last Recital';
  build();
  AB.loadAll().then(() => AB.SLOTS.forEach(refresh));
})();
