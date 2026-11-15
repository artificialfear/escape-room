import subprocess, numpy as np, json, os, librosa, scipy.signal as ss
SR = 44100
UP = '/mnt/user-data/uploads/'
OUT = '/home/claude/escape-room/sounds/'
def load(f):
    raw = subprocess.run(['ffmpeg','-v','error','-i',f,'-f','f32le','-ac','2','-ar',str(SR),'-'],capture_output=True,check=True).stdout
    return np.frombuffer(raw,dtype=np.float32).reshape(-1,2).copy()
def lufs_of(x):
    p = subprocess.run(['ffmpeg','-hide_banner','-f','f32le','-ar',str(SR),'-ac','2','-i','-','-af','loudnorm=print_format=json','-f','null','-'],input=x.astype(np.float32).tobytes(),capture_output=True)
    e = p.stderr.decode(); j = json.loads(e[e.rindex('{'):e.rindex('}')+1]); return float(j['input_i'])
def trim(x, rel=-45, floor=-70, pre=0.005, post=0.03, trim_tail=True):
    m = np.abs(x).max(1); pk = 20*np.log10(m.max()+1e-12)
    thr = 10**(max(pk+rel, floor)/20); idx = np.where(m > thr)[0]
    a = max(0, idx[0]-int(pre*SR)); b = min(len(x), idx[-1]+int(post*SR)) if trim_tail else len(x)
    y = x[a:b].copy()
    fi = int(0.003*SR); y[:fi] *= np.linspace(0,1,fi)[:,None]
    if trim_tail: fo = int(0.02*SR); y[-fo:] *= np.linspace(1,0,fo)[:,None]
    return y, a/SR, (len(x)-b)/SR
def limit_gain(x, target, tp=-1.0):
    g = 10**((target - lufs_of(x))/20); y = x*g
    pk = np.abs(y).max(); lim = 10**(tp/20)
    if pk > lim:   # soft knee limiter: tanh above 0.7*lim
        k = 0.7*lim
        s = np.sign(y); a = np.abs(y)
        over = a > k
        a[over] = k + (lim-k)*np.tanh((a[over]-k)/(lim-k))
        y = s*a
    return y, 20*np.log10(g)
def enc(x, path):
    subprocess.run(['ffmpeg','-v','error','-y','-f','f32le','-ar',str(SR),'-ac','2','-i','-','-c:a','libmp3lame','-q:a','2',path],input=np.clip(x,-1,1).astype(np.float32).tobytes(),check=True)

SFX = {  # slot: (source, target LUFS, max length s or None)
 'sfx_transition': ('0a11d8ad-scene_transition.mp3', -19, None),
 'sfx_solve': ('23c11c86-puzzle_solved.mp3', -16, None),
 'sfx_climax': ('560c3990-climax_sting.mp3', -15, None),
 'sfx_wrong': ('e6a056f5-wrong_answer.mp3', -17, None),
 'sfx_reset': ('d0be0a66-small_fizzle.mp3', -23, 1.4),
 'sfx_progress': ('b5460f46-small_progress.mp3', -19, None),
 'sfx_page': ('bf5208a5-page_found.mp3', -17, None),
 'sfx_hint': ('5ed30f55-hint_appears.mp3', -19, None),
 'sfx_heartbeat': ('e0213393-heartbeat.mp3', -18, None),
 'sfx_house1': ('081a07f2-creak.mp3', -27, None),
 'sfx_house2': ('42b419b3-creak_2_sound.mp3', -27, None),
 'sfx_house3': ('97afaf72-knock_sound.mp3', -27, None),
 'sfx_test': ('2f166dd8-tv_sound_test.mp3', -16, None),
}
MUSIC = {  # slot: (source, target, loop (A,B) in source seconds or None)
 'music_title': ('a217ef15-title_music_REAL.mp3', -20, (35.16, 92.46, 1.5)),
 'music_hiding': ('0ad77de2-hide_pages_music.mp3', -18, (17.51, 69.69, 0.6)),
 'music_act1': ('d5fd4d30-act_1_music.mp3', -18, (65.25, 128.02, 0.45)),
 'music_act2': ('10da91ff-act_2_music.mp3', -18, (16.86, 87.43, 1.0)),
 'music_act3': ('a6ff4ec2-act_3_music.mp3', -18, (17.23, 62.94, 0.45)),
 'music_ending': ('f31cb636-ending_music.mp3', -16, None),
}
report = []
os.makedirs(OUT, exist_ok=True)
for slot,(src,tgt,maxlen) in SFX.items():
    x = load(UP+src); before = lufs_of(x); d0 = len(x)/SR
    y, lead, trail = trim(x)
    if maxlen and len(y)/SR > maxlen:
        y = y[:int(maxlen*SR)].copy(); fo = int(0.6*SR); y[-fo:] *= (np.linspace(1,0,fo)**2)[:,None]
    y, g = limit_gain(y, tgt)
    enc(y, OUT+slot+'.mp3')
    report.append(dict(slot=slot, src=src[9:], dur_in=round(d0,2), dur_out=round(len(y)/SR,2), lead_cut=round(lead,2), tail_cut=round(trail,2), lufs_in=round(before,1), lufs_out=tgt, gain_db=round(g,1)))

