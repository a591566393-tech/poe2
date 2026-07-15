import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const cacheDir = join(rootDir, ".cache");
const dataDir = join(rootDir, "data");

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
const JEWELLERY_CLASSES = ["ring", "amulet", "belt", "talisman"];
const CURRENT_CLASSES = JEWELLERY_CLASSES.concat(ARMOUR_CLASSES, WEAPON_CLASSES, ["quiver"]);
const MACE_CLASSES = ["one_hand_mace", "two_hand_mace"];
const ONE_HAND_ATTACK_MELEE_CLASSES = ["claw", "dagger", "one_hand_sword", "one_hand_axe", "one_hand_mace", "spear", "flail"];
const TWO_HAND_ATTACK_MELEE_CLASSES = ["two_hand_sword", "two_hand_axe", "two_hand_mace", "quarterstaff"];
const TWO_HAND_MELEE_CLASSES = ["two_hand_sword", "two_hand_axe", "two_hand_mace", "quarterstaff", "staff", "spear"];
const SOUL_CORE_CATEGORIES = {
  chronomancy: {
    id: "uhtreds_sidereus",
    slug: "Uhtreds_Sidereus",
    name: "乌崔德的星辰",
    operation: "reroll",
    socketClasses: ["boots"],
    actionLabel: "重置塑时术师词缀",
  },
  marksman: {
    id: "kolrs_hunt",
    slug: "Kolrs_Hunt",
    name: "克尔的狩猎",
    operation: "reroll",
    socketClasses: ["gloves"],
    actionLabel: "重置神射手词缀",
  },
  decay: {
    id: "katlas_gloom",
    slug: "Katlas_Gloom",
    name: "卡塔拉的阴霾",
    operation: "reroll",
    socketClasses: ["gloves"],
    actionLabel: "重置腐蚀词缀",
  },
  soul: {
    id: "medveds_tending",
    slug: "Medveds_Tending",
    name: "梅德维德的照料",
    operation: "reroll",
    socketClasses: ["body_armour"],
    actionLabel: "重置灵魂词缀",
  },
  destruction: {
    id: "thruds_might",
    slug: "Thruds_Might",
    name: "斯鲁德的神力",
    operation: "select",
    socketClasses: WEAPON_CLASSES,
    actionLabel: "选取毁灭词缀",
  },
  berserking: {
    id: "voranas_carnage",
    slug: "Voranas_Carnage",
    name: "沃拉娜的屠戮",
    operation: "reroll",
    socketClasses: ["helmet"],
    actionLabel: "重置盛怒词缀",
  },
};

const SOUL_CORE_SOURCES = [
  { page: "Boots_str", classes: ["boots"], requiredBaseTags: ["def_armour"] },
  { page: "Boots_dex", classes: ["boots"], requiredBaseTags: ["def_evasion"] },
  { page: "Boots_int", classes: ["boots"], requiredBaseTags: ["def_energy_shield"] },
  { page: "Boots_str_dex", classes: ["boots"], requiredBaseTags: ["def_armour", "def_evasion"] },
  { page: "Boots_str_int", classes: ["boots"], requiredBaseTags: ["def_armour", "def_energy_shield"] },
  { page: "Boots_dex_int", classes: ["boots"], requiredBaseTags: ["def_evasion", "def_energy_shield"] },
  { page: "Gloves_str", classes: ["gloves"], requiredBaseTags: ["def_armour"] },
  { page: "Gloves_dex", classes: ["gloves"], requiredBaseTags: ["def_evasion"] },
  { page: "Gloves_int", classes: ["gloves"], requiredBaseTags: ["def_energy_shield"] },
  { page: "Gloves_str_dex", classes: ["gloves"], requiredBaseTags: ["def_armour", "def_evasion"] },
  { page: "Gloves_str_int", classes: ["gloves"], requiredBaseTags: ["def_armour", "def_energy_shield"] },
  { page: "Gloves_dex_int", classes: ["gloves"], requiredBaseTags: ["def_evasion", "def_energy_shield"] },
  { page: "Helmets_str", classes: ["helmet"], requiredBaseTags: ["def_armour"] },
  { page: "Helmets_dex", classes: ["helmet"], requiredBaseTags: ["def_evasion"] },
  { page: "Helmets_int", classes: ["helmet"], requiredBaseTags: ["def_energy_shield"] },
  { page: "Helmets_str_dex", classes: ["helmet"], requiredBaseTags: ["def_armour", "def_evasion"] },
  { page: "Helmets_str_int", classes: ["helmet"], requiredBaseTags: ["def_armour", "def_energy_shield"] },
  { page: "Helmets_dex_int", classes: ["helmet"], requiredBaseTags: ["def_evasion", "def_energy_shield"] },
  { page: "Body_Armours_str", classes: ["body_armour"], requiredBaseTags: ["def_armour"] },
  { page: "Body_Armours_dex", classes: ["body_armour"], requiredBaseTags: ["def_evasion"] },
  { page: "Body_Armours_int", classes: ["body_armour"], requiredBaseTags: ["def_energy_shield"] },
  { page: "Body_Armours_str_dex", classes: ["body_armour"], requiredBaseTags: ["def_armour", "def_evasion"] },
  { page: "Body_Armours_str_int", classes: ["body_armour"], requiredBaseTags: ["def_armour", "def_energy_shield"] },
  { page: "Body_Armours_dex_int", classes: ["body_armour"], requiredBaseTags: ["def_evasion", "def_energy_shield"] },
  { page: "Body_Armours_str_dex_int", classes: ["body_armour"], requiredBaseTags: ["def_armour", "def_evasion", "def_energy_shield"] },
  { page: "Bows", classes: ["bow"], requiredBaseTags: [] },
  { page: "Crossbows", classes: ["crossbow"], requiredBaseTags: [] },
  { page: "Quarterstaves", classes: ["quarterstaff"], requiredBaseTags: [] },
  { page: "Sceptres", classes: ["sceptre"], requiredBaseTags: [] },
  { page: "Staves", classes: ["staff"], requiredBaseTags: [] },
  { page: "Wands", classes: ["wand"], requiredBaseTags: [] },
  { page: "One_Hand_Maces", classes: ["one_hand_mace"], requiredBaseTags: [] },
  { page: "Two_Hand_Maces", classes: ["two_hand_mace"], requiredBaseTags: [] },
];

