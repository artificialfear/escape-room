// Microphone pitch detection (autocorrelation), used on phones.
(function () {
  let stream = null, analyser = null, buf = null, raf = 0, srcNode = null;

  function autoCorrelate(b, sampleRate) {
    let size = b.length, rms = 0;
    for (let i = 0; i < size; i++) rms += b[i] * b[i];
    rms = Math.sqrt(rms / size);
    if (rms < 0.012) return -1;
    let r1 = 0, r2 = size - 1; const thres = 0.2;
    for (let i = 0; i < size / 2; i++) if (Math.abs(b[i]) < thres) { r1 = i; break; }
    for (let i = 1; i < size / 2; i++) if (Math.abs(b[size - i]) < thres) { r2 = size - i; break; }
    b = b.slice(r1, r2); size = b.length;
    const c = new Float32Array(size);
    for (let i = 0; i < size; i++) for (let j = 0; j < size - i; j++) c[i] += b[j] * b[j + i];
    let d = 0; while (d < size - 1 && c[d] > c[d + 1]) d++;
    let maxval = -1, maxpos = -1;
    for (let i = d; i < size; i++) if (c[i] > maxval) { maxval = c[i]; maxpos = i; }
    let T0 = maxpos;
    if (T0 <= 0 || T0 >= size - 1) return -1;
    const x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
    const a = (x1 + x3 - 2 * x2) / 2, bb = (x3 - x1) / 2;
    if (a) T0 = T0 - bb / (2 * a);
    const f = sampleRate / T0;
    return f > 60 && f < 1400 ? f : -1;
  }

  async function start(onPitch) {
    const ctx = Sound.ensure();
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    srcNode = ctx.createMediaStreamSource(stream);
    analyser = ctx.createAnalyser(); analyser.fftSize = 2048;
    srcNode.connect(analyser);
    buf = new Float32Array(analyser.fftSize);
    const loop = () => {
      analyser.getFloatTimeDomainData(buf);
      const f = autoCorrelate(buf, ctx.sampleRate);
      let rms = 0; for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i]; rms = Math.sqrt(rms / buf.length);
      if (f > 0) {
        const midi = 69 + 12 * Math.log2(f / 440);
        onPitch({ rms, freq: f, midi, pc: ((Math.round(midi) % 12) + 12) % 12, cents: Math.round((midi - Math.round(midi)) * 100) });
      } else onPitch(null);
      raf = requestAnimationFrame(loop);
    };
    loop();
  }
  function stop() {
    cancelAnimationFrame(raf);
    if (srcNode) try { srcNode.disconnect(); } catch (e) {}
    if (stream) stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }
  // distance in cents from detected midi to nearest instance of target pitch class
  function centsFromPc(midi, pc) {
    let d = ((midi - pc) % 12 + 12) % 12; // 0..12
    if (d > 6) d -= 12;
    return d * 100;
  }
  window.Pitch = { start, stop, centsFromPc };
})();
