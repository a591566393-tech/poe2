import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const cacheDir = join(rootDir, ".cache");
const dataDir = join(rootDir, "data");

const DEFENCE_PROFILES = {
  str: ["def_armour"],
  dex: ["def_evasion"],
  int: ["def_energy_shield"],
  str_dex: ["def_armour", "def_evasion"],
  str_int: ["def_armour", "def_energy_shield"],
  dex_int: ["def_evasion", "def_energy_shield"],
  str_dex_int: ["def_armour", "def_evasion", "def_energy_shield"],
};

function defenceSources(prefix, classId, profiles) {
  return profiles.map((profile) => ({
    page: `${prefix}_${profile}`,
    classes: [classId],
    label: `${prefix}_${profile}`,
    requiredBaseTags: DEFENCE_PROFILES[profile] || [],
  }));
}

const sources = [
  { page: "Claws", classes: ["claw"], label: "Claws" },
  { page: "Daggers", classes: ["dagger"], label: "Daggers" },
  { page: "Wands", classes: ["wand"], label: "Wands" },
  { page: "One_Hand_Swords", classes: ["one_hand_sword"], label: "One_Hand_Swords" },
  { page: "One_Hand_Axes", classes: ["one_hand_axe"], label: "One_Hand_Axes" },
  { page: "One_Hand_Maces", classes: ["one_hand_mace"], label: "One_Hand_Maces" },
  { page: "Sceptres", classes: ["sceptre"], label: "Sceptres" },
  { page: "Spears", classes: ["spear"], label: "Spears" },
  { page: "Flails", classes: ["flail"], label: "Flails" },
  { page: "Bows", classes: ["bow"], label: "Bows" },
  { page: "Staves", classes: ["staff"], label: "Staves" },
  { page: "Two_Hand_Swords", classes: ["two_hand_sword"], label: "Two_Hand_Swords" },
  { page: "Two_Hand_Axes", classes: ["two_hand_axe"], label: "Two_Hand_Axes" },
  { page: "Two_Hand_Maces", classes: ["two_hand_mace"], label: "Two_Hand_Maces" },
  { page: "Quarterstaves", classes: ["quarterstaff"], label: "Quarterstaves" },
  { page: "Crossbows", classes: ["crossbow"], label: "Crossbows" },
  { page: "Traps", classes: ["trap"], label: "Traps" },
  { page: "Talismans", classes: ["talisman"], label: "Talismans" },
  { page: "Quivers", classes: ["quiver"], label: "Quivers" },
  ...defenceSources("Shields", "shield", ["str", "str_dex", "str_int"]),
  { page: "Bucklers", classes: ["buckler"], label: "Bucklers" },
  { page: "Foci", classes: ["focus"], label: "Foci" },
  ...defenceSources("Gloves", "gloves", ["str", "dex", "int", "str_dex", "str_int", "dex_int"]),
  ...defenceSources("Boots", "boots", ["str", "dex", "int", "str_dex", "str_int", "dex_int"]),
  ...defenceSources("Body_Armours", "body_armour", ["str", "dex", "int", "str_dex", "str_int", "dex_int", "str_dex_int"]),
  ...defenceSources("Helmets", "helmet", ["str", "dex", "int", "str_dex", "str_int", "dex_int"]),
  { page: "Amulets", classes: ["amulet"], label: "Amulets" },
  { page: "Rings", classes: ["ring"], label: "Rings" },
  { page: "Belts", classes: ["belt"], label: "Belts" },
];

const jewelSources = [
  { page: "Ruby", pool: "ordinary", allowedTag: "strjewel" },
  { page: "Emerald", pool: "ordinary", allowedTag: "dexjewel" },
  { page: "Sapphire", pool: "ordinary", allowedTag: "intjewel" },
  { page: "Time-Lost_Ruby", pool: "time_lost", allowedTag: "str_radius_jewel" },
  { page: "Time-Lost_Emerald", pool: "time_lost", allowedTag: "dex_radius_jewel" },
  { page: "Time-Lost_Sapphire", pool: "time_lost", allowedTag: "int_radius_jewel" },
];