const LIQUID_EMOTION_SOURCES = [
  { page: "Time-Lost_Ruby", baseId: "jewel_time_lost_ruby", allowedTag: "str_radius_jewel" },
  { page: "Time-Lost_Emerald", baseId: "jewel_time_lost_emerald", allowedTag: "dex_radius_jewel" },
  { page: "Time-Lost_Sapphire", baseId: "jewel_time_lost_sapphire", allowedTag: "int_radius_jewel" },
  { page: "Time-Lost_Diamond", baseId: "jewel_time_lost_diamond", allowedTag: "" },
];

const BASIC_LIQUID_JEWEL_SOURCES = [
  { label: "\u7ea2\u7389", baseId: "jewel_ruby", requiredAnyBaseTags: ["strjewel"] },
  { label: "\u84dd\u7389", baseId: "jewel_sapphire", requiredAnyBaseTags: ["intjewel"] },
  { label: "\u7fe1\u7fe0", baseId: "jewel_emerald", requiredAnyBaseTags: ["dexjewel"] },
  { label: "\u5b9d\u94bb", baseId: "jewel_diamond", requiredAnyBaseTags: [] },
];

function decodeEntities(value) {
  return String(value)
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)));
}

function stripHtml(value) {
  return decodeEntities(String(value)
    .replace(/<br\s*\/?>/gi, " | ")
    .replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeValueMarkup(html) {
  return String(html)
    .replace(/<span class=["']ndash["']>[\s\S]*?<\/span>/g, "—")
    .replace(/<span class=["']mod-value["']>([\s\S]*?)<\/span>/g, (_, value) => `<ROLL>${value}</ROLL>`);
}

function parseNumber(value) {
  return Number(String(value).replace(/[()+%]/g, "").trim());
}

function precisionOf(value) {
  const match = String(value).match(/\.(\d+)/);
  return match ? match[1].length : 0;
}

function parseRoll(rawValue) {
  let text = stripHtml(rawValue)
    .replace(/[–—]/g, "—")
    .replace(/\s+/g, " ")
    .trim();
  text = text.replace(/^\+\s*/, "").replace(/^\((.*)\)$/g, "$1");

  const parts = text.split(/\s*—\s*/);
  const minText = parts[0];
  const maxText = parts.length > 1 ? parts[1] : parts[0];
  const precision = Math.max(precisionOf(minText), precisionOf(maxText));

  return {
    min: parseNumber(minText),
    max: parseNumber(maxText),
    scale: precision > 0 ? Math.pow(10, precision) : 1,
  };
}

function parseTemplateAndRolls(rawHtml) {
  let index = 0;
  const rolls = [];
  const marked = normalizeValueMarkup(rawHtml).replace(/<ROLL>([\s\S]*?)<\/ROLL>/g, (_, value) => {
    const roll = parseRoll(value);
    rolls.push(roll);
    const token = `__ROLL_${index}__`;
    index += 1;
    return token;
  });

  let template = stripHtml(marked);
  for (let rollIndex = 0; rollIndex < rolls.length; rollIndex += 1) {
    template = template.replace(`__ROLL_${rollIndex}__`, "#");
  }

  return {
    template: template.replace(/\s+([,%])/g, " $1").replace(/\s+/g, " ").trim(),
    rolls,
  };
}

function addClasses(classes, values) {
  values.forEach((value) => classes.add(value));
}

function uniqueClasses(values) {
  return Array.from(new Set(values.filter((value) => CURRENT_CLASSES.includes(value))));
}

function firstClassClause(text) {
  const value = String(text).trim();
  const colonIndex = value.search(/[:\uFF1A]/u);
  if (colonIndex < 0 || colonIndex > 40) return "";
  return value.slice(0, colonIndex);
}

function classesFromClassText(text) {
  const classes = new Set();
  const value = String(text);
  let recognized = false;

  if (/\u5355\u624b\s*\u8fd1\u6218\s*\u6b66\u5668\s*\u6216\s*\u5f13\u7c7b/u.test(value)) {
    addClasses(classes, ONE_HAND_ATTACK_MELEE_CLASSES.concat(["bow"]));
    return uniqueClasses(Array.from(classes));
  }
  if (/\u53cc\u624b\s*\u8fd1\u6218\s*\u6b66\u5668\s*\u6216\s*\u6218\u5f29/u.test(value)) {
    addClasses(classes, TWO_HAND_ATTACK_MELEE_CLASSES.concat(["crossbow"]));
    return uniqueClasses(Array.from(classes));
  }
  if (/\u5f13\u7c7b[\s\u6216]*\u6218\u5f29|\u6218\u5f29[\s\u6216]*\u5f13\u7c7b/u.test(value)) {
    addClasses(classes, ["bow", "crossbow"]);
    return uniqueClasses(Array.from(classes));
  }

  if (/\u88c5\u5907/u.test(value)) {
    recognized = true;
    addClasses(classes, CURRENT_CLASSES);
  }
  if (/\u9970\u54c1|\u73e0\u5b9d/u.test(value)) {
    recognized = true;
    addClasses(classes, JEWELLERY_CLASSES);
  }
  if (/\u6212\u6307/u.test(value)) {
    recognized = true;
    classes.add("ring");
  }
  if (/\u9879\u94fe/u.test(value)) {
    recognized = true;
    classes.add("amulet");
  }
  if (/\u8170\u5e26/u.test(value)) {
    recognized = true;
    classes.add("belt");
  }
  if (/\u9b54\u7b26/u.test(value)) {
    recognized = true;
    classes.add("talisman");
  }
  if (/\u978b\u5b50|\u9774/u.test(value)) {
    recognized = true;
    classes.add("boots");
  }
  if (/\u624b\u5957/u.test(value)) {
    recognized = true;
    classes.add("gloves");
  }
  if (/\u5934\u76d4/u.test(value)) {
    recognized = true;
    classes.add("helmet");
  }
  if (/\u8eab\u4f53\u62a4\u7532/u.test(value)) {
    recognized = true;
    classes.add("body_armour");
  } else if (/\u62a4\u7532/u.test(value)) {
    recognized = true;
    addClasses(classes, ARMOUR_CLASSES);
  }
  if (/\u5f13\u7c7b|\u5f13/u.test(value)) {
    recognized = true;
    classes.add("bow");
  }
  if (/\u7bad\u888b/u.test(value)) {
    recognized = true;
    classes.add("quiver");
  }
  if (/\u6cd5\u6756/u.test(value)) {
    recognized = true;
    classes.add("wand");
  }
  if (/\u957f\u6756/u.test(value)) {
    recognized = true;
    classes.add("staff");
  }
  if (/\u65bd\u6cd5\u6b66\u5668/u.test(value)) {
    recognized = true;
    addClasses(classes, ["wand", "staff", "sceptre"]);
  }
  if (/\u6cd5\u5668/u.test(value)) {
    recognized = true;
    classes.add("focus");
  }
  if (/\u6218\u5f29/u.test(value)) {
    recognized = true;
    classes.add("crossbow");
  }
  if (/\u6218\u6597\u6b66\u5668|\u5355\u624b|\u53cc\u624b|\u8fd1\u6218/u.test(value)) {
    recognized = true;
    addClasses(classes, WEAPON_CLASSES);
  }
  if (/\u6b66\u5668/u.test(value)) {
    recognized = true;
    addClasses(classes, WEAPON_CLASSES);
  }
  if (/\u76fe\u724c|\u6743\u6756/u.test(value)) {
    recognized = true;
    if (/\u76fe\u724c/u.test(value)) addClasses(classes, ["shield", "buckler"]);
    if (/\u6743\u6756/u.test(value)) classes.add("sceptre");
  }

  return recognized ? uniqueClasses(Array.from(classes)) : null;
}

function semanticClassDecision(text) {
  const value = String(text);
  const classes = new Set();
  let restrict = false;

  if (/\u7bad\u888b/u.test(value)) {
    restrict = true;
    classes.add("quiver");
  }
  if (/\u76fe\u724c|\u683c\u6321|\u4e3e\u8d77\s*\u76fe\u724c/u.test(value)) {
    restrict = true;
    addClasses(classes, ["shield", "buckler"]);
  }
  if (/\u53cc\u624b\s*\u8fd1\u6218\s*\u6b66\u5668\s*\u6216\s*\u6218\u5f29/u.test(value)) {
    restrict = true;
    addClasses(classes, TWO_HAND_MELEE_CLASSES.concat(["crossbow"]));
  } else if (/\u6218\u5f29|\u88c5\u586b|\u69b4\u5f39/u.test(value)) {
    restrict = true;
    classes.add("crossbow");
  }
  if (/\u9524\u7c7b|\u731b\u51fb/u.test(value)) {
    restrict = true;
    addClasses(classes, MACE_CLASSES);
  }
  if (/\u957f\u6756/u.test(value)) {
    restrict = true;
    classes.add("staff");
  }
  if (/\u6cd5\u6756/u.test(value)) {
    restrict = true;
    classes.add("wand");
  }
  if (/\u6cd5\u5668/u.test(value)) {
    restrict = true;
    classes.add("focus");
  }
  if (/\u6743\u6756/u.test(value)) {
    restrict = true;
    classes.add("sceptre");
  }
  if (/\u79fb\u52a8\u901f\u5ea6/u.test(value)) {
    restrict = true;
    classes.add("boots");
  }
  if (/(?:\u6655\u7729\u9608\u503c|\u91cd\u5ea6\u6655\u7729)/u.test(value) && !/\u76fe\u724c\s*\u6280\u80fd/u.test(value)) {
    restrict = true;
    classes.add("belt");
  }
  if (/\u8be5\u6b66\u5668/u.test(value)) {
    restrict = true;
    addClasses(classes, WEAPON_CLASSES);
  }
  if (/\u5f13\u7c7b/u.test(value)) {
    restrict = true;
    classes.add("bow");
  }
  if (/\u8eab\u4f53\u62a4\u7532/u.test(value)) {
    restrict = true;
    classes.add("body_armour");
  }
  return restrict ? uniqueClasses(Array.from(classes)) : null;
}

function inferClasses(text) {
  const value = String(text);
  const clauseClasses = classesFromClassText(firstClassClause(value));
  if (clauseClasses) return clauseClasses;

  const semanticClasses = semanticClassDecision(value);
  if (semanticClasses) return semanticClasses;

  return CURRENT_CLASSES.slice();
}

function inferType(text) {
  const value = String(text);
  if (/抗性|攻击\s*速度|施法速度|移动速度|物品稀有度|力量|敏捷|智慧|属性|暴击|持续时间|减速|再生率|充能/.test(value)) return "suffix";
  return "prefix";
}

function isPureSkillLevelGuarantee(text, template) {
  const value = `${text || ""} ${template || ""}`;
  const hasSkillLevel = /\u6280\u80fd\s*\u7b49\u7ea7|鎶€鑳界瓑绾/u.test(value);
  const hasOtherPrimaryStat = /\u9b54\u529b\u4e0a\u9650|榄斿姏涓婇檺|\u547d\u4e2d|鍛戒腑|\u901f\u5ea6|閫熷害/u.test(value);
  return hasSkillLevel && !hasOtherPrimaryStat;
}

function inferGuaranteeType(text, template) {
  if (isPureSkillLevelGuarantee(text, template)) return "suffix";
  return inferType(text);
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 90);
}

function inferGroup(text, slug) {
  const value = String(text);
  if (isPureSkillLevelGuarantee(value, "")) return "IncreaseSocketedGemLevel";
  if (/所有\s*元素抗性|全元素抗性/.test(value)) return "all_resistance";
  if (/火焰抗性/.test(value)) return "fire_resistance";
  if (/冰霜抗性/.test(value)) return "cold_resistance";
  if (/闪电抗性/.test(value)) return "lightning_resistance";
  if (/混沌抗性/.test(value)) return "chaos_resistance";
  if (/生命上限/.test(value)) return "maximum_life";
  if (/魔力上限/.test(value)) return "maximum_mana";
  if (/物品稀有度/.test(value)) return "item_rarity";
  if (/攻击\s*速度/.test(value)) return "attack_speed";
  if (/施法速度/.test(value)) return "cast_speed";
  if (/移动速度/.test(value)) return "movement_speed";
  if (/力量|敏捷|智慧|属性/.test(value)) return "attribute";
  if (/命中/.test(value)) return "accuracy";
  if (/暴击/.test(value)) return "critical";
  if (/符文结界/.test(value)) return "rune_ward";
  if (/附加[\s\S]*火焰/.test(value)) return "added_fire_damage";
  if (/附加[\s\S]*冰霜/.test(value)) return "added_cold_damage";
  if (/附加[\s\S]*闪电/.test(value)) return "added_lightning_damage";
  if (/附加[\s\S]*物理/.test(value)) return "added_physical_damage";
  if (/法术\s*伤害/.test(value)) return "spell_damage";
  if (/物理\s*伤害/.test(value)) return "physical_damage";
  if (/伤害/.test(value)) return "generic_damage";
  return `${slug}_${slugify(value)}`;
}

function extractTags(rawHtml, text) {
  const tags = new Set();
  for (const match of String(rawHtml).matchAll(/data-tag=["']([^"']+)["']/g)) {
    tags.add(match[1]);
  }
  for (const match of String(rawHtml).matchAll(/data-keyword=["']([^"']+)["']/g)) {
    keywordTags(match[1]).forEach((tag) => tags.add(tag));
  }
  const value = String(text);
  [
    ["火焰", "fire"],
    ["冰霜", "cold"],
    ["闪电", "lightning"],
    ["混沌", "chaos"],
    ["物理", "physical"],
    ["元素", "elemental"],
    ["生命", "life"],
    ["魔力", "mana"],
    ["速度", "speed"],
    ["抗性", "resistance"],
    ["伤害", "damage"],
    ["攻击", "attack"],
    ["法术", "caster"],
    ["召唤生物", "minion"],
    ["护甲", "armour"],
    ["闪避", "evasion"],
    ["能量护盾", "energy_shield"],
    ["暴击", "critical"],
  ].forEach(([needle, tag]) => {
    if (value.includes(needle)) tags.add(tag);
  });
  if (tags.has("amanamu_mod")) tags.add("amanamu");
  if (tags.has("kurgal_mod")) tags.add("kurgal");
  if (tags.has("ulaman_mod")) tags.add("ulaman");
  return Array.from(tags).sort();
}

function keywordTags(keyword) {
  const key = String(keyword || "").toLowerCase();
  const tags = {
    life: ["life"],
    mana: ["mana"],
    armour: ["armour", "defences"],
    evasion: ["evasion", "defences"],
    energyshield: ["energy_shield", "defences"],
    physical: ["physical"],
    fire: ["fire", "elemental"],
    cold: ["cold", "elemental"],
    lightning: ["lightning", "elemental"],
    chaos: ["chaos"],
    attack: ["attack"],
    attacks: ["attack"],
    spell: ["caster"],
    spells: ["caster"],
    critical: ["critical"],
    attributes: ["attribute"],
    strength: ["attribute", "strength"],
    dexterity: ["attribute", "dexterity"],
    intelligence: ["attribute", "intelligence"],
    speed: ["speed"],
    resistances: ["resistance"],
  };
  return tags[key] || [];
}

function operationFromEffect(effect) {
  if (/移除一条随机词缀/.test(effect)) return "rare_replace";
  if (/魔法/.test(effect) && /稀有/.test(effect)) return "magic_to_rare";
  if (/普通/.test(effect) && /魔法/.test(effect)) return "normal_to_magic";
  return "unknown";
}

function tierFromSlug(slug) {
  if (slug.startsWith("Lesser_")) return "lesser";
  if (slug.startsWith("Greater_")) return "greater";
  if (slug.startsWith("Perfect_")) return "perfect";
  return "normal";
}

function extractModsViewObject(html, sourceName) {
  const marker = "new ModsView(";
  const start = html.indexOf(marker);
  if (start < 0) throw new Error(`ModsView payload not found in ${sourceName}`);

  let depth = 0;
  let inString = false;
  let escaped = false;
  let end = -1;
  const pos = start + marker.length;

  for (let index = pos; index < html.length; index += 1) {
    const char = html[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === "\"") inString = false;
      continue;
    }
    if (char === "\"") {
      inString = true;
    } else if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        end = index + 1;
        break;
      }
    }
  }

  if (end < 0) throw new Error(`ModsView payload is incomplete in ${sourceName}`);
  return JSON.parse(html.slice(pos, end));
}

function generationType(rawMod) {
  const id = String(rawMod.ModGenerationTypeID);
  if (id === "1") return "prefix";
  if (id === "2") return "suffix";
  return null;
}

function normalizeSoulCoreMod(rawMod, source, category, index) {
  const core = SOUL_CORE_CATEGORIES[category];
  const type = generationType(rawMod);
  const weight = Number(rawMod.DropChance || 0);
  const level = Number(rawMod.Level || 0);
  const group = (rawMod.ModFamilyList && rawMod.ModFamilyList[0]) || `${category}_${index}`;
  const parsed = parseTemplateAndRolls(rawMod.str || "");

  if (!core || !type || weight <= 0 || level <= 0 || !parsed.template || parsed.rolls.length === 0) return null;

  return {
    id: `poe2db_soul_core_${category}_${source.page}_${index}`,
    baseId: `${source.page}_${category}_${group}_${level}_${index}`,
    ownerSlug: core.slug,
    soulCoreCategory: category,
    sourcePage: source.page,
    sourceUrl: `https://poe2db.tw/cn/${source.page}`,
    type,
    classes: source.classes,
    requiredBaseTags: source.requiredBaseTags || [],
    group: `soul_core_${category}_${group}`,
    name: stripHtml(rawMod.Name || core.name),
    template: parsed.template,
    level,
    weight,
    tier: "S?",
    tags: extractTags((rawMod.mod_no || []).join(" "), stripHtml(rawMod.str || "")),
    rolls: parsed.rolls,
    sourceText: stripHtml(rawMod.str || ""),
  };
}

function assignSoulCoreTiers(mods) {
  const buckets = new Map();
  for (const mod of mods) {
    const key = `${mod.soulCoreCategory}|${mod.classes.join(",")}|${mod.requiredBaseTags.join(",")}|${mod.type}|${mod.group}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(mod);
  }
  for (const bucket of buckets.values()) {
    const levels = Array.from(new Set(bucket.map((mod) => mod.level))).sort((a, b) => b - a);
    for (const mod of bucket) {
      mod.tier = `S${levels.indexOf(mod.level) + 1}`;
    }
  }
}

function dedupeSoulCoreMods(mods) {
  const seen = new Set();
  const unique = [];
  for (const mod of mods) {
    const key = [
      mod.soulCoreCategory,
      mod.classes.join(","),
      mod.requiredBaseTags.join(","),
      mod.type,
      mod.group,
      mod.template,
      mod.level,
      mod.weight,
      JSON.stringify(mod.rolls),
    ].join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(mod);
  }
  return unique;
}

function parseSoulCoreRows() {
  const modsByCore = new Map(Object.keys(SOUL_CORE_CATEGORIES).map((category) => [category, []]));
  const sourceSummary = [];

  for (const source of SOUL_CORE_SOURCES) {
    const html = readFileSync(join(cacheDir, `${source.page}.html`), "utf8");
    let payload;
    try {
      payload = extractModsViewObject(html, source.page);
    } catch (error) {
      sourceSummary.push({
        page: source.page,
        classes: source.classes,
        requiredBaseTags: source.requiredBaseTags || [],
        skipped: error.message,
      });
      continue;
    }

    const categoryCounts = {};
    for (const category of Object.keys(SOUL_CORE_CATEGORIES)) {
      const rows = Array.isArray(payload[category]) ? payload[category] : [];
      if (rows.length === 0) continue;
      categoryCounts[category] = rows.length;
      rows.forEach((rawMod, index) => {
        const mod = normalizeSoulCoreMod(rawMod, source, category, index);
        if (mod) modsByCore.get(category).push(mod);
      });
    }

    if (Object.keys(categoryCounts).length > 0) {
      sourceSummary.push({
        page: source.page,
        classes: source.classes,
        requiredBaseTags: source.requiredBaseTags || [],
        categories: categoryCounts,
      });
    }
  }

  const soulCores = Object.entries(SOUL_CORE_CATEGORIES).map(([category, config]) => {
    const mods = dedupeSoulCoreMods(modsByCore.get(category) || []);
    assignSoulCoreTiers(mods);
    mods.sort((a, b) => a.classes[0].localeCompare(b.classes[0]) || a.type.localeCompare(b.type) || a.group.localeCompare(b.group) || a.level - b.level);
    return Object.assign({}, config, {
      category,
      sourceUrl: `https://poe2db.tw/cn/${config.slug}`,
      mods,
    });
  }).filter((entry) => entry.mods.length > 0);

  return { soulCores, sourceSummary };
}

