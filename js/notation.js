// Tiny SVG music engraver: one-note staff fragments and rhythm-only manuscript lines.
(function () {
  const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const PC_TO_LETTER = { 0: 0, 2: 1, 4: 2, 5: 3, 7: 4, 9: 5, 11: 6 };
  const CLEFS = {
    treble: { bottom: 30, glyph: '\u{1D11E}', baseStep: -0.6, label: 'Treble clef' },
    bass: { bottom: 18, glyph: '\u{1D122}', baseStep: 0.7, label: 'Bass clef' },
    alto: { bottom: 24, glyph: '\u{1D121}', baseStep: 1.4, label: 'Alto clef' },
    tenor: { bottom: 22, glyph: '\u{1D121}', baseStep: 3.4, label: 'Tenor clef' },
  };

  function noteHead(x, y, filled, sp) {
    const rx = sp * 0.62, ry = sp * 0.44;
    if (filled) return `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" transform="rotate(-20 ${x} ${y})" fill="currentColor"/>`;
    return `<g transform="rotate(-25 ${x} ${y})"><ellipse cx="${x}" cy="${y}" rx="${rx * 1.12}" ry="${ry * 1.05}" fill="currentColor"/>` +
      `<ellipse cx="${x}" cy="${y}" rx="${rx * 0.5}" ry="${ry * 0.62}" fill="var(--paper, #f3ead6)"/></g>`;
  }

  // One whole note of pitch class pc (natural) on a staff in the given clef
  function fragmentSVG(pc, clefName, opts = {}) {
    const sp = opts.space || 12, W = opts.width || 170, top = 34;
    const clef = CLEFS[clefName];
    const L = PC_TO_LETTER[pc];
    let best = null;
    for (let o = 1; o <= 6; o++) {
      const k = o * 7 + L - clef.bottom;
      if (best === null || Math.abs(k - 4) < Math.abs(best - 4)) best = k;
    }
    const k = best;
    const bottomY = top + 4 * sp;
    const yOf = (step) => bottomY - step * sp / 2;
    let s = `<svg viewBox="0 0 ${W} ${top * 2 + 4 * sp}" width="${W}" style="color:${opts.color || '#1b1612'}" xmlns="http://www.w3.org/2000/svg">`;
    for (let i = 0; i < 5; i++) s += `<line x1="4" x2="${W - 4}" y1="${top + i * sp}" y2="${top + i * sp}" stroke="currentColor" stroke-width="1.2"/>`;
    s += `<line x1="4" x2="4" y1="${top}" y2="${bottomY}" stroke="currentColor" stroke-width="1.2"/>`;
    s += `<line x1="${W - 4}" x2="${W - 4}" y1="${top}" y2="${bottomY}" stroke="currentColor" stroke-width="1.2"/>`;
    s += `<text class="music-glyph" x="12" y="${yOf(clef.baseStep)}" font-size="${sp * 4}" fill="currentColor">${clef.glyph}</text>`;
    const nx = W * 0.66;
    for (let st = -2; st >= k; st -= 2) s += `<line x1="${nx - sp * 1.1}" x2="${nx + sp * 1.1}" y1="${yOf(st)}" y2="${yOf(st)}" stroke="currentColor" stroke-width="1.2"/>`;
    for (let st = 10; st <= k; st += 2) s += `<line x1="${nx - sp * 1.1}" x2="${nx + sp * 1.1}" y1="${yOf(st)}" y2="${yOf(st)}" stroke="currentColor" stroke-width="1.2"/>`;
    s += noteHead(nx, yOf(k), false, sp);
    s += `</svg>`;
    return s;
  }

  // Rhythm line: measures = [[ 'q' | 'e', ...], ...]
  function rhythmSVG(measures, opts = {}) {
    const sp = opts.space || 14, noteW = sp * 2.6, pad = sp * 1.4, top = sp * 4;
    let x = pad, parts = [];
    const lineY = top + sp * 2;
    measures.forEach((m, mi) => {
      m.forEach((v) => {
        const nx = x + noteW / 2;
        let g = noteHead(nx, lineY, true, sp);
        const sx = nx + sp * 0.55, sy1 = lineY - sp * 0.15, sy2 = lineY - sp * 3.3;
        g += `<line x1="${sx}" x2="${sx}" y1="${sy1}" y2="${sy2}" stroke="currentColor" stroke-width="${sp * 0.11}"/>`;
        if (v === 'e') g += `<path d="M${sx} ${sy2} c ${sp * 0.2} ${sp * 0.9}, ${sp * 1.3} ${sp * 1.1}, ${sp * 0.9} ${sp * 2.4} c ${sp * 0.1} ${-sp * 1.0}, ${-sp * 0.5} ${-sp * 1.4}, ${-sp * 0.9} ${-sp * 1.6} z" fill="currentColor"/>`;
        parts.push(g);
        x += noteW;
      });
      x += pad * 0.9;
      if (mi < measures.length - 1) parts.push(`<line x1="${x}" x2="${x}" y1="${lineY - sp * 2}" y2="${lineY + sp * 2}" stroke="currentColor" stroke-width="${sp * 0.09}"/>`);
      x += pad;
    });
    const W = x;
    let s = `<svg viewBox="0 0 ${W} ${top + sp * 4}" xmlns="http://www.w3.org/2000/svg" style="color:${opts.color || '#1b1612'};width:100%;height:auto">`;
    s += `<line x1="0" x2="${W}" y1="${lineY}" y2="${lineY}" stroke="currentColor" stroke-width="${sp * 0.08}"/>`;
    s += `<line x1="${W - 2}" x2="${W - 2}" y1="${lineY - sp * 2}" y2="${lineY + sp * 2}" stroke="currentColor" stroke-width="${sp * 0.3}"/>`;
    s += `<line x1="${W - sp * 0.6}" x2="${W - sp * 0.6}" y1="${lineY - sp * 2}" y2="${lineY + sp * 2}" stroke="currentColor" stroke-width="${sp * 0.09}"/>`;
    s += parts.join('') + `</svg>`;
    return s;
  }

  window.Notation = { fragmentSVG, rhythmSVG, CLEFS, LETTERS, PC_TO_LETTER };
})();
