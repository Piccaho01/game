// Gobbin, translation of the concept art (art/concepts/gobbin.png) — work in progress, awaiting
// the owner's review. 44x42 grid: every concept pixel classified by material (skin, fin hood,
// tunic, rope), the sprite cell taking the majority material and that material's
// tone from the concept's light and shade; then by hand: the eye under the hood's edge, the open
// jaw (needle teeth, the mouth darkening toward the throat, no black box; the owner dropped the
// concept's throat glow), the smirk, the pointed ear, the
// clawed hands, the rope belt and pouch, the tunic's shading. Feet on y = 91.

pal({
  H: "#1e2638",
  P: "#4e3650",
  R: "#b88c52",
  S: "#dcc0d0",
  T: "#727c3c",
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
    ..........PsHjjjjjjjHjjhhhhhhHkPPk
    ..........PHjjjjjHHHpHjjhhHHHPPSSk
    .........HHHHHHHHpssssHHhHHPPSSspk
    .........HHHpppppskkkkspHHPSSsspk
    ........HHHHpssssswwkkspHHHsspkkk
    ........PsssSSSSSsPkkSsspHHsSHhhHk
    ......PPSSSSSSSSSsSSSPSSpjhhhhhHhHk
    ....PPSSSSSSSSSSSSSsPSSsjjhhhhkkkjk
    ..PPPSSSSssppppppppppSsPjjhhhk...kk......PPk
    kkkkkkkkkwPwPwPwPwPpsPjjhhhHk...........PPk
    ........kPPPPPPPPPPpPjhhhHsssk........PPppk
    .........PwPwPwPwPPpjhhhhtssssPk.....Ppppk
    .........kppppppsssPjhhhTTttssSSPk...Pppk
    ..........kkkkkkkkkHhhhTTTttSssSSkk.Pppppk
    ..............PPssskhhrRrRrRrHSSSskPpppppk
    .............PsSssk.HTttrTTtkrrkSskHpppppk
    ............PsSssk..TTTTRtttrRhkhkkkkkkspk
    ...........PsssPk..TTTTtrstpkrrkhHk....kkpk
    ...........hkhkhk.PttTTttpttpTTtkk.......kk
    ...........k.k.k.PSSsTTTTTTTTttk
    ................PssstTTTTTttttsk
    ................ksssskTtkttsttsk
    .................Pssk.kk.kkkSsssk
    .................Pssk..kk...kksssPk
    ...............PPssk..........kssssk
    ............PPPPssk............PssHsk
    ...........kkkkkkk............PPssHpk
    .............................kkkkpkkkk
    .................................k`))
