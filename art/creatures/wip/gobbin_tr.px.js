// Gobbin, translation of the concept art (art/concepts/gobbin.png) — work in progress, awaiting
// the owner's review. 44x42 grid: every concept pixel classified by material (skin, fin hood,
// tunic, rope, throat glow), the sprite cell taking the majority material and that material's
// tone from the concept's light and shade; then by hand: the eye under the hood's edge, the open
// jaw (needle teeth, dark mouth, blue throat glow, no black box), the smirk, the rope belt and
// pouch, the tunic's shading. Feet on y = 91.

pal({
  H: "#1e2638",
  P: "#4e3650",
  R: "#b88c52",
  S: "#dcc0d0",
  T: "#727c3c",
  g: "#5aaaf2",
  h: "#344260",
  j: "#4e5e82",
  k: "#1a1622",
  p: "#8a6684",
  r: "#6e4a28",
  s: "#b690aa",
  t: "#48502a",
  w: "#ffffff",
})

sprite("gobbin_tr", { w: 96, h: 96 }, (c) => c.grid(26, 50, `
    ..............................HHk
    ...........................HHHhk
    .........................HHjjhhk
    .......................PHjjjjhhk
    ......................HHjjjjjHk
    ....................HHjjjjjjHhk
    ...................PHjjjjjjjHHk
    ..................PHjjjjjjjHHkk
    .................PsHjjjjjhHpk
    ...............PPsHjjjjjjhHpk
    ..............PsssHjjjjjjhHppk
    .............HHHHHjjjjjhjhhHHk
    ...........PPHjjjjjjjjjhhhhhhk
    ..........PsHjjjjjjjHjjhhhhhhHk
    ..........PHjjjjjHHHpHjjhhHHHssPkk
    .........HHHHHHHHpssssHHhHsssssk
    .........HHHpppppskkkkspHHsssssHk
    ........HHHHpssssswwkkspHHssSHHhk
    ........PsssSSSSSsPkkSsspHHsSHhhHk
    ......PPSSSSSSSSSsSSSPSSpHHHHhhHhHk
    ....PPSSSSSSSSSSSSSsPSSsHHHHhhkkkjk
    ..PPPSSSSssppppppppppSsHhHHhhk...kk......PPk
    kkkkkkkkkwPwPwPwPwgggggHhHpHk...........PPk
    ........kPPPPPPPPgggggHhhHsssk........PPppk
    .........PwPwPwPwggHgHhhjtssssPk.....Ppppk
    .........kppppppsssHHhhjTTttssSSPk...Pppk
    ..........kkkkkkkkpHhhjTTTttSssSSk..Pppppk
    ..............PPssskhhrRrRrRrHSSSsHPpppppk
    .............Pssssk.HTttrTTtkrrkSsHHpppppk
    ............Hssskk..TTTTRtttrRRrHHHkkkkspk
    ............Hpsk...TTTTtrstpkrrkhHk....kkpk
    ............kkk...PttTTttpttpTTtkk.......kk
    .................PSSsTTTTTTTTttk
    ................PssstTTTTTttttsk
    ................ksssskTtkttsttsk
    .................Pssk.kk.kkkSsssk
    .................Pssk..kk...kksssPk
    ...............PPssk..........kssssk
    ............PPPPssk............PssHsk
    ...........kkkkkkk............PPssHpk
    .............................kkkkpkkkk
    .................................k`))
