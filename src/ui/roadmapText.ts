// Season 9 atlas prose (hand-written with the 2026-11-15 atlas, numbers from that run).
// Static, author-controlled HTML (<b>/<i> only) — rendered with dangerouslySetInnerHTML.
// Re-read it after a season change: `npm run atlas` refreshes the numbers, not this text.

/** Headline findings: [title, html]. */
export const FINDINGS: [string, string][] = [
  [
    "The tree is real, and it is a loop",
    "Better gear needs drops from stronger monsters, and stronger monsters need better gear. All 212 crafted gear recipes from Lv 10 up need a monster drop, and from Lv 25 many need drops from monsters 5 levels above the item. A fleet climbs it by beating the next monster first, then crafting from its drops."
  ],
  [
    "Three ceilings",
    "With <b>core</b> gear only (map nodes, normal monsters, leather trades) progress stalls at Lv 29: no monster is a safe win there. Adding <b>plus</b> sources (task crystals, gems, rune purchases, rare drops) carries you to Lv 37. From Lv 38 the next targets need <b>special</b> sources: events, bosses, keys. At Lv 35 not a single gear item is core, and only 2 of 22 are plus."
  ],
  [
    "Task crystals are the hidden currency",
    "93 of the 212 Lv 10+ gear recipes need a Tasks Trader crystal: jasper or magical cure (8 coins), astralyte (12), prime fabric (14). A median task pays about one coin per hour of a character's work, and the Trader opens only after 100 completed tasks. Every gathering tool above copper needs crystals too."
  ],
  [
    "Crafting is the long pole",
    "Material work for weaponcrafting, gearcrafting or jewelrycrafting 1→30 is about 650–700 hours of one character's time each, against about 85 hours of fighting for combat 1→30 and about 80 hours per gathering skill. One crafter per skill, fed by the whole fleet, is the only way the crafting skills keep pace with combat."
  ],
  [
    "Leveling is quick early and slow late",
    "Pure fight time: about 4 h for 1→10, 9 h for 10→15, 19 h for 15→20, 20 h for 20→25, 31 h for 25→30, 34 h for 30→35, 51 h for 35→40, 55–66 h for 40→45 and 52–76 h for 45→50, about 300 h in total. Low-HP monsters die in 2–3 turns, so slimes give the best XP per hour up to Lv 13; after that it's pigs (20–28), imps (30–37), goblin wolfriders and hellhounds (40s), then dryads."
  ],
  [
    "Events stop being optional at Lv 25",
    "9 of 19 Lv 25 items and 16 of 32 Lv 30 items need event drops: lizard skin and eyes (Bandit Camp), full-moon capes, demon horns (Portal (Demon)), strange ore and magic wood (the two Apparitions), and later efreet cloth, grimlet bones, marauder hands and duskworm skins. Bank them whenever an event is up, even before you can use them."
  ]
];

