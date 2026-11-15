import librosa, numpy as np, glob, os, json, subprocess
SR=22050; HOP=256
def load(f):
    y,_=librosa.load(f, sr=SR, mono=True); return y
def feats(y):
    C=librosa.feature.chroma_cqt(y=y,sr=SR,hop_length=HOP); M=librosa.feature.mfcc(y=y,sr=SR,hop_length=HOP,n_mfcc=20); R=librosa.feature.rms(y=y,hop_length=HOP)
    O=librosa.onset.onset_strength(y=y,sr=SR,hop_length=HOP)
    n=min(C.shape[1],M.shape[1],R.shape[1],len(O))
    Mz=(M[:,:n]-M[:,:n].mean(1,keepdims=True))/(M[:,:n].std(1,keepdims=True)+1e-6); Rdb=20*np.log10(R[0,:n]+1e-9)
    return np.vstack([C[:,:n]*2, Mz[1:13]*0.5, (Rdb/6)[None,:]]), O[:n], Rdb
def corr(a,b): a=a-a.mean(); b=b-b.mean(); return float(np.dot(a,b)/(np.linalg.norm(a)*np.linalg.norm(b)+1e-9))
def seam_novelty(F, i, w):
    return np.mean(np.abs(F[:,i-w:i].mean(1)-F[:,i:i+w].mean(1)))
def search(path, minfrac):
    y=load(path); dur=len(y)/SR; F,O,Rdb=feats(y); fps=SR/HOP; n=F.shape[1]
    sm=np.convolve(Rdb,np.ones(int(fps))/int(fps),mode='same'); pk=np.percentile(Rdb,95)
    fade=np.where(sm>pk-12)[0][-1]
    W=int(fps*6)//12*12; step=int(fps*0.1)
    A_c=np.arange(W+int(fps*0.5), int(n*0.45), step); B_c=np.arange(int(n*0.4), fade-int(fps*1.0), step)
    # coarse feature distance (mean over 8s window) using pooled features for speed
    pool=lambda i: F[:,i-W:i].reshape(F.shape[0], 12, -1).mean(2)
    PA={a:pool(a) for a in A_c}; PB={b:pool(b) for b in B_c}
    rows=[]
    for a in A_c:
        for b in B_c:
            if (b-a)/fps < minfrac*dur: continue
            rows.append((np.mean(np.abs(PA[a]-PB[b])), a, b))
    rows.sort(); top=rows[:60]
    best=None
    for d,a,b in top:
        # fine shift b in ±0.15s on onset correlation
        bc=None
        for s in range(-int(0.15*fps), int(0.15*fps)+1):
            c=corr(O[a-W:a], O[b+s-W:b+s])
            if bc is None or c>bc[0]: bc=(c,s)
        bb=b+bc[1]
        d2=np.mean(np.abs(F[:,a-W:a]-F[:,bb-W:bb]))
        score=d2-0.4*bc[0]
        if best is None or score<best[0]: best=(score,a,bb,d2,bc[0])
    if best is None: return None
    _,a,b,d2,oc=best
    # seam novelty vs distribution
    w=int(fps*1.0)
    Floop=np.concatenate([F[:,:b], F[:,a:]],axis=1)
    sn=seam_novelty(Floop,b,w)
    dist=[seam_novelty(F,i,w) for i in range(w, n-w, int(fps*0.5))]
    pct=float((np.array(dist)<sn).mean()*100)
    return dict(A=round(a/fps,3),B=round(b/fps,3),len=round((b-a)/fps,1),featdist=round(float(d2),3),onset_corr=round(oc,2),seam_pct=round(pct))
if __name__=='__main__':
    import sys
    files={'music_title':'a217ef15-title_music_REAL.mp3','music_hiding':'0ad77de2-hide_pages_music.mp3','music_act1':'d5fd4d30-act_1_music.mp3','music_act2':'10da91ff-act_2_music.mp3','music_act3':'a6ff4ec2-act_3_music.mp3'}
    out={}
    for slot,f in files.items():
        out[slot]={}
        for mf in [0.3,0.45,0.6]:
            r=search('/mnt/user-data/uploads/'+f, mf); out[slot][mf]=r; print(slot, mf, r, flush=True)
    json.dump(out, open('search.json','w'), indent=1)
