# Hand-pass helper for the double-res grids: drop floating specks under MIN px, then a 3x3 majority
# pass (twice) that merges noisy lone pixels into their neighbours; outline colour pixels are kept.
# python3 tidy.py NAME MIN [mirror]
import sys
from collections import Counter
from PIL import Image
name,MIN=sys.argv[1],int(sys.argv[2]); mirror='mirror' in sys.argv
for side in ('','_back'):
    L=open(name+side+'.txt').read().split('\n'); P=eval(L[0]); g=[list(r) for r in L[1:]]
    H=len(g);W=max(len(r) for r in g); g=[r+['.']*(W-len(r)) for r in g]
    dark=min(P,key=lambda k:sum(int(P[k][i:i+2],16) for i in (1,3,5)))
    seen=set()
    for y in range(H):
        for x in range(W):
            if g[y][x]!='.' and (y,x) not in seen:
                comp=[];st=[(y,x)]
                while st:
                    a,b=st.pop()
                    if (a,b) in seen or not(0<=a<H and 0<=b<W) or g[a][b]=='.': continue
                    seen.add((a,b));comp.append((a,b));st+=[(a+1,b),(a-1,b),(a,b+1),(a,b-1)]
                if len(comp)<MIN:
                    for a,b in comp: g[a][b]='.'
    for _ in range(2):
        n=[r[:] for r in g]
        for y in range(1,H-1):
            for x in range(1,W-1):
                c=g[y][x]
                if c in '.'+dark: continue
                nb=[g[y+dy][x+dx] for dy in (-1,0,1) for dx in (-1,0,1) if dy or dx]
                if nb.count(c)<=1:
                    m=Counter(v for v in nb if v!='.').most_common(1)
                    if m and m[0][1]>=4: n[y][x]=m[0][0]
        g=n
    if mirror: g=[r[::-1] for r in g]
    rows=[''.join(r) for r in g]
    open(name+side+'.txt','w').write(L[0]+'\n'+'\n'.join(rows))
    o=Image.new('RGBA',(W,H))
    for y,r in enumerate(rows):
        for x,ch in enumerate(r):
            if ch!='.': o.putpixel((x,y),tuple(int(P[ch][i:i+2],16) for i in (1,3,5))+(255,))
    o.save(name+side+'.png')
print(name,'tidied')
