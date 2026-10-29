# Crisper conversion (owner: the plain ones read low-definition): draft -> quantise to K colours at
# full size -> mode filter (kills the draft's anti-alias fuzz and dither noise) -> draft2sprite's
# majority shrink to the same size as before -> pixel2grid's clean() (lone specks merged, a solid
# outline in the darkest colour round the silhouette).
# python3 crisp.py NAME K   (reads NAME.txt for the size and writes NAME_c.txt/png, NAME_back_c.*)
import sys,os,importlib.util,numpy as np
from PIL import Image,ImageFilter
T='/home/user/game/art/tools/';C='/home/user/game/art/concepts/'
def mod(n):
    s=importlib.util.spec_from_file_location(n,T+n+'.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
d2s=mod('draft2sprite');p2g=mod('pixel2grid')
name,K=sys.argv[1],int(sys.argv[2]); src=sys.argv[3] if len(sys.argv)>3 else name
tmp='/tmp/claude-0/-home-user-game/c3d1b4f8-383a-52cf-9f4f-8de3bc29fdbf/scratchpad/'
def prep(f):
    im=Image.open(f).convert('RGB'); a=np.asarray(im).astype(int); white=a.sum(2)>705
    global PAL
    if PAL is None:
        fg=a[~white].astype(float); smp=fg[np.random.default_rng(0).choice(len(fg),min(len(fg),20000),replace=False)]
        PAL=d2s.kmeans(smp,K)
        open(tmp+'pal.txt','w').write(repr({chr(97+i):'#%02x%02x%02x'%tuple(int(v) for v in c) for i,c in enumerate(PAL)})+'\n')
    lab=np.argmin(((a[:,:,None,:]-PAL[None,None])**2).sum(3),2).astype(np.uint8)
    lab=np.asarray(Image.fromarray(lab).filter(ImageFilter.ModeFilter(5)))
    b=PAL[lab].astype(int); b[white]=255; out=tmp+'prep_'+os.path.basename(f); Image.fromarray(b.astype(np.uint8)).save(out); return out
def size(t): L=open(t).read().split('\n'); return len(L[1])
PAL=None
for side,pal in (('',tmp+'pal.txt'),('_back',tmp+'pal.txt')):
    w=size(name+side+'.txt')
    pp=prep(C+src+('_back' if side else '_front')+'.png')
    d2s.convert(pp,w,K,name+side+"_c",pal)
    L=open(name+side+'_c.txt').read().split('\n'); P=eval(L[0])
    dark=min(P,key=lambda k:sum(int(P[k][i:i+2],16) for i in (1,3,5)))
    p2g.LINES.clear(); p2g.LINES.add(dark)
    rows=p2g.clean([list(r) for r in L[1:]],dark,dark)
    open(name+side+'_c.txt','w').write(L[0]+'\n'+'\n'.join(rows))
    o=Image.new('RGBA',(len(rows[0]),len(rows)))
    for y,r in enumerate(rows):
        for x,ch in enumerate(r):
            if ch!='.': o.putpixel((x,y),tuple(int(P[ch][i:i+2],16) for i in (1,3,5))+(255,))
    o.save(name+side+'_c.png')
print(name,'ok')