function parseGuaranteeLine(rawHtml, ownerSlug, ownerName, index) {
  const text = stripHtml(rawHtml);
  const parsed = parseTemplateAndRolls(rawHtml);
  const template = parsed.template.replace(/^[^:\uFF1A]+[:\uFF1A]\s*/, "");
  return {
    id: `${ownerSlug}_${index}`,
    baseId: `${ownerSlug}_${index}`,
    ownerSlug,
    type: inferGuaranteeType(text, template),
    classes: inferClasses(text),
    group: inferGroup(text, ownerSlug),
    name: ownerName,
    template,
    level: 1,
    weight: 1,
    tier: "G",
    tags: extractTags(rawHtml, text),
    rolls: parsed.rolls,
    sourceText: text,
  };
}

function parseCurrencyCardsFromEssencePage() {
  const html = readFileSync(join(cacheDir, "Essence.html"), "utf8");
  const marker = "<div class=\"col\"><div class=\"d-flex border-top rounded\">";
  const parts = html.split(marker).slice(1).map((part) => marker + part);
  const seen = new Set();
  const essences = [];
  const alloys = [];

  for (const part of parts) {
    const match = part.match(/<a\b[^>]*class="[^"]*item_currency[^"]*"[^>]*href="([^"]+)"[^>]*>[\s\S]*?<\/a>[\s\S]*?<a\b[^>]*class="[^"]*item_currency[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    const slug = (match && (match[2] || match[1]) || "").split("?")[0].split("#")[0];
    if (!/(Essence|Alloy)/.test(slug) || seen.has(slug)) continue;
    seen.add(slug);

    const name = stripHtml(match[3]);
    const rawMods = Array.from(part.matchAll(/<div class="explicitMod">([\s\S]*?)<\/div>/gi)).map((entry) => entry[1]);
    const effect = stripHtml(rawMods[0] || "");
    const mods = rawMods.slice(1).map((line, index) => parseGuaranteeLine(line, slug, name, index)).filter((mod) => mod.template);
    const record = {
      id: slug,
      slug,
      name,
      effect,
      operation: operationFromEffect(effect),
      tier: tierFromSlug(slug),
      sourcePage: "Essence",
      sourceUrl: "https://poe2db.tw/cn/Essence",
      mods,
    };

    if (slug.includes("Alloy")) alloys.push(record);
    else essences.push(record);
  }

  return { essences, alloys };
}