/** Per band start level: a lede + bullet points. */
export const BAND_TEXT: Record<number, { lede: string; points: string[] }> = {
  "1": {
    "lede": "About 4 hours of fighting. Everything here dies in a few turns, so XP per hour follows the level ratio, and slimes beat chickens and cows: yellow slime to Lv 4, green slime 5–8, red slime from 9.",
    "points": [
      "Lv 1 gear is copper (bars from 10 copper ore each). The Lv 5 weapons need slimeballs (1/10): a <b>water bow</b> (blue slimeballs) or <b>fire staff</b> (red) are the best picks. Each slime resists its own element by 25%, so carry two elements.",
      "From Lv 5 every recipe needs a drop: feathers (chicken 1/8), wool (sheep 1/12), slimeballs. Weapon/gear/jewelry crafting 5 covers the whole tier.",
      "Start tasks now. The Tasks Trader opens after 100 completed tasks, and the Lv 10 tools and Lv 15 weapons need its crystals."
    ]
  },
  "10": {
    "lede": "Iron tier, about 9 hours. Red slimes stay the best XP until Lv 13, then highwaymen. Everything is still core except two lucky extras.",
    "points": [
      "Core set: <b>iron sword</b> (earth) or <b>greater wooden staff</b> (water), iron shield, leather hat, <b>adventurer vest</b>, iron legs, iron boots, two iron rings. Needs iron bars (mining 10), spruce planks (woodcutting 10), cowhide (cow 1/8; the Tailor trades 3 cowhide for hard leather), wool, feathers, mushrooms.",
      "Plus upgrades: <b>forest ring</b> (mushmush 1/200) beats iron rings, and the <b>novice guide</b> (5 copies for reaching Lv 10) is a free artifact (+25 HP).",
      "All Lv 10 gathering tools (−20% cooldown) cost a jasper crystal. Copper tools (−10%) are the core alternative."
    ]
  },
  "15": {
    "lede": "Mushmush tier, about 19 hours. Highwaymen, pigs and wolves are the targets; skeletons (Lv 18) are beatable but slow. Your fleet sits at the end of this band.",
    "points": [
      "Plus weapons: <b>mushstaff</b> (fire 15 + earth 15) and <b>mushmush bow</b> (air + water), each with one jasper. Core fallback: keep the Lv 10 iron sword / greater wooden staff.",
      "<b>Mushmush jacket</b> (hard leather + flying wings + mushrooms) is the body armor for the whole band. Elemental rings (air/fire/water/earth: iron + slimeballs + flying wings) replace iron rings; match them to your weapon's element.",
      "The <b>wisdom amulet</b> (+60 wisdom = +6% XP, one jasper) is the amulet the solver keeps picking through Lv 24 for its HP; the XP bonus comes free.",
      "The <b>king slime sword</b> needs king slimeballs from the King Slime boss (group fight). It is the strongest Lv 15 weapon but rarely the best one."
    ]
  },
  "20": {
    "lede": "Steel tier, the largest (28 items), about 20 hours. Pigs carry Lv 20–23 at about 2,700 XP/h (480 HP, a single water attack, weak earth resistance); wolves at 24.",
    "points": [
      "New materials: <b>steel bars</b> (3 iron ore + 7 coal, mining 20), <b>hardwood planks</b> (ash + birch, woodcutting 20), skeleton bones and skulls, pig skin, ogre eyes and skin, spider legs.",
      "Core set: <b>steel battleaxe</b> (earth 40) or <b>battlestaff</b>/<b>skull staff</b> (water / fire 40), steel armor, hard leather pants, steel boots, steel rings (+75 initiative, so you strike first). Plus adds the <b>hard leather helmet</b> (astralyte), <b>skull rings</b> (2 jasper) and the <b>healing rune</b> (10,000 gold).",
      "The <b>dreadful ring</b> is a Lv 20 item that needs Cyclops eyes (Lv 25 monster); a self-sufficient fleet only makes it at about Lv 25–30. The slime shield and the skull/dreadful amulets need king slimeballs (boss).",
      "Spiders poison for 20 a turn. The small antidote (alchemy 20) cancels it completely; fighters wear and brew it when the sim says it pays.",
      "The steel gathering tools (−30%) cost 2 astralyte each, about 24 coins."
    ]
  },
  "25": {
    "lede": "The first tier with almost no core gear (1 of 19 items). About 31 hours with everything, 38 with plus. Pigs still give the best XP to Lv 28, then rats (Abandoned House interior).",
    "points": [
      "Plus picks: <b>wooden club</b> (ogre 1/200), <b>skull wand</b>, <b>ring of the adept</b> (6 copies for reaching Lv 25), <b>piggy pants</b>, and the gem amulets (ruby/topaz/sapphire/emerald: 1 gem = 24 stones, plus 2 jasper).",
      "Event gear dominates the rest: <b>bandit armor</b> (Bandit Camp, 1/600), lizard-skin armor and legs (Bandit Camp lizards), piggy helmet and vampire bow (Full Moon capes). The <b>corrupted skull</b> artifact (crit +8) costs 75 corrupted gems at the Cultist Wizard.",
      "Core-only gear stalls at Lv 29: no safe target until something better is crafted.",
      "Keep your Lv 20 skeleton armor/helmet/pants: the Lv 30 royal skeleton set is crafted from them."
    ]
  },
  "30": {
    "lede": "Gold and obsidian tier. About 34 hours with event gear, 52 with plus. Imps (Lv 28, 1,750 HP, earth attack) are the farm: 3,700 XP/h in event gear, 2,400 in plus, and they drop obsidian (1/50).",
    "points": [
      "Plus best: <b>greater dreadful staff</b> (water 60 + earth 20, built on a dreadful staff), the <b>royal skeleton</b> armor/pants/ring, steel boots, sapphire rings and amulet (gems + magical cure).",
      "Event best: <b>obsidian battleaxe</b> (earth 80, but −25 inventory), the gold set (gold helm, platebody, platelegs, boots, shield) and the greater dreadful amulet. Most of these need demon horns (Portal (Demon)) or lizard parts.",
      "Death knight, demon, owlbear and cultist acolyte all become safe wins in event gear by Lv 34. Owlbear hair (12 recipes) and claws (11) feed much of Lv 30–40 crafting.",
      "Gold bars (mining 30) and dead wood planks (woodcutting 30) are the new base materials. Obsidian bars need 4 pieces each (about 200 imp kills per bar)."
    ]
  },
  "35": {
    "lede": "Strangold, magical and cursed tier: 20 of 22 items need event or boss materials. Plus gear runs out of safe targets at Lv 38. With event gear: imps to 37, cursed trees at 38, then goblin guards (mine). About 51 hours.",
    "points": [
      "<b>Strangold bars</b> need strange ore from the <i>Strange Apparition</i> event; <b>magical planks</b> need magic wood from <i>Magic Apparition</i>; <b>cursed planks</b> come from cursed trees (static, Lv 34, 1/10). <b>Diamonds</b> need 24 diamond stones (1/100 at strange rocks, 1/1,250+ elsewhere).",
      "Best in slot: cursed sceptre or diamond sword, jester hat, gold boots, royal skeleton ring + malefic ring, diamond amulet, corrupted skull + malefic crystal artifacts, healing rune.",
      "The Goblin Priestess (boss) needs a priestess hideout key (goblins 1/30–1/40). Her orbs feed the masterful necklace and ancestral talisman; she is out of solo reach."
    ]
  },
  "40": {
    "lede": "Mithril and maple tier, 30 of 38 items special. Restore potions become part of the set. At Lv 44 with health or greater health potions (alchemy 30/40), every Lv 38–40 monster is a safe win, and so are most of the Lv 42–51 ones; without potions bats and cultist alchemists stay risky and nothing above Lv 40 can be beaten. About 55 h with potions, 66 h without.",
    "points": [
      "Targets: goblin wolfriders (3,800 XP/h with potions; broken swords 1/16 for the Lv 40 swords), then hellhounds (Lv 40, raw meat heals 600).",
      "Best in slot: lightning sword or bloodblade, <b>mithril rings ×2</b> (175 HP, 20% dmg each, no crystals), mithril or white knight legs, mithril boots, greater gem amulet, mithril shield.",
      "Gated sources: prime fabric (14 coins), rosenblood elixir (Rosenblood boss behind the Cultist cloak and Clean the Lab), echoless bat wings (<i>Silent Night</i> event), enchanted fabric (pixie raid achievement → Beastmaster)."
    ]
  },
  "45": {
    "lede": "Hell, sand, dragon and adamantite gear, all special. The leveling target is dryads in the Enchanted Forest (5,000 gold per entry), at about 5,000 XP/h with potions; hellhounds without. About 52 h with potions, 76 h without.",
    "points": [
      "Every hell item needs a <b>book from hell</b>: 24 pages from hell (efreet sultan / grimlet events) at the Archaeologist, or the Closing the Gate achievement (500 kills each of demon, imp, efreet sultan and grimlet).",
      "Sandwhisper Isle (1,000 gold per crossing) holds adamantite, palm wood, sand snakes, sandwardens and desert scorpions. Its gear needs its own drops, and the simulator only wins there with Lv 40+ gear plus potions; group fights make it easier than shown.",
      "Level 50 rewards: amulet of the grand master (5 copies, Grand Master achievement), and the high-HP bosses (duskworm 25,000 HP, Sandwhisper Empress 13,500) for group fights."
    ]
  }
};

