// Zapail, translation of the concept art (art/concepts/zapail.png) — work in progress, awaiting
// the owner's review. Drawn on a 37x44 grid from a gridded underlay of the concept: the
// slime body, copper shell, gear face and coil painted as shapes, then the plugs, eyes, mouth
// and the zigzag Spark Trail line by hand. Feet on y = 91.

pal({
  A: "#dcf0ff",
  B: "#2e3c64",
  O: "#f7b864",
  Q: "#5a2418",
  Y: "#fffbd2",
  a: "#9ec0e0",
  b: "#5f78a8",
  k: "#181018",
  m: "#8a3a5a",
  n: "#3c3840",
  o: "#dc7a34",
  q: "#a24a26",
  u: "#d8a040",
  w: "#ffffff",
  y: "#ffe23c",
})

sprite("zapail_tr", { w: 96, h: 96 }, (c) => c.grid(30, 48, `
    ..Yk.Yk
    ..uk.uk
    .kkkkk.........Yk.Yk
    kaannnk........uk.uk
    knnnnnk.......kkkkk
    .kkkkk.......kaannnk
    ..Bk.........knnnnnk..qqk
    ..Bk..........kkkkk...qYk
    ..kk..........Bak.....kkk
    ...Bk........Bak.....kkkkk
    ...kk........Bk......kannk
    ....BBBBBBBkBak......kaYnk
    ...BBAAAAAAABk.......kYYYk
    ..BAAAAAAAAAAbk...QQQkaYnk
    .BAAAaaaaaakkkbkQQoookkkkkk
    .BAAkkaaaakYYYkkooooooooooqk
    BAAkYYkaakYwkkYkkoooooooooqkk
    BAAkwkkaakYkkkYkkoooooqkoqqkk.qqk
    BAAkkkkaakYkkkYkkoooooqkqqYYqqukk
    BAAkkkkaakYkkkYkkoooookYqYYYYuk
    kAAkyykaaakyyykbkoooooqqYnnnnnuk
    .BAAkkaaaaakkkbkoooooqqYnnOOOnnuqqk
    .kAAAkkkkkkaaabkoooqqqYYnOqqqOnuuuk
    ..kAAkwmmmkaabkoooqquYYnOqyyyqOnuk
    ...kAAkmmkaaabkooqqkkYYnqyYYYyOnuk
    ....kaakkaaaabkoqqqqqqunOyYYYyOnqk
    .....BaaaaaaabkqqqqqqqunOyYYYyOnqqqk
    .....BaaaaaaabkqqqqqqqunqOyyyqOnqqqk
    .....kaaaaaaaabkqqqqquuunOOqqOnqqkkk
    ......BaaaaaaabkqqqqkkkunnOOOnnqk
    ......kaaaaaaabkqqqqqqqkunnnnnqk
    .......Baaaaaabkqqqqqqqqqqqqqqkqk
    .......kaaaaaabkqqqqqqqqqkkqqk.qk
    ........Baaaaaabkkqqqqkkkkkqk..kk
    ........kaaaaaabkakkkqkkk..qk
    ........kkkkkkkkkaaaakaaBBBkkk
    .........BAaaaaaaaaaaaaaaaaaaaBBk
    .........BAayaaayaaayaaayaaayaaayBk
    .........BAyayayayayayayayayayayaybk
    .........Byaaayaaayaaayaaayaaayaabkkk
    .........kAaaaaaaaaaaaabkkkkkkkkkk
    ..........kkaaaaaabkkkkk
    ............kkkkkkk
    .`))