function currencySlugFromHtml(rawHtml) {
  const match = String(rawHtml).match(/href="([^"]+)"/i);
  return match ? match[1].split("?")[0].split("#")[0].replace(/^\/?cn\//, "") : "";
}

function currencyNameFromHtml(rawHtml) {
  return stripHtml(rawHtml).replace(/^\s*/, "");
}

function normalizeLiquidEmotionMod(rawMod, source, index) {
  const type = generationType(rawMod);
  const parsed = parseTemplateAndRolls(rawMod.str || "");
  const group = (rawMod.ModFamilyList && rawMod.ModFamilyList[0]) || rawMod.Code || `liquid_${index}`;
  if (!type || !parsed.template) return null;
  return {
    id: `poe2db_liquid_${source.page}_${slugify(currencySlugFromHtml(rawMod.Name || ""))}_${index}`,
    baseId: `${source.page}_liquid_${group}_${index}`,
    type,
    classes: ["jewel"],
    requiredBaseTags: ["time_lost_jewel"],
    requiredAnyBaseTags: source.allowedTag ? [source.allowedTag] : [],
    allowedBaseIds: [source.baseId],
    group: `liquid_${group}`,
    name: currencyNameFromHtml(rawMod.Name || "") || group,
    template: parsed.template,
    level: Number(rawMod.Level || 1) || 1,
    weight: 1,
    tier: "L",
    tags: extractTags((rawMod.mod_no || []).join(" "), stripHtml(rawMod.str || "")),
    rolls: parsed.rolls,
    sourceText: stripHtml(rawMod.str || ""),
  };
}

