"""Shrink a ChatGPT pixel-art draft straight to sprite size (the method used for Orbitot and Fledjet).

Use this when pixel2grid.py comes out mushy: some drafts mix 10 and 20 px "pixels", so no single
grid fits. This instead:
  draft -> background = near-white connected to the image edge (white stripes inside stay)
        -> cropped to the creature
        -> colours reduced at full size (k-means, farthest-point start so small accents such as a
           beak or eye keep their own colour), or mapped to a palette from an earlier conversion
        -> each sprite pixel takes the majority colour of its cell; dark outline colours win close
           calls so lines survive the shrink

Usage:
  python3 draft2sprite.py DRAFT.png WIDTH COLOURS OUT [PALETTE_TXT]
  e.g. front: draft2sprite.py ../concepts/fledjet.png 64 14 fledjet
       back:  draft2sprite.py ../concepts/fledjet_back.png 61 14 fledjet_back fledjet.txt
Writes OUT.png and OUT.txt (palette dict on the first line, then the grid rows). Pick WIDTH so
the body is about 50 px wide; give the back the front's scale and the front's palette.
"""
import sys, numpy as np, os
from PIL import Image
from collections import Counter
def kmeans(px, k, it=20, seed=1):
    rng=np.random.default_rng(seed)
    # init: farthest-point so small saturated accents (beak, eyes) get their own colour
    c=[px[rng.integers(len(px))]]
    for _ in range(k-1):
        d=np.min([((px-ci)**2).sum(1) for ci in c],axis=0); c.append(px[d.argmax()])
    c=np.array(c,float)
    for _ in range(it):
        lab=np.argmin(((px[:,None,:]-c[None])**2).sum(2),1)
        for j in range(k):
            m=px[lab==j]
            if len(m): c[j]=m.mean(0)
    return c
def convert(src, width, k=14, out=None, palfile=None):
    im=np.asarray(Image.open(src).convert('RGB')).astype(float)
    # background = near-white connected to the image edge (white stripes inside the body stay)
    light=im.sum(2)>3*235
    from PIL import ImageDraw
    m=Image.fromarray(np.where(light,255,0).astype(np.uint8)).copy()
    for seed in ((0,0),(m.width-1,0),(0,m.height-1),(m.width-1,m.height-1)):
        if m.getpixel(seed)==255: ImageDraw.floodfill(m,seed,128)
    bg=np.asarray(m)==128
    ys,xs=np.where(~bg); im=im[ys.min():ys.max()+1, xs.min():xs.max()+1]; bg=bg[ys.min():ys.max()+1, xs.min():xs.max()+1]
    fg=im[~bg]; samp=fg[np.random.default_rng(0).choice(len(fg),min(len(fg),20000),replace=False)]
    if palfile:
        P0=eval(open(palfile).readline())
        pal=np.array([[int(v[i:i+2],16) for i in (1,3,5)] for v in P0.values()],float); k=len(pal)
    else:
        pal=kmeans(samp,k)
    H,W=im.shape[:2]; s=width/W; h=round(H*s)
    lab=np.argmin(((im[:,:,None,:]-pal[None,None])**2).sum(3),2); lab[bg]=-1
    g=[]
    for Y in range(h):
        row=[]
        for X in range(width):
            cell=lab[int(Y/s):max(int(Y/s)+1,int((Y+1)/s)), int(X/s):max(int(X/s)+1,int((X+1)/s))].ravel()
            cnt=Counter(cell.tolist())
            if cnt[-1] > 0.55*len(cell): row.append(-1); continue
            cnt.pop(-1,None)
            # dark outline pixels win ties so lines survive the shrink
            dark=min(cnt,key=lambda j: pal[j].sum())
            v=dark if cnt[dark]>=0.3*sum(cnt.values()) and pal[dark].sum()<200 else cnt.most_common(1)[0][0]
            row.append(v)
        g.append(row)
    keys='kabcdefghijmnpqrstuvwxyz'
    order=np.argsort(pal.sum(1)); key={int(j):keys[i] for i,j in enumerate(order)}
    rows=[''.join('.' if v<0 else key[v] for v in r) for r in g]
    P={key[int(j)]:'#%02x%02x%02x'%tuple(int(x) for x in pal[j]) for j in range(k)}
    o=Image.new('RGBA',(width,h))
    for y,r in enumerate(rows):
        for x,ch in enumerate(r):
            if ch!='.': o.putpixel((x,y),tuple(int(P[ch][i:i+2],16) for i in (1,3,5))+(255,))
    if out:
        o.save(out+'.png'); open(out+'.txt','w').write(repr(P)+'\n'+'\n'.join(rows))
    return o
if __name__=='__main__':
    convert(sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4], sys.argv[5] if len(sys.argv)>5 else None)
