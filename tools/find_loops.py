import numpy as np, json
from loopsearch import load, feats, corr, seam_novelty, SR, HOP
import librosa
files={'music_title':'a217ef15-title_music_REAL.mp3','music_hiding':'0ad77de2-hide_pages_music.mp3','music_act1':'d5fd4d30-act_1_music.mp3','music_act2':'10da91ff-act_2_music.mp3','music_act3':'a6ff4ec2-act_3_music.mp3'}
res={}
for slot,f in files.items():
    y=load('/mnt/user-data/uploads/'+f); F,O,Rdb=feats(y); fps=SR/HOP; n=F.shape[1]; dur=n/fps
    sm=np.convolve(Rdb,np.ones(int(fps))/int(fps),mode='same'); pk=np.percentile(Rdb,95); fade=np.where(sm>pk-12)[0][-1]
    W=int(fps*6)//12*12; step=int(fps*0.1)
    pool=lambda i: F[:,i-W:i+W].reshape(F.shape[0],24,-1).mean(2)
    A_c=np.arange(W, int(n*0.45), step); B_c=np.arange(int(n*0.4), min(fade, n-W), step)
    PA={a:pool(a) for a in A_c}; PB={b:pool(b) for b in B_c}
    rows=[(np.mean(np.abs(PA[a]-PB[b])),a,b) for a in A_c for b in B_c if (b-a)/fps>=0.35*dur]
    rows.sort()
    w=int(fps*0.75); dist=np.array([seam_novelty(F,i,w) for i in range(w,n-w,int(fps*0.25))])
    out=[]; seen=[]
    for d,a,b in rows[:400]:
        if any(abs(a-a2)<fps*3 and abs(b-b2)<fps*3 for a2,b2 in seen): continue
        seen.append((a,b))
        bc=max(((corr(O[a-W:a+W],O[b+s-W:b+s+W]),s) for s in range(-int(0.2*fps),int(0.2*fps)+1)))
        bb=b+bc[1]
        Floop=np.concatenate([F[:,:bb],F[:,a:]],axis=1)
        pct=float((dist<seam_novelty(Floop,bb,w)).mean()*100)
        out.append(dict(A=round(a/fps,2),B=round(bb/fps,2),len=round((bb-a)/fps,1),fd=round(float(d),3),oc=round(bc[0],2),pct=round(pct)))
        if len(out)>=8: break
    res[slot]=out
    print(slot, 'dur',round(dur,1),'fade',round(fade/fps,1))
    for o in out: print('   ',o)
json.dump(res,open('cands.json','w'),indent=1)