function liquidEmotionMapKey(mod) {
  return [mod.allowedBaseIds.join(","), mod.requiredAnyBaseTags.join(","), mod.type, mod.group, mod.template].join("|");
}

function appendLiquidEmotionMod(bySlug, slug, entry, mod) {
  if (!bySlug.has(slug)) bySlug.set(slug, Object.assign({}, entry, { mods: [] }));
  const existing = bySlug.get(slug);
  if (!existing.mods.some((candidate) => liquidEmotionMapKey(candidate) === liquidEmotionMapKey(mod))) {
    existing.mods.push(mod);
    return true;
  }
  return false;
}

function basicLiquidJewelSource(rowText) {
  return BASIC_LIQUID_JEWEL_SOURCES.find((source) => rowText.startsWith(`${source.label} `));
}

function normalizeBasicLiquidEmotionMod(slug, name, rowHtml, index) {
  const rowText = stripHtml(rowHtml);
  const source = basicLiquidJewelSource(rowText);
  if (!source) return null;

  const prefixPattern = new RegExp(`^\\s*${source.label}\\s+(?:\\u524d\\u7f00|\\u540e\\u7f00)\\s*[:\\uFF1A]\\s*`, "u");
  const rawBody = String(rowHtml).replace(prefixPattern, "");
  const parsed = parseTemplateAndRolls(rawBody);
  const sourceText = stripHtml(rawBody);
  if (!parsed.template) return null;
  const type = liquidEmotionCraftedType(rowText, sourceText);
  if (!type) return null;

  const group = `liquid_${slug}_${source.baseId}_${type}_${slugify(parsed.template)}`;
  return {
    id: `poe2db_liquid_${slug}_${source.baseId}_${type}_${index}`,
    baseId: `Liquid_Emotions_${slug}_${source.baseId}_${type}_${index}`,
    type,
    classes: ["jewel"],
    requiredBaseTags: [],
    requiredAnyBaseTags: source.requiredAnyBaseTags,
    allowedBaseIds: [source.baseId],
    group,
    name,
    template: parsed.template,
    level: 1,
    weight: 1,
    tier: "L",
    tags: extractTags(rawBody, sourceText),
    rolls: parsed.rolls,
    sourcePage: "Liquid_Emotions",
    sourceUrl: "https://poe2db.tw/cn/Liquid_Emotions",
    sourceText,
  };
}

