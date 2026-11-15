"""Soundboard: assign files to slots, check the TV picks them up live and the game still works."""
import os, functools, http.server, socketserver, threading
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOTS = os.path.join(ROOT, 'tests', 'shots'); os.makedirs(SHOTS, exist_ok=True)
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(('127.0.0.1', 8770), functools.partial(Q, directory=ROOT))
threading.Thread(target=srv.serve_forever, daemon=True).start()
B = 'http://127.0.0.1:8770/'
FAKE = open(os.path.join(ROOT, 'tests', 'fakepeer.js')).read()
errors = []
with sync_playwright() as p:
    b = p.chromium.launch(channel='chromium', args=['--autoplay-policy=no-user-gesture-required'])
    ctx = b.new_context()
    ctx.route('**/lib/peerjs.min.js', lambda r: r.fulfill(body=FAKE, content_type='application/javascript'))
    tv = ctx.new_page(); tv.set_viewport_size({'width': 1600, 'height': 900})
    tv.on('pageerror', lambda e: errors.append('tv ' + str(e))); tv.on('console', lambda m: m.type == 'error' and errors.append('tv ' + m.text))
    tv.goto(B + 'index.html'); tv.click('#wakebtn'); tv.wait_for_timeout(500)
    sb = ctx.new_page(); sb.set_viewport_size({'width': 1100, 'height': 1400})
    sb.on('pageerror', lambda e: errors.append('sb ' + str(e))); sb.on('console', lambda m: m.type == 'error' and errors.append('sb ' + m.text))
    sb.on('dialog', lambda d: d.accept())
    sb.goto(B + 'soundboard.html'); sb.wait_for_timeout(1500)
    print('repo files found:', sb.evaluate("AudioBank.SLOTS.filter(s => AudioBank.bank[s.id] && AudioBank.bank[s.id].src === 'repo').length"), 'of', sb.evaluate('AudioBank.SLOTS.length'))
    print('act1 chip:', sb.text_content('#row-music_act1 [data-chip]'))
    sb.click('#row-music_act3 [data-seam]'); sb.wait_for_timeout(2500)
    print('seam test playing:', sb.evaluate('AudioBank.playingId()'))
    sb.click('#stopall')
    sb.set_input_files('#row-sfx_solve [data-file]', '/tmp/tone.wav'); sb.wait_for_timeout(600)
    sb.set_input_files('#row-music_title [data-file]', '/tmp/music.wav'); sb.wait_for_timeout(600)
    sb.click('#row-sfx_solve [data-play]'); sb.wait_for_timeout(300)
    sb.fill('#row-sfx_solve [data-vol]', '0.5') if False else sb.eval_on_selector('#row-sfx_solve [data-vol]', "e => { e.value = 0.5; e.dispatchEvent(new Event('input')); }")
    sb.screenshot(path=os.path.join(SHOTS, 'soundboard.png'), full_page=True)
    print('chip:', sb.text_content('#row-sfx_solve [data-chip]'))
    tv.wait_for_timeout(1500)
    print('tv has sfx_solve:', tv.evaluate("AudioBank.has('sfx_solve')"), 'music playing:', tv.evaluate("AudioBank.playingId()"), 'vol:', tv.evaluate("AudioBank.slotVol('sfx_solve')"))
    # reload TV: files persist via IndexedDB
    tv.reload(); tv.click('#wakebtn'); tv.wait_for_timeout(1200)
    print('after reload music:', tv.evaluate("AudioBank.playingId()"))
    sb.click('#row-music_title [data-del]'); tv.wait_for_timeout(1500)
    print('after remove music:', tv.evaluate("AudioBank.playingId()"))
    b.close()
srv.shutdown()
print('ERRORS:', errors or 'none')
