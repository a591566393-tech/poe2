import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const cacheDir = join(rootDir, ".cache");
const dataDir = join(rootDir, "data");

const SOURCES = [
  source("Claws", "claw", "爪", ["weapon", "attack_weapon", "one_hand_weapon"]),
  source("Daggers", "dagger", "匕首", ["weapon", "attack_weapon", "one_hand_weapon"]),
  source("Wands", "wand", "法杖", ["weapon", "caster_weapon", "one_hand_weapon"]),
  source("One_Hand_Swords", "one_hand_sword", "单手剑", ["weapon", "attack_weapon", "one_hand_weapon"]),
  source("One_Hand_Axes", "one_hand_axe", "单手斧", ["weapon", "attack_weapon", "one_hand_weapon"]),
  source("One_Hand_Maces", "one_hand_mace", "单手锤", ["weapon", "attack_weapon", "one_hand_weapon"]),
  source("Sceptres", "sceptre", "权杖", ["weapon", "caster_weapon", "one_hand_weapon"]),
  source("Spears", "spear", "长矛", ["weapon", "attack_weapon", "two_hand_weapon"]),
  source("Flails", "flail", "连枷", ["weapon", "attack_weapon", "one_hand_weapon"]),
  source("Bows", "bow", "弓", ["weapon", "attack_weapon", "two_hand_weapon"]),
  source("Staves", "staff", "长杖", ["weapon", "caster_weapon", "two_hand_weapon"]),
  source("Two_Hand_Swords", "two_hand_sword", "双手剑", ["weapon", "attack_weapon", "two_hand_weapon"]),
  source("Two_Hand_Axes", "two_hand_axe", "双手斧", ["weapon", "attack_weapon", "two_hand_weapon"]),
  source("Two_Hand_Maces", "two_hand_mace", "双手锤", ["weapon", "attack_weapon", "two_hand_weapon"]),
  source("Quarterstaves", "quarterstaff", "武杖", ["weapon", "attack_weapon", "two_hand_weapon"]),
  source("Crossbows", "crossbow", "十字弓", ["weapon", "attack_weapon", "two_hand_weapon"]),
  source("Traps", "trap", "陷阱", ["weapon", "attack_weapon"]),
  source("Jewels", "jewel", "珠宝", ["jewel"]),
  source("Talismans", "talisman", "魔符", ["jewellery"]),
  source("Quivers", "quiver", "箭袋", ["offhand", "quiver"]),
  source("Shields", "shield", "盾牌", ["offhand", "armour", "shield"]),
  source("Bucklers", "buckler", "圆盾", ["offhand", "armour", "buckler"]),
  source("Foci", "focus", "法器", ["offhand", "caster_offhand", "focus"]),
  source("Gloves", "gloves", "手套", ["armour", "gloves"]),
  source("Boots", "boots", "鞋子", ["armour", "boots"]),
  source("Body_Armours", "body_armour", "身体护甲", ["armour", "body_armour"]),
  source("Helmets", "helmet", "头盔", ["armour", "helmet"]),
  source("Amulets", "amulet", "项链", ["jewellery", "amulet"]),
  source("Rings", "ring", "戒指", ["jewellery", "ring"]),
  source("Belts", "belt", "腰带", ["jewellery", "belt"]),
];

function source(page, classId, classLabel, tags) {
  return { page, classId, classLabel, tags };
}