function liquidEmotionCraftedType(rowText, sourceText) {
  const text = `${sourceText || ""} ${rowText || ""}`;
  if (/(?:\u5141\u8bb8\u7684|\u5141\u8a31\u7684|Allowed)\s*(?:\u524d\u7f00|\u524d\u7db4|Prefix)/iu.test(text)) return "suffix";
  if (/(?:\u5141\u8bb8\u7684|\u5141\u8a31\u7684|Allowed)\s*(?:\u540e\u7f00|\u5f8c\u7db4|Suffix)/iu.test(text)) return "prefix";
  if (/\u524d\u7f00/u.test(rowText)) return "prefix";
  if (/\u540e\u7f00/u.test(rowText)) return "suffix";
  return null;
}

function parseBasicLiquidEmotionRows(bySlug, sourceSummary) {
  const html = readFileSync(join(cacheDir, "Liquid_Emotions.html"), "utf8");
  const marker = "<div class=\"col\"><div class=\"d-flex border-top rounded\">";
  const parts = html.split(marker).slice(1).map((part) => marker + part);
  let cardCount = 0;
  let imported = 0;

  for (const part of parts) {
    if (!/Basic_Jewel|\u57fa\u672c\u73e0\u5b9d/u.test(part)) continue;
    const match = part.match(/<a\b[^>]*class="[^"]*item_currency[^"]*"[^>]*href="([^"]+)"[^>]*>[\s\S]*?<\/a>[\s\S]*?<a\b[^>]*class="[^"]*item_currency[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    const slug = ((match && (match[2] || match[1])) || "").split("?")[0].split("#")[0].replace(/^\/?cn\//, "");
    if (!slug || /^Ancient_/i.test(slug)) continue;

    const name = match ? currencyNameFromHtml(match[3]) : slug;
    const explicitRows = Array.from(part.matchAll(/<div class="explicitMod">([\s\S]*?)<\/div>/gi)).map((entry) => entry[1]);
    const effectRow = explicitRows.find((row) => /Basic_Jewel|\u57fa\u672c\u73e0\u5b9d/u.test(row)) || "";
    const mods = explicitRows
      .map((row, index) => normalizeBasicLiquidEmotionMod(slug, name, row, index))
      .filter(Boolean);
    if (mods.length === 0) continue;

    cardCount += 1;
    const entry = {
      id: slug,
      slug,
      name,
      effect: stripHtml(effectRow) || "\u79fb\u9664\u4e00\u6761\u968f\u673a\u8bcd\u7f00\uff0c\u5e76\u4e3a\u4e00\u4ef6\u7a00\u6709\u57fa\u672c\u73e0\u5b9d\u6dfb\u52a0\u4e00\u6761\u65b0\u7684\u5fc5\u5b9a\u51fa\u73b0\u7684\u5de5\u827a\u8bcd\u7f00\u3002",
      operation: "rare_replace",
      sourcePage: "Liquid_Emotions",
      sourceUrl: "https://poe2db.tw/cn/Liquid_Emotions",
    };
    for (const mod of mods) {
      if (appendLiquidEmotionMod(bySlug, slug, entry, mod)) imported += 1;
    }
  }

  sourceSummary.push({
    page: "Liquid_Emotions",
    baseIds: BASIC_LIQUID_JEWEL_SOURCES.map((source) => source.baseId),
    cards: cardCount,
    imported,
  });
}

