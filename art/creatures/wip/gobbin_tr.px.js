// Gobbin, translation of the concept art (art/concepts/gobbin.png) — work in progress, awaiting
// the owner's review. 44x42 grid: every concept pixel classified by material (skin, fin hood,
// tunic, rope, throat glow), the sprite cell taking the majority material and that material's
// tone from the concept's light and shade; then by hand: the eye under the hood's edge, the open
// jaw (needle teeth; the mouth darkens behind the teeth and glows blue toward the throat, a pale
// core deep inside, the light catching the skin under the jaw; no black box), the smirk, the pointed ear, the
// clawed hands, the rope belt and pouch, the tunic's shading. Feet on y = 91.

pal({
  G: "#c4ecff",
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
    ..........PsHjjjjjjjHjjhhhhhhHkPPk
    ..........PHjjjjjHHHpHjjhhHHHPPSSk
    .........HHHHHHHHpssssHHhHHPPSSspk
    .........HHHpppppskkkkspHHPSSsspk
    ........HHHHpssssswwkkspHHHsspkkk
    ........PsssSSSSSsPkkSsspHHsSHhhHk
    ......PPPSSSSSSSSsSSSPSSpHHHHhhHhHk
    ....PPSSSSSSSSSSSSSsPSSsHHHHhhkkkjk
    ..PPPSSSSssppppppppppSsHhHHhhk...kk......PPk
    kkkkkkkkkwPwPwPwPwgGGggHhHpHk...........PPk
    ........kPPPPPhhgggGGgHhhHsssk........PPPpk
    .........PwPwPwPwggggHhhjtssssPk.....PPppk
    .........kppppppgggHHhhjTTttssSSPk...Pppk
    ..........kkkkkkkkpHhhjTTTttSssSSkk.PPpppk
    ..............PPssskhhrRrRrRrHSSSskPPppppk
    .............PsSssk.HTttrTTtkrrkSskHpppppk
    ............PsSssk..TTTTRtttrRhkhkkkkkkspk
    ...........PsssPk..TTTTtrstpkrrkhHk....kkpk
    ...........hkhkhk.PttTTttpttpTTtkk.......kk
    ...........k.k.k.PSSsTTTTTTTTttk
    ................PPsstTTTTTttttsk
    ................ksssskTtkttsttsk
    .................Pssk.kk.kkkSsssk
    .................Pssk..kk...kksssPk
    ...............PPssk..........kssssk
    ............PPPPssk............PssHsk
    ...........kkkkkkk............PPssHpk
    .............................kkkkpkkkk
    .................................k`))
