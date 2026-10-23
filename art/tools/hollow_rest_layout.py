"""Hollow Rest test layout (awaiting the owner's approval): a height map (island, upper terrace) gives
the cliffs; forest in clumps; ragged scorch round the crater; winding paths. Writes rows + objects JSON.
Usage: python3 art/tools/hollow_rest_layout.py OUT.json"""
import json, math
W,H=32,26
def inpoly(x,y,pts):
    c=False; n=len(pts)
    for i in range(n):
        x1,y1=pts[i]; x2,y2=pts[(i+1)%n]
        if (y1>y)!=(y2>y) and x < (x2-x1)*(y-y1)/(y2-y1)+x1: c=not c
    return c
# Height: 0 = drop to mist, 1 = lower terrace, 2 = upper terrace (the hill with the sanctuary).
island=[(0,0),(32,0),(32,7),(30,8),(30,12),(29,14),(27,15),(27,18),(24,19),(20,20),(16,20),(12,21),(8,20),(5,20),(2,19),(0,18)]
upper=[(0,0),(32,0),(32,7),(25,8),(21,9),(16,9),(13,10),(9,10),(6,11),(2,11),(0,10)]
def level(x,y):
    cx,cy=x+.5,y+.5
    if not inpoly(cx,cy,island): return 0
    return 2 if inpoly(cx,cy,upper) else 1
g=[['.' for _ in range(W)] for _ in range(H)]
L=[[level(x,y) for x in range(W)] for y in range(H)]
for y in range(H):
    for x in range(W):
        if L[y][x]==0: g[y][x]='M'
# Cliffs wherever the ground drops toward the viewer; a rock row under edges that drop to mist.
for y in range(H-1):
    for x in range(W):
        if L[y][x]>L[y+1][x]:
            g[y][x]='C'
            if L[y+1][x]==0:
                g[y+1][x]='R'
                if y+2<H and L[y+2][x]==0: g[y+2][x]='U'
def put(x,y,c):
    if 0<=x<W and 0<=y<H: g[y][x]=c
def line(pts,c='=',width=1):
    for (x1,y1),(x2,y2) in zip(pts,pts[1:]):
        x,y=x1,y1
        while (x,y)!=(x2,y2):
            for w in range(width): put(x+(w if y1==y2 else 0)*0, y, c) if False else None
            put(x,y,c)
            if width==2: put(x+1,y,c) if x1==x2 else put(x,y+1,c)
            if x!=x2: x+= 1 if x2>x else -1
            elif y!=y2: y+= 1 if y2>y else -1
        put(x2,y2,c)
# Forest: the hill behind the sanctuary and the west slope, in clumps with gaps, never a full ring.
for y in range(H):
    for x in range(W):
        if L[y][x]==0 or g[y][x]!='.': continue
        n=math.sin(x*1.7)*0.9+math.cos(y*2.3+x*0.6)*0.8
        if y<=1 and not (x in (4,5,22) and y==1): g[y][x]='T'
        elif y==2 and n>-0.4: g[y][x]='T'
        elif x<=1 and y<16 and n>-0.9: g[y][x]='T'
        elif x==2 and 3<y<10 and n>0.5: g[y][x]='T'
        elif x>=29 and y<8 and n>-0.6: g[y][x]='T'
for x,y in [(26,9),(27,9),(27,10),(25,17),(4,17),(3,16),(9,18),(22,3),(27,4),(28,5)]:
    if L[y][x]>0 and g[y][x]=='.': g[y][x]='T'
# Scorched ground round the crater: a ragged blob.
for y in range(H):
    for x in range(W):
        dx,dy=(x+.5-15.5)/5.6,(y+.5-14.5)/3.0
        r=dx*dx+dy*dy+0.18*math.sin(x*2.1+y*1.3)
        if r<1 and g[y][x]=='.' and L[y][x]==1: g[y][x]='d'
# The pond: a blob on the west of the lower terrace.
for y in range(H):
    for x in range(W):
        dx,dy=(x+.5-5.2)/2.4,(y+.5-15.4)/1.7
        if dx*dx+dy*dy+0.15*math.cos(x*2.7)<1 and g[y][x]=='.': g[y][x]='~'
# Paths: winding, from the doors down to the stairs and round the crater to the way off the island.
line([(7,8),(7,9),(9,9),(9,8),(12,8),(12,7)])            # cottage door -> casa door
line([(9,9),(9,12)])                                        # the west slope down (no cliff there)
line([(12,8),(15,8),(15,7),(19,7),(19,6)])                 # to the sanctuary steps
line([(17,8),(17,10)]); put(17,8,'H')                       # east stairs through the terrace cliff
line([(17,10),(17,11),(22,11),(22,12)])                    # to the suburb's door
line([(9,12),(9,13),(10,13)]); line([(10,13),(10,18),(14,18),(14,19)])
line([(17,11),(21,11)]); line([(21,11),(21,15),(23,15),(23,16)])  # past the shed
line([(21,15),(20,17),(20,18),(14,18)])
for y in range(19,23): put(14,y,'H')                        # stairs down the cliff, off the island to Route 1
# Garden fence by the pond, flowers, the town sign.
for x in range(3,8): put(x,18,'#')
for x,y in [(4,6),(13,5),(24,6),(6,13),(12,17),(19,16),(24,13),(3,12),(26,12)]:
    if g[y][x]=='.': put(x,y,'*')
put(15,17,'S')
rows=[''.join(r) for r in g]
objects=[
 {"kind":"sanctuary","x":16,"y":2},
 {"kind":"cottage","x":4,"y":5},
 {"kind":"casa","x":10,"y":4},
 {"kind":"crater","x":12,"y":13},
 {"kind":"suburb","x":20,"y":9},
 {"kind":"shed","x":22,"y":13},
]
json.dump({"rows":rows,"objects":objects},open(__import__('sys').argv[1],'w'))
print('\n'.join(rows))
