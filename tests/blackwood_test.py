"""Full automated playthrough of Death at Blackwood Hall: TV + two phones (fake networking)."""
import os, json, functools, http.server, socketserver, threading
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOTS = os.path.join(ROOT, 'tests', 'shots'); os.makedirs(SHOTS, exist_ok=True)
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(('127.0.0.1', 8777), functools.partial(Q, directory=ROOT)); threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = 'http://127.0.0.1:8777/'
FAKE = open(os.path.join(ROOT, 'tests', 'fakepeer.js')).read()
errors = []; step = [0]
def shot(pg, name): step[0] += 1; pg.screenshot(path=os.path.join(SHOTS, f'bw{step[0]:02d}-{name}.png'))
with sync_playwright() as p:
    b = p.chromium.launch(channel='chromium', args=['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required'])
    ctx = b.new_context(permissions=['camera', 'microphone'])
    ctx.route('**/lib/peerjs.min.js', lambda r: r.fulfill(body=FAKE, content_type='application/javascript'))
    def mk(w, h):
        pg = ctx.new_page(); pg.set_viewport_size({'width': w, 'height': h})
        pg.on('pageerror', lambda e: errors.append(str(e))); pg.on('console', lambda m: m.type == 'error' and errors.append(m.text)); pg.on('dialog', lambda d: d.accept())
        return pg
    tv = mk(1600, 900); tv.goto(BASE + 'blackwood.html'); tv.wait_for_timeout(2500); shot(tv, 'tv-wake')
    tv.click('#wakebtn'); tv.wait_for_timeout(2500)
    room = tv.evaluate("localStorage.getItem('bw-room')")
    ph = {r: mk(390, 844) for r in ['mat', 'emily']}
    for r in ph: ph[r].goto(BASE + f'play.html?r={room}&g=bw&as={r}')
    ph['mat'].wait_for_selector('#ready'); tv.wait_for_timeout(500); shot(tv, 'tv-lobby'); shot(ph['mat'], 'mat-lobby')
    G = lambda: tv.evaluate('window.__game.st')
    ph['mat'].click('#ready'); ph['emily'].click('#ready'); tv.wait_for_timeout(600); assert G()['phase'] == 'hide'
    for r, rooms in [('mat', ['Kitchen', 'Office']), ('emily', ['Bedroom', 'Closet'])]:
        pg = ph[r]; pg.wait_for_selector('#hidedone'); pg.select_option('#room-I', rooms[0]); pg.select_option('#room-II', rooms[1]); pg.fill('#hint-I', 'near the kettle'); pg.click('#hidedone'); tv.wait_for_timeout(400)
    shot(ph['emily'], 'emily-hideform-done')
    def cont(): ph['mat'].click('#cont'); tv.wait_for_timeout(900)
    cont(); assert G()['phase'] == 'intro'; tv.wait_for_timeout(6000); shot(tv, 'tv-intro')
    cont(); assert G()['phase'] == 'roles'; tv.wait_for_timeout(2500); shot(tv, 'tv-roles'); shot(ph['mat'], 'mat-roles')
    for r in ph: ph[r].dispatch_event('#hold', 'pointerdown')
    tv.wait_for_timeout(3600); assert G()['solved'], 'roles'
    cont(); assert G()['phase'] == 'body'; tv.wait_for_timeout(2500); shot(tv, 'tv-body'); shot(ph['mat'], 'mat-body')
    ph['emily'].click('[data-rv="0"]'); ph['emily'].click('[data-rv="2"]'); shot(ph['emily'], 'emily-exam')
    g = G()['gen']
    def settime(pg, mins):
        h = (mins // 60) % 24; ap = 'PM' if h >= 12 else 'AM'; h12 = h % 12 or 12
        pg.select_option('#th', str(h12)); pg.select_option('#tm', f'{mins % 60:02d}'); pg.select_option('#tap', ap); pg.click('#timego'); tv.wait_for_timeout(500)
    settime(ph['mat'], 23 * 60 + 15); assert not G()['solved']; shot(tv, 'tv-body-wrong')
    settime(ph['emily'], g['T']); assert G()['solved'], 'time of death'
    shot(tv, 'tv-body-after')
    cont(); assert G()['phase'] == 'letter'; tv.wait_for_timeout(2500); shot(tv, 'tv-letter'); shot(ph['mat'], 'mat-letter'); shot(ph['emily'], 'emily-letter')
    word = tv.evaluate(f"BWData.LETTERS[{g['letter']}].word")
    ph['emily'].fill('#word', word.lower()); ph['emily'].click('#wordgo'); tv.wait_for_timeout(500); assert G()['solved'], 'letter'
    shot(tv, 'tv-letter-after')
    cont(); assert G()['phase'] == 'hunt1'; tv.wait_for_timeout(2000); shot(tv, 'tv-hunt1'); shot(ph['mat'], 'mat-hunt1')
    def scan(pg, c): pg.click('#scan'); pg.fill('#manual', c); pg.click('#manualgo'); tv.wait_for_timeout(600)
    scan(ph['mat'], 'H2PX'); shot(ph['mat'], 'mat-evidence-bells'); ph['mat'].click('#pgok')
    scan(ph['emily'], 'K4TZ'); shot(ph['emily'], 'emily-evidence-boot'); ph['emily'].click('#pgok')
    assert G()['solved'], 'hunt1'
    cont(); assert G()['phase'] == 'interview'; tv.wait_for_timeout(1500); shot(tv, 'tv-interview'); shot(ph['mat'], 'mat-interview'); shot(ph['emily'], 'emily-interview')
    sus = ['margaret', 'hale', 'finch', 'crane', 'pell', 'jenkins']
    wrong2 = [x for x in sus if x not in (g['K'], g['F'])][:2]
    for x in wrong2: ph['mat'].check(f'.multi input[value="{x}"]')
    ph['mat'].click('#multigo'); tv.wait_for_timeout(400); assert not G()['solved']
    for x in wrong2: ph['mat'].uncheck(f'.multi input[value="{x}"]')
    for x in (g['K'], g['F']): ph['mat'].check(f'.multi input[value="{x}"]')
    ph['mat'].click('#multigo'); tv.wait_for_timeout(500); assert G()['solved'], 'liars'
    shot(tv, 'tv-interview-after')
    cont(); assert G()['phase'] == 'diary'; tv.wait_for_timeout(2500); shot(tv, 'tv-diary'); shot(ph['emily'], 'emily-diary')
    for _ in range(g['shift']): ph['mat'].click('#cwp')
    shot(ph['mat'], 'mat-cipherwheel')
    ans = tv.evaluate(f"BWData.DIARIES[{g['diary']}].answer")
    ph['mat'].fill('#word', ans); ph['mat'].click('#wordgo'); tv.wait_for_timeout(500); assert G()['solved'], 'diary'
    cont(); assert G()['phase'] == 'hunt2'
    scan(ph['mat'], 'B7NC'); ph['mat'].click('#pgok'); scan(ph['emily'], 'Q8WD'); shot(ph['emily'], 'emily-evidence-glove'); ph['emily'].click('#pgok')
    assert G()['solved'], 'hunt2'
    cont(); assert G()['phase'] == 'accuse'; tv.wait_for_timeout(3000); shot(tv, 'tv-accuse')
    ph['mat'].click('#pagesbtn'); ph['mat'].wait_for_timeout(500); shot(ph['mat'], 'mat-casebook'); ph['mat'].click('#sheet-x')
    ph['emily'].click('#pagesbtn'); ph['emily'].wait_for_timeout(500); shot(ph['emily'], 'emily-casebook'); ph['emily'].click('#sheet-x')
    other = [x for x in sus if x != g['K']][0]
    ph['mat'].select_option('#akiller', other); ph['mat'].select_option('#aweapon', g['weapon']); ph['mat'].click('#propose'); tv.wait_for_timeout(500)
    shot(tv, 'tv-proposal'); shot(ph['emily'], 'emily-agree')
    ph['emily'].click('#agree'); tv.wait_for_timeout(700); assert G()['wrong'] == 1 and G()['phase'] == 'accuse'
    shot(tv, 'tv-wrong')
    ph['emily'].select_option('#akiller', g['K']); ph['emily'].select_option('#aweapon', g['weapon']); ph['emily'].click('#propose'); tv.wait_for_timeout(500)
    ph['mat'].click('#agree'); tv.wait_for_timeout(1500); assert G()['phase'] == 'end', G()['phase']
    tv.wait_for_timeout(9000); shot(tv, 'tv-reconstruction'); shot(ph['mat'], 'mat-end')
    tv.wait_for_timeout(15000); assert tv.query_selector('.program'), 'case file'; shot(tv, 'tv-casefile')
    tv.reload(); tv.click('#wakebtn'); tv.wait_for_timeout(800); assert G()['phase'] == 'end'
    b.close()
srv.shutdown()
errs = [e for e in errors if 'favicon' not in e]
print('ERRORS:', json.dumps(errs, indent=1) if errs else 'none'); print('PASS' if not errs else 'FAIL')
