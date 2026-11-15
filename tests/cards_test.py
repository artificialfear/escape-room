"""Render the printable pages and prove every QR still decodes (clean, low-res, blurred, dim-lit)."""
import os, functools, http.server, socketserver, threading, base64
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOTS = os.path.join(ROOT, 'tests', 'shots'); os.makedirs(SHOTS, exist_ok=True)
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(('127.0.0.1', 8773), functools.partial(Q, directory=ROOT)); threading.Thread(target=srv.serve_forever, daemon=True).start()
DECODE = """async ({img, scale, blur, dim}) => {
  const im = new Image(); im.src = img; await im.decode();
  const w = Math.round(im.width * scale), h = Math.round(im.height * scale);
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  x.filter = `blur(${blur}px) brightness(${dim}) contrast(${dim < 1 ? 0.8 : 1})`; x.drawImage(im, 0, 0, w, h);
  const d = x.getImageData(0, 0, w, h); const r = jsQR(d.data, w, h, { inversionAttempts: 'dontInvert' });
  return r ? (extractCode(r.data) ? 'LR-' + extractCode(r.data) : r.data) : null; }"""
ok = True
with sync_playwright() as p:
    b = p.chromium.launch(channel='chromium')
    for mode in ['normal', 'inksaver']:
        pg = b.new_page(device_scale_factor=2) if False else b.new_page()
        pg.set_viewport_size({'width': 900, 'height': 1250})
        pg.goto('http://127.0.0.1:8773/cards.html' + ('?g=bw' if os.environ.get('BW') else '')); pg.wait_for_timeout(800)
        pg.add_script_tag(path=os.path.join(ROOT, 'lib', 'jsQR.js'))
        if mode == 'inksaver': pg.check('#inksaver')
        pg.screenshot(path=os.path.join(SHOTS, f'cards-{mode}.png'), full_page=True)
        for card in pg.query_selector_all('.card'):
            code = card.get_attribute('data-code')
            img = 'data:image/png;base64,' + base64.b64encode(card.screenshot()).decode()
            res = []
            for scale, blur, dim in [(1, 0, 1), (0.5, 0, 1), (0.35, 0.6, 1), (0.6, 1.2, 0.55)]:
                got = pg.evaluate(DECODE, {'img': img, 'scale': scale, 'blur': blur, 'dim': dim})
                res.append('✓' if got == 'LR-' + code else '✗')
                ok &= got == 'LR-' + code
            print(mode, code, ' '.join(res), '(clean, half-res, 35%+blur, dim+blur)')
    pg.uncheck('#inksaver'); pg.emulate_media(media='print'); pg.wait_for_timeout(200)
    pg.pdf(path='/tmp/cards' + ('-bw' if os.environ.get('BW') else '') + '.pdf', format='Letter', print_background=True)
    b.close()
srv.shutdown()
print('PASS' if ok else 'FAIL')
