// Procedural sound: no audio files needed. Shared by TV and phones.
(function () {
  let ctx = null, master = null, ambient = null;
  const NOTE_NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.9;
      const comp = ctx.createDynamicsCompressor();
      master.connect(comp); comp.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function unlocked() { return !!ctx && ctx.state === 'running'; }

  let verb = null;
  function reverb() {
    if (verb) return verb;
    const c = ensure();
    const len = c.sampleRate * 3.2;
    const buf = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    verb = c.createConvolver(); verb.buffer = buf;
    const g = c.createGain(); g.gain.value = 0.5;
    verb.connect(g); g.connect(master);
    return verb;
  }
  function out(node, wet = 0.35) {
    const c = ensure();
    const dry = c.createGain(); dry.gain.value = 1;
    const w = c.createGain(); w.gain.value = wet;
    node.connect(dry); dry.connect(master);
    node.connect(w); w.connect(reverb());
  }

  // Music-box / celesta pluck
  function bell(midi, when = 0, dur = 1.6, vol = 0.32) {
    const c = ensure(); const t = c.currentTime + when;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    [[1, 1], [2.01, 0.35], [3.98, 0.12], [5.4, 0.05]].forEach(([mult, amp]) => {
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = mtof(midi) * mult;
      const og = c.createGain(); og.gain.value = amp;
      o.connect(og); og.connect(g); o.start(t); o.stop(t + dur + 0.05);
    });
    out(g, 0.45);
  }
  // Soft piano-ish key for phones
  function key(midi, vol = 0.35) {
    const c = ensure(); const t = c.currentTime;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2600;
    [['triangle', 1, 1], ['sine', 2, 0.3], ['sine', 3, 0.1]].forEach(([type, mult, amp]) => {
      const o = c.createOscillator(); o.type = type; o.frequency.value = mtof(midi) * mult;
      const og = c.createGain(); og.gain.value = amp; o.connect(og); og.connect(f); o.start(t); o.stop(t + 1.5);
    });
    f.connect(g); out(g, 0.2);
  }
  // Ghostly hum (sustained tone with vibrato)
  function hum(midi, dur = 3.5, vol = 0.28) {
    const c = ensure(); const t = c.currentTime;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.5);
    g.gain.setValueAtTime(vol, t + dur - 0.8);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const lfo = c.createOscillator(); lfo.frequency.value = 5; const lg = c.createGain(); lg.gain.value = 3;
    lfo.connect(lg);
    [['sine', 1, 1], ['triangle', 2, 0.15], ['sine', 0.5, 0.25]].forEach(([type, mult, amp]) => {
      const o = c.createOscillator(); o.type = type; o.frequency.value = mtof(midi) * mult;
      lg.connect(o.detune);
      const og = c.createGain(); og.gain.value = amp; o.connect(og); og.connect(g); o.start(t); o.stop(t + dur + 0.1);
    });
    lfo.start(t); lfo.stop(t + dur + 0.1);
    out(g, 0.6);
  }
  function melody(notes, gap = 0.62) { notes.forEach((m, i) => bell(m, 0.1 + i * gap)); return notes.length * gap + 1; }
  function chime() { [72, 76, 79, 84].forEach((m, i) => bell(m, i * 0.09, 2.2, 0.22)); }
  function bigChime() { [60, 67, 72, 76, 79, 84, 88].forEach((m, i) => bell(m, i * 0.12, 3.2, 0.2)); }
  function wrong() {
    const c = ensure(); const t = c.currentTime;
    const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(55, t + 0.5);
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 600;
    const g = c.createGain(); g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    o.connect(f); f.connect(g); out(g, 0.3); o.start(t); o.stop(t + 0.7);
  }
  function noiseBuf(sec) {
    const c = ensure(); const b = c.createBuffer(1, c.sampleRate * sec, c.sampleRate);
    const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b;
  }
  function whoosh(vol = 0.25) {
    const c = ensure(); const t = c.currentTime;
    const s = c.createBufferSource(); s.buffer = noiseBuf(2.5);
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 6;
    f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(2200, t + 1.2); f.frequency.exponentialRampToValueAtTime(400, t + 2.4);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.8); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
    s.connect(f); f.connect(g); out(g, 0.7); s.start(t);
  }
  function creak() {
    const c = ensure(); const t = c.currentTime;
    const o = c.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(70 + Math.random() * 40, t);
    o.frequency.linearRampToValueAtTime(110 + Math.random() * 60, t + 0.9);
    const am = c.createOscillator(); am.frequency.value = 28 + Math.random() * 20; const amg = c.createGain(); amg.gain.value = 0.5;
    am.connect(amg);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.07, t + 0.15); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
    amg.connect(g.gain);
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 2;
    o.connect(f); f.connect(g); out(g, 0.6); o.start(t); o.stop(t + 1.2); am.start(t); am.stop(t + 1.2);
  }
  function heartbeat() {
    const c = ensure();
    [0, 0.28].forEach((d) => {
      const t = c.currentTime + d;
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
      const g = c.createGain(); g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.25);
    });
  }

  // Ambient bed: low drone + slow swells + occasional creaks / distant music-box notes
  function startAmbient(level = 1) {
    const c = ensure();
    if (ambient) { ambient.level(level); return; }
    const g = c.createGain(); g.gain.value = 0.0001;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 380;
    const oscs = [36, 43, 36.07, 48].map((m) => { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(m); o.connect(f); o.start(); return o; });
    const lfo = c.createOscillator(); lfo.frequency.value = 0.05; const lg = c.createGain(); lg.gain.value = 160; lfo.connect(lg); lg.connect(f.frequency); lfo.start();
    f.connect(g); out(g, 0.5);
    let target = 0.05 * level;
    g.gain.exponentialRampToValueAtTime(target, c.currentTime + 4);
    const scale = [57, 60, 62, 63, 65, 67, 68, 72];
    const timer = setInterval(() => {
      const r = Math.random();
      if (r < 0.18) creak();
      else if (r < 0.30) bell(scale[(Math.random() * scale.length) | 0] + 12, 0, 2.5, 0.05);
      else if (r < 0.34) whoosh(0.07);
    }, 6000);
    ambient = {
      level(l) { target = Math.max(0.0001, 0.05 * l); g.gain.cancelScheduledValues(c.currentTime); g.gain.setValueAtTime(Math.max(g.gain.value, 0.0001), c.currentTime); g.gain.exponentialRampToValueAtTime(target, c.currentTime + 2); },
      stop() { clearInterval(timer); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 3); setTimeout(() => { oscs.forEach((o) => o.stop()); lfo.stop(); }, 3200); ambient = null; },
    };
  }
  function stopAmbient() { if (ambient) ambient.stop(); }

  window.Sound = { ctx: () => ensure(), master: () => (ensure(), master), out, ambientOn: () => !!ambient, ensure, unlocked, bell, key, hum, melody, chime, bigChime, wrong, whoosh, creak, heartbeat, startAmbient, stopAmbient, mtof, NOTE_NAMES };
})();