const currencySources = [
  { action: "transmutation", tier: "greater", page: "Greater_Orb_of_Transmutation" },
  { action: "transmutation", tier: "perfect", page: "Perfect_Orb_of_Transmutation" },
  { action: "augmentation", tier: "greater", page: "Greater_Orb_of_Augmentation" },
  { action: "augmentation", tier: "perfect", page: "Perfect_Orb_of_Augmentation" },
  { action: "regal", tier: "greater", page: "Greater_Regal_Orb" },
  { action: "regal", tier: "perfect", page: "Perfect_Regal_Orb" },
  { action: "exalted", tier: "greater", page: "Greater_Exalted_Orb" },
  { action: "exalted", tier: "perfect", page: "Perfect_Exalted_Orb" },
  { action: "chaos", tier: "greater", page: "Greater_Chaos_Orb" },
  { action: "chaos", tier: "perfect", page: "Perfect_Chaos_Orb" },
];

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
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, ""))
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/['\u2019]/g, "")
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function extractTabSection(html, id, nextId) {
  const start = html.indexOf(`id="${id}"`);
  if (start < 0) throw new Error(`${id} section not found`);
  const next = nextId ? html.indexOf(`id="${nextId}"`, start + id.length) : -1;
  return html.slice(start, next > start ? next : html.length);
}

function extractTableCells(rowHtml) {
  return Array.from(String(rowHtml).matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)).map((match) => match[1]);
}

function typeFromCell(cellHtml) {
  const text = stripHtml(cellHtml);
  if (/前缀|前綴|鍓嶇紑/.test(text)) return "prefix";
  if (/后缀|後綴|鍚庣紑/.test(text)) return "suffix";
  return null;
}

function removeBadgeMarkup(html) {
  return String(html).replace(/<span\b[^>]*\bbadge\b[^>]*>[\s\S]*?<\/span>/gi, "");
}

function extractHtmlTags(html) {
  const tags = new Set();
  for (const match of String(html).matchAll(/data-tag="([^"]+)"/g)) tags.add(match[1]);
  return Array.from(tags).sort();
}

function normalizeJewelRow(cells, source, index) {
  if (cells.length < 4) return null;
  const name = stripHtml(cells[0]);
  const level = Number(stripHtml(cells[1])) || 1;
  const type = typeFromCell(cells[2]);
  const descriptionHtml = removeBadgeMarkup(cells[3]);
  const parsed = parseTemplateAndRolls(descriptionHtml);
  if (!type || !parsed.template) return null;

  const groupSeed = name || parsed.template;
  const group = `jewel_${type}_${slugify(groupSeed) || index}`;
  return {
    id: `poe2db_${source.page}_JewelMods_${index}`,
    sourcePage: source.page,
    sourceUrl: `https://poe2db.tw/cn/${source.page}#JewelMods`,
    baseId: `${source.page}_${group}_${level}_${index}`,
    type,
    classes: source.classes,
    requiredBaseTags: source.requiredBaseTags || [],
    group,
    name: name || group,
    template: parsed.template,
    level,
    weight: 1,
    tier: "T?",
    tags: extractHtmlTags(cells[3]),
    rolls: parsed.rolls,
    raw: {
      sourceSection: "JewelMods",
      weightSource: "PoE2DB JewelMods table has no DropChance column; imported as equal table-row weight.",
    },
  };
}

function parseJewelModsTable(html, source) {
  const section = extractTabSection(html, "JewelMods", "JewelCorruptMods");
  const rows = Array.from(section.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi))
    .map((match) => extractTableCells(match[1]))
    .filter((cells) => cells.length > 0);
  return rows
    .map((cells, index) => normalizeJewelRow(cells, source, index))
    .filter(Boolean);
}

