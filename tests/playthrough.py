"""Full automated playthrough: TV + two phones, fake networking via BroadcastChannel.
Run:  python3 tests/playthrough.py   (starts its own server; screenshots go to tests/shots/)"""
import os, sys, json, time, subprocess, threading, http.server, functools, socketserver
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOTS = os.path.join(ROOT, 'tests', 'shots'); os.makedirs(SHOTS, exist_ok=True)
PORT = 8765
handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=ROOT)
class Q(handler.func): 
    def log_message(self, *a): pass
socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(('127.0.0.1', PORT), functools.partial(Q, directory=ROOT))
threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = f'http://127.0.0.1:{PORT}/'
FAKE = open(os.path.join(ROOT, 'tests', 'fakepeer.js')).read()
errors = []
step = [0]
def shot(page, name):
    step[0] += 1; page.screenshot(path=os.path.join(SHOTS, f'{step[0]:02d}-{name}.png'))

with sync_playwright() as p:
    b = p.chromium.launch(channel='chromium', args=['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required'])
    ctx = b.new_context(permissions=['camera', 'microphone'])
    ctx.route('**/lib/peerjs.min.js', lambda r: r.fulfill(body=FAKE, content_type='application/javascript'))
    def mk(w, h, mobile=False):
        pg = ctx.new_page(); pg.set_viewport_size({'width': w, 'height': h})
        pg.on('pageerror', lambda e: errors.append(str(e)))
        pg.on('console', lambda m: m.type == 'error' and errors.append(m.text))
        pg.on('dialog', lambda d: d.accept())
        return pg
    tv = mk(1600, 900)
    tv.goto(BASE + 'index.html'); tv.click('#wakebtn'); tv.wait_for_timeout(500)
    room = tv.evaluate("localStorage.getItem('lr-room')")
    shot(tv, 'tv-lobby')
    ph = {}
    for r in ['mat', 'emily']:
        pg = mk(390, 844, True); pg.goto(BASE + 'play.html?r=' + room + '&as=' + r); ph[r] = pg
    ph['mat'].wait_for_selector('#ready'); ph['emily'].wait_for_selector('#ready'); tv.wait_for_timeout(400)
    shot(tv, 'tv-lobby-joined'); shot(ph['mat'], 'mat-lobby')
    ph['mat'].click('#tsnd'); ph['mat'].click('#tmic'); ph['mat'].wait_for_timeout(600); shot(ph['mat'], 'mat-mic-test'); ph['mat'].click('#tmic')
    ph['mat'].click('#tcam'); ph['mat'].fill('#manual', 'TEST'); ph['mat'].click('#manualgo'); ph['mat'].wait_for_timeout(200); shot(ph['mat'], 'mat-cam-test')
    G = lambda: tv.evaluate('window.__game.st')
    ph['mat'].click('#ready'); ph['emily'].click('#ready'); tv.wait_for_timeout(600)
    assert G()['phase'] == 'hide', G()['phase']
    shot(tv, 'tv-hide'); shot(ph['mat'], 'mat-hideform'); shot(ph['emily'], 'emily-wait')
    for r, rooms in [('mat', ['Kitchen', 'Other']), ('emily', ['Bedroom', 'Office'])]:
        pg = ph[r]; pg.wait_for_selector('#hidedone')
        pg.select_option('#room-I', rooms[0]); pg.select_option('#room-II', rooms[1])
        if rooms[1] == 'Other': pg.fill('#other-II', 'the back porch')
        pg.fill('#hint-I', 'where cold things sleep'); pg.click('#hidedone'); tv.wait_for_timeout(400)
    shot(tv, 'tv-hidden-ready')
    def cont(): ph['mat'].click('#cont'); tv.wait_for_timeout(500)
    cont(); assert G()['phase'] == 'intro'; tv.wait_for_timeout(5000); shot(tv, 'tv-intro'); shot(ph['emily'], 'emily-continue')
    cont(); assert G()['phase'] == 'seance'; tv.wait_for_timeout(2500); shot(tv, 'tv-seance')
    for r in ph: ph[r].dispatch_event('#hold', 'pointerdown')
    tv.wait_for_timeout(1500); shot(tv, 'tv-seance-holding'); shot(ph['mat'], 'mat-holding')
    tv.wait_for_timeout(2200); assert G()['solved'], 'seance not solved'
    shot(tv, 'tv-seance-after')
    cont(); assert G()['phase'] == 'lock'; tv.wait_for_timeout(2500)
    shot(tv, 'tv-lock'); shot(ph['mat'], 'mat-lock-diary'); shot(ph['emily'], 'emily-lock-marks')
    g = G()['gen']
    def code(pg, digits):
        for d in digits: pg.click(f'[data-d="{d}"]')
        pg.click('[data-d="ok"]'); tv.wait_for_timeout(400)
    code(ph['emily'], '0000'); shot(tv, 'tv-lock-wrong'); shot(ph['emily'], 'emily-lock-wrong')
    ph['mat'].click('#hintbtn'); tv.wait_for_timeout(400); shot(tv, 'tv-hint1')
    # pause: inputs are ignored, timer stops, both screens show it
    ph['mat'].click('#pausebtn'); tv.wait_for_timeout(500)
    assert G()['paused'] and tv.is_visible('#paused') and ph['emily'].is_visible('#pausedov'), 'pause'
    shot(tv, 'tv-paused'); shot(ph['emily'], 'emily-paused')
    e0 = tv.evaluate('window.__game.elapsed()'); tv.wait_for_timeout(1500); e1 = tv.evaluate('window.__game.elapsed()')
    assert abs(e1 - e0) < 0.05, ('timer ran while paused', e0, e1)
    ph['emily'].evaluate("document.getElementById('pausedov').classList.add('hidden')")
    code(ph['emily'], ''.join(map(str, g['lock']))); assert not G()['solved'], 'input accepted while paused'
    ph['emily'].click('#resumebtn') if ph['emily'].is_visible('#resumebtn') else ph['emily'].evaluate("document.getElementById('resumebtn').click()")
    tv.wait_for_timeout(400); assert not G()['paused'] and not tv.is_visible('#paused'), 'resume'
    code(ph['emily'], ''.join(map(str, g['lock']))); assert G()['solved']
    shot(tv, 'tv-lock-after')
    cont(); assert G()['phase'] == 'hunt1'; tv.wait_for_timeout(2500); shot(tv, 'tv-hunt1'); shot(ph['emily'], 'emily-hunt1')
    def scan(pg, c):
        pg.click('#scan'); pg.fill('#manual', c); pg.click('#manualgo'); tv.wait_for_timeout(500)
    scan(ph['mat'], 'K4TZ'); shot(ph['mat'], 'mat-scan-own')
    scan(ph['mat'], 'B7NC'); shot(ph['mat'], 'mat-early-find')
    ph['emily'].click('#hintbtn'); tv.wait_for_timeout(300); shot(ph['emily'], 'emily-hunt-whisper')
    ph['emily'].click('#hintbtn'); tv.wait_for_timeout(300); shot(ph['emily'], 'emily-hunt-hint2')
    scan(ph['emily'], 'K4TZ'); shot(ph['emily'], 'emily-page-reveal'); ph['emily'].click('#pgok')
    shot(tv, 'tv-hunt1-half')
    # Mat finds Emily's page with the phone's normal camera app: the QR link opens a new tab
    old_mat = ph['mat']; nm = mk(390, 844, True)
    nm.goto(BASE + 'play.html?scan=H2PX&as=mat'); tv.wait_for_timeout(1500); ph['mat'] = nm
    assert G()['solved'], 'hunt1 via camera link'
    shot(nm, 'mat-page-reveal-camera-link'); shot(old_mat, 'mat-old-tab-replaced')
    assert old_mat.query_selector('#takeback'), 'old tab should step aside'
    old_mat.close()
    nm.click('#pgok'); shot(tv, 'tv-hunt1-after')
    # test code via camera link
    tp = mk(390, 844, True); tp.goto(BASE + 'play.html?scan=TEST&as=emily'); tp.wait_for_timeout(1200)
    assert 'Camera works' in tp.text_content('#toast'), tp.text_content('#toast'); shot(tp, 'emily-test-link'); tp.close(); tv.wait_for_timeout(600)
    ph['emily'].click('#takeback') if ph['emily'].query_selector('#takeback') else None; tv.wait_for_timeout(1200)
    cont(); assert G()['phase'] == 'melody'; tv.wait_for_timeout(2500); shot(tv, 'tv-melody'); shot(ph['emily'], 'emily-keys'); shot(ph['mat'], 'mat-keys')
    def play(m):
        pg = ph['mat'] if m <= 65 else ph['emily']; pg.dispatch_event(f'[data-m="{m}"]', 'pointerdown'); tv.wait_for_timeout(120)
    for m in g['melody'][:3]: play(m)
    shot(tv, 'tv-melody-progress')
    play(61 if g['melody'][3] != 61 else 63); tv.wait_for_timeout(200)
    for m in g['melody']: play(m)
    assert G()['solved'], 'melody'
    cont(); assert G()['phase'] == 'harmony'; tv.wait_for_timeout(2500)
    shot(tv, 'tv-harmony'); shot(ph['emily'], 'emily-sing')
    for r, tpc in [('mat', g['ghostPc']), ('emily', (g['ghostPc'] + 7) % 12)]:
        ph[r].evaluate("""(tpc) => { Pitch.start = async (cb) => { let n=0; const iv=setInterval(()=>{ if(n++>200) return clearInterval(iv); cb({rms:0.1, midi: 48+tpc+ (n%3)*0.05, pc: tpc, cents: 0}); }, 30); window.__iv=iv; }; Pitch.stop=()=>clearInterval(window.__iv); }""", tpc)
        ph[r].click('#listen'); ph[r].wait_for_timeout(700); shot(ph[r], f'{r}-singing')
        ph[r].wait_for_timeout(1500)
    tv.wait_for_timeout(300); assert G()['solved'], 'harmony'
    cont(); assert G()['phase'] == 'rhythm'; tv.wait_for_timeout(2500)
    shot(tv, 'tv-rhythm'); shot(ph['mat'], 'mat-rhythm'); shot(ph['emily'], 'emily-rhythm')
    # a phone drops off: TV shows a banner after a grace period, and it clears when the phone comes back
    ph['emily'].close(); tv.wait_for_timeout(24000)
    assert tv.is_visible('#banner') and 'Emily' in tv.text_content('#banner'), 'banner'
    shot(tv, 'tv-banner')
    ph['emily'] = mk(390, 844, True); ph['emily'].goto(BASE + 'play.html?r=' + room + '&as=emily'); tv.wait_for_timeout(1500)
    assert not tv.is_visible('#banner'), 'banner should clear'
    ph['mat'].fill('#word', 'wrong'); ph['mat'].click('#wordgo'); tv.wait_for_timeout(300)
    ph['mat'].fill('#word', g['word'].lower()); ph['mat'].click('#wordgo'); tv.wait_for_timeout(300); assert G()['solved'], 'rhythm'
    shot(tv, 'tv-rhythm-after')
    cont(); assert G()['phase'] == 'hunt2'; shot(ph['mat'], 'mat-hunt2-done')
    scan(ph['emily'], 'Q8WD'); assert G()['solved'], 'hunt2'
    ph['emily'].click('#pgok')
    cont(); assert G()['phase'] == 'portraits'; tv.wait_for_timeout(2500)
    shot(tv, 'tv-portraits'); shot(ph['mat'], 'mat-portraits'); shot(ph['emily'], 'emily-portraits')
    f = g['family']; order = [f['C']['name'], f['A']['name'], f['D']['name'], f['B']['name']]
    for i, n in enumerate(order): ph['emily'].select_option(f'select[data-c="{i+1}"]', n)
    ph['emily'].click('#seat'); tv.wait_for_timeout(300); assert G()['solved'], 'portraits'
    cont(); assert G()['phase'] == 'finale'; tv.wait_for_timeout(2500)
    shot(tv, 'tv-finale'); ph['mat'].click('#pagesbtn'); ph['mat'].wait_for_timeout(500); shot(ph['mat'], 'mat-pages'); ph['mat'].click('#sheet-x')
    ph['emily'].click('#pagesbtn'); ph['emily'].wait_for_timeout(500); shot(ph['emily'], 'emily-pages'); ph['emily'].click('#sheet-x')
    for pc in g['finale']:
        m = 60 + pc; play(m if m <= 65 else (72 if pc == 0 else m))
    assert G()['solved'], 'finale'
    shot(tv, 'tv-finale-after')
    cont(); assert G()['phase'] == 'release'; tv.wait_for_timeout(2500)
    for r in ph: ph[r].dispatch_event('#hold', 'pointerdown')
    tv.wait_for_timeout(3600); assert G()['phase'] == 'end', G()['phase']
    tv.wait_for_timeout(5500); shot(tv, 'tv-end'); shot(ph['mat'], 'mat-end')
    tv.wait_for_timeout(9000); assert tv.query_selector('.program'), 'program screen'; shot(tv, 'tv-program')
    # persistence: reload TV mid-game state survives
    tv.reload(); tv.click('#wakebtn'); tv.wait_for_timeout(800); assert G()['phase'] == 'end'
    st = G(); print('hints', st['hintsUsed'], 'skips', st['skips'])
    b.close()
srv.shutdown()
errs = [e for e in errors if 'favicon' not in e]
print('ERRORS:', json.dumps(errs, indent=1) if errs else 'none')
print('PASS' if not errs else 'FAIL')
