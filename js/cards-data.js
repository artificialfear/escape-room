// Printed page cards. The codes mean nothing on their own; the game decides what each one reveals.
window.CARDS = [
  { code: 'K4TZ', hider: 'mat', slot: 'I' },
  { code: 'Q8WD', hider: 'mat', slot: 'II' },
  { code: 'H2PX', hider: 'emily', slot: 'I' },
  { code: 'B7NC', hider: 'emily', slot: 'II' },
];
window.TEST_CODE = 'TEST';
window.ROOMS = ['Kitchen', 'Dining room', 'Hallway', 'Bedroom', 'Guest room', 'Bathroom', 'Office', 'Laundry', 'Closet', 'Garage', 'Other'];

// QR codes hold a link, so the phone's normal camera app opens the game too.
window.scanUrl = (code, room) => new URL('play.html?scan=' + code + (room ? '&r=' + room : ''), location.href).href;
// Pull a page code out of whatever a QR held: a game link, or an older "LR-XXXX" code.
window.extractCode = (text) => {
  text = String(text || '').trim();
  try { const u = new URL(text); const c = u.searchParams.get('scan'); if (c) return c.toUpperCase(); } catch (e) {}
  const m = text.match(/^LR-([A-Z0-9]+)$/i); return m ? m[1].toUpperCase() : null;
};