function decodeEntities(value) {
  return String(value)
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCodePoint(parseInt(num, 10)));
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
    .replace(/<span class=["']ndash["']>[\s\S]*?<\/span>/g, "-")
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
    .replace(/[—–]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  let prefix = "";
  if (text.startsWith("+") || text.startsWith("-")) {
    prefix = text[0];
    text = text.slice(1);
  }
  text = text.replace(/^\((.*)\)$/g, "$1");

  const parts = text.split(/\s*-\s*/);
  const minText = parts[0];
  const maxText = parts.length > 1 ? parts[1] : parts[0];
  const precision = Math.max(precisionOf(minText), precisionOf(maxText));

  return {
    min: parseNumber(minText),
    max: parseNumber(maxText),
    scale: precision > 0 ? Math.pow(10, precision) : 1,
    placeholder: `${prefix}#`,
  };
}

function parseTemplateAndRolls(rawHtml) {
  let index = 0;
  const rolls = [];
  const placeholders = [];
  const marked = normalizeValueMarkup(rawHtml).replace(/<ROLL>([\s\S]*?)<\/ROLL>/g, (_, value) => {
    const roll = parseRoll(value);
    rolls.push({ min: roll.min, max: roll.max, scale: roll.scale });
    placeholders.push(roll.placeholder);
    const token = `__ROLL_${index}__`;
    index += 1;
    return token;
  });

  let template = stripHtml(marked);
  for (let rollIndex = 0; rollIndex < rolls.length; rollIndex += 1) {
    template = template.replace(`__ROLL_${rollIndex}__`, placeholders[rollIndex] || "#");
  }

  return {
    template: template.replace(/\s+([,%])/g, "$1").replace(/\s+/g, " ").trim(),
    rolls: rolls.filter((roll) => Number.isFinite(roll.min) && Number.isFinite(roll.max)),
  };
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function stableId(sourceEntry, href, index) {
  let slug = slugify(href);
  const stripSuffixes = {
    ring: "_ring",
    amulet: "_amulet",
    belt: "_belt",
    wand: "_wand",
  };
  const suffix = stripSuffixes[sourceEntry.classId];
  if (suffix && slug.endsWith(suffix)) slug = slug.slice(0, -suffix.length);
  return `${sourceEntry.classId}_${slug || index}`;
}

function extractTags(sourceEntry, properties, implicits) {
  const tags = new Set(sourceEntry.tags);
  const text = `${properties.join(" ")} ${implicits.map((entry) => entry.template).join(" ")}`;

  if (/护甲/.test(text)) tags.add("def_armour");
  if (/闪避/.test(text)) tags.add("def_evasion");
  if (/能量护盾/.test(text)) tags.add("def_energy_shield");
  if (/符文结界/.test(text)) tags.add("runic");
  if (/物理伤害|攻击/.test(text) && sourceEntry.tags.includes("weapon")) tags.add("attack_weapon");
  if (/法术|施法|魔力/.test(text) && sourceEntry.tags.includes("weapon")) tags.add("caster_weapon");
  if (/火焰/.test(text)) tags.add("fire");
  if (/冰霜/.test(text)) tags.add("cold");
  if (/闪电/.test(text)) tags.add("lightning");
  if (/混沌/.test(text)) tags.add("chaos");
  if (/抗性/.test(text)) tags.add("resistance");

  return Array.from(tags).sort();
}

function addJewelBaseTags(base) {
  const href = String(base.href || "");
  const isTimeLost = /^Time-Lost_/i.test(href);
  if (/_Ruby$/i.test(href) || /^Ruby$/i.test(href)) {
    base.tags.push("jewel_ruby", isTimeLost ? "str_radius_jewel" : "strjewel");
  }
  if (/_Emerald$/i.test(href) || /^Emerald$/i.test(href)) {
    base.tags.push("jewel_emerald", isTimeLost ? "dex_radius_jewel" : "dexjewel");
  }
  if (/_Sapphire$/i.test(href) || /^Sapphire$/i.test(href)) {
    base.tags.push("jewel_sapphire", isTimeLost ? "int_radius_jewel" : "intjewel");
  }
  if (/_Diamond$/i.test(href) || /^Diamond$/i.test(href)) {
    base.tags.push("jewel_diamond");
    base.tags.push(...(isTimeLost
      ? ["str_radius_jewel", "dex_radius_jewel", "int_radius_jewel"]
      : ["strjewel", "dexjewel", "intjewel"]));
  }
  if (isTimeLost) base.tags.push("time_lost_jewel", "radius_jewel");
  if (/^Timeless_Jewel$/i.test(href)) base.tags.push("timeless_jewel");
  base.tags = Array.from(new Set(base.tags)).sort();
}

function parseAffixAdjust(implicitEntries) {
  const adjust = { prefix: 0, suffix: 0 };
  implicitEntries.forEach((entry) => {
    let rollIndex = 0;
    const regex = /(允许的前缀|允许的后缀)\s*([+-]?)\s*(#|[+-]?\d+)/g;
    let match = regex.exec(entry.template);
    while (match) {
      const type = match[1] === "允许的前缀" ? "prefix" : "suffix";
      const token = match[3];
      const sign = match[2] === "-" || token.startsWith("-") ? -1 : 1;
      let value = 0;
      if (token === "#") {
        const roll = entry.rolls[rollIndex];
        value = roll ? Number(roll.min) || Number(roll.max) || 0 : 0;
        rollIndex += 1;
      } else {
        value = Math.abs(Number(token) || 0);
      }
      adjust[type] += sign * value;
      match = regex.exec(entry.template);
    }
  });
  return adjust;
}

function parseLevel(cardHtml) {
  const text = stripHtml(cardHtml);
  const match = text.match(/等级\s*(\d+)/);
  return match ? Number(match[1]) : 1;
}

function parseBaseCard(cardHtml, sourceEntry, index) {
  const anchorMatches = Array.from(cardHtml.matchAll(/<a\b[^>]*class="([^"]*\bwhiteitem\b[^"]*)"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi));
  const namedAnchor = anchorMatches
    .map((match) => ({ className: match[1], href: match[2], text: stripHtml(match[3]) }))
    .filter((entry) => sourceEntry.classId !== "jewel" || /\bJewel\b/.test(entry.className))
    .filter((entry) => entry.text)
    .pop();

  if (!namedAnchor) return null;

  const properties = Array.from(cardHtml.matchAll(/<div class="property">([\s\S]*?)<\/div>/gi))
    .map((match) => stripHtml(match[1]))
    .filter((entry) => entry && !/^Item Level\s*:/i.test(entry));
  const implicits = Array.from(cardHtml.matchAll(/<div class="implicitMod">([\s\S]*?)<\/div>/gi))
    .map((match) => parseTemplateAndRolls(match[1]))
    .filter((entry) => entry.template && !/hidden|local weapon implicit/i.test(entry.template));
  const affixAdjust = parseAffixAdjust(implicits);

  const base = {
    id: stableId(sourceEntry, namedAnchor.href, index),
    sourcePage: sourceEntry.page,
    sourceUrl: `https://poe2db.tw/cn/${sourceEntry.page}`,
    href: namedAnchor.href,
    classId: sourceEntry.classId,
    classLabel: sourceEntry.classLabel,
    name: namedAnchor.text,
    english: namedAnchor.href.replace(/_/g, " "),
    requiredLevel: parseLevel(cardHtml),
    defenses: properties,
    tags: [],
    implicits,
  };

  base.tags = extractTags(sourceEntry, properties, implicits);
  if (sourceEntry.classId === "jewel") addJewelBaseTags(base);
  if (sourceEntry.tags.includes("weapon")) base.maxSockets = 2;
  if (sourceEntry.tags.includes("armour") || sourceEntry.tags.includes("offhand")) base.maxSockets = 1;
  if (affixAdjust.prefix || affixAdjust.suffix) base.affixAdjust = affixAdjust;

  return base;
}

function parseSource(sourceEntry) {
  const html = readFileSync(join(cacheDir, `${sourceEntry.page}.html`), "utf8");
  const marker = "<div class=\"col\"><div class=\"d-flex border-top rounded\">";
  return html.split(marker).slice(1)
    .map((part) => marker + part)
    .filter((part) => /\bwhiteitem\b/.test(part))
    .map((part, index) => parseBaseCard(part, sourceEntry, index))
    .filter(Boolean);
}

function dedupeBases(bases) {
  const seen = new Map();
  return bases.map((base) => {
    let id = base.id;
    const key = `${base.classId}|${base.href}|${base.name}|${base.implicits.map((entry) => entry.template).join("|")}|${base.defenses.join("|")}`;
    if (!seen.has(id)) {
      seen.set(id, new Set([key]));
      return base;
    }
    const keys = seen.get(id);
    if (keys.has(key)) return null;
    keys.add(key);
    let suffix = keys.size;
    while (seen.has(`${id}_${suffix}`)) suffix += 1;
    id = `${id}_${suffix}`;
    return { ...base, id };
  }).filter(Boolean);
}

function importAll() {
  const bases = dedupeBases(SOURCES.flatMap(parseSource));
  bases.sort((a, b) => a.classLabel.localeCompare(b.classLabel, "zh-Hans") || a.requiredLevel - b.requiredLevel || a.name.localeCompare(b.name, "zh-Hans"));

  mkdirSync(dataDir, { recursive: true });
  const payload = {
    version: "poe2db-bases-2026-07-12-jewel-tags1",
    generatedAt: new Date().toISOString(),
    source: "PoE2DB equipment item class pages cached under .cache/",
    sourceUrls: SOURCES.map((entry) => `https://poe2db.tw/cn/${entry.page}`),
    notes: [
      "White-item base cards are parsed from PoE2DB class pages.",
      "English labels are derived from PoE2DB href slugs when the Chinese page does not expose English base names.",
    ],
    bases,
  };

  const output = [
    "(function (root) {",
    "  root.POE2DB_BASE_DATA = ",
    JSON.stringify(payload, null, 2),
    ";",
    "})(typeof globalThis !== \"undefined\" ? globalThis : window);",
    "",
  ].join("\n");

  writeFileSync(join(dataDir, "poe2db-base-data.js"), output, "utf8");
  return {
    bases: bases.length,
    byClass: Object.fromEntries(SOURCES.map((entry) => [entry.classId, bases.filter((base) => base.classId === entry.classId).length])),
  };
}

export const result = importAll();
