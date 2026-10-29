# Groups a palette into material ramps by hue for bands.py: outlines (very dark) left out, greys
# (low saturation) their own ramp, the rest in 40-degree hue bins. Prints bands.py arguments.
import sys,colorsys
P=eval(open('raw/'+sys.argv[1]+'.txt').readline()); bins={}
for k,v in P.items():
    r,g,b=[int(v[i:i+2],16)/255 for i in (1,3,5)]; h,l,s=colorsys.rgb_to_hls(r,g,b)
    if l<0.16: continue
    key='grey' if s<0.18 else int(((h*360+20)%360)//40)
    bins.setdefault(key,'');bins[key]+=k
print(' '.join(v for v in bins.values() if len(v)>1))
