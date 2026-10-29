# Hand-pass helper (M7): rebuild a material's shading as clean bands. Pixels of one material (a
# ramp of palette keys, dark to light) take the ramp tone nearest their smoothed brightness
# (centre-weighted 3x3 over that material only), so speckle merges into bands that follow the
# form while outlines, other materials and the silhouette stay exactly as drawn.
# python3 bands.py NAME[_back] "ramp1" "ramp2" ... [--into "src:ramp"]  (from raw/, writes NAME.txt)
import sys
from PIL import Image
name=sys.argv[1]; ramps=[a for a in sys.argv[2:] if not a.startswith('--') and ':' not in a]
into={}  # keys folded into a ramp before banding (stray off-colours, e.g. grey-olive grain)
for a in sys.argv[2:]:
    if ':' in a: src,r=a.split(':'); [into.__setitem__(ch,r) for ch in src]
L=open('raw/'+name+'.txt').read().split('\n'); P=eval(L[0]); g=[list(r) for r in L[1:]]
H=len(g); W=max(len(r) for r in g); g=[r+['.']*(W-len(r)) for r in g]
lum=lambda k: sum(int(P[k][i:i+2],16)*w for i,w in ((1,.3),(3,.59),(5,.11)))
for r in ramps:
    mat=set(r)|{k for k,v in into.items() if v==r}
    tones=sorted(r,key=lum)
    out=[row[:] for row in g]
    for y in range(H):
        for x in range(W):
            if g[y][x] not in mat: continue
            s=4*lum(g[y][x]); n=4
            for dy in (-1,0,1):
                for dx in (-1,0,1):
                    if (dy or dx) and 0<=y+dy<H and 0<=x+dx<W and g[y+dy][x+dx] in mat:
                        s+=lum(g[y+dy][x+dx]); n+=1
            v=s/n
            out[y][x]=min(tones,key=lambda t: abs(lum(t)-v))
    g=out
rows=[''.join(r) for r in g]
open(name+'.txt','w').write(L[0]+'\n'+'\n'.join(rows))
o=Image.new('RGBA',(W,H))
for y,r in enumerate(rows):
    for x,c in enumerate(r):
        if c!='.': o.putpixel((x,y),tuple(int(P[c][i:i+2],16) for i in (1,3,5))+(255,))
o.save(name+'.png')
