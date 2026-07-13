import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const cacheDir = join(rootDir, ".cache", "i18n");
const dataDir = join(rootDir, "data");

globalThis.window = globalThis;
await import(new URL("../data/poe2db-mod-data.js", import.meta.url));
await import(new URL("../data/poe2db-base-data.js", import.meta.url));
await import(new URL("../data/poe2db-crafting-data.js", import.meta.url));

const currentMods = globalThis.POE2DB_MOD_DATA.modifiers || [];
const currentBases = globalThis.POE2DB_BASE_DATA.bases || [];
const currentCrafting = globalThis.POE2DB_CRAFTING_DATA || {};

const pages = Array.from(new Set(currentMods
  .map((mod) => mod.sourcePage)
  .filter(Boolean)
  .filter((page) => page !== "Jewels")));

const jewelPages = [
  "Ruby",
  "Emerald",
  "Sapphire",
  "Time-Lost_Ruby",
  "Time-Lost_Emerald",
  "Time-Lost_Sapphire",
];

const langs = [
  { key: "en", path: "us" },
  { key: "zhHant", path: "tw" },
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
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, ""))
    .replace(/\s+/g, " ")
    .trim();
}

function stripHtmlLoose(value) {
  return decodeEntities(String(value)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, ""))
    .replace(/\s+/g, " ");
}

function normalizeValueMarkup(html) {
  return String(html)
    .replace(/<span class=["']ndash["']>[\s\S]*?<\/span>/g, "-")
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
  let text = stripHtml(rawValue).replace(/[—–]/g, "-").trim();
  let prefix = "";
  if (text.startsWith("+")) {
    prefix = "+";
    text = text.slice(1);
  } else if (text.startsWith("-")) {
    prefix = "-";
    text = text.slice(1);
  }
  text = text.replace(/^\((.*)\)$/g, "$1");

  const parts = text.split("-");
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
      template += stripHtmlLoose(part);
    }
  }

  return {
    template: template.replace(/\s+/g, " ").trim(),
    rolls,
  };
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
    if (char === "\"") inString = true;
    else if (char === "{") depth += 1;
    else if (char === "}") {
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

function normalKey(sourcePage, rawMod) {
  const parsed = parseTemplateAndRolls(rawMod.str || "");
  const group = (rawMod.ModFamilyList && rawMod.ModFamilyList[0]) || "";
  return [
    sourcePage,
    generationType(rawMod),
    group,
    Number(rawMod.Level || 0),
    Number(rawMod.DropChance || 0),
    JSON.stringify(parsed.rolls),
  ].join("|");
}

function jewelKey(rawMod, jewelPool) {
  const parsed = parseTemplateAndRolls(rawMod.str || "");
  const group = (rawMod.ModFamilyList && rawMod.ModFamilyList[0]) || "";
  return [
    "Jewels",
    jewelPool,
    generationType(rawMod),
    group,
    Number(rawMod.Level || 0),
    Number(rawMod.DropChance || 0),
    parsed.template,
    JSON.stringify(parsed.rolls),
  ].join("|");
}

function currentNormalKey(mod) {
  return [
    mod.sourcePage,
    mod.type,
    mod.group,
    Number(mod.level || 0),
    Number(mod.weight || 0),
    JSON.stringify(mod.rolls || []),
  ].join("|");
}

function currentJewelKey(mod) {
  return [
    "Jewels",
    mod.raw?.jewelPool || "",
    mod.type,
    mod.group,
    Number(mod.level || 0),
    Number(mod.weight || 0),
    mod.template,
    JSON.stringify(mod.rolls || []),
  ].join("|");
}

async function cachedPage(langPath, page) {
  const dir = join(cacheDir, langPath);
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${page}.html`);
  if (!existsSync(file)) {
    const url = `https://poe2db.tw/${langPath}/${page}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
    writeFileSync(file, await response.text(), "utf8");
  }
  return readFileSync(file, "utf8");
}

function addLocalization(target, langKey, rawMod) {
  const parsed = parseTemplateAndRolls(rawMod.str || "");
  target[langKey] = {
    name: stripHtml(rawMod.Name || ""),
    template: parsed.template,
  };
}

function baseLocalizations() {
  return Object.fromEntries(currentBases.map((base) => [base.id, {
    en: { name: base.english || base.name || base.id, classLabel: base.classId },
  }]));
}

function actionLocalizations() {
  const actionEntries = [];
  const groups = [
    ...(currentCrafting.essences || []),
    ...(currentCrafting.alloys || []),
    ...(currentCrafting.liquidEmotions || []),
    ...(currentCrafting.catalysts || []),
    ...(currentCrafting.soulCores || []),
  ];
  for (const entry of groups) {
    if (!entry.id && !entry.slug) continue;
    actionEntries.push([entry.id || entry.slug, {
      en: { name: entry.slug ? entry.slug.replace(/_/g, " ") : String(entry.id).replace(/_/g, " ") },
    }]);
  }
  return Object.fromEntries(actionEntries);
}

async function importAll() {
  const normalIndex = new Map();
  const jewelIndex = new Map();
  for (const mod of currentMods) {
    if (mod.sourcePage === "Jewels") jewelIndex.set(currentJewelKey(mod), mod);
    else normalIndex.set(currentNormalKey(mod), mod);
  }

  const modifiers = {};
  const summary = [];
  for (const lang of langs) {
    let matched = 0;
    let rows = 0;
    for (const page of pages) {
      const payload = extractModsViewObject(await cachedPage(lang.path, page), `${lang.path}/${page}`);
      for (const rawMod of payload.normal || []) {
        rows += 1;
        const mod = normalIndex.get(normalKey(page, rawMod));
        if (!mod) continue;
        if (!modifiers[mod.id]) modifiers[mod.id] = {};
        addLocalization(modifiers[mod.id], lang.key, rawMod);
        matched += 1;
      }
    }

    const jewelSourceMap = {
      Ruby: "ordinary",
      Emerald: "ordinary",
      Sapphire: "ordinary",
      "Time-Lost_Ruby": "time_lost",
      "Time-Lost_Emerald": "time_lost",
      "Time-Lost_Sapphire": "time_lost",
    };
    for (const page of jewelPages) {
      const payload = extractModsViewObject(await cachedPage(lang.path, page), `${lang.path}/${page}`);
      for (const rawMod of payload.normal || []) {
        rows += 1;
        const mod = jewelIndex.get(jewelKey(rawMod, jewelSourceMap[page]));
        if (!mod) continue;
        if (!modifiers[mod.id]) modifiers[mod.id] = {};
        addLocalization(modifiers[mod.id], lang.key, rawMod);
        matched += 1;
      }
    }

    summary.push({ lang: lang.key, rows, matched });
  }

  mkdirSync(dataDir, { recursive: true });
  const data = {
    version: "poe2db-i18n-2026-07-12-1",
    generatedAt: new Date().toISOString(),
    source: "PoE2DB /us and /tw ModsView pages",
    summary,
    bases: baseLocalizations(),
    actions: actionLocalizations(),
    modifiers,
  };
  writeFileSync(join(dataDir, "poe2db-i18n-data.js"), [
    "(function (root) {",
    "  root.POE2DB_I18N_DATA = ",
    JSON.stringify(data, null, 2),
    ";",
    "})(typeof globalThis !== \"undefined\" ? globalThis : window);",
    "",
  ].join("\n"), "utf8");

  return data;
}

export const result = await importAll();
console.log(JSON.stringify({
  ok: true,
  version: result.version,
  summary: result.summary,
  modifiers: Object.keys(result.modifiers).length,
}, null, 2));
