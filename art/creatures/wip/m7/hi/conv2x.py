# Double-res conversion (owner's call, M7): same framing as the 96 conversions, twice the pixels,
# for a 192x192 canvas shown at half size in game.
import sys,os,subprocess
from PIL import Image
M=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));C='/home/user/game/art/concepts/'
K=sys.argv[1]
for n in sys.argv[2:]:
    src={'sprigby':'sprigby_v2'}.get(n,n)
    for side in ('','_back'):
        w=len(open(f'{M}/{src}{side}.txt').read().split('\n')[1])*2
        args=['python3','/home/user/game/art/tools/draft2sprite.py',C+src+('_back' if side else '_front')+'.png',str(w),K,os.path.join(M,'hi',n+side)]
        if side: args.append(os.path.join(M,'hi',n+'.txt'))
        subprocess.run(args,check=True,capture_output=True)
    print(n,Image.open(f'{M}/hi/{n}.png').size,Image.open(f'{M}/hi/{n}_back.png').size)
