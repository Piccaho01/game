import sys,numpy as np
from PIL import Image
# split.py SHEET ROWS COLS name1 name2 ... : cut at the widest white gap near each grid line
src,R,C=sys.argv[1],int(sys.argv[2]),int(sys.argv[3]); names=sys.argv[4:]
im=Image.open(src).convert('RGB'); a=np.asarray(im).astype(int); ink=(a.sum(2)<3*235)
def cuts(prof,n,L):
    out=[0]
    for k in range(1,n):
        t=L*k//n; w=L//(3*n)
        seg=prof[t-w:t+w]; out.append(t-w+int(np.argmin(np.convolve(seg,np.ones(9),'same'))))
    return out+[L]
H,W=ink.shape
rc=cuts(ink.sum(1),R,H)
i=0
for r in range(R):
    band=ink[rc[r]:rc[r+1]]; cc=cuts(band.sum(0),C,W)
    for c in range(C):
        box=(cc[c],rc[r],cc[c+1],rc[r+1]); im.crop(box).save(names[i]); i+=1