/** Per skill: the training path in words. */
export const SKILL_TEXT: Record<string, string> = {
  "mining": "Copper → iron (10) → coal (20, for steel) → gold (30, underground) → mithril (40, underground) → adamantite (50, Sandwhisper Mine). Every rock also drops gem stones (1/200; 1/100 from gold up). 24 stones make a gem at mining 20 (diamond at 35, alexandrite at 50).",
  "woodcutting": "Ash → spruce (10) → birch (20, hardwood planks need ash too) → dead wood (30) → maple (40) → palm (50, island). Magic wood (35) is event-only. Sap (1/10) feeds antidotes and health potions.",
  "fishing": "Gudgeon → shrimp (10) → trout (20) → bass (30) → salmon (40) → swordfish (50, island). Fishing feeds cooking 1:1. Algae (1/10) is a potion ingredient; shells and pearls are rare.",
  "alchemy": "Gather sunflowers for Lv 1–4 (no recipe until 5). Recall potions (sunflower + gudgeon) to 15, boost potions (slimeball + sunflower + algae) 16–19, <b>forest bank potions</b> (nettle + trout) for 20–34, health splash potions to 39, enchanted potions (Enchanted Forest mushrooms) for 40+. Nettle (alchemy 20) and glowstem (alchemy 40) gathering are the alternatives. Sunflower (1), nettle (20), glowstem (40, also a Lv 40 task item), enchanted mushroom (40, Enchanted Forest), torch cactus (50, island). Nodes leave gaps (12–19, 31–39) where brewing is the only XP; see Alchemy under Crafting.",
  "weaponcrafting": "Best path: daggers (iron dagger: 6 iron bars + 2 feathers) through Lv 19, skull staff at 20–30, then the dreadful staves on plus materials, or gold sword / mithril cleaver once event drops are allowed. Everything past 30 needs crystals or events, which is why the plus column climbs to thousands of hours.",
  "gearcrafting": "Leather boots (ash planks + cowhide) carry Lv 10–19, the skeleton helmet 20–30, snakeskin legs and the royal skeleton set to 40. Gearcrafting and jewelrycrafting keep a core recipe up to Lv 40 (royal skeleton armor, gold ring) because skeleton, wolf and vampire drops are on the open map; weaponcrafting has none past 30.",
  "jewelrycrafting": "Iron ring → elemental rings (air ring) to Lv 27 → gold ring (gold bars, dead wood, bones, vampire blood) for 30–40. Past 40 every recipe needs gems + astralyte or strangold; the mithril ring (no crystals, but event lizard eyes) is the cheapest.",
  "cooking": "Trivial: one fish per cook. Shrimp, trout, bass, salmon at their levels, under 40 hours for 1→50. Raw meat drops (beef, wolf, porkchop, rat, hellhound) work too and feed the fighters."
};
