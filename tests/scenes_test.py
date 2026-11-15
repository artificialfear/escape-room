"""Screenshot each scene background (no UI) plus effects, for visual review."""
import os, functools, http.server, socketserver, threading
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOTS = os.path.join(ROOT, 'tests', 'shots'); os.makedirs(SHOTS, exist_ok=True)
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(('127.0.0.1', 8774), functools.partial(Q, directory=ROOT)); threading.Thread(target=srv.serve_forever, daemon=True).start()
errs = []
with sync_playwright() as p:
    b = p.chromium.launch(channel='chromium'); pg = b.new_page(); pg.set_viewport_size({'width': 1600, 'height': 900})
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.route('**/lib/peerjs.min.js', lambda r: r.fulfill(body='window.Peer=function(){return{on(){},destroy(){},reconnect(){}}}', content_type='application/javascript'))
    pg.goto('http://127.0.0.1:8774/index.html'); pg.wait_for_timeout(500)
    pg.evaluate("document.querySelector('#wake').remove(); document.querySelector('#app').style.visibility='hidden'")
    for name in ['exterior', 'hallway', 'parlor', 'musicroom', 'attic', 'dawn']:
        pg.evaluate(f"Scenes.setScene('{name}', true)"); pg.wait_for_timeout(2200)
        pg.screenshot(path=os.path.join(SHOTS, f'scene-{name}.png'))
    pg.evaluate("Scenes.ghost('right', 0, 1)"); pg.wait_for_timeout(3000); pg.screenshot(path=os.path.join(SHOTS, 'scene-ghost.png'))
    pg.evaluate("Scenes.lightning()"); pg.wait_for_timeout(60); pg.screenshot(path=os.path.join(SHOTS, 'fx-lightning.png'))
    pg.wait_for_timeout(1500); pg.evaluate("Scenes.shimmer()"); pg.wait_for_timeout(500); pg.screenshot(path=os.path.join(SHOTS, 'fx-shimmer.png'))
    pg.wait_for_timeout(1500); pg.evaluate("Scenes.transition('ink', ()=>{})"); pg.wait_for_timeout(600); pg.screenshot(path=os.path.join(SHOTS, 'fx-ink.png'))
    pg.wait_for_timeout(1500); pg.evaluate("Scenes.transition('snuff', ()=>{})"); pg.wait_for_timeout(250); pg.screenshot(path=os.path.join(SHOTS, 'fx-snuff.png'))
    pg.evaluate("Scenes.tension(2)"); pg.wait_for_timeout(1500); pg.screenshot(path=os.path.join(SHOTS, 'fx-tension.png'))
    b.close()
srv.shutdown()
print('errors:', errs or 'none')
