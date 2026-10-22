// Zapail, translation of the concept art (art/concepts/zapail.png) — work in progress, awaiting
// the owner's review. 37x44 grid drawn from a gridded underlay of the concept: the silhouette
// and the slime/copper light and shade from the concept, the gear face, plugs and the zigzag
// Spark Trail by hand. The face follows the Emolga formula: dark oval eyes with one shine pixel at
// mid-height, a big open smile filling the lower face. Feet on y = 91.

pal({
  A: "#c6f2ff",
  B: "#284c88",
  O: "#e8944c",
  Q: "#f08c98",
  Y: "#fff0a0",
  a: "#86d0f4",
  b: "#4c9ad8",
  k: "#181018",
  m: "#8c2a3c",
  n: "#3c3840",
  o: "#c4602c",
  q: "#883818",
  u: "#e0aa28",
  w: "#ffffff",
  y: "#ffd820",
})

sprite("zapail_tr", { w: 96, h: 96 }, (c) => c.grid(30, 48, `
    ..Yk.Yk
    ..uk.uk
    .kkkkk.........Yk.Yk
    kaannnk........uk.uk
    knnnnnk.......kkkkk
    .kkkkk.......kaannnk
    ..Bk.........knnnnnk....qqk
    ..Bk..........kkkkk.....qYk
    ..kak.........Bak.......kkk
    ...Bk........Bak.......kkkkk
    ...BaBBBBBBkBak........kannk
    ...BBBAAaaaaBk.........kaYnk
    ..BAAAaaaaaaaaBk.......kYYYk
    .BAAaaaaaaaaaabk....kkkkaYnk
    .BAaakkaaaakkaabk.kkoookkkkk
    .BaakwkaaakwkkabkkooOOOooookqk
    BaaakkkaaakkkkabkOoOOOOOooooqk
    BaaakykaaakkykabkOOOOOOOOqqqYuk.qk
    BaaaakkaaaakkaabkOOOOOOOqYYYYuuquk
    kaaaakkkkkkkaaabkOoooooqYYnnnnuuk
    .BaaakmwmmmkaaabkOoooooqYnnOOOnuuk
    .kaaakmmmmmkaaabkoooooqYYnqqqqOnuuqk
    ..BaaakmQQkaaabkOoooooqYnOqOOOqOnuuk
    ..kkaaakkkaaaabkooqoooqYnqqyyOqOnuk
    ....kkkaaaaaaaaboqqqooquOqqyYyOOnuk
    .......BaaaaaabbkqqqqqqnqqOYYyOOnuk
    .......kaaaaabbbkqqqqqquqqOyYyOOnuuqk
    ........BaaaaabbbqqqqqqunOqyyOqOnqqkk
    ........BaaaaaabbkqqqqqunOqqqqqOnqk
    ........BawaaaaabbqqqqkuunOOOOOnqk
    ........BawaaaAAAboqqqqqunnOOqnqqqk
    ........BaaaaAAAAAooqqqkuunnnnqqkkk
    ........kaaaaAAAAAaooqqqkuuqqqqk
    .........BaaaAAAAAaOoqqqqkuqkkqk
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