function normalizeValueMarkup(html) {
  return String(html)
    .replace(/<span class=["']ndash["']>[\s\S]*?<\/span>/g, "—")
    .replace(/<span class=["']mod-value["']>/g, "<MODVALUE>")
    .replace(/<\/span>/g, "</MODVALUE>");
}

function parseNumber(value) {
  return Number(String(value).replace(/[()+]/g, ""));
}

function precisionOf(value) {
  const match = String(value).match(/\.(\d+)/);
  return match ? match[1].length : 0;
}

function parseRoll(rawValue) {
  let text = stripHtml(rawValue).replace(/−/g, "-").trim();
  let prefix = "";
  if (text.startsWith("+")) {
    prefix = "+";
    text = text.slice(1);
  } else if (text.startsWith("-")) {
    prefix = "-";
    text = text.slice(1);
  }
  text = text.replace(/^\((.*)\)$/g, "$1");

  const parts = text.split("—");
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

function parseTemplateAndRolls(str) {
  const normalized = normalizeValueMarkup(str);
  const parts = normalized.split(/(<MODVALUE>[\s\S]*?<\/MODVALUE>)/g);
  const rolls = [];
  let template = "";

  for (const part of parts) {
    if (!part) continue;
    const valueMatch = part.match(/^<MODVALUE>([\s\S]*?)<\/MODVALUE>$/);
    if (valueMatch) {
      const roll = parseRoll(valueMatch[1]);
      rolls.push({ min: roll.min, max: roll.max, scale: roll.scale });
      template += roll.placeholder;
    } else {
      template += stripHtml(part);
    }
  }

  return {
    template: template.replace(/\s+/g, " ").trim(),
    rolls,
  };
}

function extractTags(rawMod) {
  const tags = new Set();
  for (const tag of rawMod.fossil_no || []) tags.add(String(tag));
  for (const html of rawMod.mod_no || []) {
    for (const match of String(html).matchAll(/data-tag="([^"]+)"/g)) tags.add(match[1]);
    const text = stripHtml(html);
    if (text) tags.add(text);
  }
  return Array.from(tags).sort();
}

function generationType(rawMod) {
  const id = String(rawMod.ModGenerationTypeID);
  if (id === "1") return "prefix";
  if (id === "2") return "suffix";
  return null;
}

function normalizeRawMod(rawMod, source, index) {
  const type = generationType(rawMod);
  const weight = Number(rawMod.DropChance || 0);
  const level = Number(rawMod.Level || 0);
  const group = (rawMod.ModFamilyList && rawMod.ModFamilyList[0]) || `unknown_${source.page}_${index}`;
  const parsed = parseTemplateAndRolls(rawMod.str || "");

  if (!type || weight <= 0 || level <= 0 || !parsed.template || (!source.allowFixed && parsed.rolls.length === 0)) return null;

  return {
    id: `poe2db_${source.page}_${index}`,
    sourcePage: source.page,
    sourceUrl: `https://poe2db.tw/cn/${source.page}`,
    baseId: `${source.page}_${group}_${level}_${index}`,
    type,
    classes: source.classes,
    requiredBaseTags: source.requiredBaseTags || [],
    requiredAnyBaseTags: source.requiredAnyBaseTags || [],
    group,
    name: stripHtml(rawMod.Name || group),
    template: parsed.template,
    level,
    weight,
    tier: "T?",
    tags: extractTags(rawMod),
    rolls: parsed.rolls,
    raw: {
      ModFamilyList: rawMod.ModFamilyList || [],
      spawn_no: rawMod.spawn_no || [],
      adds_no: rawMod.adds_no || [],
      hover: rawMod.hover || "",
      jewelPool: source.jewelPool || "",
    },
  };
}

function jewelModKey(mod) {
  return [
    mod.raw.jewelPool,
    mod.type,
    mod.group,
    mod.level,
    mod.weight,
    mod.template,
    JSON.stringify(mod.rolls),
  ].join("|");
}

function importJewelMods() {
  const merged = new Map();
  const sourceSummary = [];

  for (const jewelSource of jewelSources) {
    const source = {
      page: jewelSource.page,
      classes: ["jewel"],
      label: jewelSource.page,
      requiredAnyBaseTags: [jewelSource.allowedTag],
      allowFixed: true,
      jewelPool: jewelSource.pool,
    };
    const html = readFileSync(join(cacheDir, `${source.page}.html`), "utf8");
    const payload = extractModsViewObject(html, source.page);
    const normalMods = Array.isArray(payload.normal) ? payload.normal : [];
    let imported = 0;

    normalMods.forEach((rawMod, index) => {
      const mod = normalizeRawMod(rawMod, source, index);
      if (!mod) return;
      const key = jewelModKey(mod);
      const existing = merged.get(key);
      if (existing) {
        existing.requiredAnyBaseTags = Array.from(new Set(existing.requiredAnyBaseTags.concat(mod.requiredAnyBaseTags))).sort();
        existing.raw.sourcePages = Array.from(new Set(existing.raw.sourcePages.concat(source.page))).sort();
        return;
      }

      mod.id = `poe2db_Jewels_${jewelSource.pool}_${merged.size}`;
      mod.baseId = `Jewels_${jewelSource.pool}_${mod.group}_${mod.level}_${merged.size}`;
      mod.sourcePage = "Jewels";
      mod.sourceUrl = `https://poe2db.tw/cn/${source.page}`;
      mod.raw.sourcePages = [source.page];
      merged.set(key, mod);
      imported += 1;
    });

    sourceSummary.push({
      page: source.page,
      url: `https://poe2db.tw/cn/${source.page}`,
      classes: source.classes,
      requiredAnyBaseTags: source.requiredAnyBaseTags,
      normalRows: normalMods.length,
      imported,
      weightSource: "PoE2DB individual jewel ModsView.normal DropChance.",
    });
  }

  return {
    mods: Array.from(merged.values()),
    sourceSummary,
  };
}

function assignTiers(mods) {
  const buckets = new Map();
  for (const mod of mods) {
    const key = `${mod.sourcePage}|${mod.classes.join(",")}|${mod.type}|${mod.group}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(mod);
  }

  for (const bucket of buckets.values()) {
    const levels = Array.from(new Set(bucket.map((mod) => mod.level))).sort((a, b) => b - a);
    for (const mod of bucket) {
      mod.tier = `T${levels.indexOf(mod.level) + 1}`;
    }
  }
}

function importAll() {
  const mods = [];
  const sourceSummary = [];
  const currencyTiers = {
    greater: { minLevelByAction: {}, sources: {} },
    perfect: { minLevelByAction: {}, sources: {} },
  };

  const importedJewels = importJewelMods();
  mods.push(...importedJewels.mods);
  sourceSummary.push(...importedJewels.sourceSummary);

  for (const source of sources) {
    const html = readFileSync(join(cacheDir, `${source.page}.html`), "utf8");
    let payload;
    try {
      payload = extractModsViewObject(html, source.page);
    } catch (error) {
      sourceSummary.push({
        page: source.page,
        url: `https://poe2db.tw/cn/${source.page}`,
        classes: source.classes,
        requiredBaseTags: source.requiredBaseTags || [],
        normalRows: 0,
        imported: 0,
        skipped: error.message,
      });
      continue;
    }
    const normalMods = payload.normal || [];
    let imported = 0;

    normalMods.forEach((rawMod, index) => {
      const mod = normalizeRawMod(rawMod, source, index);
      if (!mod) return;
      mods.push(mod);
      imported += 1;
    });

    sourceSummary.push({
      page: source.page,
      url: `https://poe2db.tw/cn/${source.page}`,
      classes: source.classes,
      requiredBaseTags: source.requiredBaseTags || [],
      normalRows: normalMods.length,
      imported,
    });
  }

  for (const source of currencySources) {
    const html = readFileSync(join(cacheDir, "currency", `${source.page}.html`), "utf8");
    const text = stripHtml(html);
    const minLevelMatch = text.match(/最低词缀等级\s*:\s*(\d+)/);
    if (!minLevelMatch) continue;
    currencyTiers[source.tier].minLevelByAction[source.action] = Number(minLevelMatch[1]);
    currencyTiers[source.tier].sources[source.action] = {
      page: source.page,
      url: `https://poe2db.tw/cn/${source.page}`,
    };
  }

  assignTiers(mods);
  mods.sort((a, b) => a.classes[0].localeCompare(b.classes[0]) || a.type.localeCompare(b.type) || a.group.localeCompare(b.group) || a.level - b.level);

  mkdirSync(dataDir, { recursive: true });
  const output = [
    "(function (root) {",
    "  root.POE2DB_MOD_DATA = ",
    JSON.stringify({
      version: "poe2db-mods-2026-07-12-jewel-colours1",
      generatedAt: new Date().toISOString(),
      source: "PoE2DB Modifiers Calc pages cached from https://poe2db.tw/cn/",
      note: "Weights are imported from PoE2DB ModsView DropChance fields. Jewel colour eligibility is merged from the individual Ruby, Emerald, Sapphire, and Time-Lost jewel pages.",
      sources: sourceSummary,
      currencyTiers,
      modifiers: mods,
    }, null, 2),
    ";",
    "})(typeof globalThis !== \"undefined\" ? globalThis : window);",
    "",
  ].join("\n");

  writeFileSync(join(dataDir, "poe2db-mod-data.js"), output, "utf8");
  return { modifiers: mods.length, sources: sourceSummary };
}

export const result = importAll();