def onset_env(x):
    return librosa.onset.onset_strength(y=x.mean(1), sr=SR, hop_length=256)
loops = {}
for slot,(src,tgt,lp) in MUSIC.items():
    x = load(UP+src); before = lufs_of(x); d0 = len(x)/SR
    x, lead, _ = trim(x, rel=-60, floor=-75, trim_tail=False)
    if lp is None:
        y, _, trail = trim(x, rel=-60, floor=-75)
        y, g = limit_gain(y, tgt); enc(y, OUT+slot+'.mp3')
        report.append(dict(slot=slot, src=src[9:], dur_in=round(d0,2), dur_out=round(len(y)/SR,2), lead_cut=round(lead,2), tail_cut=round(trail,2), lufs_in=round(before,1), lufs_out=tgt, gain_db=round(g,1), loop=None))
        continue
    A = int((lp[0]-lead)*SR); B = int((lp[1]-lead)*SR)
    # 1) rhythmic alignment: shift B within ±150 ms so onset envelopes around A and B line up best
    env = onset_env(x); hop = 256; ea = A//hop; eb = B//hop; w = int(4*SR/hop)
    best = (-1e9, 0)
    for s in range(-int(0.06*SR/hop), int(0.06*SR/hop)+1):
        a1 = env[ea-w:ea]; b1 = env[eb+s-w:eb+s]
        c = np.dot(a1-a1.mean(), b1-b1.mean())/(np.std(a1)*np.std(b1)*len(a1)+1e-9)
        if c > best[0]: best = (c, s)
    B += best[1]*hop
    # 2) waveform fine alignment ±8 ms
    L = int(0.03*SR); m = x.mean(1); r = int(0.008*SR)
    ref = m[A-L:A+L]; bestw=(-1e9,0)
    for s in range(-r, r+1):
        seg = m[B+s-L:B+s+L]; c = np.dot(ref, seg)/(np.linalg.norm(ref)*np.linalg.norm(seg)+1e-9)
        if c > bestw[0]: bestw=(c,s)
    B += bestw[1]
    # 3) bake an equal-power crossfade: the last N samples before B blend into the audio just before A
    N = int(lp[2]*SR)
    t = np.linspace(0, np.pi/2, N)[:,None]
    y = x[:B].copy()
    y[B-N:B] = x[B-N:B]*np.cos(t) + x[A-N:A]*np.sin(t)
    # target loudness measured on the loop body
    g = 10**((tgt - lufs_of(y[A:B]))/20); y = y*g
    pk = np.abs(y).max(); lim = 10**(-1/20)
    if pk > lim:
        k=0.7*lim; s=np.sign(y); a=np.abs(y); o=a>k; a[o]=k+(lim-k)*np.tanh((a[o]-k)/(lim-k)); y=s*a
    enc(y, OUT+slot+'.mp3')
    loops[slot] = {'start': round(A/SR, 4), 'end': round(B/SR, 4)}
    np.save(f'/home/claude/audio/{slot}.npy', y.astype(np.float32))
    report.append(dict(slot=slot, src=src[9:], dur_in=round(d0,2), dur_out=round(len(y)/SR,2), lead_cut=round(lead,2), lufs_in=round(before,1), lufs_out=tgt, gain_db=round(20*np.log10(g),1), loop=loops[slot], rhythm_corr=round(best[0],2), wave_corr=round(bestw[0],2)))
json.dump(loops, open(OUT+'loops.json','w'), indent=1)
json.dump(report, open('/home/claude/audio/report.json','w'), indent=1, default=float)
for r in report: print(r)