function parseLiquidEmotionRows() {
  const bySlug = new Map();
  const sourceSummary = [];

  parseBasicLiquidEmotionRows(bySlug, sourceSummary);

  for (const source of LIQUID_EMOTION_SOURCES) {
    const html = readFileSync(join(cacheDir, `${source.page}.html`), "utf8");
    const payload = extractModsViewObject(html, source.page);
    const rows = Array.isArray(payload.liquid) ? payload.liquid : [];
    let imported = 0;

    rows.forEach((rawMod, index) => {
      const slug = currencySlugFromHtml(rawMod.Name || "");
      if (!slug) return;
      const mod = normalizeLiquidEmotionMod(rawMod, source, index);
      if (!mod) return;
      if (!bySlug.has(slug)) {
        bySlug.set(slug, {
          id: slug,
          slug,
          name: mod.name,
          effect: "移除一条随机词缀，并为一件稀有失落时空珠宝添加一条新的必定出现的工艺词缀。",
          operation: "rare_replace",
          sourcePage: "Jewels",
          sourceUrl: `https://poe2db.tw/cn/${source.page}`,
          mods: [],
        });
      }
      const entry = bySlug.get(slug);
      const key = [mod.allowedBaseIds.join(","), mod.requiredAnyBaseTags.join(","), mod.type, mod.group, mod.template].join("|");
      if (!entry.mods.some((existing) => [existing.allowedBaseIds.join(","), existing.requiredAnyBaseTags.join(","), existing.type, existing.group, existing.template].join("|") === key)) {
        entry.mods.push(mod);
        imported += 1;
      }
    });

    sourceSummary.push({
      page: source.page,
      baseId: source.baseId,
      requiredAnyBaseTags: source.allowedTag ? [source.allowedTag] : [],
      rows: rows.length,
      imported,
    });
  }

  return { liquidEmotions: Array.from(bySlug.values()).filter((entry) => entry.mods.length > 0), liquidEmotionSources: sourceSummary };
}

function catalystTagsFromEffect(rawHtml, effect) {
  const tags = new Set(extractTags(rawHtml, effect));
  const value = String(effect);
  if (/速度|Speed/i.test(value)) tags.add("speed");
  if (/属性|Attribute/i.test(value)) tags.add("attribute");
  if (/生命|Life/i.test(value)) tags.add("life");
  if (/魔力|Mana/i.test(value)) tags.add("mana");
  if (/暴击|Critical/i.test(value)) tags.add("critical");
  if (/抗性|Resistance/i.test(value)) tags.add("resistance");
  return Array.from(tags).sort();
}

function catalystClassesFromEffect(effect) {
  const value = String(effect);
  if (/珠宝|Jewel/i.test(value)) return ["jewel"];
  if (/戒指|项链|Ring|Amulet/i.test(value)) return ["ring", "amulet"];
  return ["ring", "amulet", "jewel"];
}

function parseCatalystCards() {
  const html = readFileSync(join(cacheDir, "Catalysts.html"), "utf8");
  const marker = "<div class=\"col\"><div class=\"d-flex border-top rounded\">";
  const parts = html.split(marker).slice(1).map((part) => marker + part);
  const seen = new Set();
  const catalysts = [];

  for (const part of parts) {
    const match = part.match(/<a\b[^>]*class="[^"]*item_currency[^"]*"[^>]*href="([^"]*Catalyst)"[^>]*>[\s\S]*?<\/a>[\s\S]*?<a\b[^>]*class="[^"]*item_currency[^"]*"[^>]*href="([^"]*Catalyst)"[^>]*>([\s\S]*?)<\/a>/i);
    const slug = (match && (match[2] || match[1]) || "").split("?")[0].split("#")[0];
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);

    const name = stripHtml(match[3]);
    const rawEffect = (part.match(/<div class="explicitMod">([\s\S]*?)<\/div>/i) || [])[1] || "";
    const effect = stripHtml(rawEffect);
    catalysts.push({
      id: slug,
      slug,
      name,
      effect,
      tags: catalystTagsFromEffect(rawEffect, effect),
      classes: catalystClassesFromEffect(effect),
      sourcePage: "Catalysts",
      sourceUrl: "https://poe2db.tw/cn/Catalysts",
    });
  }

  return catalysts;
}

