# Report (or with --fix, clear) near-white pockets: background caught inside the outline (between
# Voltcalf's club and head, inside Voltaurus's axe arcs). Clusters >= MIN px of the near-white
# colour become transparent; smaller ones are kept as highlights.
import sys
MIN=int(sys.argv[2]) if len(sys.argv)>2 else 6
def comps(G,white):
    H,W=len(G),len(G[0]); seen=set(); out=[]
    for y in range(H):
        for x in range(W):
            if G[y][x] in white and (x,y) not in seen:
                st=[(x,y)]; seen.add((x,y)); c=[]
                while st:
                    a,b=st.pop(); c.append((a,b))
                    for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
                        u,v=a+dx,b+dy
                        if 0<=u<W and 0<=v<H and (u,v) not in seen and G[v][u] in white: seen.add((u,v)); st.append((u,v))
                out.append(c)
    return out
for n in sys.argv[1].split(','):
    L=open(n+'.txt').read().rstrip('\n').split('\n'); P=eval(L[0]); G=[list(r.ljust(max(map(len,L[1:])),'.')) for r in L[1:]]
    white={k for k,v in P.items() if all(int(v[i:i+2],16)>235 for i in (1,3,5))}
    cs=comps(G,white); big=[c for c in cs if len(c)>=MIN]
    print(n,sorted(P[w] for w in white),'clusters',sorted((len(c) for c in cs),reverse=True)[:10])
    if '--fix' in sys.argv:
        for c in big:
            for x,y in c: G[y][x]='.'
        open(n+'.txt','w').write('\n'.join([L[0]]+[''.join(r) for r in G])+'\n')
