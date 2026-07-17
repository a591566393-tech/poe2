import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const cacheDir = join(rootDir, ".cache");

globalThis.window = globalThis;
await import(new URL("../data/poe2db-mod-data.js", import.meta.url));
await import(new URL("../data/poe2db-i18n-data.js", import.meta.url));

const sourcePages = ["Rings", "Belts", "Amulets"];
const pools = [
  { section: "breach_minion", id: "minion" },
  { section: "breach_caster", id: "caster" },
];
const craftedSources = [
  { section: "OtherworldlyAmuletModifiers", nextSection: "OtherworldlyRingModifiers", classId: "amulet" },
  { section: "OtherworldlyRingModifiers", nextSection: "OtherworldlyBeltModifiers", classId: "ring" },
  { section: "OtherworldlyBeltModifiers", nextSection: "MinionModifiers", classId: "belt" },
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
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
  if (String(rawMod.ModGenerationTypeID) === "1") return "prefix";
  if (String(rawMod.ModGenerationTypeID) === "2") return "suffix";
  return null;
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
  return decodeEntities(String(value).replace(/<[^>]*>/g, ""))
    .replace(/\s+/g, " ")
    .trim();
}

function extractTabSection(html, id, nextId) {
  const start = html.indexOf(`id="${id}"`);
  assert(start >= 0, `${id} section not found`);
  const next = html.indexOf(`id="${nextId}"`, start + id.length);
  return html.slice(start, next > start ? next : html.length);
}

function extractTableCells(rowHtml) {
  return Array.from(String(rowHtml).matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)).map((match) => match[1]);
}

function typeFromCell(cellHtml) {
  const text = stripHtml(cellHtml);
  if (/前缀|前綴|Prefix/.test(text)) return "prefix";
  if (/后缀|後綴|Suffix/.test(text)) return "suffix";
  return null;
}

function extractTags(html) {
  return Array.from(new Set(Array.from(String(html).matchAll(/data-tag="([^"]+)"/g), (match) => match[1]))).sort();
}

function extractRolls(html) {
  const normalized = String(html).replace(/<span class=["']ndash["']>[\s\S]*?<\/span>/g, "—");
  return Array.from(normalized.matchAll(/<span class=["']mod-value["']>([\s\S]*?)<\/span>/g), (match) => {
    let text = stripHtml(match[1]).replace(/^\+/, "").replace(/^\(|\)$/g, "");
    const parts = text.split("—").map((part) => Number(part.replace(/[()%]/g, "")));
    return { min: parts[0], max: parts.length > 1 ? parts[1] : parts[0], scale: 1 };
  });
}

const importedMods = globalThis.POE2DB_MOD_DATA?.modifiers || [];
const i18nMods = globalThis.POE2DB_I18N_DATA?.modifiers || {};
const summary = {};

for (const page of sourcePages) {
  const payload = extractModsViewObject(readFileSync(join(cacheDir, `${page}.html`), "utf8"), page);
  summary[page] = {};

  for (const pool of pools) {
    const sourceRows = Array.isArray(payload[pool.section]) ? payload[pool.section] : [];
    const importedRows = importedMods.filter((mod) => (
      mod.sourcePage === page
      && mod.raw?.sourceSection === pool.section
      && mod.raw?.genesisPool === pool.id
    ));

    assert(importedRows.length === sourceRows.length,
      `${page}.${pool.section}: expected ${sourceRows.length} rows, imported ${importedRows.length}`);

    const byHover = new Map(importedRows.map((mod) => [mod.raw?.hover || mod.id, mod]));
    for (const rawMod of sourceRows) {
      const imported = byHover.get(rawMod.hover);
      assert(imported, `${page}.${pool.section}: missing ${rawMod.hover || rawMod.Name}`);
      assert(imported.type === generationType(rawMod), `${imported.id}: modifier side mismatch`);
      assert(imported.level === Number(rawMod.Level), `${imported.id}: level mismatch`);
      assert(imported.weight === Number(rawMod.DropChance), `${imported.id}: weight mismatch`);
      assert(imported.group === rawMod.ModFamilyList?.[0], `${imported.id}: family mismatch`);
      assert(JSON.stringify(imported.raw?.spawn_no || []) === JSON.stringify(rawMod.spawn_no || []),
        `${imported.id}: spawn tags mismatch`);
    }

    summary[page][pool.section] = sourceRows.length;
  }
}

assert(summary.Amulets.breach_minion === 0 && summary.Amulets.breach_caster === 0,
  "PoE2DB does not expose Genesis minion/caster pools for amulets");

const genesisHtml = readFileSync(join(cacheDir, "The_Genesis_Tree.html"), "utf8");
const craftedSummary = {};
for (const source of craftedSources) {
  const section = extractTabSection(genesisHtml, source.section, source.nextSection);
  const sourceRows = Array.from(section.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi))
    .map((match) => extractTableCells(match[1]))
    .filter((cells) => cells.length >= 3);
  const importedRows = importedMods.filter((mod) => mod.raw?.sourceSection === source.section && mod.raw?.genesisCrafted);
  assert(importedRows.length === sourceRows.length,
    `${source.section}: expected ${sourceRows.length} crafted rows, imported ${importedRows.length}`);

  sourceRows.forEach((cells, index) => {
    const imported = importedRows.find((mod) => mod.raw?.sourceRow === index);
    assert(imported, `${source.section}: missing source row ${index}`);
    assert(imported.classes.length === 1 && imported.classes[0] === source.classId,
      `${imported.id}: crafted item class mismatch`);
    assert(imported.name === stripHtml(cells[0]), `${imported.id}: crafted name mismatch`);
    assert(imported.type === typeFromCell(cells[1]), `${imported.id}: crafted modifier side mismatch`);
    assert(JSON.stringify(imported.tags) === JSON.stringify(extractTags(cells[2])), `${imported.id}: crafted tags mismatch`);
    assert(JSON.stringify(imported.rolls) === JSON.stringify(extractRolls(cells[2])), `${imported.id}: crafted values mismatch`);
    assert(imported.raw?.craftChance === 0.05, `${imported.id}: crafted node chance must be 5%`);
    assert(i18nMods[imported.id]?.en && i18nMods[imported.id]?.zhHant,
      `${imported.id}: English or Traditional Chinese localization missing`);
  });
  craftedSummary[source.classId] = sourceRows.length;
}

assert(Object.values(craftedSummary).reduce((sum, count) => sum + count, 0) === 36,
  "expected 36 Genesis Otherworldly crafted modifiers");

console.log(JSON.stringify({
  ok: true,
  version: globalThis.POE2DB_MOD_DATA?.version,
  summary,
  craftedSummary,
}, null, 2));