function parseAffixType(typeText) {
  return /后缀|Suffix|Suf/i.test(typeText) ? "suffix" : "prefix";
}

function parseDesecratedSection(html, sectionId, endSectionId, idPrefix, forcedClasses) {
  const start = html.indexOf(`id="${sectionId}"`);
  const end = endSectionId ? html.indexOf(`id="${endSectionId}"`, start) : -1;
  const section = html.slice(start, end > start ? end : undefined);
  const rows = Array.from(section.matchAll(/<tr>([\s\S]*?)<\/tr>/gi)).map((match) => match[1]).filter((row) => /<td\b/i.test(row));
  return rows.map((row, index) => {
    const cells = Array.from(row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)).map((match) => match[1]);
    const name = stripHtml(cells[0] || "");
    const hasLevelColumn = cells.length >= 4;
    const level = hasLevelColumn ? Number(stripHtml(cells[1] || "1")) || 1 : 1;
    const typeText = stripHtml(cells[hasLevelColumn ? 2 : 1] || "");
    const rawDescription = cells[hasLevelColumn ? 3 : 2] || "";
    const text = stripHtml(rawDescription);
    const parsed = parseTemplateAndRolls(rawDescription);
    const group = `${name}_${inferGroup(parsed.template || text, "desecrated")}`;

    return {
      id: `${idPrefix}_${index}`,
      baseId: `${idPrefix}_${slugify(group)}`,
      type: parseAffixType(typeText),
      classes: forcedClasses ? forcedClasses.slice() : inferClasses(text),
      group,
      name,
      template: parsed.template,
      level,
      weight: 1,
      tier: "D?",
      tags: extractTags(rawDescription, text),
      rolls: parsed.rolls,
      desecrated: true,
      sourcePage: "Desecrated_Modifiers",
      sourceUrl: "https://poe2db.tw/cn/Desecrated_Modifiers",
      sourceSection: sectionId,
      sourceText: text,
    };
  });
}

function parseDesecratedRows() {
  const html = readFileSync(join(cacheDir, "Desecrated_Modifiers.html"), "utf8");
  const mods = parseDesecratedSection(html, "JewelsDesecratedMods", "DesecratedMods", "poe2db_desecrated_jewel", ["jewel"])
    .concat(parseDesecratedSection(html, "DesecratedMods", "DesecratedWaystoneMods", "poe2db_desecrated", null))
    .concat(parseDesecratedSection(html, "DesecratedWaystoneMods", "AbyssalifyRef", "poe2db_desecrated_waystone", ["waystone"]));

  assignDesecratedTiers(mods);
  return mods;
}

function assignDesecratedTiers(mods) {
  const buckets = new Map();
  for (const mod of mods) {
    const key = `${mod.type}|${mod.group}|${mod.template}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(mod);
  }
  for (const bucket of buckets.values()) {
    const levels = Array.from(new Set(bucket.map((mod) => mod.level))).sort((a, b) => b - a);
    for (const mod of bucket) {
      mod.tier = `D${levels.indexOf(mod.level) + 1}`;
    }
  }
}

function importAll() {
  const { essences, alloys } = parseCurrencyCardsFromEssencePage();
  const { liquidEmotions, liquidEmotionSources } = parseLiquidEmotionRows();
  const catalysts = parseCatalystCards();
  const desecratedMods = parseDesecratedRows();
  const { soulCores, sourceSummary: soulCoreSources } = parseSoulCoreRows();

  mkdirSync(dataDir, { recursive: true });
  const payload = {
    version: "poe2db-crafting-2026-07-15-desecration-routing1",
    generatedAt: new Date().toISOString(),
    source: "PoE2DB Essence, Catalyst, Desecrated Modifiers, Jewel Liquid Emotion, and Soul Core pages cached under .cache/",
    notes: [
      "Essence and alloy guaranteed modifier text is parsed from PoE2DB item cards.",
      "Liquid Emotion crafted jewel modifiers are parsed from Time-Lost jewel ModsView liquid rows.",
      "Catalyst actions are parsed from PoE2DB Catalysts cards and preserve their listed affected mod tags.",
      "Desecrated modifier rows on PoE2DB do not expose DropChance weights; imported desecrated rows use equal weights and keep source tags for filtering.",
      "Desecrated rows with explicit equipment text are narrowed to that equipment class; unclassified rows remain broad because PoE2DB notes revealed desecrated modifiers may include base modifiers.",
      "Soul Core modifier rows are parsed from PoE2DB ModsView categories and preserve DropChance weights from those rows.",
    ],
    essences,
    alloys,
    liquidEmotions,
    catalysts,
    desecratedMods,
    soulCores,
    soulCoreSources,
    liquidEmotionSources,
  };

  const output = [
    "(function (root) {",
    "  root.POE2DB_CRAFTING_DATA = ",
    JSON.stringify(payload, null, 2),
    ";",
    "})(typeof globalThis !== \"undefined\" ? globalThis : window);",
    "",
  ].join("\n");

  writeFileSync(join(dataDir, "poe2db-crafting-data.js"), output, "utf8");
  return {
    essences: essences.length,
    alloys: alloys.length,
    liquidEmotions: liquidEmotions.length,
    catalysts: catalysts.length,
    desecratedMods: desecratedMods.length,
    soulCores: soulCores.map((entry) => ({ id: entry.id, mods: entry.mods.length })),
  };
}

export const result = importAll();
