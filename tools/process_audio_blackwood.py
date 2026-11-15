import subprocess, numpy as np, json, os
SR=44100; UP='/mnt/user-data/uploads/'; OUT='/home/claude/escape-room/sounds/blackwood/'
def load(f):
    raw=subprocess.run(['ffmpeg','-v','error','-i',f,'-f','f32le','-ac','2','-ar',str(SR),'-'],capture_output=True,check=True).stdout
    return np.frombuffer(raw,dtype=np.float32).reshape(-1,2).copy()
def lufs_of(x):
    p=subprocess.run(['ffmpeg','-hide_banner','-f','f32le','-ar',str(SR),'-ac','2','-i','-','-af','loudnorm=print_format=json','-f','null','-'],input=x.astype(np.float32).tobytes(),capture_output=True)
    e=p.stderr.decode(); j=json.loads(e[e.rindex('{'):e.rindex('}')+1]); return float(j['input_i'])
def limit(y, tp=-1.0):
    lim=10**(tp/20); k=0.7*lim; s=np.sign(y); a=np.abs(y); o=a>k; a[o]=k+(lim-k)*np.tanh((a[o]-k)/(lim-k)); return s*a
def enc(x,path): subprocess.run(['ffmpeg','-v','error','-y','-f','f32le','-ar',str(SR),'-ac','2','-i','-','-c:a','libmp3lame','-q:a','2',path],input=np.clip(x,-1,1).astype(np.float32).tobytes(),check=True)
def lead_trim(x, rel=-50):
    m=np.abs(x).max(1); thr=10**((20*np.log10(m.max())+rel)/20); i=np.where(m>thr)[0][0]; i=max(0,i-int(.005*SR)); y=x[i:].copy(); y[:int(.003*SR)]*=np.linspace(0,1,int(.003*SR))[:,None]; return y, i/SR
def loopify(x, A, B, N):
    A=int(A*SR); B=int(B*SR); N=int(N*SR)
    # fine-align B within ±10 ms to the waveform at A
    m=x.mean(1); L=int(.04*SR); ref=m[A-L:A+L]; best=(-2,0)
    for s in range(-int(.01*SR), int(.01*SR)+1, 2):
        seg=m[B+s-L:B+s+L]; c=np.dot(ref,seg)/(np.linalg.norm(ref)*np.linalg.norm(seg)+1e-9)
        if c>best[0]: best=(c,s)
    B+=best[1]
    t=np.linspace(0,np.pi/2,N)[:,None]; y=x[:B].copy(); y[B-N:B]=x[B-N:B]*np.cos(t)+x[A-N:A]*np.sin(t)
    return y, A/SR, B/SR
report={}; loops=json.load(open(OUT+'loops.json')) if os.path.exists(OUT+'loops.json') else {}
# rain: steady bed; loop the even middle section, long crossfade (it's noise, so it blends invisibly)
x=load(UP+'ab35058e-rain_sound.mp3'); li=lufs_of(x)
y,A,B=loopify(x, 4.0, 90.0, 2.5)
g=10**((-25-lufs_of(y[int(A*SR):int(B*SR)]))/20); y=limit(y*g)
enc(y,OUT+'amb_rain.mp3'); loops['amb_rain']={'start':round(A,4),'end':round(B,4)}; report['amb_rain']=dict(lufs_in=li,gain=round(20*np.log10(g),1),loop=loops['amb_rain'],dur=round(len(y)/SR,2))
# rolling thunder bed: loop nearly the whole file between two quiet moments (start and end)
x=load(UP+'63999e91-thunder_for_loop.mp3'); li=lufs_of(x); d=len(x)/SR
y,A,B=loopify(x, 1.6, d-0.15, 1.5)
g=10**((-24-lufs_of(y[int(A*SR):int(B*SR)]))/20); y=limit(y*g)
enc(y,OUT+'amb_thunder.mp3'); loops['amb_thunder']={'start':round(A,4),'end':round(B,4)}; report['amb_thunder']=dict(lufs_in=li,gain=round(20*np.log10(g),1),loop=loops['amb_thunder'],dur=round(len(y)/SR,2))
# opening thunder clap: trim the half-second of silence, make it big, keep the tail with a gentle fade
x=load(UP+'f8e2240c-thunder_when_first_clicking.mp3'); li=lufs_of(x)
y,lead=lead_trim(x); fo=int(.4*SR); y[-fo:]*=(np.linspace(1,0,fo)**2)[:,None]
g=10**((-14-lufs_of(y))/20); y=limit(y*g)
enc(y,OUT+'sfx_wake.mp3'); report['sfx_wake']=dict(lufs_in=li,gain=round(20*np.log10(g),1),lead_cut=round(lead,2),dur=round(len(y)/SR,2))
json.dump(loops,open(OUT+'loops.json','w'),indent=1)
files=sorted(f for f in os.listdir(OUT) if f.endswith('.mp3')); json.dump(files,open(OUT+'manifest.json','w'),indent=1)
print(json.dumps(report,indent=1,default=float))

# --- sfx_house1.mp3 (Thunder slot, plays with each lightning flash) ---
# Cut from thunder_for_loop.mp3: 117.76 s -> 121.90 s (the loudest, fastest-decaying clap,
# well clear of the next strike at ~122.5 s). 6 ms fade-in, 1.4 s curved fade-out
# (linear**1.6), normalized to -16 LUFS, tanh soft limit to -1 dBTP, LAME VBR q2.
# Result: 4.14 s, -16.6 LUFS, -0.95 dBTP.
