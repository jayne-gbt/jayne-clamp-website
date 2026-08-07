// Athens concert poster / flyer archive - not linked from site navigation
// and not in sitemap.xml yet, so it's not publicly discoverable until
// there's enough here to be worth categorizing and launching properly.
//
// Add one entry per poster/flyer image. Just drop the jpg into this same
// athens-posters/ folder and add a matching entry here - no other files
// need to change. title is optional (many of these are auto-named exports
// with no real info yet).

const POSTERS_DATA = [
    { filename: '167863_1722167247746_1045273455_31774593_1265882_n.jpg' },
    { filename: '174966_2388751368785_1550862259_32459713_293231859.jpg' },
    { filename: '176042_166951363355366_100001215117779_394916_5444.jpg' },
    { filename: '187789_120061194738248_7190033_n.jpg' },
    { filename: '195751_126658700745306_1299793_n.jpg' },
    { filename: '195786_209692985727092_6721408_n.jpg' },
    { filename: '211054_157496634307370_4839954_n.jpg' },
    { filename: '220035_10150154847843564_33881673563_6821154_66564.jpg' },
    { filename: '23698_1237801660419_1090581545_30572484_3565570_n.jpg' },
    { filename: '267099_10150240507136316_31818016315_7887147_17732.jpg' },
    { filename: '277065_269315559776552_2118841136_n.jpg' },
    { filename: '28.jpg' },
    { filename: '286278_10150260834746194_30840521193_7792155_55445.jpg' },
    { filename: '288773_1951863645465_1508850047_31868366_6344764_o.jpg' },
    { filename: '289757_10150375619796973_8244721972_8424699_165328.jpg' },
    { filename: '291219_10100721277685580_4939444_64270181_16740793.jpg' },
    { filename: '294618_228961227160309_188369124552853_629164_1402.jpg' },
    { filename: '300853_10150293981413031_80426078030_7972096_85590.jpg' },
    { filename: '304213_2347168449936_1571809990_32329592_463948119_n.jpg' },
    { filename: '31801_675073310639_12807314_37839769_4149960_n.jpg' },
    { filename: '320259_2289880241978_1098138324_32298086_177063204.jpg' },
    { filename: '328419_317927541568041_199390153421781_1180418_136.jpg' },
    { filename: '333154_2427571486346_1163333191_32946479_170844826.jpg' },
    { filename: '334380_2363163050824_1602807010_32294690_327590833_o.jpg' },
    { filename: '337996_330414120322652_318705031493561_1010389_580.jpg' },
    { filename: '339663_250176568379965_100001628720775_699691_1826.jpg' },
    { filename: '377008_232381996835358_100001906781494_611598_9884.jpg' },
    { filename: '385444_10150465852741973_8244721972_8781590_138930.jpg' },
    { filename: '388778_284081798294190_121958524506519_740524_1226.jpg' },
    { filename: '40wattjpeg.jpg', title: '40wattjpeg' },
    { filename: '50554_106932299378331_5016149_n.jpg' },
    { filename: 'BSBTS Poster.jpg', title: 'BSBTS Poster' },
    { filename: 'Clay  William Poster  smaller.jpg', title: 'Clay William Poster smaller' },
    { filename: 'FuturebirdsPoster.jpg', title: 'FuturebirdsPoster' },
    { filename: 'GH_PosterMock_2.jpg', title: 'GH PosterMock 2' },
    { filename: 'KurtSaleDT2011-Dweb.jpg', title: 'KurtSaleDT2011 Dweb' },
    { filename: 'PIR Athens Poster-1.jpg', title: 'PIR Athens Poster 1' },
    { filename: 'S9 benefit 11x17.jpg', title: 'S9 benefit 11x17' },
    { filename: 'TeamClermontPublicity_tsxsw2011flyersmaller_4.jpg', title: 'TeamClermontPublicity tsxsw2011flyersmaller 4' },
    { filename: 'aquarium-drunkard-athfest-2009.jpg', title: 'aquarium drunkard athfest 2009' },
    { filename: 'dbt-2012.jpg', title: 'dbt 2012' },
    { filename: 'face-off.jpg', title: 'face off' },
    { filename: 'guitar art poster WITH MUSIC copy.jpg', title: 'guitar art poster WITH MUSIC copy' },
    { filename: 'hootenannyflier.jpg', title: 'hootenannyflier' },
    { filename: 'plan9.jpg', title: 'plan9' },
    { filename: 'qqyv_40wattSXSWbanner_1.jpg', title: 'qqyv 40wattSXSWbanner 1' },
    { filename: 'soulspeclegal10_19web_1_jpg-magnum (1).jpg', title: 'soulspeclegal10 19web 1 jpg magnum (1)' },
    { filename: 'summit1.jpg', title: 'summit1' },
    { filename: 'tumblr_lhszsvYlKS1qzxbgoo1_1280.jpg' },
    { filename: 'tumblr_lpu0i0DyJn1r0nnx9o1_1280.jpg' },
    { filename: 'tumblr_lpu0i0DyJn1r0nnx9o3_1280.jpg' },
    { filename: 'tumblr_lpu0i0DyJn1r0nnx9o5_1280.jpg' },
    { filename: 'tumblr_lpu0i0DyJn1r0nnx9o6_1280.jpg' },
    { filename: 'tumblr_lpu0i0DyJn1r0nnx9o9_1280.jpg' },
    { filename: 'tumblr_ltd97gSWVd1qzezj5o1_1280.jpg' },

    // Found online, but not from a store selling the print - a band's own
    // archive, a completed-auction record, and a personal history blog.
    { filename: 'widespread-panic-40-watt-friday-13th-part-7.jpg', title: "Widespread Panic - 40 Watt Club, Friday the 13th Part VII" },
    { filename: 'rem-40-watt-club-1980.jpg', title: 'R.E.M. - 40 Watt Club, 1980' },
    { filename: 'tyrones-oc-flyers-collage-rem-pylon-love-tractor.jpg', title: "R.E.M., Pylon, Love Tractor, Method Actors & the Side Effects - Tyrone's OC flyers" },
];

// Galleries with Athens/40 Watt-specific pages (not just a homepage) - too
// many individual posters to list one-by-one (Zen Dragon Gallery alone has
// 48+), so link straight to their Athens-scoped search/collection instead.
const POSTER_SOURCES_DATA = [
    { name: 'Zen Dragon Gallery', url: 'https://zendragongallery.com/search?q=Athens&type=product' },
    { name: 'Classic Posters', url: 'https://www.classicposters.com/venue/40-watt-club-athens-ga/' },
];
