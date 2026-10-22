// Zapail, translation of the concept art (art/concepts/zapail.png) — work in progress, awaiting
// the owner's review. 37x44 grid drawn from a gridded underlay of the concept: the silhouette
// and the slime/copper light and shade from the concept, the gear face, plugs and the zigzag
// Spark Trail by hand. The head is turned 3/4 left, so the far eye hugs the left edge of the face;
// eyes have an iris ring, pupil and shine; the mouth is drawn the BW way (Emolga): no black box. Feet on y = 91.

pal({
  A: "#bfeafc",
  B: "#1e4a7a",
  O: "#ee9a55",
  Q: "#e8788a",
  Y: "#fff3a8",
  a: "#74c4ef",
  b: "#3f8fcf",
  k: "#1a1420",
  m: "#7a2440",
  n: "#3a3d4f",
  o: "#c8662f",
  q: "#8a3f1e",
  u: "#e3ad2f",
  w: "#ffffff",
  y: "#ffd42a",
})

sprite("zapail_tr", { w: 96, h: 96 }, (c) => c.grid(30, 48, `
    .
    .......Yy...Y
    ..Yk.Yy..y.y.y
    ..uk.uk...Y...y
    .kkkkk.........Yk.Yk
    kaannnk........uk.uk
    knnnnnk.......kkkkk.....qqk
    .kkkkk.......kaannnk....qYk
    ..Bk.........knnnnnk....kkk
    ..Bk..........kkkkk....kkkkk
    ..kak.........Bak......kannk
    ...Bk........Bak.......kaYnk
    ...BaBBBBBBkBak........kYYYk
    ...BBBAAaaaaBk......kkkkaYnk
    ..BAAwwaaaaaaaBk..kkoookkkkk
    .BAAaaaaaaaaaabk.kooOOOooookqk
    .BkkaaaaaaakkkkbkOoOOOOOooooqk
    .kYkaaaaaakYYYYkkOOOOOOOOqqqYuk.qk
    BwkkaaaaaakYwkYkkOOOOOOOqYYYYuuquk
    BkkkaaaaaakYkkYkkOoooooqYYnnnnuuk
    BkykaaaaaakyYYykkOoooooqYnnOOOnuuk
    kakkmwmmmmakkkkbkoooooqYYnqqqqOnuuqk
    .BaammmmmmaaaaabkoooooqYnOqOOOqOnuuk
    .kaaamQQmaaaaaabkoqoooqYnqqyyOqOnuk
    ..BaaammaaaaaabkoqqqooquOqqyYyOOnuk
    ..kkaaaaaaaaaabkqqqqqqqnqqOYYyOOnuk
    ....kkkaaaaaaabbqqqqqqquqqOyYyOOnuuqk
    .......BaaaaaabbkqqqqqqunOqyyOqOnqqkk
    .......kaaaaaaabbqqqqqqunOqqqqqOnqk
    ........BaaaaaaabkqqqqkuunOOOOOnqk
    ........BawaaaAAAboqqqqqunnOOqnqqqk
    ........BawaaAAAAAooqqqkuunnnnqqkkk
    ........BaaaaAAAAAkooqqqkuuqqqqk
    ........kaaaaAAAAAaOoqqqqkuqkkqk
    .........Baaaaaaaaakooqqqkqk..kk
    .........kaaaaaaaaaakkkkkBkkk
    ..........BaaaaaaaaaabbbbbbbbBBk
    .........BbyyaaaayyaaaayybbbbyyaBBk
    .........ByaayaayAAyaayaayabybayaayk
    .........kaaaayyaaaAyyaaAAyyaaaayyakk
    ..........BabbbaaaaaAAAAaakkkkkkkkk
    ..........kkaaaaaaaaaakkkk
    ............kkkkkkkkkk
    .`))
