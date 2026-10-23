// Sprigby (sprig + wallaby) — Plant starter, stage 1. 96x96 BW battle sprites.
// A cocky little kickboxing joey: leaf crest and leaf ears, a leaf plaster on one cheek, chewing a
// grass sprig, vine-taped fists up in a guard, tail ending in a leaf fan.
//
// Translated from the owner's concept art (art/concepts/line_wallaby.png, left creature, mirrored
// to face left) the BW way: art/tools/art2sprite.py did the majority-vote downscale to 48 px tall,
// then the head, crest, face, fists and sprig were redrawn by hand over a gridded underlay of the
// art. Approved by the owner.
//
// The back sprite is translated from the owner's back-view concept (art/concepts/sprigby_back.png)
// the same way: every concept pixel classified by material (lime skin, leaf, brown), the cell
// taking the majority material and its tone; the concept's bark patches left out (they are
// Fernaroo's); the head, crest, eye corner and sprig drawn by hand over a gridded underlay; the body
// below the shoulders shortened so he is as stubby (and as tall) as his front sprite.
// Grids sit so the feet are on y = 91.
//
// Sprites: sprigby (front still), sprigby_idle, sprigby_back, sprigby_back_idle.

pal({
  D: "#2c5016",
  G: "#2a4a18",
  L: "#def896",
  R: "#7e5a38",
  b: "#b2de4c",
  c: "#f4fbd2",
  e: "#7a4a22",
  g: "#2e7a2a",
  k: "#181018",
  l: "#58b042",
  r: "#4c3420",
  s: "#7cb032",
  w: "#ffffff",
})

const FRONT = `
  ............k
  ...........Dlk
  ...........DlLk
  ...........DlLk.....DDDDDkk
  ...........DlLgk..DDlLLlllggk
  ........Dk.DlLgkDDlLllllggggk
  .......DlLkDlLgDlLlllggggkk
  ........DlLDlLgDllllggkkk
  ........DDLLLLLLDkk.DDDDDDkk
  .......DLLLLLLbbbbkkDlLLLLlggkk
  ......DLLLLLbbbbbbbkDlllllllggggk
  ......DLLLLbbbbbbbbkDllllllgggggG
  .....Dbbbbbbbbbbbbbskggggggggkkk
  .....Dkkbbbbbbkkkbbskkkkkkkk
  .....Dwkkbbbbkwkkbbsk......DLk
  .....Deekbbbbkeekbbsk......DLlk
  .....Dkkbbccbbkkbbssk......DLlgk
  L....kkcccckccbbGlGk.......DLlgk.k
  gLLLLLlkkkkcccbsGGGk.......DLlgkDk
  .ggg..kccccccbbbbssk.....k.DLlgDlk
  ....DlLlgkssLLLLsssk...DLlkDLlgDgk
  ...DlLgGlgDLccccbbbk....DlgDLlgDgk
  ...DgGlGggDLccccbbbsk...DLlgDlgDgk
  ...DlGgGlgkLccccbDDDk...DLlgDlgggk
  ...kgggggkbLcccbDlLlDk...DlgDlggk
  ....kkkkkbbLcccDlGlGlgk..DlggDggk
  .........bLLcccDgGlGggk...DlgDgk
  .........DLccccbkgggggk...kDlggk
  .........Dccccbbbk.........kRRk
  ........Dcccccbbbsk........rRRk
  .......Dscccccbbbblk.......rRRk
  ......Dbscccccbbbbbbk......rRk
  .....Dbbbccccccbbbbbbk....rRRk
  .....DbbbLLccLLbbbbbbbDrrrRRRk
  ....kbbbbLLLLLLbbbbbbbssRRRRrk
  .....DbbbbLLkkLbbbbbbbbsrrrrk
  .....ksbbLLk..kkbbbbbbbbrrrk
  ......kssssk....kkssbbbsrrk
  .......Dssssk.....kksssssk
  .....rDbbsskk.......ksssk
  ...krRRRbkk..........kssbk
  ..krrrRRk.............Dbbbk
  ..kkrkkk..............DbRRRk
  ....k.................rRRRRRk
  ......................rRRRrRrk
  ......................krrRrrrk
  .......................krkrrrkk
  ........................k.kkk
  ............................k`
