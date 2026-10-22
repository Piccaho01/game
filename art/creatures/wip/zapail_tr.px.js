// Zapail, translation of the concept art (art/concepts/zapail.png) — work in progress, awaiting
// the owner's review. 37x44 grid drawn from a gridded underlay of the concept: the silhouette
// and the slime/copper light and shade from the concept, the gear face, plugs, face and the
// zigzag Spark Trail line by hand. Two face options: small round BW eyes, or Torkoal-style slits.
// Feet on y = 91.

pal({
  A: "#c6f2ff",
  B: "#284c88",
  O: "#e8944c",
  Q: "#4c1c10",
  Y: "#fff0a0",
  a: "#86d0f4",
  b: "#4c9ad8",
  k: "#181018",
  m: "#8a3a5a",
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
    ..BAAAkaaaaaaaBk.......kYYYk
    .BAAakwkaaakkabk....QQQkaYnk
    .BAaakkkaakwkkabk.QQoookkkkk
    .BaaakYkaakkkkabkQooOOOooookqk
    BaaaaakaaakYYkabkOoOOOOOooooqk
    BaaaaaaaaaakkaabkOOOOOOOOqqqYuk.qk
    BaaaaakkkkkaaaabkOOOOOOOqYYYYuuquk
    kaaaaakwmmkaaaabkOoooooqYYnnnnuuk
    .BaaaaakmkaaaaabkOoooooqYnnOOOnuuk
    .kaaaaaaaaaaaaabkoooooqYYnqqqqOnuuqk
    ..BaaaaaaaaaaabkOoooooqYnOqOOOqOnuuk
    ..kkaaaaaaaaaabkooqoooqYnqqyyOqOnuk
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

sprite("zapail_tr_slit", { w: 96, h: 96 }, (c) => c.grid(30, 48, `
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
    .BAAakkkaaaaaabk....QQQkaYnk
    .BAaaaYkaakkkkabk.QQoookkkkk
    .BaaaaaaaaaYkkkbkQooOOOooookqk
    BaaaaaaaaaaabbabkOoOOOOOooooqk
    BaaaaaaaaaaaaaabkOOOOOOOOqqqYuk.qk
    BaaaaakkkkkaaaabkOOOOOOOqYYYYuuquk
    kaaaaakwmmkaaaabkOoooooqYYnnnnuuk
    .BaaaaakmkaaaaabkOoooooqYnnOOOnuuk
    .kaaaaaaaaaaaaabkoooooqYYnqqqqOnuuqk
    ..BaaaaaaaaaaabkOoooooqYnOqOOOqOnuuk
    ..kkaaaaaaaaaabkooqoooqYnqqyyOqOnuk
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
