import sys,subprocess,numpy as np
from PIL import Image,ImageDraw
C='/home/user/game/art/concepts/'
def crop(f):
    im=np.asarray(Image.open(f).convert('RGB')).astype(int)
    m=Image.fromarray(np.where(im.sum(2)>705,255,0).astype(np.uint8)).copy()
    for s in ((0,0),(m.width-1,0),(0,m.height-1),(m.width-1,m.height-1)):
        if m.getpixel(s)==255: ImageDraw.floodfill(m,s,128)
    ys,xs=np.where(np.asarray(m)!=128); return xs.max()-xs.min()+1, ys.max()-ys.min()+1
for spec in sys.argv[1:]:
    n,w,h=spec.split(':'); w,h=int(w),int(h)
    fw,fh=crop(C+n+'_front.png'); bw,bh=crop(C+n+'_back.png')
    s=min(w/fw,h/fh,h/bh,92/bw)
    subprocess.run(['python3','/home/user/game/art/tools/draft2sprite.py',C+n+'_front.png',str(round(fw*s)),'15',n],check=True,capture_output=True)
    subprocess.run(['python3','/home/user/game/art/tools/draft2sprite.py',C+n+'_back.png',str(round(bw*s)),'15',n+'_back',n+'.txt'],check=True,capture_output=True)
    print(n,Image.open(n+'.png').size,Image.open(n+'_back.png').size)
