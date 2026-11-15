// Animated scene art for the TV: backgrounds, Eleanor, transitions and event effects.
// Everything is drawn in code (SVG + canvas). No images needed.
(function () {
  const W = 1600, H = 900;
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const rs = (n) => { seed = n; };

  // ---------- shared pieces ----------
  const defs = `
    <radialGradient id="glow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffcf7a" stop-opacity=".9"/><stop offset=".25" stop-color="#ff9f3a" stop-opacity=".35"/><stop offset="1" stop-color="#ff8a2a" stop-opacity="0"/></radialGradient>
    <radialGradient id="moonglow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#cfe0f0" stop-opacity=".35"/><stop offset="1" stop-color="#cfe0f0" stop-opacity="0"/></radialGradient>
    <radialGradient id="cloud" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#2a2c44" stop-opacity=".9"/><stop offset="1" stop-color="#2a2c44" stop-opacity="0"/></radialGradient>
    <linearGradient id="shaft" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bcd3e8" stop-opacity=".22"/><stop offset="1" stop-color="#bcd3e8" stop-opacity="0"/></linearGradient>
    <linearGradient id="warmshaft" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffcf7a" stop-opacity=".25"/><stop offset="1" stop-color="#ffcf7a" stop-opacity="0"/></linearGradient>`;
  const flame = (x, y, s = 1) => `
    <circle class="flick" cx="${x}" cy="${y - 4 * s}" r="${70 * s}" fill="url(#glow)"/>
    <path class="flame-shape" d="M${x} ${y - 16 * s} C ${x + 5 * s} ${y - 8 * s}, ${x + 5 * s} ${y}, ${x} ${y + 1} C ${x - 5 * s} ${y}, ${x - 5 * s} ${y - 8 * s}, ${x} ${y - 16 * s} Z" fill="#ffe2a0"/>`;
  const candle = (x, y, s = 1) => `<rect x="${x - 4 * s}" y="${y}" width="${8 * s}" height="${34 * s}" fill="#d9ccb0" opacity=".85"/>${flame(x, y - 2, s)}`;
  const stars = (n, maxY) => { let o = ''; for (let i = 0; i < n; i++) o += `<circle class="twinkle" style="animation-delay:${(rnd() * 6).toFixed(1)}s" cx="${(rnd() * W).toFixed(0)}" cy="${(rnd() * maxY).toFixed(0)}" r="${(0.6 + rnd() * 1.4).toFixed(1)}" fill="#dfe6f5"/>`; return o; };
  const clouds = (fill, y0) => { let o = '<g class="clouds">'; for (let i = 0; i < 6; i++) { const x = rnd() * W * 1.2 - 100, y = y0 + rnd() * 160; o += `<ellipse cx="${x}" cy="${y}" rx="${200 + rnd() * 220}" ry="${30 + rnd() * 30}" fill="${fill}" opacity="${.5 + rnd() * .4}"/>`; } return o + '</g>'; };
  // Spanish moss: tapered, ragged wisps
  const moss = (x, y, len) => {
    let o = `<g class="sway" style="animation-delay:${(rnd() * 4).toFixed(1)}s;transform-origin:${x}px ${y}px">`;
    for (let i = 0; i < 4; i++) {
      const dx = (rnd() - .5) * 26, l = len * (.6 + rnd() * .6), w = 1.6 + rnd() * 2.6, cx = x + dx;
      let d = `M${cx - w} ${y}`;
      for (let k = 1; k <= 6; k++) d += ` L ${cx - w * (1 - k / 7) + (rnd() - .5) * 5} ${y + l * k / 6}`;
      d += ` L ${cx + (rnd() - .5) * 4} ${y + l + 8}`;
      for (let k = 6; k >= 1; k--) d += ` L ${cx + w * (1 - k / 7) + (rnd() - .5) * 5} ${y + l * k / 6}`;
      o += `<path d="${d} L ${cx + w} ${y} Z" fill="#6c7880" opacity="${.14 + rnd() * .14}"/>`;
    }
    return o + '</g>';
  };
  // Southern live oak framing one side of the screen
  function oak(side, ink) {
    const m = side === 'left' ? 1 : -1, bx = side === 'left' ? 110 : W - 110;
    const X = (x) => bx + m * x;
    let o = `<path d="M${X(-55)} 800 C ${X(-40)} 690, ${X(-30)} 600, ${X(-20)} 520 L ${X(40)} 520 C ${X(50)} 610, ${X(70)} 700, ${X(95)} 800 Z" fill="${ink}"/>`;
    const limbs = [[10, 540, 160, 470, 330, 430], [0, 530, 70, 380, 170, 250], [0, 540, -60, 420, -150, 330], [20, 520, 120, 330, 280, 300]];
    const ends = [];
    limbs.forEach(([sx, sy, c1x, c1y, ex, ey]) => { o += `<path d="M${X(sx)} ${sy} Q ${X(c1x)} ${c1y} ${X(ex)} ${ey}" stroke="${ink}" stroke-width="${16 + rnd() * 10}" fill="none" stroke-linecap="round"/>`; ends.push([ex, ey], [(sx + ex) / 2 + 30, (sy + ey) / 2 - 30]); });
    // lumpy canopy built from many overlapping circles around the limb ends
    ends.forEach(([ex, ey]) => { for (let i = 0; i < 9; i++) o += `<circle cx="${X(ex + (rnd() - .5) * 170)}" cy="${ey - 20 + (rnd() - .5) * 90}" r="${26 + rnd() * 34}" fill="${ink}"/>`; });
    for (let i = 0; i < 9; i++) { const [ex, ey] = ends[(rnd() * ends.length) | 0]; o += moss(X(ex + (rnd() - .5) * 160), ey + 30 + rnd() * 30, 110 + rnd() * 110); }
    return o;
  }

  // ---------- scenes ----------
  function exterior(dawn) {
    rs(11);
    const sky = dawn
      ? `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1d2340"/><stop offset=".55" stop-color="#6b4a6a"/><stop offset=".8" stop-color="#d9866a"/><stop offset="1" stop-color="#f3c88a"/></linearGradient>`
      : `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#05060d"/><stop offset=".6" stop-color="#121426"/><stop offset="1" stop-color="#1d1a2e"/></linearGradient>`;
    const body = dawn ? '#1b1522' : '#0c0a12', win = dawn ? '#3a2d3d' : '#141a2a';
    let lit = '';
    const wins = [[600, 430], [700, 430], [860, 430], [600, 520], [860, 520], [995, 360], [995, 470]];
    wins.forEach(([x, y], i) => {
      const on = !dawn && (i === 5 || i === 2);
      lit += `<rect x="${x}" y="${y}" width="44" height="64" fill="${on ? '#e9a24a' : win}" ${on ? 'class="flick-win"' : ''}/><path d="M${x + 22} ${y} v64 M${x} ${y + 30} h44" stroke="${body}" stroke-width="4"/>`;
      if (on) lit += `<circle class="flick" cx="${x + 22}" cy="${y + 32}" r="90" fill="url(#glow)"/>`;
    });
    let fence = ''; for (let x = -10; x < W + 20; x += 34) fence += `<path d="M${x} 860 V 770 l 6 -14 l 6 14 V 860" fill="#050408"/>`;
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg"><defs>${defs}${sky}
      <radialGradient id="sun" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffe6b0" stop-opacity=".9"/><stop offset="1" stop-color="#ffb070" stop-opacity="0"/></radialGradient></defs>
      <rect width="${W}" height="${H}" fill="url(#sky)"/>
      ${dawn ? `<circle cx="1180" cy="720" r="420" fill="url(#sun)"/>` : `${stars(120, 520)}<circle cx="870" cy="110" r="220" fill="url(#moonglow)"/><circle cx="870" cy="110" r="46" fill="#e9e4d2"/><circle cx="856" cy="100" r="7" fill="#d6d0bd"/><circle cx="884" cy="124" r="5" fill="#d6d0bd"/>`}
      ${clouds(dawn ? '#8a5a6e' : 'url(#cloud)', dawn ? 260 : 120)}
      <path d="M0 650 Q 120 600 240 640 T 480 630 T 760 650 T 1040 625 T 1320 645 T 1600 630 V900 H0Z" fill="${dawn ? '#241a28' : '#0a0911'}"/>
      <g>
        <rect x="560" y="380" width="480" height="340" fill="${body}"/>
        <polygon points="540,382 800,232 1060,382" fill="${body}"/>
        <polygon points="560,382 800,250 1040,382" fill="none" stroke="#1d1a28" stroke-width="3"/>
        <rect x="960" y="300" width="140" height="420" fill="${body}"/>
        <polygon points="945,302 1030,130 1115,302" fill="${body}"/>
        <line x1="1030" y1="130" x2="1030" y2="96" stroke="${body}" stroke-width="4"/>
        <rect x="640" y="250" width="36" height="90" fill="${body}"/>
        <rect x="520" y="598" width="560" height="14" fill="${body}"/>
        ${[540, 640, 740, 860, 960, 1060].map((x) => `<rect x="${x - 6}" y="610" width="12" height="110" fill="${body}"/>`).join('')}
        <path d="M520 640 H1080" stroke="#16131f" stroke-width="3"/>
        ${lit}
        <rect x="770" y="640" width="60" height="80" fill="#07060b"/>
      </g>
      ${oak('left', dawn ? '#120d16' : '#07060b')}${oak('right', dawn ? '#120d16' : '#07060b')}
      <rect y="760" width="${W}" height="140" fill="${dawn ? '#140f18' : '#040306'}"/>
      ${fence}
      ${dawn ? '<g class="birds">' + [0, 1, 2, 3].map((i) => `<path d="M${300 + i * 40} ${300 + (i % 2) * 18} q 8 -8 16 0 q 8 -8 16 0" stroke="#2a1d2a" stroke-width="2" fill="none"/>`).join('') + '</g>' : ''}
    </svg>`;
  }

  function hallway() {
    rs(23);
    const vp = [800, 440];
    const doorL = (t0, t1) => { const x0 = 620 * t0, x1 = 620 * t1, y0t = 320 * t0 + 120 * (1 - t0), y1t = 320 * t1 + 120 * (1 - t1); return `<polygon points="${x0},${y0t + 60 * (1 - t0)} ${x1},${y1t + 60 * (1 - t1)} ${x1},${900 - (900 - 560) * t1} ${x0},${900 - (900 - 560) * t0}" fill="#0b0910" stroke="#1d1824" stroke-width="3"/>`; };
    const mirror = (s) => `<g transform="translate(${W} 0) scale(-1 1)">${s}</g>`;
    const sconce = (x, y, s) => `<rect x="${x - 3 * s}" y="${y}" width="${6 * s}" height="${18 * s}" fill="#3a2c1c"/>${flame(x, y - 2, s * .9)}`;
    let frames = '';
    [[0.18, 0.3], [0.68, 0.76]].forEach(([a, b]) => { frames += `<polygon points="${620 * a},${200 + 120 * a} ${620 * b},${200 + 120 * b} ${620 * b},${330 + 70 * b} ${620 * a},${330 + 70 * a}" fill="none" stroke="#3a2c1c" stroke-width="5"/>`; });
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg"><defs>${defs}
      <linearGradient id="wallL" x1="0" x2="1"><stop offset="0" stop-color="#1a1420"/><stop offset="1" stop-color="#0b090f"/></linearGradient>
      <linearGradient id="floor" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#1a120c"/><stop offset="1" stop-color="#07050a"/></linearGradient></defs>
      <rect width="${W}" height="${H}" fill="#06050a"/>
      <polygon points="0,0 1600,0 980,320 620,320" fill="#0a080e"/>
      <polygon points="0,900 1600,900 980,560 620,560" fill="url(#floor)"/>
      <polygon points="560,900 1040,900 870,560 730,560" fill="#2a0f12" opacity=".7"/>
      <polygon points="0,0 620,320 620,560 0,900" fill="url(#wallL)"/>
      ${mirror('<polygon points="0,0 620,320 620,560 0,900" fill="url(#wallL)"/>')}
      <rect x="620" y="320" width="360" height="240" fill="#0d0a12"/>
      <rect x="740" y="380" width="120" height="180" fill="#07060a"/>
      <polygon class="flick" points="796,380 812,380 812,560 796,560" fill="#ffcf7a" opacity=".55"/>
      <polygon class="flick" points="796,560 812,560 880,900 720,900" fill="url(#shaft)" opacity=".6" style="mix-blend-mode:screen"/>
      ${doorL(0.08, 0.28)}${doorL(0.45, 0.6)}${mirror(doorL(0.1, 0.3) + doorL(0.47, 0.62))}
      ${frames}${mirror(frames)}
      ${sconce(400, 300, 1.2)}${sconce(W - 400, 300, 1.2)}${sconce(560, 360, .7)}${sconce(W - 560, 360, .7)}
    </svg>`;
  }

  function parlor() {
    rs(31);
    let damask = '';
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg"><defs>${defs}
      <pattern id="dmk" width="80" height="110" patternUnits="userSpaceOnUse"><path d="M40 10 C 60 30, 60 50, 40 60 C 20 50, 20 30, 40 10 Z M40 60 C 55 75, 50 95, 40 105 C 30 95, 25 75, 40 60 Z" fill="#2a1a2a" opacity=".35"/></pattern>
      <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#140d18"/><stop offset="1" stop-color="#1c1220"/></linearGradient></defs>
      <rect width="${W}" height="${H}" fill="url(#wall)"/>
      <rect width="${W}" height="740" fill="url(#dmk)"/>
      <rect y="700" width="${W}" height="40" fill="#0f0a10"/>
      <rect y="740" width="${W}" height="160" fill="#0b0709"/>
      <ellipse cx="820" cy="830" rx="560" ry="60" fill="#2a1016" opacity=".6"/>
      <!-- tall window with moonlight -->
      <rect x="150" y="120" width="250" height="480" fill="#131c2c"/>
      <circle cx="320" cy="230" r="34" fill="#dfe3ea" opacity=".7"/>
      <path d="M275 120 V600 M150 360 H400 M150 240 H400 M150 480 H400" stroke="#0a070c" stroke-width="10"/>
      <rect x="150" y="120" width="250" height="480" fill="none" stroke="#0a070c" stroke-width="16"/>
      <polygon points="150,600 400,600 760,900 220,900" fill="url(#shaft)"/>
      <path class="sway slow" style="transform-origin:120px 100px" d="M100 90 C 150 300, 90 500, 140 720 L 60 720 C 70 500, 40 300, 60 90 Z" fill="#2b0f18"/>
      <path class="sway slow" style="transform-origin:430px 100px;animation-delay:2s" d="M450 90 C 400 300, 460 500, 410 720 L 490 720 C 480 500, 510 300, 490 90 Z" fill="#2b0f18"/>
      <rect x="40" y="80" width="470" height="18" fill="#3a2414"/>
      <!-- fireplace -->
      <rect x="880" y="420" width="420" height="290" fill="#120c0e"/>
      <rect x="960" y="500" width="260" height="210" fill="#050304"/>
      <rect x="860" y="400" width="460" height="28" fill="#2a1a12"/>
      <circle class="flick" cx="1090" cy="700" r="120" fill="url(#glow)" opacity=".35"/><path d="M1030 708 Q1060 690 1090 704 Q1120 688 1150 708 Z" fill="#7a3414" opacity=".8"/>
      ${candle(930, 360, 1.1)}${candle(1250, 360, 1.1)}
      <!-- portrait (turned to the wall) -->
      <rect x="1000" y="150" width="180" height="220" fill="#3a2a1a"/>
      <rect x="1012" y="162" width="156" height="196" fill="#1a1410"/>
      <path d="M1012 162 L1168 358 M1168 162 L1012 358" stroke="#2a2018" stroke-width="3"/>
      <!-- armchair & side table -->
      <path d="M520 760 V560 C 520 500, 700 500, 700 560 V640 H760 V760 H730 V700 H550 V760 Z" fill="#0d080b"/>
      <rect x="1400" y="600" width="140" height="14" fill="#0d080b"/><rect x="1462" y="614" width="16" height="140" fill="#0d080b"/>
      <ellipse cx="1470" cy="760" rx="60" ry="8" fill="#0d080b"/>
    </svg>`;
  }

  function musicroom() {
    rs(41);
    let rain = ''; for (let i = 0; i < 70; i++) { const x = 260 + rnd() * 330, y = rnd() * 900; rain += `<line x1="${x}" y1="${y}" x2="${x - 6}" y2="${y + 26}" stroke="#9fb4c8" stroke-width="1.2" opacity="${.25 + rnd() * .3}"/>`; }
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg"><defs>${defs}
      <clipPath id="arch"><path d="M260 640 V260 A165 165 0 0 1 590 260 V640 Z"/></clipPath>
      <linearGradient id="wall2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d1018"/><stop offset="1" stop-color="#161320"/></linearGradient></defs>
      <rect width="${W}" height="${H}" fill="url(#wall2)"/>
      ${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<rect x="${i * 220}" y="0" width="6" height="740" fill="#0a0c12" opacity=".7"/>`).join('')}
      <rect y="740" width="${W}" height="160" fill="#08070b"/>
      <!-- arched window with rain -->
      <g clip-path="url(#arch)">
        <rect x="260" y="90" width="330" height="560" fill="#101a2a"/>
        <rect class="lightning-sky" x="260" y="90" width="330" height="560" fill="#cfe0ff" opacity="0"/>
        <g class="rain">${rain}</g><g class="rain r2" style="transform:translateY(-900px)">${rain}</g>
      </g>
      <path d="M260 640 V260 A165 165 0 0 1 590 260 V640 Z M425 95 V640 M260 400 H590" fill="none" stroke="#07060a" stroke-width="12"/>
      <polygon points="260,640 590,640 900,900 120,900" fill="url(#shaft)" opacity=".8"/>
      <!-- grand piano -->
      <path d="M820 600 H1400 C 1470 600, 1500 560, 1460 520 C 1420 480, 1300 500, 1240 470 C 1170 436, 1140 380, 1060 380 H 900 C 850 380, 820 420, 820 470 Z" fill="#050407"/>
      <path d="M900 380 L 1180 180 L 1200 196 L 960 384 Z" fill="#07060a"/>
      <line x1="1050" y1="384" x2="1150" y2="230" stroke="#050407" stroke-width="6"/>
      <rect x="820" y="470" width="190" height="34" fill="#0b0a0f"/>
      ${Array.from({ length: 14 }, (_, i) => `<rect x="${824 + i * 13}" y="474" width="11" height="26" fill="#d8cfbe" opacity=".18"/>`).join('')}
      ${[860, 1300, 1430].map((x) => `<rect x="${x}" y="600" width="18" height="150" fill="#050407"/>`).join('')}
      <rect x="880" y="660" width="150" height="16" fill="#050407"/><rect x="900" y="676" width="12" height="70" fill="#050407"/><rect x="996" y="676" width="12" height="70" fill="#050407"/>
      <!-- candelabra on piano -->
      <path d="M1300 520 V470 M1270 480 Q1300 500 1330 480 M1270 480 V460 M1330 480 V460" stroke="#3a2c1c" stroke-width="5" fill="none"/>
      ${flame(1270, 452, .8)}${flame(1300, 462, .8)}${flame(1330, 452, .8)}
      <!-- music stand -->
      <path d="M1520 760 L1560 760 M1540 760 V520 M1490 470 L1590 470 L1580 530 L1500 530 Z" stroke="#0a090e" stroke-width="6" fill="#0a090e"/>
    </svg>`;
  }

  function attic() {
    rs(53);
    const chair = (x, s) => `<g transform="translate(${x} ${600}) scale(${s})" fill="#08070b"><rect x="-40" y="-150" width="10" height="230"/><rect x="30" y="-150" width="10" height="230"/><rect x="-40" y="-150" width="80" height="12"/><rect x="-40" y="-110" width="80" height="8"/><rect x="-46" y="0" width="92" height="12"/><rect x="-40" y="12" width="8" height="70"/><rect x="32" y="12" width="8" height="70"/></g>`;
    let dust = ''; for (let i = 0; i < 24; i++) dust += `<circle class="mote" style="animation-delay:${(rnd() * 8).toFixed(1)}s" cx="${700 + rnd() * 400}" cy="${250 + rnd() * 450}" r="${1 + rnd() * 1.6}" fill="#e8e4d2"/>`;
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg"><defs>${defs}
      <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9e4ee" stop-opacity=".28"/><stop offset="1" stop-color="#d9e4ee" stop-opacity="0"/></linearGradient></defs>
      <rect width="${W}" height="${H}" fill="#0b0a0f"/>
      <polygon points="0,0 800,0 800,0 0,720" fill="#100d14"/><polygon points="1600,0 800,0 1600,720" fill="#100d14"/>
      ${[0, 1, 2, 3, 4].map((i) => `<line x1="${800 - 160 * i}" y1="0" x2="${0}" y2="${720 - 140 * i}" stroke="#07060a" stroke-width="16"/><line x1="${800 + 160 * i}" y1="0" x2="${W}" y2="${720 - 140 * i}" stroke="#07060a" stroke-width="16"/>`).join('')}
      <line x1="0" y1="720" x2="800" y2="0" stroke="#050407" stroke-width="30"/><line x1="1600" y1="720" x2="800" y2="0" stroke="#050407" stroke-width="30"/>
      <rect y="720" width="${W}" height="180" fill="#0a080b"/>
      ${[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => `<line x1="0" y1="${730 + i * 20}" x2="${W}" y2="${730 + i * 20}" stroke="#060508" stroke-width="2"/>`).join('')}
      <!-- round window + light beam -->
      <circle cx="800" cy="200" r="70" fill="#1a2436"/><circle cx="800" cy="200" r="70" fill="none" stroke="#050407" stroke-width="12"/>
      <path d="M800 130 V270 M730 200 H870" stroke="#050407" stroke-width="8"/>
      <polygon class="beam" points="740,230 860,230 1120,900 560,900" fill="url(#beam)"/>
      ${dust}
      <!-- four chairs facing a stand -->
      ${chair(560, 1)}${chair(700, 1.05)}${chair(900, 1.05)}${chair(1040, 1)}
      <path d="M800 760 L 780 790 M800 760 L820 790 M800 760 V 560 M760 520 H840 L835 560 H765 Z" stroke="#08070b" stroke-width="6" fill="#08070b"/>
      <!-- sheeted furniture, trunk, cobwebs -->
      <path d="M90 760 C 90 620, 150 560, 230 560 C 320 560, 360 640, 360 760 Z" fill="#2a2830" opacity=".55"/>
      <rect x="1290" y="680" width="220" height="90" fill="#120d0c"/><path d="M1290 680 Q1400 620 1510 680" fill="#120d0c"/>
      <g stroke="#bfc6d0" stroke-width=".8" fill="none" opacity=".25"><path d="M0 0 L180 160 M0 60 L180 160 M60 0 L180 160 M0 120 Q90 120 180 160 M120 0 Q150 90 180 160"/><path d="M30 30 Q 60 60 90 30 M60 60 Q 100 100 140 70"/></g>
      <g stroke="#bfc6d0" stroke-width=".8" fill="none" opacity=".2" transform="translate(${W} 0) scale(-1 1)"><path d="M0 0 L200 180 M0 70 L200 180 M70 0 L200 180"/><path d="M40 40 Q 80 80 120 40"/></g>
    </svg>`;
  }

  const SCENES = { exterior: () => exterior(false), dawn: () => exterior(true), hallway, parlor, musicroom, attic };
  const PHASE_SCENE = { lobby: 'exterior', hide: 'hallway', intro: 'exterior', seance: 'parlor', lock: 'parlor', hunt1: 'hallway', melody: 'musicroom', harmony: 'musicroom', rhythm: 'musicroom', hunt2: 'hallway', portraits: 'attic', finale: 'attic', release: 'attic', end: 'dawn' };

  // ---------- Eleanor ----------
  const GHOST = `<svg viewBox="0 0 300 640" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="gfade" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="640"><stop offset="0" stop-color="#fff"/><stop offset=".4" stop-color="#ccc"/><stop offset=".75" stop-color="#555"/><stop offset="1" stop-color="#000"/></linearGradient>
      <mask id="gmask" maskUnits="userSpaceOnUse" x="0" y="0" width="300" height="640"><rect width="300" height="640" fill="url(#gfade)"/></mask>
      <filter id="gblur" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.2"/></filter>
    </defs>
    <g mask="url(#gmask)"><g filter="url(#gblur)" fill="#d9f6f1">
      <ellipse cx="150" cy="30" rx="17" ry="13"/>
      <ellipse cx="150" cy="56" rx="33" ry="24"/>
      <ellipse cx="150" cy="78" rx="23" ry="29"/>
      <rect x="140" y="100" width="20" height="26"/>
      <ellipse cx="101" cy="152" rx="24" ry="24"/><ellipse cx="199" cy="152" rx="24" ry="24"/>
      <path d="M106 132 Q150 120 194 132 L182 248 L118 248 Z"/>
      <path d="M78 165 Q 82 225 136 254 L 146 244 Q 104 215 104 160 Z"/>
      <path d="M222 165 Q 218 225 164 254 L 154 244 Q 196 215 196 160 Z"/>
      <ellipse cx="150" cy="252" rx="15" ry="10"/>
      <path d="M118 246 L182 246 C 214 330, 252 470, 282 640 L 18 640 C 48 470, 86 330, 118 246 Z"/>
    </g>
    <g fill="none" stroke="#ffffff" stroke-opacity=".35" stroke-width="3" filter="url(#gblur)">
      <path d="M140 270 C 130 380, 110 500, 95 630"/><path d="M160 270 C 170 380, 190 500, 205 630"/><path d="M150 262 C 150 400, 150 520, 150 630"/>
    </g></g>
    <ellipse cx="141" cy="76" rx="4" ry="2.6" fill="#0b1a1a" opacity=".22"/><ellipse cx="159" cy="76" rx="4" ry="2.6" fill="#0b1a1a" opacity=".22"/>
  </svg>`;

  // ---------- DOM ----------
  let root, layerA, layerB, ghostEl, fx, canvas, ctx, current = null;
  function init() {
    root = document.createElement('div'); root.id = 'scene';
    root.innerHTML = `<div class="scene-layer"></div><div class="scene-layer"></div><canvas class="motes"></canvas><div class="scene-dim"></div>`;
    document.body.prepend(root);
    [layerA, layerB] = root.querySelectorAll('.scene-layer');
    canvas = root.querySelector('canvas'); ctx = canvas.getContext('2d');
    ghostEl = document.createElement('div'); ghostEl.id = 'ghost'; ghostEl.innerHTML = GHOST; document.body.appendChild(ghostEl);
    fx = document.createElement('div'); fx.id = 'fx';
    fx.innerHTML = `<div class="fx-flash"></div><div class="fx-sweep"></div><div class="fx-ink"><svg viewBox="0 0 200 200"><defs><filter id="inkf"><feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="3" seed="4"/><feDisplacementMap in="SourceGraphic" scale="40"/></filter></defs><circle cx="100" cy="100" r="70" fill="#000" filter="url(#inkf)"/></svg></div><div class="fx-snuff"></div><div class="fx-smoke"></div>`;
    document.body.appendChild(fx);
    resize(); window.addEventListener('resize', resize);
    for (let i = 0; i < 70; i++) motes.push(spawnMote());
    requestAnimationFrame(tick);
  }
  function resize() { canvas.width = innerWidth; canvas.height = innerHeight; }

  // dust motes / embers
  const motes = []; let moteColor = '232,228,210';
  function spawnMote(burst) {
    return burst
      ? { x: burst.x + (Math.random() - .5) * 40, y: burst.y + (Math.random() - .5) * 40, vx: (Math.random() - .5) * 3.2, vy: -1 - Math.random() * 3, r: 1 + Math.random() * 2.4, a: 1, life: 1, decay: .008 + Math.random() * .01, c: '255,214,130' }
      : { x: Math.random() * canvas.width, y: Math.random() * canvas.height, vx: (Math.random() - .5) * .15, vy: -.05 - Math.random() * .18, r: .6 + Math.random() * 1.6, a: 0, life: 1, decay: 0, phase: Math.random() * 6.28, c: null };
  }
  function tick(t) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = motes.length - 1; i >= 0; i--) {
      const m = motes[i];
      m.x += m.vx + (m.decay ? 0 : Math.sin(t / 2000 + m.phase) * .12); m.y += m.vy;
      if (m.decay) { m.life -= m.decay; m.vy += .02; if (m.life <= 0) { motes.splice(i, 1); continue; } m.a = m.life; }
      else { m.a = Math.min(.55, m.a + .004); if (m.y < -10) { m.y = canvas.height + 10; m.x = Math.random() * canvas.width; } }
      ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, 6.283);
      ctx.fillStyle = `rgba(${m.c || moteColor},${m.a * (m.decay ? 1 : .5 + .5 * Math.sin(t / 900 + (m.phase || 0)))})`; ctx.fill();
    }
    requestAnimationFrame(tick);
  }

  function setScene(name, instant) {
    if (!root) init();
    if (name === current) return;
    current = name;
    const next = layerA.classList.contains('on') ? layerB : layerA, prev = next === layerA ? layerB : layerA;
    next.innerHTML = SCENES[name]();
    next.dataset.scene = name;
    if (instant) next.style.transition = 'none';
    requestAnimationFrame(() => { next.classList.add('on'); prev.classList.remove('on'); setTimeout(() => { next.style.transition = ''; }, 50); });
    moteColor = name === 'attic' ? '232,228,210' : name === 'dawn' ? '255,226,180' : name === 'parlor' || name === 'hallway' ? '255,210,150' : '200,220,235';
  }
  function sceneForPhase(ph) { return PHASE_SCENE[ph] || 'exterior'; }

  // Eleanor: pos 'left' | 'right' | 'center'; ms = how long she stays (0 = until hidden)
  let ghostT = 0;
  function ghost(pos = 'right', ms = 5000, strength = 1) {
    if (!root) init();
    clearTimeout(ghostT);
    ghostEl.className = 'show pos-' + pos; ghostEl.style.setProperty('--g', strength);
    if (ms) ghostT = setTimeout(hideGhost, ms);
  }
  function hideGhost(rise) { clearTimeout(ghostT); ghostEl.className = ghostEl.className.replace('show', '') + (rise ? ' rise' : ''); }

  // transitions: 'ink' (between places) or 'snuff' (within a place). cb runs while the screen is covered.
  let busy = 0;
  function transition(kind, cb) {
    if (!root) init();
    const el = fx.querySelector(kind === 'ink' ? '.fx-ink' : '.fx-snuff');
    const cover = kind === 'ink' ? 650 : 380;
    el.classList.remove('go'); void el.offsetWidth; el.classList.add('go');
    if (kind === 'snuff') { const s = fx.querySelector('.fx-smoke'); s.classList.remove('go'); void s.offsetWidth; s.classList.add('go'); }
    const my = ++busy;
    setTimeout(() => { if (my === busy) cb(); else cb(); }, cover);
  }
  function lightning() {
    if (!root) init();
    const f = fx.querySelector('.fx-flash'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
    root.classList.remove('struck'); void root.offsetWidth; root.classList.add('struck');
  }
  function shimmer() {
    if (!root) init();
    const s = fx.querySelector('.fx-sweep'); s.classList.remove('go'); void s.offsetWidth; s.classList.add('go');
    const c = { x: canvas.width / 2, y: canvas.height * .45 };
    for (let i = 0; i < 70; i++) motes.push(spawnMote({ x: c.x + (Math.random() - .5) * canvas.width * .5, y: c.y + (Math.random() - .5) * 160 }));
  }
  // 0 = calm, 1 = time running low, 2 = over time
  function tension(level) { if (!root) init(); document.body.classList.toggle('tension-1', level === 1); document.body.classList.toggle('tension-2', level === 2); }

  window.Scenes = { get current() { return current; }, init, setScene, sceneForPhase, ghost, hideGhost, transition, lightning, shimmer, tension, SCENES };
})();
