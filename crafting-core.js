(function (root, factory) {
  const core = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = core;
  }
  root.CraftingCore = core;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const DATA_VERSION = "poe2db-weighted-2026-07-10-v15";

  const RARITIES = {
    normal: { label: "普通", maxPrefixes: 0, maxSuffixes: 0 },
    magic: { label: "魔法", maxPrefixes: 1, maxSuffixes: 1 },
    rare: { label: "稀有", maxPrefixes: 3, maxSuffixes: 3 },
    unique: { label: "传奇", maxPrefixes: 0, maxSuffixes: 0 },
  };

  const CURRENCY_TIERS = {
    normal: { label: "普通", minLevelByAction: {} },
    greater: {
      label: "高级",
      minLevelByAction: {},
    },
    perfect: {
      label: "完美",
      minLevelByAction: {},
    },
  };

  const TIERED_CURRENCY_ACTIONS = new Set(["transmutation", "augmentation", "regal", "exalted", "chaos"]);
  const WEAPON_CLASSES = [
    "claw",
    "dagger",
    "wand",
    "one_hand_sword",
    "one_hand_axe",
    "one_hand_mace",
    "sceptre",
    "spear",
    "flail",
    "bow",
    "staff",
    "two_hand_sword",
    "two_hand_axe",
    "two_hand_mace",
    "quarterstaff",
    "crossbow",
    "trap",
  ];
  const ARMOUR_CLASSES = ["boots", "body_armour", "gloves", "helmet", "shield", "buckler", "focus"];
  const JEWELLERY_CLASSES = ["amulet", "ring", "belt", "talisman"];
  const ALL_EQUIPMENT_CLASSES = JEWELLERY_CLASSES.concat(ARMOUR_CLASSES, WEAPON_CLASSES, ["quiver"]);
  const MACE_CLASSES = ["one_hand_mace", "two_hand_mace"];
  const TWO_HAND_MELEE_CLASSES = ["two_hand_sword", "two_hand_axe", "two_hand_mace", "quarterstaff", "staff", "spear"];
  const DEFENCE_BASE_TAGS = ["def_armour", "def_evasion", "def_energy_shield"];
  const FALLBACK_CURRENCY_TIER_MIN_LEVELS = {
    greater: { transmutation: 44, augmentation: 44, regal: 35, exalted: 35, chaos: 35 },
    perfect: { transmutation: 70, augmentation: 70, regal: 50, exalted: 50, chaos: 50 },
  };
  const IMPORTED_CRAFTING_DATA = loadCraftingData();
  const MODIFIER_DATA_LOADED = hasModifierData();
  const CRAFTING_DATA_LOADED = hasCraftingData();
  const SOUL_CORE_DATA_LOADED = hasSoulCoreData();

  const CURRENCIES = [
    currency("transmutation", "蜕变石", "将普通物品升级为具有 1 个词缀的魔法物品", true),
    currency("augmentation", "增幅石", "用 1 个新随机词缀强化魔法物品", true),
    currency("alchemy", "点金石", "将普通物品升级为拥有 4 个词缀的稀有物品", true),
    currency("regal", "富豪石", "将魔法物品升级为稀有物品，并增加 1 个词缀", true),
    currency("exalted", "崇高石", "用 1 个新随机词缀强化稀有物品", true),
    currency("chaos", "混沌石", "魔法或稀有：移除 1 个随机词缀，再获得 1 个新随机词缀", true),
    currency("annulment", "剥离石", "魔法或稀有：随机移除物品上的 1 个词缀", false),
    currency("divine", "神圣石", "重置物品上词缀的数值", false),
    currency("chance", "机会石", "普通物品：有机会变为传奇，否则摧毁物品", false),
    currency("vaal", "瓦尔宝珠", "随机腐化并改变物品，随后物品腐化", false),
    currency("fracturing", "破溃石", "稀有物品：随机破碎并锁定 1 个显式词缀", false),
    currency("artificer", "巧匠石", "为武器或护甲添加 1 个符文插槽", false),
    currency("armour_scrap", "护甲片", "提高护甲类物品品质", false),
    currency("whetstone", "磨刀石", "提高武器品质", false),
    currency("arcanist_etcher", "奥术蚀刻石", "提高法术武器品质", false),
    currency("mirror", "卡兰德的魔镜", "复制物品，复制品带有镜像标签且不能继续修改", false),

    essence("essence_body", "精髓：躯体", "普通物品 -> 魔法，并保证 1 个生命词缀", "normal", "生命"),
    essence("essence_mind", "精髓：心灵", "普通物品 -> 魔法，并保证 1 个魔力词缀", "normal", "魔力"),
    essence("essence_flames", "精髓：烈焰", "普通物品 -> 魔法，并保证 1 个火焰抗性词缀", "normal", "火焰"),
    essence("essence_ice", "精髓：冰霜", "普通物品 -> 魔法，并保证 1 个冰霜抗性词缀", "normal", "冰霜"),
    essence("essence_electricity", "精髓：电击", "普通物品 -> 魔法，并保证 1 个闪电抗性词缀", "normal", "闪电"),
    essence("essence_battle", "精髓：战斗", "普通物品 -> 魔法，并保证 1 个攻击词缀", "normal", "攻击"),
    essence("essence_sorcery", "精髓：巫术", "普通物品 -> 魔法，并保证 1 个施法/技能速度词缀", "normal", "速度"),
    essence("greater_essence_body", "高级精髓：躯体", "魔法物品 -> 稀有，并保证 1 个生命词缀", "greater", "生命"),
    essence("greater_essence_mind", "高级精髓：心灵", "魔法物品 -> 稀有，并保证 1 个魔力词缀", "greater", "魔力"),
    essence("greater_essence_flames", "高级精髓：烈焰", "魔法物品 -> 稀有，并保证 1 个火焰抗性词缀", "greater", "火焰"),
    essence("greater_essence_ice", "高级精髓：冰霜", "魔法物品 -> 稀有，并保证 1 个冰霜抗性词缀", "greater", "冰霜"),
    essence("greater_essence_electricity", "高级精髓：电击", "魔法物品 -> 稀有，并保证 1 个闪电抗性词缀", "greater", "闪电"),
    essence("greater_essence_battle", "高级精髓：战斗", "魔法物品 -> 稀有，并保证 1 个攻击词缀", "greater", "攻击"),
    essence("greater_essence_sorcery", "高级精髓：巫术", "魔法物品 -> 稀有，并保证 1 个施法/技能速度词缀", "greater", "速度"),
    essence("perfect_essence_body", "完美精髓：躯体", "稀有物品获得 1 个生命词缀", "perfect", "生命"),
    essence("perfect_essence_mind", "完美精髓：心灵", "稀有物品获得 1 个魔力词缀", "perfect", "魔力"),
    essence("perfect_essence_flames", "完美精髓：烈焰", "稀有物品获得 1 个火焰抗性词缀", "perfect", "火焰"),
    essence("perfect_essence_ice", "完美精髓：冰霜", "稀有物品获得 1 个冰霜抗性词缀", "perfect", "冰霜"),
    essence("perfect_essence_electricity", "完美精髓：电击", "稀有物品获得 1 个闪电抗性词缀", "perfect", "闪电"),
    essence("perfect_essence_battle", "完美精髓：战斗", "稀有物品获得 1 个攻击词缀", "perfect", "攻击"),
    essence("perfect_essence_sorcery", "完美精髓：巫术", "稀有物品获得 1 个施法/技能速度词缀", "perfect", "速度"),

    rune("rune_fire", "沙漠符文", "放入符文插槽，提供火焰抗性", "火焰抗性 +12%"),
    rune("rune_cold", "冰川符文", "放入符文插槽，提供冰霜抗性", "冰霜抗性 +12%"),
    rune("rune_lightning", "风暴符文", "放入符文插槽，提供闪电抗性", "闪电抗性 +12%"),
    rune("rune_iron", "铁符文", "放入符文插槽，提高护甲或物理伤害", "防御或物理加成"),
    rune("serles_triumph", "瑟尔的凯旋", "放入符文插槽，允许的后缀 +1", "允许的后缀 +1", { affixAdjust: { suffix: 1 } }),

    omen("omen_alchemy_prefixes", "左旋炼金预兆", "下一颗点金石造成最大数量前缀", "alchemy", { alchemyMaxType: "prefix" }),
    omen("omen_alchemy_suffixes", "右旋炼金预兆", "下一颗点金石造成最大数量后缀", "alchemy", { alchemyMaxType: "suffix" }),
    omen("omen_regal_homogenising", "同质化加冕预兆", "下一颗富豪石增加一个与现有词缀相同种类的词缀", "regal", { addSameType: true }),
    omen("omen_chance_ancient", "远古预兆", "下一颗机会石升级为相同物品种类的随机传奇物品", "chance", { chanceForceUnique: true }),
    omen("omen_chance_safe", "机遇预兆", "下一颗机会石不会摧毁物品", "chance", { chanceNoDestroy: true }),
    omen("omen_exalted_powerful", "强效崇高预兆", "下一颗崇高石增加 2 个词缀", "exalted", { addCount: 2 }),
    omen("omen_exalted_prefix", "左旋崇高预兆", "下一颗崇高石只添加前缀", "exalted", { addType: "prefix" }),
    omen("omen_exalted_suffix", "右旋崇高预兆", "下一颗崇高石只添加后缀", "exalted", { addType: "suffix" }),
    omen("omen_exalted_homogenising", "同质化崇高预兆", "下一颗崇高石增加一个与现有词缀相同种类的词缀", "exalted", { addSameType: true }),
    omen("omen_regal_prefix", "左旋富豪预兆", "下一颗富豪石只添加前缀", "regal", { addType: "prefix" }),
    omen("omen_regal_suffix", "右旋富豪预兆", "下一颗富豪石只添加后缀", "regal", { addType: "suffix" }),
    omen("omen_annulment_powerful", "强效剥离预兆", "下一颗剥离石移除 2 个词缀", "annulment", { removeCount: 2 }),
    omen("omen_annulment_prefix", "左旋剥离预兆", "下一颗剥离石只移除前缀", "annulment", { removeType: "prefix" }),
    omen("omen_annulment_suffix", "右旋剥离预兆", "下一颗剥离石只移除后缀", "annulment", { removeType: "suffix" }),
    omen("omen_chaos_prefix", "左旋消抹预兆", "下一颗混沌石只移除前缀", "chaos", { removeType: "prefix" }),
    omen("omen_chaos_suffix", "右旋消抹预兆", "下一颗混沌石只移除后缀", "chaos", { removeType: "suffix" }),
    omen("omen_chaos_lowest", "消减预兆", "下一颗混沌石移除最低等级词缀", "chaos", { removeLowest: true }),
    omen("omen_essence_prefix", "左旋结晶预兆", "下一次完美精髓移除前缀", "essence", { removeType: "prefix" }),
    omen("omen_essence_suffix", "右旋结晶预兆", "下一次完美精髓移除后缀", "essence", { removeType: "suffix" }),
    omen("omen_desecration_prefix", "左旋亵渎预兆", "下一次亵渎只添加亵渎前缀", "desecration", { addType: "prefix" }),
    omen("omen_desecration_suffix", "右旋亵渎预兆", "下一次亵渎只添加亵渎后缀", "desecration", { addType: "suffix" }),
    omen("omen_desecration_reroll", "深渊回响预兆", "下一次深渊回响揭露亵渎词缀时重骰一次", "abyssal_echoes", { rerollReveal: true }),
    omen("omen_desecration_rotting", "腐烂预兆", "下一次亵渎取代所有词缀，生成最多 6 个亵渎词缀并腐化物品", "desecration", { rottingDesecration: true }),
    omen("omen_bright", "光明预兆", "下一颗剥离石只移除亵渎词缀", "annulment", { removeDesecrated: true }),

    reveal("abyssal_echoes", "深渊回响", "从 3 个候选中选择 1 条揭露亵渎词缀"),

    desecration("ancient_lockbone", "远古锁骨", "亵渎稀有饰品，亵渎词缀等级至少 40", JEWELLERY_CLASSES, { minModLevel: 40 }),
    desecration("preserved_lockbone", "保存完好的锁骨", "亵渎稀有饰品，随机获得 1 个亵渎词缀", JEWELLERY_CLASSES, {}),
    desecration("gnawing_lockbone", "啃噬锁骨", "亵渎物品等级不高于 64 的稀有饰品", JEWELLERY_CLASSES, { maxItemLevel: 64 }),
    desecration("ancient_rib", "远古肋骨", "亵渎稀有护甲或副手防具，亵渎词缀等级至少 40", ARMOUR_CLASSES, { minModLevel: 40 }),
    desecration("preserved_rib", "保存完好的肋骨", "亵渎稀有护甲或副手防具，随机获得 1 个亵渎词缀", ARMOUR_CLASSES, {}),
    desecration("gnawing_rib", "啃噬肋骨", "亵渎物品等级不高于 64 的稀有护甲或副手防具", ARMOUR_CLASSES, { maxItemLevel: 64 }),
    desecration("ancient_jawbone", "远古颚骨", "亵渎稀有武器或箭袋，亵渎词缀等级至少 40", WEAPON_CLASSES.concat(["quiver"]), { minModLevel: 40 }),
    desecration("preserved_jawbone", "保存完好的颚骨", "亵渎稀有武器或箭袋，随机获得 1 个亵渎词缀", WEAPON_CLASSES.concat(["quiver"]), {}),
    desecration("gnawing_jawbone", "啃噬颚骨", "亵渎物品等级不高于 64 的稀有武器或箭袋", WEAPON_CLASSES.concat(["quiver"]), { maxItemLevel: 64 }),
    desecration("preserved_cranium", "遗存头骨", "亵渎稀有珠宝，随机获得 1 个亵渎词缀", ["jewel"], {}),
    desecration("preserved_vertebrae", "遗存椎骨", "亵渎稀有引路石，随机获得 1 个亵渎词缀", ["waystone"], {}),
  ];

  applyImportedCraftingActions(CURRENCIES);
  disableUnsupportedCurrencyTiers();

  const FALLBACK_BASES = [
    {
      id: "boots_ornate_greaves",
      classId: "boots",
      classLabel: "鞋子",
      name: "华丽胫甲",
      english: "Ornate Greaves",
      requiredLevel: 70,
      defenses: ["护甲: 256"],
      tags: ["boots", "armour", "str"],
      implicits: [],
    },
    {
      id: "boots_vaal_greaves",
      classId: "boots",
      classLabel: "鞋子",
      name: "瓦尔胫甲",
      english: "Vaal Greaves",
      requiredLevel: 75,
      defenses: ["护甲: 268"],
      tags: ["boots", "armour", "str"],
      implicits: [],
    },
    {
      id: "boots_runemastered_rough_greaves",
      classId: "boots",
      classLabel: "鞋子",
      name: "符文大师粗制胫甲",
      english: "Runemastered Rough Greaves",
      requiredLevel: 38,
      defenses: ["护甲: 150", "符文结界: 27"],
      tags: ["boots", "armour", "str", "runic"],
      implicits: [implicit("#% 移动速度提高", 10, 10, ["速度"])],
    },
    {
      id: "ring_ruby",
      classId: "ring",
      classLabel: "戒指",
      name: "红玉戒指",
      english: "Ruby Ring",
      requiredLevel: 8,
      defenses: [],
      tags: ["ring", "jewellery"],
      implicits: [implicit("+#% 火焰抗性", 20, 30, ["元素", "火焰", "抗性"])],
    },
    {
      id: "ring_sapphire",
      classId: "ring",
      classLabel: "戒指",
      name: "蓝玉戒指",
      english: "Sapphire Ring",
      requiredLevel: 12,
      defenses: [],
      tags: ["ring", "jewellery"],
      implicits: [implicit("+#% 冰霜抗性", 20, 30, ["元素", "冰霜", "抗性"])],
    },
    {
      id: "ring_topaz",
      classId: "ring",
      classLabel: "戒指",
      name: "黄玉戒指",
      english: "Topaz Ring",
      requiredLevel: 16,
      defenses: [],
      tags: ["ring", "jewellery"],
      implicits: [implicit("+#% 闪电抗性", 20, 30, ["元素", "闪电", "抗性"])],
    },
    {
      id: "ring_amethyst",
      classId: "ring",
      classLabel: "戒指",
      name: "紫晶戒指",
      english: "Amethyst Ring",
      requiredLevel: 20,
      defenses: [],
      tags: ["ring", "jewellery"],
      implicits: [implicit("+#% 混沌抗性", 7, 13, ["混沌", "抗性"])],
    },
    {
      id: "ring_prismatic",
      classId: "ring",
      classLabel: "戒指",
      name: "三相戒指",
      english: "Prismatic Ring",
      requiredLevel: 35,
      defenses: [],
      tags: ["ring", "jewellery"],
      implicits: [implicit("+#% 所有元素抗性", 7, 10, ["元素", "抗性"])],
    },
    {
      id: "amulet_lapis",
      classId: "amulet",
      classLabel: "项链",
      name: "青玉护身符",
      english: "Lapis Amulet",
      requiredLevel: 16,
      defenses: [],
      tags: ["amulet", "jewellery"],
      implicits: [implicit("+# 智慧", 18, 24, ["属性"])],
    },
    {
      id: "belt_heavy",
      classId: "belt",
      classLabel: "腰带",
      name: "重革腰带",
      english: "Heavy Belt",
      requiredLevel: 8,
      defenses: [],
      tags: ["belt", "jewellery"],
      implicits: [implicit("+# 力量", 18, 24, ["属性"])],
    },
    {
      id: "waystone_t15",
      classId: "waystone",
      classLabel: "引路石",
      name: "15阶引路石",
      english: "Tier 15 Waystone",
      requiredLevel: 79,
      defenses: [],
      tags: ["waystone", "map"],
      implicits: [],
    },
    {
      id: "jewel_abyss",
      classId: "jewel",
      classLabel: "珠宝",
      name: "深渊珠宝",
      english: "Abyss Jewel",
      requiredLevel: 1,
      defenses: [],
      tags: ["jewel"],
      implicits: [],
    },
    {
      id: "bow_war_bow",
      classId: "bow",
      classLabel: "弓",
      name: "战争弓",
      english: "War Bow",
      requiredLevel: 62,
      defenses: ["物理伤害: 32-96"],
      tags: ["bow", "weapon", "attack_weapon"],
      maxSockets: 2,
      implicits: [],
    },
    {
      id: "wand_attuned",
      classId: "wand",
      classLabel: "法杖",
      name: "调谐法杖",
      english: "Attuned Wand",
      requiredLevel: 62,
      defenses: ["物理伤害: 18-34"],
      tags: ["wand", "weapon", "caster_weapon"],
      maxSockets: 2,
      implicits: [implicit("#% 法术伤害提高", 12, 18, ["法术", "伤害"])],
    },
  ];

  const BASES = loadBaseData(FALLBACK_BASES);

  const SAMPLE_MODIFIERS = [
    tiered("boots_life", "prefix", ["boots"], "maximum_life", "生命", "+# 最大生命", [1, 12, 24, 36, 50, 70, 80], [[20, 29], [30, 39], [40, 49], [50, 59], [60, 69], [70, 79], [80, 89]], [1100, 950, 800, 650, 500, 360, 220], ["生命"]),
    tiered("jewellery_life", "prefix", ["ring", "amulet", "belt"], "maximum_life", "生命", "+# 最大生命", [1, 12, 24, 36, 50, 70, 80], [[20, 29], [30, 39], [40, 49], [50, 59], [60, 69], [70, 79], [80, 89]], [1000, 900, 760, 620, 480, 340, 210], ["生命"]),
    tiered("mana", "prefix", ["ring", "amulet"], "maximum_mana", "魔力", "+# 魔力上限", [1, 12, 24, 40, 70, 80], [[20, 29], [30, 39], [40, 49], [50, 59], [60, 74], [75, 90]], [1000, 880, 720, 560, 380, 240], ["魔力"]),
    tiered("armour_flat", "prefix", ["boots"], "local_armour", "护甲", "+# 点护甲", [1, 14, 28, 44, 70, 80], [[20, 34], [35, 54], [55, 79], [80, 109], [110, 149], [150, 190]], [900, 780, 640, 480, 320, 200], ["护甲"]),
    tiered("armour_percent", "prefix", ["boots"], "local_armour_percent", "护甲", "#% 护甲提高", [1, 16, 50, 70, 80], [[20, 29], [30, 44], [45, 59], [60, 74], [75, 90]], [950, 760, 560, 360, 220], ["护甲"]),
    tiered("ring_added_physical", "prefix", ["ring"], "added_attack_physical", "攻击物理", "攻击附加 # - # 物理伤害", [1, 35, 70, 80], [[1, 4, 5, 9], [4, 8, 9, 14], [7, 12, 13, 20], [11, 18, 19, 28]], [850, 640, 420, 240], ["攻击", "物理"]),
    tiered("jewellery_damage", "prefix", ["ring", "amulet"], "generic_damage", "伤害", "#% 伤害提高", [1, 40, 70, 80], [[10, 16], [17, 24], [25, 32], [33, 40]], [720, 520, 320, 180], ["伤害"]),
    tiered("weapon_physical_percent", "prefix", ["bow"], "weapon_physical_percent", "攻击物理", "#% 物理伤害提高", [1, 20, 45, 70, 80], [[20, 34], [35, 54], [55, 74], [75, 94], [95, 120]], [920, 720, 500, 300, 160], ["攻击", "物理", "伤害"]),
    tiered("weapon_added_physical", "prefix", ["bow"], "weapon_added_physical", "攻击物理附加", "附加 # - # 物理伤害", [1, 35, 70, 80], [[2, 5, 6, 12], [7, 12, 13, 22], [13, 22, 23, 36], [23, 36, 37, 54]], [880, 620, 380, 200], ["攻击", "物理"]),
    tiered("wand_spell_damage", "prefix", ["wand"], "spell_damage", "法术伤害", "#% 法术伤害提高", [1, 35, 70, 80], [[15, 24], [25, 39], [40, 59], [60, 78]], [880, 640, 360, 180], ["法术", "伤害"]),
    tiered("wand_cast_speed", "suffix", ["wand"], "cast_speed", "施法速度", "#% 施法速度提高", [1, 35, 70, 80], [[4, 6], [7, 9], [10, 12], [13, 15]], [640, 420, 240, 120], ["速度", "施法"]),
    tiered("weapon_accuracy", "suffix", ["bow"], "accuracy", "命中", "+# 命中值", [1, 35, 70, 80], [[40, 69], [70, 109], [110, 159], [160, 220]], [720, 480, 260, 120], ["攻击"]),

    tiered("boots_movement", "suffix", ["boots"], "movement_speed", "速度", "#% 移动速度提高", [1, 16, 30, 50, 70, 80], [[10, 14], [15, 19], [20, 24], [25, 29], [30, 34], [35, 35]], [950, 760, 560, 360, 220, 120], ["速度"]),
    tiered("fire_resistance", "suffix", ["boots", "ring", "amulet", "belt"], "fire_resistance", "火焰抗性", "+#% 火焰抗性", [1, 12, 24, 36, 50, 70, 80], [[12, 17], [18, 23], [24, 29], [30, 35], [36, 41], [42, 47], [48, 52]], [900, 820, 700, 560, 420, 280, 160], ["元素", "火焰", "抗性"]),
    tiered("cold_resistance", "suffix", ["boots", "ring", "amulet", "belt"], "cold_resistance", "冰霜抗性", "+#% 冰霜抗性", [1, 12, 24, 36, 50, 70, 80], [[12, 17], [18, 23], [24, 29], [30, 35], [36, 41], [42, 47], [48, 52]], [900, 820, 700, 560, 420, 280, 160], ["元素", "冰霜", "抗性"]),
    tiered("lightning_resistance", "suffix", ["boots", "ring", "amulet", "belt"], "lightning_resistance", "闪电抗性", "+#% 闪电抗性", [1, 12, 24, 36, 50, 70, 80], [[12, 17], [18, 23], [24, 29], [30, 35], [36, 41], [42, 47], [48, 52]], [900, 820, 700, 560, 420, 280, 160], ["元素", "闪电", "抗性"]),
    tiered("chaos_resistance", "suffix", ["boots", "ring", "amulet", "belt"], "chaos_resistance", "混沌抗性", "+#% 混沌抗性", [20, 50, 70, 80], [[7, 13], [14, 20], [21, 27], [28, 33]], [580, 420, 260, 140], ["混沌", "抗性"]),
    tiered("all_resistance", "suffix", ["ring", "amulet"], "all_resistance", "全元素抗性", "+#% 所有元素抗性", [1, 70, 80], [[5, 8], [9, 12], [13, 16]], [420, 260, 140], ["元素", "抗性"]),
    tiered("strength", "suffix", ["boots", "ring", "amulet", "belt"], "strength", "力量", "+# 力量", [1, 40, 70, 80], [[10, 15], [16, 22], [23, 30], [31, 38]], [720, 520, 320, 180], ["属性"]),
    tiered("dexterity", "suffix", ["boots", "ring", "amulet", "belt"], "dexterity", "敏捷", "+# 敏捷", [1, 40, 70, 80], [[10, 15], [16, 22], [23, 30], [31, 38]], [720, 520, 320, 180], ["属性"]),
    tiered("intelligence", "suffix", ["boots", "ring", "amulet", "belt"], "intelligence", "智慧", "+# 智慧", [1, 40, 70, 80], [[10, 15], [16, 22], [23, 30], [31, 38]], [720, 520, 320, 180], ["属性"]),
    tiered("item_rarity", "suffix", ["ring", "amulet"], "item_rarity", "物品稀有度", "#% 物品稀有度提高", [1, 70, 80], [[10, 15], [16, 24], [25, 32]], [500, 300, 160], ["物品稀有度"]),
    tiered("skill_speed", "suffix", ["ring", "amulet"], "skill_speed", "技能速度", "#% 技能速度提高", [32, 70, 80], [[4, 6], [7, 9], [10, 12]], [360, 220, 120], ["速度"]),
    tiered("debuff_slow_reduction", "suffix", ["boots"], "slow_reduction", "减速减益", "你受到的减速减益强度降低 #% ", [1, 70, 80], [[10, 16], [17, 24], [25, 30]], [560, 320, 160], ["异常状态"]),
  ].flat();

  const MODIFIERS = loadModifierData(SAMPLE_MODIFIERS);

  const DESECRATED_MODIFIERS = loadDesecratedData([
    desecratedMod("desecrated_jewellery_life_on_kill", "prefix", ["ring", "amulet", "belt"], "desecrated_life_on_kill", "亵渎生命", "击败敌人时获得 # 生命", 1, [[18, 28], [29, 42], [43, 58]], [900, 520, 260], ["亵渎", "生命"]),
    desecratedMod("desecrated_jewellery_mana_on_kill", "prefix", ["ring", "amulet"], "desecrated_mana_on_kill", "亵渎魔力", "击败敌人时获得 # 魔力", 1, [[14, 22], [23, 34], [35, 48]], [760, 440, 220], ["亵渎", "魔力"]),
    desecratedMod("desecrated_jewellery_damage", "prefix", ["ring", "amulet", "belt"], "desecrated_damage", "亵渎伤害", "对稀有和传奇敌人的伤害提高 #% ", 40, [[8, 12], [13, 18], [19, 24]], [520, 320, 160], ["亵渎", "伤害"]),
    desecratedMod("desecrated_jewellery_resistance", "suffix", ["ring", "amulet", "belt"], "desecrated_resistance", "亵渎抗性", "+#% 所有元素抗性", 1, [[4, 6], [7, 9], [10, 12]], [760, 420, 200], ["亵渎", "元素", "抗性"]),
    desecratedMod("desecrated_jewellery_attribute", "suffix", ["ring", "amulet", "belt"], "desecrated_attribute", "亵渎属性", "+# 全属性", 20, [[5, 8], [9, 12], [13, 16]], [680, 380, 180], ["亵渎", "属性"]),
    desecratedMod("desecrated_armour_life", "prefix", ["boots", "body_armour", "gloves", "helmet"], "desecrated_armour_life", "亵渎生命", "+# 最大生命", 1, [[22, 34], [35, 49], [50, 66]], [850, 480, 240], ["亵渎", "生命"]),
    desecratedMod("desecrated_armour_defence", "prefix", ["boots", "body_armour", "gloves", "helmet"], "desecrated_armour_defence", "亵渎防御", "#% 全局防御提高", 40, [[8, 12], [13, 18], [19, 25]], [600, 340, 170], ["亵渎", "防御"]),
    desecratedMod("desecrated_armour_speed", "suffix", ["boots"], "desecrated_armour_speed", "亵渎速度", "#% 移动速度提高", 20, [[3, 5], [6, 8], [9, 10]], [420, 240, 120], ["亵渎", "速度"]),
    desecratedMod("desecrated_armour_resistance", "suffix", ["boots", "body_armour", "gloves", "helmet"], "desecrated_armour_resistance", "亵渎抗性", "+#% 混沌抗性", 1, [[4, 7], [8, 11], [12, 15]], [740, 420, 200], ["亵渎", "混沌", "抗性"]),
  ].flat());

  function currency(id, label, sourceRule, supportsTiers) {
    return { id, label, sourceRule, supportsTiers, category: "currency" };
  }

  function omen(id, label, sourceRule, target, effect) {
    return { id, label, sourceRule, supportsTiers: false, category: "omen", omen: { id, label, target, effect } };
  }

  function desecration(id, label, sourceRule, classes, rules) {
    return { id, label, sourceRule, supportsTiers: false, category: "desecration", desecration: Object.assign({ classes }, rules) };
  }

  function reveal(id, label, sourceRule) {
    return { id, label, sourceRule, supportsTiers: false, category: "desecration", revealDesecration: true };
  }

  function essence(id, label, sourceRule, tier, tag) {
    return { id, label, sourceRule, supportsTiers: false, category: "essence", essence: { tier, tag } };
  }

  function rune(id, label, sourceRule, effectText, effect) {
    return { id, label, sourceRule, supportsTiers: false, category: "rune", rune: { id, label, effectText, effect: effect || {} } };
  }

  function implicit(template, min, max, tags) {
    return { template, min, max, tags };
  }

  function tiered(baseId, type, classes, group, name, template, levels, ranges, weights, tags) {
    return levels.map(function (level, index) {
      return makeMod(baseId, baseId + "_t" + (levels.length - index), type, classes, group, name, template, level, ranges[index], weights[index], "T" + (levels.length - index), tags, false);
    });
  }

  function desecratedMod(baseId, type, classes, group, name, template, firstLevel, ranges, weights, tags) {
    return ranges.map(function (range, index) {
      const level = firstLevel + index * 20;
      return makeMod(baseId, baseId + "_t" + (ranges.length - index), type, classes, group, name, template, level, range, weights[index], "D" + (ranges.length - index), tags, true);
    });
  }

  function makeMod(baseId, id, type, classes, group, name, template, level, range, weight, tier, tags, desecrated) {
    const rolls = [];
    for (let i = 0; i < range.length; i += 2) {
      rolls.push({ min: range[i], max: range[i + 1] });
    }
    return { id, baseId, type, classes, group, name, template, level, weight, tier, tags, rolls, desecrated };
  }

  function loadBaseData(fallback) {
    const data = typeof globalThis !== "undefined" ? globalThis.POE2DB_BASE_DATA : null;
    if (!data || !Array.isArray(data.bases) || data.bases.length === 0) return fallback;

    const imported = data.bases.map(function (base) {
      if (!base || !base.id || !base.classId || !base.name) return null;
      const normalized = {
        id: String(base.id),
        classId: String(base.classId),
        classLabel: String(base.classLabel || base.classId),
        name: String(base.name),
        english: String(base.english || base.href || base.id),
        requiredLevel: Number(base.requiredLevel) || 1,
        defenses: Array.isArray(base.defenses) ? base.defenses.map(String).filter(Boolean) : [],
        tags: Array.isArray(base.tags) ? base.tags.map(String) : [],
        maxSockets: typeof base.maxSockets === "number" ? base.maxSockets : undefined,
        affixAdjust: base.affixAdjust && typeof base.affixAdjust === "object"
          ? {
              prefix: Number(base.affixAdjust.prefix) || 0,
              suffix: Number(base.affixAdjust.suffix) || 0,
            }
          : undefined,
        implicits: Array.isArray(base.implicits) ? base.implicits.map(function (implicitEntry) {
          const rolls = Array.isArray(implicitEntry.rolls) ? implicitEntry.rolls.map(function (roll) {
            return {
              min: Number(roll.min),
              max: Number(roll.max),
              scale: Number(roll.scale) || 1,
            };
          }).filter(function (roll) {
            return Number.isFinite(roll.min) && Number.isFinite(roll.max);
          }) : [];
          return {
            template: String(implicitEntry.template || ""),
            rolls,
            min: Number(implicitEntry.min),
            max: Number(implicitEntry.max),
            tags: Array.isArray(implicitEntry.tags) ? implicitEntry.tags.map(String) : [],
          };
        }).filter(function (implicitEntry) {
          return implicitEntry.template;
        }) : [],
      };
      normalized.affixAdjust = normalizeBaseAffixAdjust(base.affixAdjust, normalized.implicits);
      return normalized;
    }).filter(Boolean);

    const seenIds = new Set(imported.map(function (base) { return base.id; }));
    const hasImportedJewels = imported.some(function (base) { return base.classId === "jewel"; });
    fallback.forEach(function (base) {
      if (base.id === "jewel_abyss" && hasImportedJewels) return;
      if (!seenIds.has(base.id)) imported.push(base);
    });
    return imported.length > 0 ? imported : fallback;
  }

  function normalizeBaseAffixAdjust(rawAdjust, implicits) {
    const explicitAdjust = rawAdjust && typeof rawAdjust === "object"
      ? {
          prefix: Number(rawAdjust.prefix) || 0,
          suffix: Number(rawAdjust.suffix) || 0,
        }
      : { prefix: 0, suffix: 0 };
    if (explicitAdjust.prefix || explicitAdjust.suffix) return explicitAdjust;
    return parseImplicitAffixAdjust(implicits);
  }

  function parseImplicitAffixAdjust(implicits) {
    const adjust = { prefix: 0, suffix: 0 };
    (implicits || []).forEach(function (implicitEntry) {
      const rolls = implicitEntry.rolls || [];
      let rollIndex = 0;
      const regex = /(允许的前缀|允许的后缀)\s*([+-]?)\s*(#|[+-]?\d+)/g;
      let match = regex.exec(implicitEntry.template || "");
      while (match) {
        const type = match[1] === "允许的前缀" ? "prefix" : "suffix";
        const token = match[3];
        const sign = match[2] === "-" || token.startsWith("-") ? -1 : 1;
        let value = 0;
        if (token === "#") {
          const roll = rolls[rollIndex];
          value = roll ? Number(roll.min) || Number(roll.max) || 0 : 0;
          rollIndex += 1;
        } else {
          value = Math.abs(Number(token) || 0);
        }
        adjust[type] += sign * value;
        match = regex.exec(implicitEntry.template || "");
      }
    });
    return adjust;
  }

  function loadModifierData(fallback) {
    const data = typeof globalThis !== "undefined" ? globalThis.POE2DB_MOD_DATA : null;
    if (!data || !Array.isArray(data.modifiers) || data.modifiers.length === 0) return fallback;

    const imported = data.modifiers.map(function (mod) {
      if (!mod || !mod.id || !mod.type || !mod.group || !mod.template) return null;
      if (mod.type !== "prefix" && mod.type !== "suffix") return null;
      if (!Array.isArray(mod.classes) || mod.classes.length === 0) return null;
      if (!Array.isArray(mod.rolls)) return null;

      return {
        id: String(mod.id),
        baseId: String(mod.baseId || mod.id),
        type: mod.type,
        classes: mod.classes.map(String),
        group: String(mod.group),
        name: String(mod.name || mod.group),
        template: String(mod.template),
        level: Number(mod.level) || 1,
        weight: Math.max(0, Number(mod.weight) || 0),
        tier: String(mod.tier || "?"),
        tags: Array.isArray(mod.tags) ? mod.tags.map(String) : [],
        requiredBaseTags: Array.isArray(mod.requiredBaseTags) ? mod.requiredBaseTags.map(String) : [],
        requiredAnyBaseTags: Array.isArray(mod.requiredAnyBaseTags) ? mod.requiredAnyBaseTags.map(String) : [],
        allowedBaseIds: Array.isArray(mod.allowedBaseIds) ? mod.allowedBaseIds.map(String) : [],
        rolls: mod.rolls.map(function (roll) {
          return {
            min: Number(roll.min),
            max: Number(roll.max),
            scale: Number(roll.scale) || 1,
          };
        }),
        desecrated: false,
        sourcePage: mod.sourcePage || "",
        sourceUrl: mod.sourceUrl || "",
      };
    }).filter(function (mod) {
      return mod && mod.weight > 0 && mod.rolls.every(function (roll) {
        return Number.isFinite(roll.min) && Number.isFinite(roll.max);
      });
    });

    return imported.length > 0 ? imported : fallback;
  }

  function hasModifierData() {
    const data = typeof globalThis !== "undefined" ? globalThis.POE2DB_MOD_DATA : null;
    return !!(data && Array.isArray(data.modifiers) && data.modifiers.length > 0);
  }

  function hasCraftingData() {
    const data = typeof globalThis !== "undefined" ? globalThis.POE2DB_CRAFTING_DATA : null;
    return !!(data && Array.isArray(data.desecratedMods) && data.desecratedMods.length > 0);
  }

  function hasSoulCoreData() {
    const data = typeof globalThis !== "undefined" ? globalThis.POE2DB_CRAFTING_DATA : null;
    return !!(data && Array.isArray(data.soulCores) && data.soulCores.length > 0);
  }

  function loadDesecratedData(fallback) {
    const imported = IMPORTED_CRAFTING_DATA.desecratedMods.map(function (mod) {
      return normalizeImportedMod(mod, mod && mod.name, true);
    }).filter(function (mod) {
      return mod && mod.desecrated;
    });

    return imported.length > 0 ? imported : fallback;
  }

  function currencyTierData() {
    const data = typeof globalThis !== "undefined" ? globalThis.POE2DB_MOD_DATA : null;
    return data && data.currencyTiers ? data.currencyTiers : null;
  }

  function loadCraftingData() {
    const data = typeof globalThis !== "undefined" ? globalThis.POE2DB_CRAFTING_DATA : null;
    if (!data || typeof data !== "object") return { essences: [], alloys: [], liquidEmotions: [], catalysts: [], desecratedMods: [], soulCores: [] };
    return {
      essences: Array.isArray(data.essences) ? data.essences : [],
      alloys: Array.isArray(data.alloys) ? data.alloys : [],
      liquidEmotions: Array.isArray(data.liquidEmotions) ? data.liquidEmotions : [],
      catalysts: Array.isArray(data.catalysts) ? data.catalysts : [],
      desecratedMods: Array.isArray(data.desecratedMods) ? data.desecratedMods : [],
      soulCores: Array.isArray(data.soulCores) ? data.soulCores : [],
    };
  }

  function importedEssenceById(importedId) {
    return IMPORTED_CRAFTING_DATA.essences.find(function (entry) { return entry.id === importedId || entry.slug === importedId; });
  }

  function importedAlloyById(importedId) {
    return IMPORTED_CRAFTING_DATA.alloys.find(function (entry) { return entry.id === importedId || entry.slug === importedId; });
  }

  function importedLiquidEmotionById(importedId) {
    return IMPORTED_CRAFTING_DATA.liquidEmotions.find(function (entry) { return entry.id === importedId || entry.slug === importedId; });
  }

  function importedCatalystById(importedId) {
    return IMPORTED_CRAFTING_DATA.catalysts.find(function (entry) { return entry.id === importedId || entry.slug === importedId; });
  }

  function importedSoulCoreById(importedId) {
    return IMPORTED_CRAFTING_DATA.soulCores.find(function (entry) {
      return entry.id === importedId || entry.slug === importedId || entry.category === importedId;
    });
  }

  function normalizeImportedMod(mod, fallbackName, fallbackDesecrated) {
    if (!mod || !mod.id || !mod.type || !mod.group || !mod.template) return null;
    if (mod.type !== "prefix" && mod.type !== "suffix") return null;
    if (!Array.isArray(mod.classes) || mod.classes.length === 0) return null;
    return {
      id: String(mod.id),
      baseId: String(mod.baseId || mod.id),
      type: mod.type,
      classes: mod.classes.map(String),
      group: String(mod.group),
      name: String(mod.name || fallbackName || mod.group),
      template: String(mod.template),
      level: Number(mod.level) || 1,
      weight: Math.max(1, Number(mod.weight) || 1),
      tier: String(mod.tier || "G"),
      tags: Array.isArray(mod.tags) ? mod.tags.map(String) : [],
      requiredBaseTags: Array.isArray(mod.requiredBaseTags) ? mod.requiredBaseTags.map(String) : [],
      requiredAnyBaseTags: Array.isArray(mod.requiredAnyBaseTags) ? mod.requiredAnyBaseTags.map(String) : [],
      allowedBaseIds: Array.isArray(mod.allowedBaseIds) ? mod.allowedBaseIds.map(String) : [],
      rolls: Array.isArray(mod.rolls) ? mod.rolls.map(function (roll) {
        return {
          min: Number(roll.min),
          max: Number(roll.max),
          scale: Number(roll.scale) || 1,
        };
      }).filter(function (roll) {
        return Number.isFinite(roll.min) && Number.isFinite(roll.max);
      }) : [],
      desecrated: !!(fallbackDesecrated || mod.desecrated),
      sourcePage: mod.sourcePage || "",
      sourceUrl: mod.sourceUrl || "",
      sourceSection: mod.sourceSection || "",
      sourceText: mod.sourceText || "",
      soulCoreCategory: mod.soulCoreCategory || "",
      ownerSlug: mod.ownerSlug || "",
    };
  }

  function disableUnsupportedCurrencyTiers() {
    CURRENCIES.forEach(function (action) {
      if (!action.supportsTiers) return;
      action.supportsTiers = TIERED_CURRENCY_ACTIONS.has(action.id);
    });
  }

  function applyImportedCraftingActions(actions) {
    if (IMPORTED_CRAFTING_DATA.essences.length > 0) {
      for (let index = actions.length - 1; index >= 0; index -= 1) {
        if (actions[index].category === "essence") actions.splice(index, 1);
      }
      IMPORTED_CRAFTING_DATA.essences.forEach(function (entry) {
        actions.push({
          id: entry.id,
          label: entry.name,
          sourceRule: entry.effect,
          supportsTiers: false,
          category: "essence",
          essence: {
            importedId: entry.id,
            tag: entry.id,
            sourceTier: entry.tier,
            tier: importedEssenceRuntimeTier(entry),
            operation: entry.operation,
          },
        });
      });
    }

    if (IMPORTED_CRAFTING_DATA.alloys.length > 0) {
      IMPORTED_CRAFTING_DATA.alloys.forEach(function (entry) {
        actions.push({
          id: entry.id,
          label: entry.name,
          sourceRule: entry.effect,
          supportsTiers: false,
          category: "alloy",
          alloy: {
            importedId: entry.id,
            operation: entry.operation || "rare_replace",
          },
        });
      });
    }

    if (IMPORTED_CRAFTING_DATA.liquidEmotions.length > 0) {
      IMPORTED_CRAFTING_DATA.liquidEmotions.forEach(function (entry) {
        actions.push({
          id: entry.id,
          label: entry.name,
          sourceRule: entry.effect,
          supportsTiers: false,
          category: "liquid_emotion",
          liquidEmotion: {
            importedId: entry.id,
            operation: entry.operation || "rare_replace",
          },
        });
      });
    }

    if (IMPORTED_CRAFTING_DATA.catalysts.length > 0) {
      IMPORTED_CRAFTING_DATA.catalysts.forEach(function (entry) {
        actions.push({
          id: entry.id,
          label: entry.name,
          sourceRule: entry.effect,
          supportsTiers: false,
          category: "catalyst",
          catalyst: {
            importedId: entry.id,
            tags: entry.tags || [],
            classes: entry.classes || [],
          },
        });
      });
    }

    if (IMPORTED_CRAFTING_DATA.soulCores.length > 0) {
      IMPORTED_CRAFTING_DATA.soulCores.forEach(function (entry) {
        actions.push({
          id: entry.id,
          label: entry.name,
          sourceRule: "放入符文插槽：" + entry.actionLabel,
          supportsTiers: false,
          category: "rune",
          rune: {
            id: entry.id,
            label: entry.name,
            effectText: entry.actionLabel,
            effect: {
              soulCoreId: entry.id,
              soulCoreCategory: entry.category,
              operation: entry.operation,
              socketClasses: entry.socketClasses || [],
            },
          },
        });
        actions.push({
          id: entry.id + "_modifier",
          label: entry.actionLabel,
          sourceRule: "需要已镶嵌 " + entry.name + "，按 PoE2DB 权重" + (entry.operation === "select" ? "选取" : "重置") + "对应词缀",
          supportsTiers: false,
          category: "soul_core",
          soulCore: {
            importedId: entry.id,
            category: entry.category,
            operation: entry.operation || "reroll",
          },
        });
      });
    }
  
    actions.push(
      currency("hinekoras_lock", "辛格拉的发辫", "允许物品预示对其使用的下一个通货物品的结果", false),
      omen("omen_desecration_kurgal", "黑血预兆", "下一次亵渎必定赋予随机柯戈词缀，限武器和饰品", "desecration", { forceDesecratedTag: "kurgal", allowedBaseTags: ["weapon", "jewellery"] }),
      omen("omen_desecration_amanamu", "领主预兆", "下一次亵渎必定赋予随机阿曼娜姆词缀，限武器和饰品", "desecration", { forceDesecratedTag: "amanamu", allowedBaseTags: ["weapon", "jewellery"] }),
      omen("omen_desecration_ulaman", "至高预兆", "下一次亵渎必定赋予随机乌拉曼词缀，限武器和饰品", "desecration", { forceDesecratedTag: "ulaman", allowedBaseTags: ["weapon", "jewellery"] }),
      omen("omen_catalysing_exaltation", "催化崇高预兆", "你的下一个崇高石将消耗所有催化剂品质", "exalted", { consumeCatalystQuality: true }),
      desecration("altered_lockbone", "变形锁骨", "亵渎稀有饰品，并尝试获得异界词缀", JEWELLERY_CLASSES, { breach: true })
    );
  }

  function importedEssenceRuntimeTier(entry) {
    if (!entry) return "greater";
    if (entry.operation === "normal_to_magic") return "normal";
    if (entry.operation === "rare_replace") return "perfect";
    return "greater";
  }

  function hashSeed(input) {
    const text = String(input || "poe2");
    let hash = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0 || 1;
  }

  function nextFloat(item) {
    item.rngState = (Math.imul(item.rngState, 1664525) + 1013904223) >>> 0;
    return item.rngState / 4294967296;
  }

  function randomInt(item, min, max) {
    if (min === max) return min;
    return Math.floor(nextFloat(item) * (max - min + 1)) + min;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function getBase(baseId) {
    return BASES.find(function (base) { return base.id === baseId; });
  }

  function getAction(actionId) {
    return CURRENCIES.find(function (entry) { return entry.id === actionId; });
  }

  function baseHasTag(itemOrBase, tag) {
    const base = itemOrBase.tags ? itemOrBase : getBase(itemOrBase.baseId);
    return (base.tags || []).includes(tag);
  }

  function modMatchesBaseTags(mod, base) {
    const required = mod.requiredBaseTags || [];
    const requiredAny = mod.requiredAnyBaseTags || [];
    const allowedBaseIds = mod.allowedBaseIds || [];
    if (allowedBaseIds.length > 0 && !allowedBaseIds.includes(base.id)) return false;
    if (requiredAny.length > 0 && !requiredAny.some(function (tag) { return (base.tags || []).includes(tag); })) return false;
    if (required.length === 0) return true;
    if (mod.soulCoreCategory && required.some(function (tag) { return DEFENCE_BASE_TAGS.includes(tag); })) {
      const baseTags = (base.tags || []).filter(function (tag) { return DEFENCE_BASE_TAGS.includes(tag); }).sort();
      const requiredTags = required.slice().sort();
      return baseTags.length === requiredTags.length && requiredTags.every(function (tag, index) {
        return tag === baseTags[index];
      });
    }
    const tags = base.tags || [];
    if (
      required.every(function (tag) { return DEFENCE_BASE_TAGS.includes(tag); }) &&
      tags.some(function (tag) { return tag === "armour" || tag === "offhand"; }) &&
      !tags.some(function (tag) { return DEFENCE_BASE_TAGS.includes(tag); })
    ) {
      return true;
    }
    if (
      base.classId === "shield" &&
      required.every(function (tag) { return DEFENCE_BASE_TAGS.includes(tag); }) &&
      required.some(function (tag) { return tags.includes(tag); })
    ) {
      return true;
    }
    return required.every(function (tag) { return tags.includes(tag); });
  }

  function baseHasAnyTag(base, tags) {
    return tags.some(function (tag) { return baseHasTag(base, tag); });
  }

  function desecratedBaseDefinition(mod) {
    const copy = clone(mod);
    copy.id = "desecrated_base_" + mod.id;
    copy.baseId = "desecrated_base_" + (mod.baseId || mod.id);
    copy.desecrated = true;
    copy.sourceKind = "base";
    copy.sourceText = mod.sourceText || "";
    return copy;
  }

  function textHasAny(text, patterns) {
    return patterns.some(function (pattern) { return pattern.test(text); });
  }

  function explicitDesecratedTextClasses(text) {
    const classes = new Set();
    if (/箭袋/u.test(text)) classes.add("quiver");
    if (/盾牌|格挡|举起\s*盾牌/u.test(text)) {
      classes.add("shield");
      classes.add("buckler");
    }
    if (/双手\s*近战\s*武器\s*或\s*战弩/u.test(text)) TWO_HAND_MELEE_CLASSES.concat(["crossbow"]).forEach(function (classId) { classes.add(classId); });
    else if (/战弩|装填|榴弹/u.test(text)) classes.add("crossbow");
    if (/弓类/u.test(text)) classes.add("bow");
    if (/锤类|猛击/u.test(text)) MACE_CLASSES.forEach(function (classId) { classes.add(classId); });
    if (/长杖/u.test(text)) classes.add("staff");
    if (/法杖/u.test(text)) classes.add("wand");
    if (/法器/u.test(text)) classes.add("focus");
    if (/权杖/u.test(text)) classes.add("sceptre");
    return classes.size ? Array.from(classes) : null;
  }

  function explicitDesecratedBaseTags(text) {
    const tags = new Set();
    if (textHasAny(text, [/该装备的闪避值/u])) tags.add("def_evasion");
    if (textHasAny(text, [/该装备的护甲/u, /全局\s*护甲/u, /护甲\s*，\s*闪避\s*与\s*能量护盾/u, /护甲\s*同样作用/u, /获得\s*魔力上限.*护甲/u])) tags.add("def_armour");
    if (textHasAny(text, [/能量护盾上限/u, /能量护盾充能率/u, /能量护盾\s*提高/u])) tags.add("def_energy_shield");
    return tags.size ? Array.from(tags) : null;
  }

  function desecratedExclusiveMatchesBase(mod, base) {
    if (!mod.desecrated || mod.sourcePage !== "Desecrated_Modifiers") return true;

    const text = [mod.sourceText || "", mod.template || ""].join(" ");
    const explicitClasses = explicitDesecratedTextClasses(text);
    if (explicitClasses && !explicitClasses.includes(base.classId)) return false;

    const explicitTags = explicitDesecratedBaseTags(text);
    if (explicitTags && !baseHasAnyTag(base, explicitTags)) return false;

    return true;
  }

  function canHaveQuality(item, qualityKind) {
    if (qualityKind === "armour") return baseHasTag(item, "armour") || baseHasTag(item, "offhand");
    if (qualityKind === "weapon") return baseHasTag(item, "attack_weapon") || (baseHasTag(item, "weapon") && !baseHasTag(item, "caster_weapon"));
    if (qualityKind === "caster") return baseHasTag(item, "caster_weapon") || baseHasTag(item, "caster_offhand");
    return false;
  }

  function qualityMultiplier(item) {
    return 1 + (Math.max(0, Number(item.quality) || 0) / 100);
  }

  function baseStatLines(item) {
    const base = getBase(item.baseId);
    return (base.defenses || []).map(function (line) {
      return qualityAdjustedBaseStat(item, line);
    });
  }

  function qualityAdjustedBaseStat(item, line) {
    const text = String(line || "");
    if (!item || !item.quality) return { text, original: text, qualityAdjusted: false };
    const base = item && item.baseId ? getBase(item.baseId) : null;
    if (!qualityAffectsBaseStat(item, text) && !qualityAffectsBaseStatFromBase(base, text)) return { text, original: text, qualityAdjusted: false };

    const scaled = scaleNumbersInText(text, qualityMultiplier(item), qualityStatKind(item, text));
    return {
      text: scaled,
      original: text,
      qualityAdjusted: true,
      valueChanged: scaled !== text,
    };
  }

  function qualityAffectsBaseStat(item, line) {
    const qualityLine = String(line || "");
    if (canHaveQuality(item, "armour") && /\u62a4\u7532|Armou?r|\u95ea\u907f|Evasion|\u80fd\u91cf\u62a4\u76fe|Energy Shield|\u7b26\u6587\u7ed3\u754c|Rune Ward/i.test(qualityLine)) return true;
    if (canHaveQuality(item, "weapon") && /\u7269\u7406\s*\u4f24\u5bb3|Physical\s*Damage/i.test(qualityLine)) return true;
    if (canHaveQuality(item, "armour")) {
      return /护甲|Armou?r|闪避|Evasion|能量护盾|Energy Shield|符文结界|Rune Ward/i.test(line);
    }
    if (canHaveQuality(item, "weapon")) {
      return /物理\s*伤害|Physical\s*Damage/i.test(line);
    }
    return false;
  }

  function qualityAffectsBaseStatFromBase(base, line) {
    const tags = (base && base.tags) || [];
    const qualityLine = String(line || "");
    const armourLike = tags.includes("armour") || tags.includes("offhand");
    const weaponLike = tags.includes("attack_weapon") || (tags.includes("weapon") && !tags.includes("caster_weapon"));
    if (armourLike && /\u62a4\u7532|Armou?r|\u95ea\u907f|Evasion|\u80fd\u91cf\u62a4\u76fe|Energy Shield|\u7b26\u6587\u7ed3\u754c|Rune Ward/i.test(qualityLine)) return true;
    if (weaponLike && /\u7269\u7406\s*\u4f24\u5bb3|Physical\s*Damage/i.test(qualityLine)) return true;
    return false;
  }

  function qualityStatKind(item, line) {
    if (/\u7269\u7406\s*\u4f24\u5bb3|Physical\s*Damage/i.test(String(line || ""))) return "damage";
    if (/物理\s*伤害|Physical\s*Damage/i.test(line)) return "damage";
    return "defence";
  }

  function scaleNumbersInText(text, multiplier, kind) {
    return text.replace(/-?\d+(?:\.\d+)?/g, function (raw) {
      const value = Number(raw);
      if (!Number.isFinite(value)) return raw;
      return formatScaledStat(value * multiplier, kind, raw);
    });
  }

  function formatScaledStat(value, kind, raw) {
    if (kind === "defence") return String(Math.floor(value));
    const decimals = raw.indexOf(".") >= 0 || Math.abs(value - Math.round(value)) > 0.001 ? 1 : 0;
    return value.toFixed(decimals).replace(/\.0$/, "");
  }

  function maxSockets(item) {
    const base = getBase(item.baseId);
    if (typeof base.maxSockets === "number") return base.maxSockets;
    if (baseHasTag(base, "armour")) return 1;
    if (baseHasTag(base, "weapon")) return 2;
    return 0;
  }

  function canAddSocket(item) {
    return maxSockets(item) > 0 && item.sockets.length < maxSockets(item);
  }

  function canAddCorruptedSocket(item) {
    return maxSockets(item) > 0 && item.sockets.length < maxSockets(item) + 1;
  }

  function isMutable(item) {
    return !item.destroyed && !item.mirrored && !item.corrupted;
  }

  function capFor(item, type) {
    const rarity = RARITIES[item.rarity] || RARITIES.normal;
    const base = item && item.baseId ? getBase(item.baseId) : null;
    const adjust = base && base.affixAdjust ? Number(base.affixAdjust[type]) || 0 : 0;
    const socketAdjust = socketAffixAdjust(item, type);
    const modAdjust = modAffixAdjust(item, type);
    const jewelTransferAdjust = base && base.classId === "jewel" ? jewelSourceAffixAdjust(item, type) : 0;
    const cap = base && base.classId === "jewel" ? jewelBaseCap(item.rarity, type, rarity) : (type === "prefix" ? rarity.maxPrefixes : rarity.maxSuffixes);
    return Math.max(0, cap + adjust + socketAdjust + modAdjust + jewelTransferAdjust);
  }

  function jewelBaseCap(rarityId, type, fallbackRarity) {
    if (rarityId === "magic") return 1;
    if (rarityId === "rare") return 2;
    return type === "prefix" ? fallbackRarity.maxPrefixes : fallbackRarity.maxSuffixes;
  }

  function socketAffixAdjust(item, type) {
    if (!item || !Array.isArray(item.sockets)) return 0;
    return item.sockets.reduce(function (total, socket) {
      const adjust = socket && socket.rune && socket.rune.effect && socket.rune.effect.affixAdjust;
      return total + (adjust ? Number(adjust[type]) || 0 : 0);
    }, 0);
  }

  function modAffixAdjust(item, type) {
    if (!item) return 0;
    return allMods(item).reduce(function (total, mod) {
      return total + affixAdjustFromText(mod, type);
    }, 0);
  }

  function jewelSourceAffixAdjust(item, type) {
    if (!item) return 0;
    const oppositeType = type === "prefix" ? "suffix" : "prefix";
    return allMods(item).reduce(function (total, mod) {
      if (mod.type !== type) return total;
      const oppositeGain = Math.max(0, affixAdjustFromText(mod, oppositeType));
      return total - oppositeGain;
    }, 0);
  }

  function affixAdjustFromText(mod, type) {
    const target = type === "prefix" ? "鍓嶇紑|前缀|前綴|Prefix" : "鍚庣紑|后缀|後綴|Suffix";
    const regex = new RegExp("(?:鍏佽鐨?|允许的|允許的|Allowed)\\s*(?:" + target + ")\\s*([+-]?)\\s*(#|[+-]?\\d+)", "gi");
    const text = mod && mod.sourceText ? String(mod.sourceText) : String((mod && mod.template) || "");
    const values = mod && Array.isArray(mod.values) ? mod.values : [];
    const modernTarget = type === "prefix" ? "前缀|前綴|Prefix" : "后缀|後綴|Suffix";
    const modernRegex = new RegExp("(?:允许的|允許的|Allowed)\\s*(?:" + modernTarget + ")\\s*([+-]?)\\s*(#|[+-]?\\d+)", "gi");
    let modernIndex = 0;
    let modernTotal = 0;
    let modernMatch = modernRegex.exec(text);
    while (modernMatch) {
      const token = modernMatch[2];
      const sign = modernMatch[1] === "-" || String(token).startsWith("-") ? -1 : 1;
      let value = 0;
      if (token === "#") {
        value = Number(values[modernIndex]) || 0;
        modernIndex += 1;
      } else {
        value = Math.abs(Number(token) || 0);
      }
      modernTotal += sign * value;
      modernMatch = modernRegex.exec(text);
    }
    if (modernTotal !== 0) return modernTotal;
    if (/(允许的|允許的|Allowed)/i.test(text)) return 0;
    let index = 0;
    let total = 0;
    let match = regex.exec(text);
    while (match) {
      const token = match[2];
      const sign = match[1] === "-" || String(token).startsWith("-") ? -1 : 1;
      let value = 0;
      if (token === "#") {
        value = Number(values[index]) || 0;
        index += 1;
      } else {
        value = Math.abs(Number(token) || 0);
      }
      total += sign * value;
      match = regex.exec(text);
    }
    return total;
  }

  function explicitMods(item) {
    return item.prefixes.concat(item.suffixes);
  }

  function allMods(item) {
    return explicitMods(item).concat(item.desecratedMods || []);
  }

  function qualityCapBonusFromMod(mod) {
    if (!mod) return 0;
    const text = [mod.template, mod.sourceText, mod.name, mod.group].join(" ");
    if (!/品质\s*上限|Quality\s*(?:Limit|Maximum|Cap)/i.test(text)) return 0;
    const values = [];
    (mod.values || []).forEach(function (value) {
      const numeric = Number(value);
      if (Number.isFinite(numeric)) values.push(numeric);
    });
    (mod.rolls || []).forEach(function (roll) {
      const numeric = Number(roll.max);
      if (Number.isFinite(numeric)) values.push(numeric);
    });
    return Math.max(0, values.length ? Math.max.apply(null, values) : 0);
  }

  function qualityCapFor(item) {
    return 20 + allMods(item).reduce(function (sum, mod) {
      return sum + qualityCapBonusFromMod(mod);
    }, 0);
  }

  function countExplicit(item) {
    return item.prefixes.length + item.suffixes.length;
  }

  function countByType(item, type) {
    const explicitCount = type === "prefix" ? item.prefixes.length : item.suffixes.length;
    const desecratedCount = (item.desecratedMods || []).filter(function (mod) { return mod.type === type; }).length;
    return explicitCount + desecratedCount;
  }

  function totalCapFor(item) {
    const base = item && item.baseId ? getBase(item.baseId) : null;
    if (base && base.classId === "jewel") {
      if (item.rarity === "magic") return 2;
      if (item.rarity === "rare") return 4;
      return 0;
    }
    return Infinity;
  }

  function hasOpenSlot(item, type) {
    return countByType(item, type) < capFor(item, type) && allMods(item).length < totalCapFor(item);
  }

  function overBaseJewelAffixTypes(item) {
    const base = item && item.baseId ? getBase(item.baseId) : null;
    const rarity = RARITIES[item.rarity] || RARITIES.normal;
    const overTypes = new Set();
    if (!base || base.classId !== "jewel") return overTypes;
    ["prefix", "suffix"].forEach(function (type) {
      if (countByType(item, type) > jewelBaseCap(item.rarity, type, rarity)) overTypes.add(type);
    });
    return overTypes;
  }

  function itemWithinAffixCaps(item) {
    return countByType(item, "prefix") <= capFor(item, "prefix") &&
      countByType(item, "suffix") <= capFor(item, "suffix") &&
      allMods(item).length <= totalCapFor(item);
  }

  function canAddDefinition(item, mod) {
    if (!hasOpenSlot(item, mod.type)) return false;
    const draft = clone(item);
    const simulated = clone(mod);
    if (simulated.desecrated) draft.desecratedMods.push(simulated);
    else if (simulated.type === "prefix") draft.prefixes.push(simulated);
    else draft.suffixes.push(simulated);
    return itemWithinAffixCaps(draft);
  }

  function formatRoll(template, values) {
    let index = 0;
    return template.replace(/#/g, function () {
      const value = values[index];
      index += 1;
      return String(value);
    }).trim();
  }

  function rollValues(item, rolls) {
    return rolls.map(function (roll) {
      const scale = roll.scale || 1;
      if (scale === 1) return randomInt(item, roll.min, roll.max);
      const value = randomInt(item, Math.round(roll.min * scale), Math.round(roll.max * scale)) / scale;
      return Number(value.toFixed(String(scale).length - 1));
    });
  }

  function rollImplicit(item, implicitEntry) {
    if (Array.isArray(implicitEntry.rolls)) {
      return {
        template: implicitEntry.template,
        values: rollValues(item, implicitEntry.rolls),
        tags: implicitEntry.tags || [],
      };
    }

    if (!Number.isFinite(Number(implicitEntry.min)) || !Number.isFinite(Number(implicitEntry.max))) {
      return {
        template: implicitEntry.template,
        values: [],
        tags: implicitEntry.tags || [],
      };
    }

    return {
      template: implicitEntry.template,
      values: [randomInt(item, implicitEntry.min, implicitEntry.max)],
      tags: implicitEntry.tags || [],
    };
  }

  function rollModifier(item, mod) {
    return {
      id: mod.id,
      baseId: mod.baseId,
      type: mod.type,
      group: mod.group,
      name: mod.name,
      tier: mod.tier,
      level: mod.level,
      weight: mod.weight,
      tags: mod.tags,
      template: mod.template,
      rolls: clone(mod.rolls),
      values: rollValues(item, mod.rolls),
      desecrated: !!mod.desecrated,
        revealed: !mod.desecrated || mod.revealed !== false,
        fractured: false,
        sourceText: mod.sourceText || "",
        soulCoreCategory: mod.soulCoreCategory || "",
        ownerSlug: mod.ownerSlug || "",
      };
    }

  function renderImplicit(implicitEntry) {
    return formatRoll(implicitEntry.template, implicitEntry.values);
  }

  function renderMod(mod, item) {
    if (isUnrevealedDesecrated(mod)) return "未揭露的亵渎词缀";
    return formatRoll(mod.template, item ? catalystAdjustedValues(item, mod) : mod.values);
  }

  function renderRange(mod) {
    if (isUnrevealedDesecrated(mod)) return "未揭露的亵渎词缀";
    const values = [];
    mod.rolls.forEach(function (roll) {
      values.push(roll.min === roll.max ? String(roll.min) : roll.min + "-" + roll.max);
    });
    return formatRoll(mod.template, values);
  }

  function catalystAdjustedValues(item, mod) {
    if (!item || !item.catalyst || !item.catalyst.quality || !catalystMatchesMod(item, mod)) return mod.values;
    const multiplier = 1 + item.catalyst.quality / 100;
    return (mod.values || []).map(function (value) {
      if (!Number.isFinite(Number(value))) return value;
      return formatCatalystValue(Number(value) * multiplier, value);
    });
  }

  function formatCatalystValue(value, rawValue) {
    const decimals = String(rawValue).includes(".") || Math.abs(value - Math.round(value)) > 0.001 ? 1 : 0;
    return Number(value.toFixed(decimals));
  }

  function catalystMatchesMod(item, mod) {
    if (!item || !item.catalyst || !mod) return false;
    const catalystTags = item.catalyst.tags || [];
    if (catalystTags.length === 0) return false;
    const modTags = mod.tags || [];
    return catalystTags.some(function (tag) { return modTags.includes(tag); });
  }

  function catalysingExaltMultiplier(item, mod, omenEntry) {
    if (!omenEntry || !omenEntry.effect || !omenEntry.effect.consumeCatalystQuality) return 1;
    if (!item || !item.catalyst || !item.catalyst.quality) return 1;
    if (!catalystMatchesMod(item, mod)) return 1;
    return 1 + Math.max(0, Number(item.catalyst.quality) || 0);
  }

  function applyEffectiveRollWeights(item, mods, options) {
    const omenEntry = options && options.omenEntry ? options.omenEntry : null;
    if (!omenEntry || !omenEntry.effect || !omenEntry.effect.consumeCatalystQuality) return mods;
    return mods.map(function (mod) {
      const multiplier = catalysingExaltMultiplier(item, mod, omenEntry);
      if (multiplier === 1) return mod;
      const effectiveWeight = Math.max(1, Number(mod.weight) || 1) * multiplier;
      return Object.assign({}, mod, {
        baseWeight: mod.weight,
        effectiveWeight,
        weightMultiplier: multiplier,
        catalystBoosted: true,
      });
    });
  }

  function isUnrevealedDesecrated(mod) {
    return !!(mod && mod.desecrated && mod.revealed === false);
  }

  function modKey(mod) {
    return [
      mod.desecrated ? "desecrated" : "explicit",
      mod.id,
      mod.group,
      mod.template,
      mod.type,
    ].join("|");
  }

  function makeItem(baseId, itemLevel, seed) {
    const base = getBase(baseId);
    if (!base) throw new Error("Unknown base: " + baseId);

    const item = {
      baseId: base.id,
      itemLevel: Number(itemLevel) || base.requiredLevel || 1,
      rarity: "normal",
      prefixes: [],
      suffixes: [],
      desecratedMods: [],
      implicits: [],
      corrupted: false,
      mirrored: false,
      destroyed: false,
      quality: 0,
      sockets: [],
      pendingOmen: null,
      pendingDesecrationChoice: null,
      hinekoraLock: false,
      hinekoraPreview: null,
      catalyst: null,
      rngState: hashSeed(seed || Date.now()),
      history: [],
    };

    item.implicits = base.implicits.map(function (implicitEntry) {
      return rollImplicit(item, implicitEntry);
    });

    return item;
  }

  function makeCustomItem(baseId, itemLevel, seed, options) {
    const item = makeItem(baseId, itemLevel, seed);
    const rarity = options && RARITIES[options.rarity] ? options.rarity : "normal";
    const explicitModIds = options && Array.isArray(options.explicitModIds)
      ? options.explicitModIds.filter(Boolean)
      : [];

    item.rarity = rarity;
    if (rarity === "normal" && explicitModIds.length > 0) {
      return { ok: false, item, reason: "普通物品不能带有显式词缀。" };
    }

    const added = [];
    for (const modId of explicitModIds) {
      const definition = MODIFIERS.find(function (mod) { return mod.id === modId; });
      if (!definition) {
        return { ok: false, item, reason: "找不到词缀定义：" + modId };
      }
      const available = eligibleMods(item, { type: definition.type }).some(function (mod) {
        return mod.id === definition.id;
      });
      if (!available) {
        return {
          ok: false,
          item,
          reason: "词缀不可用于当前底材、物等、稀有度或槽位：" + renderRange(definition),
        };
      }

      const rolled = rollModifier(item, definition);
      if (rolled.type === "prefix") item.prefixes.push(rolled);
      else item.suffixes.push(rolled);
      added.push(rolled);
    }

    if (rarity !== "normal" || added.length > 0) {
      item.history.push({
        actionId: "custom_item",
        currencyName: "自定义开局",
        tier: "custom",
        beforeRarity: "normal",
        afterRarity: item.rarity,
        added: clone(added),
        removed: [],
        revealed: [],
        rerolled: 0,
        note: "按当前底材、物等和已选词缀生成",
        omenSet: null,
        omenConsumed: null,
      });
    }

    return { ok: true, item, added };
  }

  function tierMinLevel(actionId, tierId) {
    const imported = currencyTierData();
    const importedLevel = imported && imported[tierId] && imported[tierId].minLevelByAction
      ? imported[tierId].minLevelByAction[actionId]
      : null;
    if (Number.isFinite(Number(importedLevel))) return Number(importedLevel);
    const fallbackLevel = FALLBACK_CURRENCY_TIER_MIN_LEVELS[tierId] && FALLBACK_CURRENCY_TIER_MIN_LEVELS[tierId][actionId];
    if (Number.isFinite(Number(fallbackLevel))) return Number(fallbackLevel);
    const tier = CURRENCY_TIERS[tierId] || CURRENCY_TIERS.normal;
    return tier.minLevelByAction[actionId] || 0;
  }

  function activeOmen(item, actionId) {
    if (!item.pendingOmen || item.pendingOmen.target !== actionId) return null;
    return item.pendingOmen;
  }

  function omenParts(omenEntry) {
    if (!omenEntry) return [];
    if (Array.isArray(omenEntry.components) && omenEntry.components.length > 0) return omenEntry.components.map(clone);
    return [clone(omenEntry)];
  }

  function mergeOmens(existing, next) {
    if (!existing) return clone(next);
    const components = omenParts(existing).concat(omenParts(next));
    const seen = new Set();
    const uniqueComponents = [];
    components.forEach(function (component) {
      if (!component || seen.has(component.id)) return;
      seen.add(component.id);
      uniqueComponents.push(component);
    });
    return {
      id: uniqueComponents.map(function (component) { return component.id; }).join("+"),
      label: uniqueComponents.map(function (component) { return component.label; }).join(" + "),
      target: next.target,
      effect: Object.assign.apply(null, [{}].concat(uniqueComponents.map(function (component) { return component.effect || {}; }))),
      components: uniqueComponents,
    };
  }

  function occupiedGroups(item) {
    return new Set(allMods(item).map(function (mod) { return mod.group; }));
  }

  function socketedSoulCore(item, soulCoreId) {
    if (!item || !Array.isArray(item.sockets)) return null;
    for (const socket of item.sockets) {
      const rune = socket && socket.rune;
      const effect = rune && rune.effect;
      if (effect && effect.soulCoreId === soulCoreId) return rune;
    }
    return null;
  }

  function soulCoreDefinition(action) {
    const importedId = action && action.soulCore ? action.soulCore.importedId : action;
    return importedId ? importedSoulCoreById(importedId) : null;
  }

  function eligibleSoulCoreMods(item, action, options) {
    const definition = soulCoreDefinition(action);
    if (!definition || !Array.isArray(definition.mods)) return [];
    const base = getBase(item.baseId);
    const forceType = options && options.type ? options.type : null;
    const ignoreItemState = !!(options && options.ignoreItemState);
    const groups = occupiedGroups(item);

    return definition.mods.map(function (mod) {
      return normalizeImportedMod(mod, definition.name, false);
    }).filter(function (mod) {
      if (!mod) return false;
      mod.soulCoreCategory = definition.category;
      mod.ownerSlug = definition.slug;
      if (forceType && mod.type !== forceType) return false;
      if (!mod.classes.includes(base.classId)) return false;
      if (!modMatchesBaseTags(mod, base)) return false;
      if (item.itemLevel < mod.level) return false;
      if (!ignoreItemState && groups.has(mod.group)) return false;
      if (!ignoreItemState && !canAddDefinition(item, mod)) return false;
      return true;
    });
  }

  function soulCoreExistingMods(item, action) {
    const definition = soulCoreDefinition(action);
    if (!definition) return [];
    return allMods(item).filter(function (mod) {
      return mod.soulCoreCategory === definition.category || String(mod.group || "").indexOf("soul_core_" + definition.category + "_") === 0;
    });
  }

  function addSoulCoreMod(item, action) {
    const mods = eligibleSoulCoreMods(item, action, {});
    if (mods.length === 0) {
      return { ok: false, reason: "当前底材没有可用的 Soul Core 词缀池。" };
    }

    const mod = rollModifier(item, pickWeighted(item, mods));
    mod.soulCoreCategory = action.soulCore.category;
    mod.ownerSlug = soulCoreDefinition(action).slug;
    if (mod.type === "prefix") item.prefixes.push(mod);
    else item.suffixes.push(mod);
    return { ok: true, mod };
  }

  function soulCoreRemovalCandidates(item, action) {
    return soulCoreExistingMods(item, action).filter(function (candidate) {
      if (candidate.fractured) return false;
      const draft = clone(item);
      removeSpecificMod(draft, candidate);
      return eligibleSoulCoreMods(draft, action, {}).length > 0;
    });
  }

  function eligibleMods(item, options) {
    const base = getBase(item.baseId);
    const minLevel = options && options.minLevel ? options.minLevel : 0;
    const forceType = options && options.type ? options.type : null;
    const ignoreItemState = !!(options && options.ignoreItemState);
    const groups = occupiedGroups(item);

    return MODIFIERS.filter(function (mod) {
      if (forceType && mod.type !== forceType) return false;
      if (!mod.classes.includes(base.classId)) return false;
      if (!modMatchesBaseTags(mod, base)) return false;
      if (item.itemLevel < mod.level) return false;
      if (mod.level < minLevel) return false;
      if (!ignoreItemState && groups.has(mod.group)) return false;
      if (!ignoreItemState && !canAddDefinition(item, mod)) return false;
      return true;
    });
  }

  function eligibleDesecratedMods(item, action, options) {
    const base = getBase(item.baseId);
    const omenEntry = activeOmen(item, "desecration");
    const forceType = omenEntry && omenEntry.effect.addType ? omenEntry.effect.addType : null;
    const forceTag = omenEntry && omenEntry.effect.forceDesecratedTag ? omenEntry.effect.forceDesecratedTag : null;
    const allowedBaseTags = omenEntry && omenEntry.effect.allowedBaseTags ? omenEntry.effect.allowedBaseTags : null;
    const rules = action && action.desecration ? action.desecration : { classes: [base.classId] };
    const ignoreItemState = !!(options && options.ignoreItemState);
    const groups = occupiedGroups(item);

    if (rules.classes && !rules.classes.includes(base.classId)) return [];

    const exclusiveMods = DESECRATED_MODIFIERS.filter(function (mod) {
      if (allowedBaseTags && !allowedBaseTags.some(function (tag) { return baseHasTag(base, tag); })) return false;
      if (!mod.classes.includes(base.classId)) return false;
      if (forceType && mod.type !== forceType) return false;
      if (forceTag && !(mod.tags || []).includes(forceTag)) return false;
      if (rules.minModLevel && mod.level < rules.minModLevel) return false;
      if (item.itemLevel < mod.level) return false;
      if (!desecratedExclusiveMatchesBase(mod, base)) return false;
      if (!ignoreItemState && groups.has(mod.group)) return false;
      if (!ignoreItemState && !canAddDefinition(item, mod)) return false;
      return true;
    });

    const baseMods = forceTag ? [] : eligibleMods(item, {
      minLevel: rules.minModLevel || 0,
      type: forceType,
      ignoreItemState,
    }).map(desecratedBaseDefinition);

    return uniqueModifiers(exclusiveMods.concat(baseMods));
  }

  function previewItemsForAction(item, actionId) {
    if (actionId === "hinekoras_lock") {
      return [item];
      if (!isMutable(item)) return { ok: false, reason: "腐化或镜像物品不能使用辛格拉的发辫。" };
      if (item.hinekoraLock) return { ok: false, reason: "该物品已经处于发辫预示状态。" };
      return { ok: true };
    }

    if (actionId === "transmutation") {
      const draft = clone(item);
      draft.rarity = "magic";
      return [draft];
    }

    if (actionId === "regal" || actionId === "alchemy") {
      const draft = clone(item);
      draft.rarity = "rare";
      return [draft];
    }

    if (actionId === "chaos") {
      return chaosPreviewItems(item);
    }

    return [item];
  }

  function chaosPreviewItems(item) {
    const candidates = chaosRemovalCandidates(item, { minLevel: 0 });
    return candidates.map(function (candidate) {
      const draft = clone(item);
      removeSpecificMod(draft, candidate);
      return draft;
    });
  }

  function uniqueModifiers(mods) {
    const seen = new Set();
    const unique = [];
    mods.forEach(function (mod) {
      if (seen.has(mod.id)) return;
      seen.add(mod.id);
      unique.push(mod);
    });
    return unique;
  }

  function modRollWeight(mod) {
    const weight = mod && mod.effectiveWeight != null ? mod.effectiveWeight : mod && mod.weight;
    return Math.max(0, Number(weight) || 0);
  }

  function totalWeight(mods) {
    return mods.reduce(function (sum, mod) { return sum + modRollWeight(mod); }, 0);
  }

  function pickWeighted(item, mods) {
    const total = totalWeight(mods);
    let roll = nextFloat(item) * total;
    for (const mod of mods) {
      roll -= modRollWeight(mod);
      if (roll <= 0) return mod;
    }
    return mods[mods.length - 1];
  }

  function addRandomMod(item, options) {
    const mods = applyEffectiveRollWeights(item, eligibleMods(item, options || {}), options || {});
    if (mods.length === 0) {
      return { ok: false, reason: "当前底材、物品等级、词缀组和前后缀槽位下没有可添加的词缀。" };
    }

    const mod = rollModifier(item, pickWeighted(item, mods));
    if (mod.type === "prefix") item.prefixes.push(mod);
    else item.suffixes.push(mod);
    return { ok: true, mod };
  }

  function addEssenceMod(item, essenceEntry, options) {
    const baseOptions = options || {};
    const mods = eligibleEssenceMods(item, essenceEntry, baseOptions);
    if (mods.length === 0) {
      return { ok: false, reason: "当前底材无法添加该精髓保证的词缀。" };
    }

    const mod = rollModifier(item, pickWeighted(item, mods));
    if (mod.type === "prefix") item.prefixes.push(mod);
    else item.suffixes.push(mod);
    return { ok: true, mod };
  }

  function essenceMatches(mod, tag) {
    return mod.tags.includes(tag) || mod.name.includes(tag) || (tag === "速度" && mod.tags.includes("施法"));
  }

  function importedGuaranteeMods(item, definition, options) {
    if (!definition || !Array.isArray(definition.mods)) return [];
    const base = getBase(item.baseId);
    const forceType = options && options.type ? options.type : null;
    const groups = occupiedGroups(item);

    return definition.mods.map(function (mod) {
      return normalizeImportedMod(mod, definition.name, false);
    }).filter(function (mod) {
      if (!mod) return false;
      if (forceType && mod.type !== forceType) return false;
      if (!mod.classes.includes(base.classId)) return false;
      if (!modMatchesBaseTags(mod, base)) return false;
      if (groups.has(mod.group)) return false;
      if (!canAddDefinition(item, mod)) return false;
      return true;
    });
  }

  function importedEssenceDefinition(essenceEntry) {
    if (!essenceEntry) return null;
    if (typeof essenceEntry === "string") return importedEssenceById(essenceEntry);
    const importedId = essenceEntry.importedId || essenceEntry.id;
    return importedId ? importedEssenceById(importedId) : null;
  }

  function eligibleEssenceMods(item, essenceEntry, options) {
    const importedDefinition = importedEssenceDefinition(essenceEntry);
    if (importedDefinition) return importedGuaranteeMods(item, importedDefinition, options || {});
    const tag = typeof essenceEntry === "string" ? essenceEntry : essenceEntry && essenceEntry.tag;
    return eligibleMods(item, options || {}).filter(function (mod) {
      return essenceMatches(mod, tag);
    });
  }

  function essenceRemovalCandidates(item, essenceEntry, removeType) {
    return removalCandidates(item, { type: removeType }).filter(function (candidate) {
      const draft = clone(item);
      removeSpecificMod(draft, candidate);
      return eligibleEssenceMods(draft, essenceEntry, {}).length > 0;
    });
  }

  function eligibleAlloyMods(item, action, options) {
    const definition = action && action.alloy ? importedAlloyById(action.alloy.importedId) : null;
    return importedGuaranteeMods(item, definition, options || {});
  }

  function addAlloyMod(item, action) {
    const mods = eligibleAlloyMods(item, action, {});
    if (mods.length === 0) {
      return { ok: false, reason: "当前底材无法添加该合金的保证词缀。" };
      /*
      return { ok: false, reason: "褰撳墠搴曟潗鏃犳硶娣诲姞璇ュ悎閲戠殑淇濊瘉璇嶇紑銆? };
      */
    }

    const mod = rollModifier(item, pickWeighted(item, mods));
    if (mod.type === "prefix") item.prefixes.push(mod);
    else item.suffixes.push(mod);
    return { ok: true, mod };
  }

  function alloyRemovalCandidates(item, action, removeType) {
    return removalCandidates(item, { type: removeType }).filter(function (candidate) {
      const draft = clone(item);
      removeSpecificMod(draft, candidate);
      return eligibleAlloyMods(draft, action, {}).length > 0;
    });
  }

  function eligibleLiquidEmotionMods(item, action, options) {
    const definition = action && action.liquidEmotion ? importedLiquidEmotionById(action.liquidEmotion.importedId) : null;
    return importedGuaranteeMods(item, definition, options || {});
  }

  function addLiquidEmotionMod(item, action) {
    const mods = eligibleLiquidEmotionMods(item, action, {});
    if (mods.length === 0) {
      return { ok: false, reason: "当前底材无法添加该液化情感的工艺词缀。" };
    }

    const mod = rollModifier(item, pickWeighted(item, mods));
    if (mod.type === "prefix") item.prefixes.push(mod);
    else item.suffixes.push(mod);
    return { ok: true, mod };
  }

  function liquidEmotionRemovalCandidates(item, action) {
    return removalCandidates(item, {}).filter(function (candidate) {
      const draft = clone(item);
      removeSpecificMod(draft, candidate);
      return eligibleLiquidEmotionMods(draft, action, {}).length > 0;
    });
  }

  function catalystDefinition(action) {
    const importedId = action && action.catalyst ? action.catalyst.importedId : action;
    return importedId ? importedCatalystById(importedId) : null;
  }

  function catalystAmount(item, omenEntry) {
    if (omenEntry && omenEntry.effect && omenEntry.effect.maxCatalystQuality) return 20;
    if (item.rarity === "normal") return 5;
    if (item.rarity === "magic") return 2;
    return 1;
  }

  function canUseCatalyst(item, action) {
    const base = getBase(item.baseId);
    const definition = catalystDefinition(action);
    if (!definition) return { ok: false, reason: "找不到该催化剂的 PoE2DB 数据。" };
    const classes = definition.classes || [];
    if (!classes.includes(base.classId)) return { ok: false, reason: "该催化剂不能用于当前底材。" };
    if (item.catalyst && item.catalyst.id === definition.id && item.catalyst.quality >= qualityCapFor(item)) return { ok: false, reason: "该催化剂品质已经达到当前品质上限。" };
    return { ok: true, definition };
  }

  function addRandomDesecratedMod(item, action, options) {
    const mods = eligibleDesecratedMods(item, action);
    if (mods.length === 0) {
      return { ok: false, reason: "当前底材和亵渎材料下没有可添加的亵渎词缀。" };
    }

    const definition = pickWeighted(item, mods);
    const mod = options && options.revealed
      ? rollModifier(item, definition)
      : {
        id: "hidden_desecrated_" + action.id + "_" + item.history.length + "_" + randomInt(item, 1000, 9999),
        baseId: "hidden_desecrated",
        type: definition.type,
        group: "hidden_desecrated_" + definition.type + "_" + item.history.length,
        name: "隐藏亵渎词缀",
        tier: "D?",
        level: definition.level,
        weight: 1,
        tags: [],
        template: "未揭露的亵渎词缀",
        rolls: [],
        values: [],
        desecrated: true,
        revealed: false,
        fractured: false,
        sourceText: "",
      };
    mod.revealed = !!(options && options.revealed);
    mod.desecrationActionId = action && action.id ? action.id : "";
    item.desecratedMods.push(mod);
    return { ok: true, mod };
  }

  function unrevealedDesecratedMods(item) {
    return (item.desecratedMods || []).filter(function (mod) {
      return isUnrevealedDesecrated(mod);
    });
  }

  function desecrationChoicePool(item, target) {
    const action = getAction(target.desecrationActionId);
    const draft = clone(item);
    draft.pendingDesecrationChoice = null;
    const draftTarget = (draft.desecratedMods || []).find(function (mod) {
      return modKey(mod) === modKey(target);
    });
    if (draftTarget) removeSpecificMod(draft, draftTarget);
    return eligibleDesecratedMods(draft, action).filter(function (mod) {
      return mod.type === target.type;
    });
  }

  function pickDesecrationChoices(item, target, count) {
    const pool = desecrationChoicePool(item, target);
    const picked = [];
    const available = pool.slice();
    while (available.length > 0 && picked.length < count) {
      const definition = pickWeighted(item, available);
      const mod = rollModifier(item, definition);
      mod.revealed = true;
      mod.desecrated = true;
      mod.desecrationActionId = target.desecrationActionId || "";
      mod.choiceId = "abyssal_choice_" + picked.length + "_" + mod.id;
      picked.push(mod);
      const usedIndex = available.findIndex(function (candidate) { return candidate.id === definition.id; });
      if (usedIndex >= 0) available.splice(usedIndex, 1);
    }
    return picked;
  }

  function prepareDesecrationChoices(item, omenEntry) {
    const candidates = unrevealedDesecratedMods(item);
    if (candidates.length === 0) {
      return { ok: false, reason: "物品上没有未揭露的亵渎词缀。" };
    }

    const target = candidates[randomInt(item, 0, candidates.length - 1)];
    const choices = pickDesecrationChoices(item, target, 3);
    if (choices.length === 0) {
      return { ok: false, reason: "当前底材没有可揭露的亵渎词缀候选。" };
    }

    item.pendingDesecrationChoice = {
      id: "abyssal_choice_" + item.history.length + "_" + randomInt(item, 1000, 9999),
      targetKey: modKey(target),
      choices: clone(choices),
      omenConsumed: omenEntry ? clone(omenEntry) : null,
    };
    if (omenEntry) item.pendingOmen = null;
    return { ok: true, target, choices };
  }

  function chooseDesecrationChoice(inputItem, choiceId) {
    const item = clone(inputItem);
    const pending = item.pendingDesecrationChoice;
    if (!pending || !Array.isArray(pending.choices)) {
      return { ok: false, item: inputItem, reason: "没有待选择的深渊回响词缀。" };
    }

    const choice = pending.choices.find(function (entry) { return entry.choiceId === choiceId || entry.id === choiceId; });
    if (!choice) return { ok: false, item: inputItem, reason: "选择的亵渎词缀不存在或已经失效。" };

    const removeIndex = (item.desecratedMods || []).findIndex(function (mod) {
      return modKey(mod) === pending.targetKey;
    });
    if (removeIndex < 0) return { ok: false, item: inputItem, reason: "待揭露的隐藏亵渎词缀已经不存在。" };

    const target = item.desecratedMods[removeIndex];
    const revealed = clone(choice);
    delete revealed.choiceId;
    revealed.revealed = true;
    revealed.desecrated = true;
    revealed.desecrationActionId = target.desecrationActionId || revealed.desecrationActionId || "";
    item.desecratedMods.splice(removeIndex, 1, revealed);
    item.pendingDesecrationChoice = null;

    const step = {
      actionId: "abyssal_echoes",
      currencyName: currencyNameFor("abyssal_echoes", "normal"),
      tier: "normal",
      beforeRarity: item.rarity,
      afterRarity: item.rarity,
      added: [],
      removed: [],
      revealed: [clone(revealed)],
      choices: clone(pending.choices),
      rerolled: 0,
      note: "深渊回响三选一揭露亵渎词缀",
      omenSet: null,
      omenConsumed: pending.omenConsumed || null,
    };
    item.history.push(step);
    return { ok: true, item, step, mod: revealed };
  }

  function addUntilTotal(item, targetTotal, options) {
    const added = [];
    while (countExplicit(item) < targetTotal) {
      const result = addRandomMod(item, options);
      if (!result.ok) return { ok: false, added, reason: result.reason };
      added.push(result.mod);
    }
    return { ok: true, added };
  }

  function removalCandidates(item, options) {
    const includeDesecrated = options && options.includeDesecrated;
    const forceDesecrated = options && options.forceDesecrated;
    const forceType = options && options.type;
    const lowest = options && options.lowest;
    let mods = forceDesecrated ? (item.desecratedMods || []) : explicitMods(item).filter(function (mod) { return !mod.fractured; });

    if (includeDesecrated && !forceDesecrated) {
      mods = mods.concat(item.desecratedMods || []);
    }
    if (forceType) {
      mods = mods.filter(function (mod) { return mod.type === forceType; });
    }
    if (lowest && mods.length > 0) {
      const lowestLevel = Math.min.apply(null, mods.map(function (mod) { return mod.level; }));
      mods = mods.filter(function (mod) { return mod.level === lowestLevel; });
    }
    return mods;
  }

  function chaosRemovalCandidates(item, options) {
    const omenEntry = activeOmen(item, "chaos");
    const minLevel = options && Number.isFinite(Number(options.minLevel)) ? Number(options.minLevel) : 0;
    const addType = options && options.addType ? options.addType : null;
    const blockedTypes = overBaseJewelAffixTypes(item);
    const candidates = removalCandidates(item, {
      includeDesecrated: true,
      type: omenEntry && omenEntry.effect.removeType,
      lowest: omenEntry && omenEntry.effect.removeLowest,
    });

    return candidates.filter(function (candidate) {
      if (blockedTypes.has(candidate.type)) return false;
      const draft = clone(item);
      removeSpecificMod(draft, candidate);
      return eligibleMods(draft, { minLevel, type: addType }).length > 0;
    });
  }

  function removeRandomMod(item, options) {
    const mods = removalCandidates(item, options || {});
    if (mods.length === 0) {
      return { ok: false, reason: "物品上没有符合条件的可移除词缀。" };
    }
    return { ok: true, mod: removeSpecificMod(item, mods[randomInt(item, 0, mods.length - 1)]) };
  }

  function removeSpecificMod(item, target) {
    const list = target.desecrated ? item.desecratedMods : (target.type === "prefix" ? item.prefixes : item.suffixes);
    const removeIndex = list.findIndex(function (mod) {
      return mod.id === target.id && mod.group === target.group && mod.template === target.template;
    });
    return list.splice(removeIndex, 1)[0];
  }

  function rerollValues(item) {
    const mods = allMods(item).filter(function (mod) { return !mod.fractured; });
    mods.forEach(function (mod) {
      mod.values = rollValues(item, mod.rolls);
    });
    return mods.length;
  }

  function highRollValues(item) {
    const mods = allMods(item).filter(function (mod) {
      return !mod.fractured && Array.isArray(mod.rolls) && mod.rolls.length > 0;
    });
    mods.forEach(function (mod) {
      mod.values = mod.rolls.map(function (roll) { return Number(roll.max); });
    });
    return mods.length;
  }

  function hasPoolForAction(item, actionId, minLevel, forcedAddType) {
    return previewItemsForAction(item, actionId).some(function (draft) {
      return eligibleMods(draft, { minLevel, type: forcedAddType }).length > 0;
    });
  }

  function sameKindType(item) {
    const prefixes = item.prefixes.length;
    const suffixes = item.suffixes.length;
    if (prefixes > 0 && suffixes === 0) return "prefix";
    if (suffixes > 0 && prefixes === 0) return "suffix";
    if (prefixes > suffixes) return "prefix";
    if (suffixes > prefixes) return "suffix";
    return null;
  }

  function addAlchemyMods(item, minLevel, omenEntry) {
    const added = [];
    const maxType = omenEntry && omenEntry.effect.alchemyMaxType;
    if (maxType) {
      const targetTypeCount = capFor(item, maxType);
      while (countByType(item, maxType) < targetTypeCount) {
        const result = addRandomMod(item, { minLevel, type: maxType });
        if (!result.ok) return { ok: false, added, reason: result.reason };
        added.push(result.mod);
      }
    }

    while (countExplicit(item) < 4) {
      const result = addRandomMod(item, { minLevel });
      if (!result.ok) return { ok: false, added, reason: result.reason };
      added.push(result.mod);
    }
    return { ok: true, added };
  }

  function removeMultipleMods(item, count, options) {
    const removed = [];
    for (let index = 0; index < count; index += 1) {
      const result = removeRandomMod(item, options);
      if (!result.ok) {
        if (removed.length > 0) return { ok: true, removed };
        return { ok: false, removed, reason: result.reason };
      }
      removed.push(result.mod);
    }
    return { ok: true, removed };
  }

  function validateCurrency(item, actionId, tierId) {
    const action = getAction(actionId);
    if (actionId === "hinekoras_lock" && action) {
      if (!isMutable(item)) return { ok: false, reason: "腐化或镜像物品不能使用辛格拉的发辫。" };
      if (item.hinekoraLock) return { ok: false, reason: "该物品已经处于发辫预示状态。" };
      return { ok: true };
    }
    if (!action) return { ok: false, reason: "未知通货或材料。" };
    if (item.destroyed) return { ok: false, reason: "物品已经被摧毁，不能继续操作。" };
    if (item.pendingDesecrationChoice && !action.revealDesecration) return { ok: false, reason: "请先从深渊回响的 3 个候选词缀中选择 1 个。" };

    if (action.category === "omen") {
      if (!isMutable(item)) return { ok: false, reason: "腐化或镜像物品不能准备预兆继续做装。" };
      if (item.pendingOmen && item.pendingOmen.target !== action.omen.target) return { ok: false, reason: "已经有一个不同目标的待触发预兆，请先触发或重置物品。" };
      return { ok: true };
    }

    if (action.revealDesecration) {
      if (!isMutable(item)) return { ok: false, reason: "腐化或镜像物品不能继续揭露亵渎词缀。" };
      if (unrevealedDesecratedMods(item).length === 0) return { ok: false, reason: "物品上没有未揭露的亵渎词缀。" };
      return { ok: true };
    }

    if (action.category === "desecration") {
      return validateDesecration(item, action);
    }

    if (action.category === "essence") {
      return validateEssence(item, action);
    }

    if (action.category === "essence") {
      const operation = action.essence.operation || action.essence.tier;
      const essenceOmen = operation === "rare_replace" || action.essence.tier === "perfect" ? activeOmen(item, "essence") : null;
      if (operation === "normal_to_magic" || action.essence.tier === "normal") {
        item.rarity = "magic";
        step.note = "普通 -> 魔法，精华保证词缀";
      } else if (operation === "magic_to_rare" || action.essence.tier === "greater" || action.essence.tier === "lesser") {
        item.rarity = "rare";
        step.note = "魔法 -> 稀有，精华保证词缀";
      } else {
        const candidates = essenceRemovalCandidates(item, action.essence, essenceOmen && essenceOmen.effect.removeType);
        if (candidates.length === 0) return { ok: false, item: original, reason: "没有可在移除后成功加入该精华词缀的候选词缀。" };
        const removed = removeSpecificMod(item, candidates[randomInt(item, 0, candidates.length - 1)]);
        step.removed.push(removed);
        step.note = "移除 1 个词缀，并加入精华保证词缀";
      }
      const added = addEssenceMod(item, action.essence, {});
      if (!added.ok) return { ok: false, item: original, reason: added.reason };
      step.added.push(added.mod);
      if (essenceOmen) {
        step.omenConsumed = clone(essenceOmen);
        item.pendingOmen = null;
      }
      step.afterRarity = item.rarity;
      item.history.push(step);
      return { ok: true, item, step };
    }

    if (action.category === "essence") {
      return validateEssence(item, action);
    }

    if (action.category === "alloy") {
      return validateAlloy(item, action);
    }

    if (action.category === "liquid_emotion") {
      return validateLiquidEmotion(item, action);
    }

    if (action.category === "catalyst") {
      return validateCatalyst(item, action);
    }

    if (action.category === "soul_core") {
      return validateSoulCore(item, action);
    }

    if (action.category === "alloy") {
      const candidates = alloyRemovalCandidates(item, action, null);
      if (candidates.length === 0) return { ok: false, item: original, reason: "没有可在移除后成功加入该合金词缀的候选词缀。" };
      const removed = removeSpecificMod(item, candidates[randomInt(item, 0, candidates.length - 1)]);
      step.removed.push(removed);
      const added = addAlloyMod(item, action);
      if (!added.ok) return { ok: false, item: original, reason: added.reason };
      step.added.push(added.mod);
      step.note = "合金移除 1 个随机词缀，并加入保证词缀";
      step.afterRarity = item.rarity;
      item.history.push(step);
      return { ok: true, item, step };
    }

    if (action.category === "alloy") {
      const candidates = alloyRemovalCandidates(item, action, null);
      if (candidates.length === 0) return { ok: false, item: original, reason: "没有可在移除后成功加入该合金词缀的候选词缀。" };
      const removed = removeSpecificMod(item, candidates[randomInt(item, 0, candidates.length - 1)]);
      step.removed.push(removed);
      const added = addAlloyMod(item, action);
      if (!added.ok) return { ok: false, item: original, reason: added.reason };
      step.added.push(added.mod);
      step.note = "合金移除 1 个随机词缀，并加入保证词缀";
      step.afterRarity = item.rarity;
      item.history.push(step);
      return { ok: true, item, step };
    }

    if (action.category === "rune") {
      return validateRune(item, action);
    }

    if (!isMutable(item) && actionId !== "mirror") {
      return { ok: false, reason: "腐化或镜像物品不能继续使用普通做装通货。" };
    }

    const minLevel = tierMinLevel(actionId, tierId);
    const omenEntry = activeOmen(item, actionId);
    const addType = omenEntry && (omenEntry.effect.addType || (omenEntry.effect.addSameType ? sameKindType(item) : null));

    if (actionId === "chance") {
      if (item.rarity !== "normal") return { ok: false, reason: "机会石只能用于普通物品。" };
      return { ok: true };
    }

    if (actionId === "vaal") {
      if (item.corrupted) return { ok: false, reason: "物品已经腐化。" };
      return { ok: true };
    }

    if (actionId === "fracturing") {
      if (item.rarity !== "rare") return { ok: false, reason: "破溃石只能用于稀有物品。" };
      if (allMods(item).length < 4) return { ok: false, reason: "破溃石需要至少 4 个词缀（含亵渎词缀）。" };
      if (explicitMods(item).some(function (mod) { return mod.fractured; })) return { ok: false, reason: "该物品已经有破碎词缀。" };
      return { ok: true };
    }

    if (actionId === "artificer") {
      if (!canAddSocket(item)) return { ok: false, reason: "该底材不能再添加符文插槽。" };
      return { ok: true };
    }

    if (actionId === "armour_scrap") {
      if (!canHaveQuality(item, "armour")) return { ok: false, reason: "护甲片只能用于护甲类物品。" };
      if (item.quality >= qualityCapFor(item)) return { ok: false, reason: "品质已经达到当前品质上限。" };
      return { ok: true };
    }

    if (actionId === "whetstone") {
      if (!canHaveQuality(item, "weapon")) return { ok: false, reason: "磨刀石只能用于攻击武器。" };
      if (item.quality >= qualityCapFor(item)) return { ok: false, reason: "品质已经达到当前品质上限。" };
      return { ok: true };
    }

    if (actionId === "arcanist_etcher") {
      if (!canHaveQuality(item, "caster")) return { ok: false, reason: "奥术蚀刻石只能用于法术武器。" };
      if (item.quality >= qualityCapFor(item)) return { ok: false, reason: "品质已经达到当前品质上限。" };
      return { ok: true };
    }

    if (actionId === "mirror") {
      if (item.mirrored) return { ok: false, reason: "镜像物品不能再次被镜像。" };
      return { ok: true };
    }

    if (actionId === "transmutation") {
      if (item.rarity !== "normal") return { ok: false, reason: "蜕变石只能用于普通物品。" };
      if (!hasPoolForAction(item, actionId, minLevel, addType)) return { ok: false, reason: "没有符合物品等级和最低词缀等级的可用词缀。" };
      return { ok: true };
    }

    if (actionId === "augmentation") {
      if (item.rarity !== "magic") return { ok: false, reason: "增幅石只能用于魔法物品。" };
      if (!hasOpenSlot(item, "prefix") && !hasOpenSlot(item, "suffix")) return { ok: false, reason: "魔法物品已经有 1 前缀和 1 后缀。" };
      if (!hasPoolForAction(item, actionId, minLevel, addType)) return { ok: false, reason: "没有符合当前槽位和词缀组限制的可用词缀。" };
      return { ok: true };
    }

    if (actionId === "alchemy") {
      if (item.rarity !== "normal") return { ok: false, reason: "点金石只能用于普通物品。" };
      if (!hasPoolForAction(item, actionId, minLevel, addType)) return { ok: false, reason: "没有可用于点金的词缀池。" };
      return { ok: true };
    }

    if (actionId === "regal") {
      if (item.rarity !== "magic") return { ok: false, reason: "富豪石只能用于魔法物品。" };
      if (!hasPoolForAction(item, actionId, minLevel, addType)) return { ok: false, reason: "升为稀有后没有可添加的词缀。" };
      return { ok: true };
    }

    if (actionId === "exalted") {
      if (item.rarity !== "rare") return { ok: false, reason: "崇高石只能用于稀有物品。" };
      if (!hasOpenSlot(item, "prefix") && !hasOpenSlot(item, "suffix")) return { ok: false, reason: "该稀有物品前后缀都已满。" };
      if (!hasPoolForAction(item, actionId, minLevel, addType)) return { ok: false, reason: "没有符合当前槽位和词缀组限制的可用词缀。" };
      return { ok: true };
    }

    if (actionId === "chaos") {
      if (item.rarity !== "magic" && item.rarity !== "rare") return { ok: false, reason: "混沌石只能用于魔法或稀有物品。" };
      const removeType = omenEntry && omenEntry.effect.removeType;
      const removeLowest = omenEntry && omenEntry.effect.removeLowest;
      if (removalCandidates(item, { includeDesecrated: true, type: removeType, lowest: removeLowest }).length === 0) return { ok: false, reason: "没有符合条件的词缀可供混沌石移除。" };
      if (!hasPoolForAction(item, actionId, minLevel, addType)) return { ok: false, reason: "移除词缀后没有可添加的新词缀。" };
      return { ok: true };
    }

    if (actionId === "annulment") {
      if (item.rarity !== "magic" && item.rarity !== "rare") return { ok: false, reason: "剥离石只能用于魔法或稀有物品。" };
      const removeType = omenEntry && omenEntry.effect.removeType;
      const forceDesecrated = omenEntry && omenEntry.effect.removeDesecrated;
      const removeCount = omenEntry && omenEntry.effect.removeCount ? omenEntry.effect.removeCount : 1;
      if (removalCandidates(item, { includeDesecrated: true, type: removeType, forceDesecrated }).length < removeCount) return { ok: false, reason: "没有足够的符合条件词缀可剥离。" };
      return { ok: true };
    }

    if (actionId === "divine") {
      if (allMods(item).length === 0) return { ok: false, reason: "物品上没有可重置数值的词缀。" };
      return { ok: true };
    }

    return { ok: false, reason: "未知通货。" };
  }

  function validateDesecration(item, action) {
    const base = getBase(item.baseId);
    const rules = action.desecration;
    if (!isMutable(item)) return { ok: false, reason: "腐化或镜像物品不能继续亵渎。" };
    if (item.rarity !== "rare") return { ok: false, reason: "亵渎材料只能用于稀有物品。" };
    if (!rules.classes.includes(base.classId)) return { ok: false, reason: action.label + "不适用于" + base.classLabel + "。" };
    if (rules.maxItemLevel && item.itemLevel > rules.maxItemLevel) return { ok: false, reason: action.label + "只能用于物品等级不高于 " + rules.maxItemLevel + " 的物品。" };
    if (eligibleDesecratedMods(item, action).length === 0) return { ok: false, reason: "当前没有符合该骨材限制的亵渎词缀。" };
    return { ok: true };
  }

  function validateEssence(item, action) {
    if (!isMutable(item)) return { ok: false, reason: "腐化或镜像物品不能使用精髓。" };
    const tier = action.essence.tier;
    const draft = clone(item);
    if (tier === "normal") {
      if (item.rarity !== "normal") return { ok: false, reason: "普通精髓只能用于普通物品。" };
      draft.rarity = "magic";
    } else if (tier === "greater") {
      if (item.rarity !== "magic") return { ok: false, reason: "高级精髓只能用于魔法物品。" };
      draft.rarity = "rare";
    } else if (tier === "perfect") {
      if (item.rarity !== "rare") return { ok: false, reason: "完美精髓只能用于稀有物品。" };
      const essenceOmen = activeOmen(item, "essence");
      if (essenceRemovalCandidates(item, action.essence.tag, essenceOmen && essenceOmen.effect.removeType).length === 0) return { ok: false, reason: "没有可在移除后成功加入该精髓词缀的候选词缀。" };
      return { ok: true };
    }

    const mods = eligibleEssenceMods(draft, action.essence.tag, {});
    if (mods.length === 0) return { ok: false, reason: "当前底材没有该精髓可保证的可用词缀。" };
    return { ok: true };
  }

  function validateEssence(item, action) {
    if (!isMutable(item)) return { ok: false, reason: "腐化或镜像物品不能使用精华。" };
    const tier = action.essence.tier;
    const operation = action.essence.operation || tier;
    const draft = clone(item);

    if (operation === "normal_to_magic" || tier === "normal") {
      if (item.rarity !== "normal") return { ok: false, reason: "该精华只能用于普通物品。" };
      draft.rarity = "magic";
    } else if (operation === "magic_to_rare" || tier === "greater" || tier === "lesser") {
      if (item.rarity !== "magic") return { ok: false, reason: "该精华只能用于魔法物品。" };
      draft.rarity = "rare";
    } else if (operation === "rare_replace" || tier === "perfect") {
      if (item.rarity !== "rare") return { ok: false, reason: "该精华只能用于稀有物品。" };
      const essenceOmen = activeOmen(item, "essence");
      if (essenceRemovalCandidates(item, action.essence, essenceOmen && essenceOmen.effect.removeType).length === 0) {
        return { ok: false, reason: "没有可在移除后成功加入该精华词缀的候选词缀。" };
      }
      return { ok: true };
    }

    const mods = eligibleEssenceMods(draft, action.essence, {});
    if (mods.length === 0) return { ok: false, reason: "当前底材没有该精华可保证的可用词缀。" };
    return { ok: true };
  }

  function validateAlloy(item, action) {
    if (!isMutable(item)) return { ok: false, reason: "腐化或镜像物品不能使用合金。" };
    if (item.rarity !== "rare") return { ok: false, reason: "合金只能用于稀有物品。" };
    if (alloyRemovalCandidates(item, action, null).length === 0) {
      return { ok: false, reason: "没有可在移除后成功加入该合金词缀的候选词缀。" };
    }
    return { ok: true };
  }

  function validateLiquidEmotion(item, action) {
    const base = getBase(item.baseId);
    if (!isMutable(item)) return { ok: false, reason: "腐化或镜像物品不能使用液化情感。" };
    if (item.rarity !== "rare") return { ok: false, reason: "液化情感只能用于稀有物品。" };
    if (base.classId !== "jewel") return { ok: false, reason: "液化情感只能用于珠宝。" };
    if (liquidEmotionRemovalCandidates(item, action).length === 0) {
      return { ok: false, reason: "没有可在移除后成功加入该液化情感词缀的候选词缀。" };
    }
    return { ok: true };
  }

  function validateCatalyst(item, action) {
    if (!isMutable(item)) return { ok: false, reason: "腐化或镜像物品不能使用催化剂。" };
    const validation = canUseCatalyst(item, action);
    return validation.ok ? { ok: true } : validation;
  }

  function validateSoulCore(item, action) {
    const definition = soulCoreDefinition(action);
    if (!definition) return { ok: false, reason: "缺少该 Soul Core 的 PoE2DB 词缀数据。" };
    if (!isMutable(item)) return { ok: false, reason: "腐化或镜像物品不能重置 Soul Core 词缀。" };
    if (item.rarity !== "rare") return { ok: false, reason: "Soul Core 词缀操作只能用于稀有物品。" };
    if (!socketedSoulCore(item, definition.id)) return { ok: false, reason: "需要先镶嵌 " + definition.name + "。" };
    const mods = eligibleSoulCoreMods(item, action, {});
    if (action.soulCore.operation === "reroll") {
      if (soulCoreExistingMods(item, action).length === 0 && mods.length === 0) {
        return { ok: false, reason: "没有可重置或可新增的 " + definition.actionLabel + " 池。" };
      }
      if (soulCoreExistingMods(item, action).length > 0 && soulCoreRemovalCandidates(item, action).length === 0) {
        return { ok: false, reason: "当前 Soul Core 词缀无法被重置。" };
      }
      if (soulCoreExistingMods(item, action).length === 0 && mods.length === 0) {
        return { ok: false, reason: "当前底材没有可添加的 Soul Core 词缀。" };
      }
      return { ok: true };
    }
    if (mods.length === 0) return { ok: false, reason: "当前底材没有可选取的 " + definition.actionLabel + " 池。" };
    return { ok: true };
  }

  function validateRune(item, action) {
    const base = getBase(item.baseId);
    if (!isMutable(item)) return { ok: false, reason: "腐化或镜像物品不能镶嵌符文。" };
    if (maxSockets(item) === 0) return { ok: false, reason: "该底材不能拥有符文插槽。" };
    if (!item.sockets.some(function (socket) { return !socket.rune; })) return { ok: false, reason: "没有空的符文插槽。" };
    const socketClasses = action.rune && action.rune.effect && action.rune.effect.socketClasses;
    if (Array.isArray(socketClasses) && socketClasses.length > 0 && !socketClasses.includes(base.classId)) {
      return { ok: false, reason: action.label + " 不能镶嵌到 " + base.classLabel + "。" };
    }
    return { ok: true };
  }

  function applyCurrency(inputItem, actionId, tierId) {
    const original = clone(inputItem);
    const item = clone(inputItem);
    const tier = tierId || "normal";
    const action = getAction(actionId);
    const validation = validateCurrency(item, actionId, tier);
    if (!validation.ok) return { ok: false, item: original, reason: validation.reason };

    const step = {
      actionId,
      currencyName: currencyNameFor(actionId, tier),
      tier,
      beforeRarity: item.rarity,
      afterRarity: item.rarity,
      added: [],
      removed: [],
      revealed: [],
      rerolled: 0,
      note: "",
      omenSet: null,
      omenConsumed: null,
    };

    if (action.category === "omen") {
      item.pendingOmen = mergeOmens(item.pendingOmen, action.omen);
      step.omenSet = clone(item.pendingOmen);
      step.note = "预兆已准备，等待下一次 " + targetLabel(action.omen.target);
      item.history.push(step);
      return { ok: true, item, step };
    }

    if (action.revealDesecration) {
      const revealOmen = activeOmen(item, "abyssal_echoes");
      const prepared = prepareDesecrationChoices(item, revealOmen);
      if (!prepared.ok) return { ok: false, item: original, reason: prepared.reason };
      step.note = revealOmen && revealOmen.effect.rerollReveal
        ? "深渊回响预兆已触发，生成 3 个可选亵渎词缀"
        : "深渊回响生成 3 个可选亵渎词缀";
      step.afterRarity = item.rarity;
      return { ok: true, item, step, pendingChoice: clone(item.pendingDesecrationChoice), choices: clone(prepared.choices) };
    }

    if (action.category === "essence") {
      const essenceOmen = action.essence.tier === "perfect" ? activeOmen(item, "essence") : null;
      if (action.essence.tier === "normal") {
        item.rarity = "magic";
        step.note = "普通 -> 魔法，精髓保证 " + action.essence.tag + " 词缀";
      } else if (action.essence.tier === "greater") {
        item.rarity = "rare";
        step.note = "魔法 -> 稀有，精髓保证 " + action.essence.tag + " 词缀";
      } else {
        const candidates = essenceRemovalCandidates(item, action.essence.tag, essenceOmen && essenceOmen.effect.removeType);
        if (candidates.length === 0) return { ok: false, item: original, reason: "没有可在移除后成功加入该精髓词缀的候选词缀。" };
        const removed = removeSpecificMod(item, candidates[randomInt(item, 0, candidates.length - 1)]);
        step.removed.push(removed);
        step.note = "完美精髓移除 1 个词缀，并保证 " + action.essence.tag + " 词缀";
      }
      const added = addEssenceMod(item, action.essence.tag, {});
      if (!added.ok) return { ok: false, item: original, reason: added.reason };
      step.added.push(added.mod);
      if (essenceOmen) {
        step.omenConsumed = clone(essenceOmen);
        item.pendingOmen = null;
      }
      step.afterRarity = item.rarity;
      item.history.push(step);
      return { ok: true, item, step };
    }

    if (action.category === "liquid_emotion") {
      const candidates = liquidEmotionRemovalCandidates(item, action);
      if (candidates.length === 0) return { ok: false, item: original, reason: "No liquid emotion candidate can be applied." };
      const removed = removeSpecificMod(item, candidates[randomInt(item, 0, candidates.length - 1)]);
      step.removed.push(removed);
      const added = addLiquidEmotionMod(item, action);
      if (!added.ok) return { ok: false, item: original, reason: added.reason };
      step.added.push(added.mod);
      step.note = "液化情感移除 1 条词缀，并加入对应工艺词缀。";
      step.afterRarity = item.rarity;
      item.history.push(step);
      return { ok: true, item, step };
    }
    if (action.category === "catalyst") {
      const definition = catalystDefinition(action);
      const before = item.catalyst && item.catalyst.id === definition.id ? item.catalyst.quality : 0;
      const after = Math.min(qualityCapFor(item), before + catalystAmount(item, null));
      item.catalyst = {
        id: definition.id,
        name: definition.name,
        tags: definition.tags || [],
        quality: after,
      };
      step.note = "催化剂品质 " + before + "% -> " + after + "%";
      step.afterRarity = item.rarity;
      item.history.push(step);
      return { ok: true, item, step };
    }

    if (action.category === "rune") {
      const socket = item.sockets.find(function (entry) { return !entry.rune; });
      socket.rune = clone(action.rune);
      step.note = "镶嵌 " + action.label + "：" + action.rune.effectText;
      item.history.push(step);
      return { ok: true, item, step };
    }

    if (action.category === "soul_core") {
      const definition = soulCoreDefinition(action);
      const existing = soulCoreExistingMods(item, action);
      if (action.soulCore.operation === "reroll" && existing.length > 0) {
        const candidates = soulCoreRemovalCandidates(item, action);
        if (candidates.length === 0) return { ok: false, item: original, reason: "没有可重置的 Soul Core 词缀。" };
        const removed = removeSpecificMod(item, candidates[randomInt(item, 0, candidates.length - 1)]);
        step.removed.push(removed);
      }
      const added = addSoulCoreMod(item, action);
      if (!added.ok) return { ok: false, item: original, reason: added.reason };
      step.added.push(added.mod);
      step.note = (action.soulCore.operation === "select" ? "选取 " : "重置 ") + definition.actionLabel + "：" + definition.name;
      step.afterRarity = item.rarity;
      item.history.push(step);
      return { ok: true, item, step };
    }

    const omenEntry = activeOmen(item, action.category === "desecration" ? "desecration" : actionId);
    const minLevel = tierMinLevel(actionId, tier);
    const addType = omenEntry && (omenEntry.effect.addType || (omenEntry.effect.addSameType ? sameKindType(item) : null));

    if (actionId === "hinekoras_lock") {
      item.hinekoraLock = true;
      item.hinekoraPreview = null;
      step.note = "物品已进入发辫预示状态；下一次通货会先显示结果。";
      step.afterRarity = item.rarity;
      item.history.push(step);
      return { ok: true, item, step };
    }

    if (action.category === "alloy") {
      const candidates = alloyRemovalCandidates(item, action, null);
      if (candidates.length === 0) return { ok: false, item: original, reason: "没有可在移除后成功加入该合金词缀的候选词缀。" };
      const removed = removeSpecificMod(item, candidates[randomInt(item, 0, candidates.length - 1)]);
      step.removed.push(removed);
      const added = addAlloyMod(item, action);
      if (!added.ok) return { ok: false, item: original, reason: added.reason };
      step.added.push(added.mod);
      step.note = "合金移除 1 个随机词缀，并加入保证词缀";
      step.afterRarity = item.rarity;
      item.history.push(step);
      return { ok: true, item, step };
    }

    if (actionId === "chance") {
      const success = (omenEntry && (omenEntry.effect.chanceForceUnique || omenEntry.effect.chanceNoDestroy)) || nextFloat(item) < 0.1;
      if (success) {
        item.rarity = "unique";
        item.prefixes = [];
        item.suffixes = [];
        item.desecratedMods = [];
        step.note = omenEntry && omenEntry.effect.chanceForceUnique ? "远古预兆触发，物品变为同类传奇" : "机会成功，普通物品变为传奇物品";
      } else {
        item.destroyed = true;
        step.note = "机会失败，物品被摧毁";
      }
    }

    if (actionId === "vaal") {
      const outcomes = ["no_visible_change"];
      if (allMods(item).filter(function (mod) { return !mod.fractured; }).length > 0) outcomes.push("reroll_values");
      if (allMods(item).some(function (mod) { return !mod.fractured && Array.isArray(mod.rolls) && mod.rolls.length > 0; })) outcomes.push("high_roll_values");
      if (canAddCorruptedSocket(item)) outcomes.push("add_socket");
      if ((item.rarity === "magic" || item.rarity === "rare") && hasPoolForAction(item, "exalted", 0, null)) outcomes.push("add_mod");
      if (removalCandidates(item, { includeDesecrated: true }).length > 0) outcomes.push("remove_mod");
      const outcome = outcomes[randomInt(item, 0, outcomes.length - 1)];
      item.corrupted = true;
      if (outcome === "reroll_values") {
        step.rerolled = rerollValues(item);
        step.note = "腐化：重置可变词缀数值";
      } else if (outcome === "high_roll_values") {
        step.rerolled = highRollValues(item);
        step.note = "腐化：可变词缀数值变为高 roll";
      } else if (outcome === "add_socket") {
        item.sockets.push({ rune: null, corrupted: true });
        step.note = "腐化：添加 1 个符文插槽";
      } else if (outcome === "add_mod") {
        const added = addRandomMod(item, {});
        if (added.ok) step.added.push(added.mod);
        step.note = "腐化：添加 1 个随机词缀";
      } else if (outcome === "remove_mod") {
        const removed = removeRandomMod(item, { includeDesecrated: true });
        if (removed.ok) step.removed.push(removed.mod);
        step.note = "腐化：移除 1 个随机词缀";
      } else {
        step.note = "腐化：无可见变化";
      }
    }

    if (actionId === "fracturing") {
      const candidates = explicitMods(item).filter(function (mod) { return !mod.fractured; });
      const target = candidates[randomInt(item, 0, candidates.length - 1)];
      target.fractured = true;
      step.note = "破碎锁定词缀：" + renderMod(target);
    }

    if (actionId === "artificer") {
      item.sockets.push({ rune: null });
      step.note = "添加 1 个空符文插槽";
    }

    if (actionId === "armour_scrap" || actionId === "whetstone" || actionId === "arcanist_etcher") {
      const before = item.quality;
      const amount = item.rarity === "normal" ? 5 : item.rarity === "magic" ? 2 : 1;
      item.quality = Math.min(qualityCapFor(item), item.quality + amount);
      step.note = "品质 " + before + "% -> " + item.quality + "%";
    }

    if (actionId === "mirror") {
      item.mirrored = true;
      step.note = "生成镜像复制品；镜像物品不能继续修改";
    }

    if (actionId === "transmutation") {
      item.rarity = "magic";
      const added = addRandomMod(item, { minLevel, type: addType });
      if (!added.ok) return { ok: false, item: original, reason: added.reason };
      step.added.push(added.mod);
      step.note = "普通 -> 魔法";
    }

    if (actionId === "augmentation") {
      const added = addRandomMod(item, { minLevel, type: addType });
      if (!added.ok) return { ok: false, item: original, reason: added.reason };
      step.added.push(added.mod);
    }

    if (actionId === "alchemy") {
      item.rarity = "rare";
      const added = addAlchemyMods(item, minLevel, omenEntry);
      if (!added.ok) return { ok: false, item: original, reason: added.reason };
      step.added = added.added;
      step.note = omenEntry && omenEntry.effect.alchemyMaxType
        ? "普通 -> 稀有，并最大化" + (omenEntry.effect.alchemyMaxType === "prefix" ? "前缀" : "后缀")
        : "普通 -> 稀有，补足到 4 词缀";
    }

    if (actionId === "regal") {
      item.rarity = "rare";
      const added = addRandomMod(item, { minLevel, type: addType });
      if (!added.ok) return { ok: false, item: original, reason: added.reason };
      step.added.push(added.mod);
      step.note = "魔法 -> 稀有";
    }

    if (actionId === "exalted") {
      const addCount = omenEntry && omenEntry.effect.addCount ? omenEntry.effect.addCount : 1;
      for (let index = 0; index < addCount; index += 1) {
        const added = addRandomMod(item, { minLevel, type: addType, omenEntry });
        if (!added.ok) return { ok: false, item: original, reason: added.reason };
        step.added.push(added.mod);
      }
      if (omenEntry && omenEntry.effect.consumeCatalystQuality && item.catalyst) {
        const consumed = item.catalyst.quality || 0;
        item.catalyst.quality = 0;
        step.note = "催化崇高预兆消耗 " + consumed + "% 催化剂品质";
      }
    }

    if (actionId === "chaos") {
      const candidates = chaosRemovalCandidates(item, { minLevel, addType });
      if (candidates.length === 0) return { ok: false, item: original, reason: "没有移除后能成功添加新词缀的候选词缀。" };
      const removed = removeSpecificMod(item, candidates[randomInt(item, 0, candidates.length - 1)]);
      const added = addRandomMod(item, { minLevel, type: addType });
      if (!added.ok) return { ok: false, item: original, reason: added.reason };
      step.removed.push(removed);
      step.added.push(added.mod);
    }

    if (actionId === "annulment") {
      const removed = removeMultipleMods(item, omenEntry && omenEntry.effect.removeCount ? omenEntry.effect.removeCount : 1, {
        includeDesecrated: true,
        type: omenEntry && omenEntry.effect.removeType,
        forceDesecrated: omenEntry && omenEntry.effect.removeDesecrated,
      });
      if (!removed.ok) return { ok: false, item: original, reason: removed.reason };
      step.removed = step.removed.concat(removed.removed);
    }

    if (actionId === "divine") {
      step.rerolled = rerollValues(item);
    }

    if (action.category === "desecration") {
      if (omenEntry && omenEntry.effect.rottingDesecration) {
        step.removed = step.removed.concat(allMods(item));
        item.prefixes = [];
        item.suffixes = [];
        item.desecratedMods = [];
        item.corrupted = true;
        for (let index = 0; index < 6; index += 1) {
          const added = addRandomDesecratedMod(item, action, { revealed: false });
          if (!added.ok) break;
          step.added.push(added.mod);
        }
        if (step.added.length === 0) return { ok: false, item: original, reason: "腐烂预兆没有可生成的亵渎词缀。" };
        step.note = "腐烂亵渎：取代所有词缀，生成 " + step.added.length + " 个未揭露的亵渎词缀并腐化";
      } else {
        const added = addRandomDesecratedMod(item, action, { revealed: false });
        if (!added.ok) return { ok: false, item: original, reason: added.reason };
        step.note = "添加 1 个未揭露的亵渎词缀";
        step.added.push(added.mod);
      }
    }

    if (omenEntry) {
      step.omenConsumed = clone(omenEntry);
      item.pendingOmen = null;
    }

    step.afterRarity = item.rarity;
    item.history.push(step);
    return { ok: true, item, step };
  }

  function previewCurrency(inputItem, actionId, tierId) {
    const draft = clone(inputItem);
    draft.hinekoraLock = false;
    draft.hinekoraPreview = null;
    return applyCurrency(draft, actionId, tierId || "normal");
  }

  function removalPreview(inputItem, actionId, tierId) {
    const item = clone(inputItem);
    const action = getAction(actionId);
    if (!item || !action) return removalPreviewResult(actionId, tierId, []);

    if (actionId === "chaos") {
      const omenEntry = activeOmen(item, "chaos");
      const minLevel = tierMinLevel(actionId, tierId || "normal");
      const addType = omenEntry && (omenEntry.effect.addType || (omenEntry.effect.addSameType ? sameKindType(item) : null));
      return removalPreviewResult(actionId, tierId, chaosRemovalCandidates(item, { minLevel, addType }));
    }

    if (actionId === "annulment") {
      const omenEntry = activeOmen(item, "annulment");
      return removalPreviewResult(actionId, tierId, removalCandidates(item, {
        includeDesecrated: true,
        type: omenEntry && omenEntry.effect.removeType,
        forceDesecrated: omenEntry && omenEntry.effect.removeDesecrated,
      }));
    }

    if (action.category === "essence") {
      const operation = action.essence && (action.essence.operation || action.essence.tier);
      if (operation === "rare_replace" || (action.essence && action.essence.tier === "perfect")) {
        const omenEntry = activeOmen(item, "essence");
        return removalPreviewResult(actionId, tierId, essenceRemovalCandidates(item, action.essence, omenEntry && omenEntry.effect.removeType));
      }
    }

    if (action.category === "alloy") {
      return removalPreviewResult(actionId, tierId, alloyRemovalCandidates(item, action, null));
    }

    if (action.category === "liquid_emotion") {
      return removalPreviewResult(actionId, tierId, liquidEmotionRemovalCandidates(item, action));
    }

    if (action.category === "soul_core" && action.soulCore && action.soulCore.operation === "reroll") {
      return removalPreviewResult(actionId, tierId, soulCoreRemovalCandidates(item, action));
    }

    return removalPreviewResult(actionId, tierId, []);
  }

  function removalPreviewResult(actionId, tierId, candidates) {
    return {
      actionId: actionId || "",
      tierId: tierId || "normal",
      candidates: candidates.map(clone),
      keys: candidates.map(modKey),
      lowestLevel: candidates.length > 0 ? Math.min.apply(null, candidates.map(function (mod) { return mod.level; })) : null,
    };
  }

  function targetLabel(target) {
    const labels = {
      exalted: "崇高石",
      regal: "富豪石",
      annulment: "剥离石",
      chaos: "混沌石",
      desecration: "亵渎材料",
      abyssal_echoes: "深渊回响",
    };
    return labels[target] || target;
  }

  function currencyNameFor(actionId, tierId) {
    const action = getAction(actionId);
    if (!action) return actionId;
    if (!action.supportsTiers || tierId === "normal") return action.label;
    return CURRENCY_TIERS[tierId].label + action.label;
  }

  function summarizePool(item, tierId, actionId, options) {
    const action = getAction(actionId);
    if (action && action.category === "essence") {
      const mods = uniqueModifiers(eligibleEssenceMods(item, action.essence, {}));
      const summary = summarizeMods(mods);
      summary.minLevel = 0;
      summary.actionId = actionId || "";
      summary.tierId = "normal";
      return summary;
    }

    if (action && action.category === "alloy") {
      const mods = uniqueModifiers(eligibleAlloyMods(item, action, {}));
      const summary = summarizeMods(mods);
      summary.minLevel = 0;
      summary.actionId = actionId || "";
      summary.tierId = "normal";
      return summary;
    }

    if (action && action.category === "liquid_emotion") {
      const mods = uniqueModifiers(eligibleLiquidEmotionMods(item, action, {}));
      const summary = summarizeMods(mods);
      summary.minLevel = 0;
      summary.actionId = actionId || "";
      summary.tierId = "normal";
      return summary;
    }

    if (action && action.category === "soul_core") {
      const mods = uniqueModifiers(eligibleSoulCoreMods(item, action, options || {}));
      const summary = summarizeMods(mods);
      summary.minLevel = 0;
      summary.actionId = actionId || "";
      summary.tierId = "normal";
      return summary;
    }

    if (action && action.category === "desecration") {
      const mods = uniqueModifiers(eligibleDesecratedMods(item, action, options || {}));
      const summary = summarizeMods(mods);
      summary.minLevel = action.desecration && action.desecration.minModLevel ? action.desecration.minModLevel : 0;
      summary.actionId = actionId || "";
      summary.tierId = "normal";
      return summary;
    }

    const minLevel = actionId ? tierMinLevel(actionId, tierId || "normal") : 0;
    const omenEntry = actionId ? activeOmen(item, actionId) : null;
    const addType = omenEntry && (omenEntry.effect.addType || (omenEntry.effect.addSameType ? sameKindType(item) : null));
    const mods = uniqueModifiers(previewItemsForAction(item, actionId).flatMap(function (draft) {
      return eligibleMods(draft, { minLevel, type: addType });
    }));
    const summary = summarizeMods(actionId === "exalted" ? applyEffectiveRollWeights(item, mods, { omenEntry }) : mods);
    summary.minLevel = minLevel;
    summary.actionId = actionId || "";
    summary.tierId = tierId || "normal";
    return summary;
  }

  function summarizeMods(mods) {
    return {
      mods,
      totalWeight: totalWeight(mods),
      prefixCount: mods.filter(function (mod) { return mod.type === "prefix"; }).length,
      suffixCount: mods.filter(function (mod) { return mod.type === "suffix"; }).length,
    };
  }

  return {
    DATA_VERSION,
    DATA_STATUS: {
      modDataLoaded: MODIFIER_DATA_LOADED,
      craftingDataLoaded: CRAFTING_DATA_LOADED,
      soulCoreDataLoaded: SOUL_CORE_DATA_LOADED,
      modifierCount: MODIFIERS.length,
      desecratedModifierCount: DESECRATED_MODIFIERS.length,
      liquidEmotionCount: IMPORTED_CRAFTING_DATA.liquidEmotions.length,
      catalystCount: IMPORTED_CRAFTING_DATA.catalysts.length,
      soulCoreCount: IMPORTED_CRAFTING_DATA.soulCores.length,
    },
    RARITIES,
    CURRENCY_TIERS,
    CURRENCIES,
    BASES,
    MODIFIERS,
    DESECRATED_MODIFIERS,
    makeItem,
    makeCustomItem,
    getBase,
    getAction,
    baseStatLines,
    explicitMods,
    allMods,
    countExplicit,
    countByType,
    capFor,
    qualityCapFor,
    hasOpenSlot,
    eligibleMods,
    eligibleDesecratedMods,
    summarizePool,
    validateCurrency,
    previewCurrency,
    removalPreview,
    applyCurrency,
    chooseDesecrationChoice,
    renderMod,
    renderImplicit,
    renderRange,
    modKey,
    currencyNameFor,
  };
});