const BACK = `
  ....................Gk
  ....................Glk
  ....................GLgk
  .....................GLggk....Gk
  .....................GLlggk..Glgk
  ...........GGGGGGGGGGkGLlgkkGLlgk
  .........GlllGlLLLLllgkGlgkLGlgk
  .........kggkglllllggggkLLLbbgk
  .............kkggggggggkLbbbbbbk
  ...................Gllggkbbbbbbk
  ..................Glgggkbbbbbbse
  .................Glggkkbbbbbsssk
  ................Gggk...Dbbbsssk
  ................kk.....kksssskLLLl
  .......................ssssss.ggg
  ......................DDDbbbbk
  ....Gk...............DbbbbbbbbDDk
  ....Glk.k...........Dssbbbbbbbbggk
  ....GllGgk..........DssbbbbssbbkLk
  ....kllllk..........Dssbbbbssbbbkk
  GGk..GlgllGGk.....GDsskbbbbbkkbbbbk
  kllGGllgllllk.....Gksgkbbbbk..Dbbbk
  .kllllLgggllk.....kkkkbbbbbk..kskkk
  ..kgglLLLgllk.........Dbbbbk...kk
  ...GgggLLglLLk.......Dbbbbbbk
  kGGgggggLLgllk......Dbbbbbbbbk
  .kggggggggglk.....rrsRRkbbbbbbDk
  ..kgggggggRk.....rrrRRRkbbbbbbbbk
  ...kggggGrRk.....rrRRRRkssbbbbbbk
  ....GgggGrrRk...rrRRRRkskkssbbbbbk
  ....kkkggkrrrrrrRRRRrrrk..kksssbbbk
  .......kk.krrrRRRRrrrrk.....kksbbbbk
  ...........krrrrrrrrrk........Dsssbk
  ............kkrrrrrsk.........Dsbbk
  ..............Dbbbbk.........Dsbbk
  ..............Dbbbbk.........Dsbk
  .............Dbbbbk..........Dbk
  .............Dbbbk..........kbbbk
  ............Dbbkk............kssbk
  ...........Dbbk...............kssbrk
  ..........DDbbk................DssRRk
  ..........Dbbbk................kkrrRkk
  .........Dbbbk...................kkk
  ........rbRbbk
  .......rrRRRRk
  ......rrrRrrRk
  ......rrrrrrRrk
  .....kkkrksrkk
  ........k.kk`

// Draw a grid with everything above row `split` shifted down by `bob` (the breath: the upper body
// sinks into the hips); the lower rows go first so the upper body overlaps them.
function draw(c, grid, x, y, bob = 0, split = 30) {
  const rows = grid.trim().split("\n").map((r) => r.trim())
  rows.forEach((r, i) => { if (i >= split) c.grid(x, y + i, r) })
  rows.forEach((r, i) => { if (i < split) c.grid(x, y + i + bob, r) })
}

// BW2-style idle loop: a slow breath, 12 frames at 10 fps; frame 0 is the still.
const BREATH = [0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0]

sprite("sprigby", { w: 96, h: 96 }, (c) => draw(c, FRONT, 30, 43))
anim("sprigby_idle", { w: 96, h: 96, frames: 12, fps: 10 }, (c) => draw(c, FRONT, 30, 43, BREATH[c.frame]))
sprite("sprigby_back", { w: 96, h: 96 }, (c) => draw(c, BACK, 32, 45))
anim("sprigby_back_idle", { w: 96, h: 96, frames: 12, fps: 10 }, (c) => draw(c, BACK, 32, 45, BREATH[c.frame], 21))
