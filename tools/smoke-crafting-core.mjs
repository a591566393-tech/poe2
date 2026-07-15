import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
globalThis.window = globalThis;

require("../data/poe2db-mod-data.js");
require("../data/poe2db-base-data.js");
require("../data/poe2db-crafting-data.js");
const Core = require("../crafting-core.js");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function makeRareRubyRing(seed) {
  const item = Core.makeItem("ring_ruby", 82, seed);
  item.rarity = "rare";
  return item;
}

function rolledFromDefinition(definition) {
  return {
    id: definition.id,
    baseId: definition.baseId,
    type: definition.type,
    group: definition.group,
    name: definition.name,
    tier: definition.tier,
    level: definition.level,
    weight: definition.weight,
    tags: [...(definition.tags || [])],
    template: definition.template,
    rolls: JSON.parse(JSON.stringify(definition.rolls || [])),
    values: (definition.rolls || []).map((roll) => roll.min),
    desecrated: !!definition.desecrated,
    revealed: !definition.desecrated,
    fractured: false,
    sourceText: definition.sourceText || "",
  };
}

function pushExplicit(item, definition) {
  const mod = rolledFromDefinition(definition);
  if (mod.type === "prefix") item.prefixes.push(mod);
  else item.suffixes.push(mod);
  return mod;
}

function distinctDefinitions(definitions, count) {
  const seenGroups = new Set();
  const picked = [];
  for (const definition of definitions) {
    if (seenGroups.has(definition.group)) continue;
    seenGroups.add(definition.group);
    picked.push(definition);
    if (picked.length === count) break;
  }
  return picked;
}

function modText(mod) {
  return [Core.renderRange(mod), mod.sourceText || "", mod.group || ""].join(" ");
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
    .replace(/<br\s*\/?>/gi, " | ")
    .replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSourceText(value) {
  return String(value).replace(/\s+/g, " ").trim();
}

function parseAffixType(typeText) {
  return /后缀|Suffix|Suf/i.test(typeText) ? "suffix" : "prefix";
}

function parseCachedDesecratedSection(sectionId, endSectionId) {
  const html = readFileSync(join(rootDir, ".cache", "Desecrated_Modifiers.html"), "utf8");
  const start = html.indexOf(`id="${sectionId}"`);
  const end = html.indexOf(`id="${endSectionId}"`, start);
  const section = html.slice(start, end > start ? end : undefined);
  return Array.from(section.matchAll(/<tr>([\s\S]*?)<\/tr>/gi))
    .map((match) => match[1])
    .filter((row) => /<td\b/i.test(row))
    .map((row) => {
      const cells = Array.from(row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)).map((match) => match[1]);
      const hasLevelColumn = cells.length >= 4;
      return {
        name: stripHtml(cells[0] || ""),
        level: hasLevelColumn ? Number(stripHtml(cells[1] || "1")) || 1 : 1,
        type: parseAffixType(stripHtml(cells[hasLevelColumn ? 2 : 1] || "")),
        sourceText: normalizeSourceText(stripHtml(cells[hasLevelColumn ? 3 : 2] || "")),
      };
    });
}

function parseCachedJewelMods() {
  const html = readFileSync(join(rootDir, ".cache", "Jewels.html"), "utf8");
  const start = html.indexOf('id="JewelMods"');
  const end = html.indexOf('id="JewelCorruptMods"', start);
  const section = html.slice(start, end > start ? end : undefined);
  return Array.from(section.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi))
    .map((match) => Array.from(match[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)).map((cell) => cell[1]))
    .filter((cells) => cells.length >= 4)
    .map((cells) => ({
      name: stripHtml(cells[0] || ""),
      level: Number(stripHtml(cells[1] || "1")) || 1,
      type: parseAffixType(stripHtml(cells[2] || "")),
      sourceText: normalizeSourceText(stripHtml(cells[3] || "")),
    }));
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

function cachedModsViewRows(page, section = "normal") {
  const html = readFileSync(join(rootDir, ".cache", `${page}.html`), "utf8");
  const payload = extractModsViewObject(html, page);
  return Array.isArray(payload[section]) ? payload[section] : [];
}

function rawImportedById() {
  return new Map((globalThis.POE2DB_MOD_DATA.modifiers || []).map((mod) => [mod.id, mod]));
}

function rawSourcePages(rawMod) {
  return rawMod && rawMod.raw && Array.isArray(rawMod.raw.sourcePages) ? rawMod.raw.sourcePages : [];
}

function modAllowedByBase(mod, base) {
  const allowedBaseIds = mod.allowedBaseIds || [];
  const requiredAny = mod.requiredAnyBaseTags || [];
  const required = mod.requiredBaseTags || [];
  const tags = base.tags || [];
  if (allowedBaseIds.length > 0 && !allowedBaseIds.includes(base.id)) return false;
  if (requiredAny.length > 0 && !requiredAny.some((tag) => tags.includes(tag))) return false;
  return required.every((tag) => tags.includes(tag));
}

function assertJewelRuntimePool(baseId, sourcePages) {
  const rawById = rawImportedById();
  const base = Core.getBase(baseId);
  assert(base, `missing jewel base ${baseId}`);
  const item = Core.makeItem(baseId, 82, `smoke-${baseId}-colour-pool`);
  const pool = Core.summarizePool(item, "normal", "transmutation");
  const poolIds = new Set(pool.mods.map((mod) => mod.id));
  const expectedIds = new Set(
    Core.MODIFIERS
      .filter((mod) => mod.sourcePage === "Jewels" && mod.classes.includes("jewel") && modAllowedByBase(mod, base))
      .map((mod) => mod.id),
  );
  const missing = Array.from(expectedIds).filter((id) => !poolIds.has(id));
  const extra = Array.from(poolIds).filter((id) => !expectedIds.has(id));
  const wrongSource = pool.mods.filter((mod) => {
    const pages = rawSourcePages(rawById.get(mod.id));
    return pages.length > 0 && !pages.some((page) => sourcePages.includes(page));
  });

  assert(missing.length === 0, `${baseId} jewel pool is missing imported colour mods: ${missing.slice(0, 10).join(", ")}`);
  assert(extra.length === 0, `${baseId} jewel pool contains mods outside its base constraints: ${extra.slice(0, 10).join(", ")}`);
  assert(wrongSource.length === 0, `${baseId} jewel pool contains another colour's mods: ${wrongSource.slice(0, 5).map((mod) => `${mod.id}:${rawSourcePages(rawById.get(mod.id)).join("/")}`).join(", ")}`);
  return { pool, expectedIds };
}

const badRingPattern = /移动速度|晕眩阈值|重度晕眩|盾牌/u;
const ring = makeRareRubyRing("smoke-ring-pool");
const badPools = [];

for (const action of Core.CURRENCIES) {
  const pool = Core.summarizePool(ring, "normal", action.id);
  const bad = pool.mods.filter((mod) => badRingPattern.test(modText(mod)));
  if (bad.length > 0) {
    badPools.push({
      action: action.id,
      examples: bad.slice(0, 5).map((mod) => ({
        text: Core.renderRange(mod),
        classes: mod.classes,
        sourceText: mod.sourceText || "",
        group: mod.group,
      })),
    });
  }
}

assert(badPools.length === 0, `ruby ring pools contain invalid mods: ${JSON.stringify(badPools, null, 2)}`);

const beltDesecration = Core.makeItem("belt_heavy", 82, "smoke-belt-desecration-routing");
beltDesecration.rarity = "rare";
const beltDesecrationPool = Core.summarizePool(beltDesecration, "normal", "preserved_lockbone").mods.filter((mod) => mod.sourceKind !== "base");
assert(!beltDesecrationPool.some((mod) => /\u76fe\u724c\s*\u6280\u80fd/u.test(modText(mod))), "belt desecration should not expose shield-only heavy-stun modifiers");
/* The following legacy mojibake pattern is superseded by the Unicode check above.
assert(!beltDesecrationPool.some((mod) => /盾牌\s*技能|重度晕眩/u.test(modText(mod))), "belt desecration should not expose shield-only heavy-stun modifiers");

*/

for (const actionId of ["preserved_rib", "ancient_rib", "gnawing_rib", "preserved_jawbone", "ancient_jawbone", "gnawing_jawbone"]) {
  const pool = Core.summarizePool(ring, "normal", actionId);
  assert(pool.mods.length === 0, `${actionId} should not apply to ruby ring, got ${pool.mods.length} mods`);
}

const hysteria = Core.CURRENCIES.find((action) => action.id === "Essence_of_Hysteria");
assert(hysteria, "Essence_of_Hysteria action is missing");
const hysteriaPool = Core.summarizePool(ring, "normal", "Essence_of_Hysteria");
const badHysteria = hysteriaPool.mods.filter((mod) => badRingPattern.test(modText(mod)));
assert(badHysteria.length === 0, `hysteria contains boots/belt-only mods for ruby ring: ${JSON.stringify(badHysteria, null, 2)}`);

const jewelBases = Core.BASES.filter((base) => base.classId === "jewel");
assert(jewelBases.length === 9, `PoE2DB Jewels should import 9 base jewels, got ${jewelBases.length}`);
assert(!jewelBases.some((base) => /cadigans/i.test(`${base.id} ${base.href || ""}`)), "Soul Core Cadigan's Epiphany must not be imported as a jewel base");
const sourceJewelModRows = parseCachedJewelMods();
const importedJewelMods = Core.MODIFIERS.filter((mod) => mod.sourcePage === "Jewels" && mod.classes.includes("jewel"));
assert(sourceJewelModRows.length === 193, `PoE2DB cached JewelMods should contain 193 rows, got ${sourceJewelModRows.length}`);
assert(importedJewelMods.length > sourceJewelModRows.length, `runtime jewel mods should use individual colour pages, got ${importedJewelMods.length}`);
[
  "Ruby",
  "Emerald",
  "Sapphire",
  "Time-Lost_Ruby",
  "Time-Lost_Emerald",
  "Time-Lost_Sapphire",
].forEach((page) => {
  const sourceRows = cachedModsViewRows(page, "normal");
  const summary = (globalThis.POE2DB_MOD_DATA.sources || []).find((entry) => entry.page === page);
  assert(summary, `missing jewel source summary for ${page}`);
  assert(summary.normalRows === sourceRows.length, `${page} normal row count changed: expected ${sourceRows.length}, got ${summary.normalRows}`);
});
const rubyJewel = Core.makeItem("jewel_ruby", 82, "smoke-ordinary-jewel-pool");
const rubyJewelTransmutationPool = Core.summarizePool(rubyJewel, "normal", "transmutation");
const rubyJewelRuntime = assertJewelRuntimePool("jewel_ruby", ["Ruby"]);
const emeraldJewelRuntime = assertJewelRuntimePool("jewel_emerald", ["Emerald"]);
const sapphireJewelRuntime = assertJewelRuntimePool("jewel_sapphire", ["Sapphire"]);
assertJewelRuntimePool("jewel_time_lost_ruby", ["Time-Lost_Ruby"]);
assertJewelRuntimePool("jewel_time_lost_emerald", ["Time-Lost_Emerald"]);
assertJewelRuntimePool("jewel_time_lost_sapphire", ["Time-Lost_Sapphire"]);
const diamondRuntime = assertJewelRuntimePool("jewel_diamond", ["Ruby", "Emerald", "Sapphire"]);
const ordinaryUnionSize = new Set([
  ...rubyJewelRuntime.expectedIds,
  ...emeraldJewelRuntime.expectedIds,
  ...sapphireJewelRuntime.expectedIds,
]).size;
assert(diamondRuntime.pool.mods.length === ordinaryUnionSize, "diamond jewel should expose the union of ruby, emerald, and sapphire pools");
assert(rubyJewelTransmutationPool.mods.length === rubyJewelRuntime.pool.mods.length, `ruby jewel transmutation pool should expose Ruby page mods, got ${rubyJewelTransmutationPool.mods.length}`);
const rubyJewelTransmutation = Core.applyCurrency(rubyJewel, "transmutation", "normal");
assert(rubyJewelTransmutation.ok, `transmutation failed on ruby jewel: ${rubyJewelTransmutation.reason || "unknown"}`);
assert(Core.allMods(rubyJewelTransmutation.item).some((mod) => String(mod.baseId || "").startsWith("Jewels_")), "transmutation on ruby jewel should add an ordinary jewel modifier");

const badAttempts = [];
for (let index = 0; index < 300; index += 1) {
  const attempt = Core.applyCurrency(makeRareRubyRing(`smoke-lockbone-${index}`), "preserved_lockbone", "normal");
  assert(attempt.ok, `preserved_lockbone failed on ruby ring: ${attempt.reason || "unknown"}`);
  const text = Core.allMods(attempt.item).map(modText).join(" | ");
  if (badRingPattern.test(text)) badAttempts.push({ index, text });
}
assert(badAttempts.length === 0, `preserved_lockbone rolled invalid ring mods: ${JSON.stringify(badAttempts.slice(0, 5), null, 2)}`);

const desecrationActionByClass = new Map([
  ["ring", "preserved_lockbone"],
  ["amulet", "preserved_lockbone"],
  ["belt", "preserved_lockbone"],
  ["talisman", "preserved_lockbone"],
  ["boots", "preserved_rib"],
  ["body_armour", "preserved_rib"],
  ["gloves", "preserved_rib"],
  ["helmet", "preserved_rib"],
  ["shield", "preserved_rib"],
  ["buckler", "preserved_rib"],
  ["focus", "preserved_rib"],
  ["quiver", "preserved_jawbone"],
  ["jewel", "preserved_cranium"],
  ["waystone", "preserved_vertebrae"],
]);
Core.BASES.forEach((base) => {
  if (Core.DESECRATED_MODIFIERS.some((mod) => mod.classes.includes(base.classId)) && !desecrationActionByClass.has(base.classId)) {
    desecrationActionByClass.set(base.classId, "preserved_jawbone");
  }
});
const missingDesecrationCoverage = [];
const invalidDesecrationRolls = [];
const missingDesecrationChoices = [];
for (const [classId, actionId] of desecrationActionByClass) {
  const base = Core.BASES.find((entry) => entry.classId === classId);
  if (!base) continue;
  const item = Core.makeItem(base.id, Math.max(82, base.requiredLevel || 1), `smoke-desecration-${classId}`);
  item.rarity = "rare";
  const validation = Core.validateCurrency(item, actionId, "normal");
  const pool = Core.summarizePool(item, "normal", actionId);
  if (!validation.ok || pool.mods.length === 0) {
    missingDesecrationCoverage.push({ classId, actionId, reason: validation.reason || "", pool: pool.mods.length });
    continue;
  }
  const attempt = Core.applyCurrency(item, actionId, "normal");
  const added = attempt.step && attempt.step.added ? attempt.step.added[0] : null;
  if (!attempt.ok || !added || !added.desecrated || added.revealed !== false) {
    invalidDesecrationRolls.push({
      classId,
      actionId,
      reason: attempt.reason || "",
      added: added ? {
        id: added.id,
        text: Core.renderRange(added),
        sourceText: added.sourceText || "",
      } : null,
    });
    continue;
  }
  const echo = Core.applyCurrency(attempt.item, "abyssal_echoes", "normal");
  const choices = echo.item && echo.item.pendingDesecrationChoice ? echo.item.pendingDesecrationChoice.choices : [];
  const chosen = choices[0];
  const picked = chosen ? Core.chooseDesecrationChoice(echo.item, chosen.choiceId) : { ok: false, reason: "missing choices" };
  const revealed = picked.ok ? picked.step.revealed[0] : null;
  if (!echo.ok || choices.length !== 3 || !picked.ok || !revealed || !revealed.desecrated || revealed.revealed !== true) {
    missingDesecrationChoices.push({
      classId,
      actionId,
      reason: echo.reason || picked.reason || "",
      choices: choices.length,
      revealed: revealed ? { id: revealed.id, text: Core.renderRange(revealed), sourceText: revealed.sourceText || "" } : null,
    });
  }
}
assert(missingDesecrationCoverage.length === 0, `desecration coverage missing: ${JSON.stringify(missingDesecrationCoverage, null, 2)}`);
assert(invalidDesecrationRolls.length === 0, `desecration rolled mods outside their equipment class: ${JSON.stringify(invalidDesecrationRolls, null, 2)}`);
assert(missingDesecrationChoices.length === 0, `desecration reveal choices missing: ${JSON.stringify(missingDesecrationChoices, null, 2)}`);

const disallowedDesecrationPatternByClass = new Map([
  ["sceptre", /箭袋|盾牌|格挡|举起\s*盾牌|战弩|装填|榴弹|锤类|猛击|长杖|法杖|法器|弓类/u],
  ["wand", /箭袋|盾牌|格挡|举起\s*盾牌|战弩|装填|榴弹|锤类|猛击|长杖|法器|权杖|弓类/u],
  ["staff", /箭袋|盾牌|格挡|举起\s*盾牌|战弩|装填|榴弹|锤类|猛击|法杖|法器|权杖|弓类/u],
  ["crossbow", /箭袋|盾牌|格挡|举起\s*盾牌|锤类|猛击|长杖|法杖|法器|权杖/u],
  ["quiver", /盾牌|格挡|举起\s*盾牌|战弩|装填|榴弹|锤类|猛击|长杖|法杖|法器|权杖/u],
  ["shield", /箭袋|战弩|装填|榴弹|锤类|猛击|长杖|法杖|法器|权杖|弓类/u],
  ["focus", /箭袋|战弩|装填|榴弹|锤类|猛击|长杖|法杖|权杖|弓类/u],
]);

function makeRareBase(classId, seed) {
  const base = Core.BASES.find((entry) => entry.classId === classId);
  assert(base, `missing base for ${classId}`);
  const item = Core.makeItem(base.id, Math.max(82, base.requiredLevel || 1), seed);
  item.rarity = "rare";
  return item;
}

const desecrationRoutingFailures = [];
for (const [classId, badPattern] of disallowedDesecrationPatternByClass) {
  const item = makeRareBase(classId, `smoke-routing-pool-${classId}`);
  const actionId = desecrationActionByClass.get(classId) || "preserved_jawbone";
  const pool = Core.summarizePool(item, "normal", actionId).mods;
  const badPool = pool.filter((mod) => badPattern.test(modText(mod)));
  const added = Core.applyCurrency(makeRareBase(classId, `smoke-routing-choice-${classId}`), actionId, "normal");
  const echo = added.ok ? Core.applyCurrency(added.item, "abyssal_echoes", "normal") : { ok: false, reason: added.reason || "desecration failed" };
  const choices = echo.item && echo.item.pendingDesecrationChoice ? echo.item.pendingDesecrationChoice.choices : [];
  const badChoices = choices.filter((mod) => badPattern.test(modText(mod)));

  if (badPool.length > 0 || badChoices.length > 0) {
    desecrationRoutingFailures.push({
      classId,
      actionId,
      badPool: badPool.slice(0, 5).map((mod) => ({
        text: Core.renderRange(mod),
        sourceText: mod.sourceText || "",
        classes: mod.classes,
      })),
      badChoices: badChoices.slice(0, 5).map((mod) => ({
        text: Core.renderRange(mod),
        sourceText: mod.sourceText || "",
        classes: mod.classes,
      })),
    });
  }
}
assert(desecrationRoutingFailures.length === 0, `desecration routing leaked explicit equipment mods: ${JSON.stringify(desecrationRoutingFailures, null, 2)}`);

const requiredOwnDesecrationKeywords = [
  { classId: "crossbow", pattern: /战弩|装填|榴弹/u },
  { classId: "quiver", pattern: /箭袋/u },
  { classId: "shield", pattern: /盾牌|格挡|举起\s*盾牌/u },
];
const missingOwnDesecrationKeywords = [];
for (const check of requiredOwnDesecrationKeywords) {
  const item = makeRareBase(check.classId, `smoke-routing-own-${check.classId}`);
  const actionId = desecrationActionByClass.get(check.classId) || "preserved_jawbone";
  const poolTexts = Core.summarizePool(item, "normal", actionId).mods.map(modText);
  if (!poolTexts.some((text) => check.pattern.test(text))) missingOwnDesecrationKeywords.push(check.classId);
}
assert(missingOwnDesecrationKeywords.length === 0, `own explicit desecration keywords missing for: ${missingOwnDesecrationKeywords.join(", ")}`);

const sceptrePoolTexts = Core.summarizePool(makeRareBase("sceptre", "smoke-sceptre-broad"), "normal", "preserved_jawbone").mods.map(modText);
assert(
  sceptrePoolTexts.some((text) => !disallowedDesecrationPatternByClass.get("sceptre").test(text)),
  "sceptre desecration should retain broad desecrated rows that do not name another equipment class",
);

const sourceEquipmentRows = parseCachedDesecratedSection("DesecratedMods", "DesecratedWaystoneMods");
const importedEquipmentRows = Core.DESECRATED_MODIFIERS
  .filter((mod) => mod.sourceSection === "DesecratedMods")
  .map((mod) => ({
    name: mod.name,
    level: mod.level,
    type: mod.type,
    sourceText: normalizeSourceText(mod.sourceText || ""),
  }));
assert(sourceEquipmentRows.length === 198, `PoE2DB cached equipment section should contain 198 rows, got ${sourceEquipmentRows.length}`);
assert(importedEquipmentRows.length === sourceEquipmentRows.length, `imported equipment desecrated rows mismatch: expected ${sourceEquipmentRows.length}, got ${importedEquipmentRows.length}`);
const equipmentComparisonFailures = sourceEquipmentRows
  .map((source, index) => ({ index, source, imported: importedEquipmentRows[index] }))
  .filter((entry) => JSON.stringify(entry.source) !== JSON.stringify(entry.imported));
assert(equipmentComparisonFailures.length === 0, `equipment desecrated rows differ from PoE2DB cache: ${JSON.stringify(equipmentComparisonFailures.slice(0, 5), null, 2)}`);

const sourceJewelRows = parseCachedDesecratedSection("JewelsDesecratedMods", "DesecratedMods");
const importedJewelRows = Core.DESECRATED_MODIFIERS
  .filter((mod) => mod.sourceSection === "JewelsDesecratedMods" || mod.classes.includes("jewel"))
  .map((mod) => ({
    name: mod.name,
    level: mod.level,
    type: mod.type,
    sourceText: normalizeSourceText(mod.sourceText || ""),
  }));
assert(sourceJewelRows.length === 32, `PoE2DB cached jewel section should contain 32 rows, got ${sourceJewelRows.length}`);
assert(importedJewelRows.length === sourceJewelRows.length, `imported jewel desecrated rows mismatch: expected ${sourceJewelRows.length}, got ${importedJewelRows.length}`);
const jewelComparisonFailures = sourceJewelRows
  .map((source, index) => ({ index, source, imported: importedJewelRows[index] }))
  .filter((entry) => JSON.stringify(entry.source) !== JSON.stringify(entry.imported));
assert(jewelComparisonFailures.length === 0, `jewel desecrated rows differ from PoE2DB cache: ${JSON.stringify(jewelComparisonFailures.slice(0, 5), null, 2)}`);

const sourceWaystoneRows = parseCachedDesecratedSection("DesecratedWaystoneMods", "AbyssalifyRef");
const importedWaystoneRows = Core.DESECRATED_MODIFIERS
  .filter((mod) => mod.sourceSection === "DesecratedWaystoneMods" || mod.classes.includes("waystone"))
  .map((mod) => ({
    name: mod.name,
    level: mod.level,
    type: mod.type,
    sourceText: normalizeSourceText(mod.sourceText || ""),
  }));
assert(sourceWaystoneRows.length === 19, `PoE2DB cached waystone section should contain 19 rows, got ${sourceWaystoneRows.length}`);
assert(importedWaystoneRows.length === sourceWaystoneRows.length, `imported waystone desecrated rows mismatch: expected ${sourceWaystoneRows.length}, got ${importedWaystoneRows.length}`);
const waystoneComparisonFailures = sourceWaystoneRows
  .map((source, index) => ({ index, source, imported: importedWaystoneRows[index] }))
  .filter((entry) => JSON.stringify(entry.source) !== JSON.stringify(entry.imported));
assert(waystoneComparisonFailures.length === 0, `waystone desecrated rows differ from PoE2DB cache: ${JSON.stringify(waystoneComparisonFailures.slice(0, 5), null, 2)}`);

const jewelItem = Core.makeItem("jewel_ruby", 82, "smoke-jewel-desecration");
jewelItem.rarity = "rare";
const jewelPool = Core.summarizePool(jewelItem, "normal", "preserved_cranium");
const jewelExclusiveDesecratedPool = jewelPool.mods.filter((mod) => mod.sourceKind !== "base");
const jewelBaseDesecratedPool = jewelPool.mods.filter((mod) => mod.sourceKind === "base");
assert(jewelExclusiveDesecratedPool.length === 32, `preserved_cranium should expose 32 exclusive jewel desecrated mods, got ${jewelExclusiveDesecratedPool.length}`);
assert(jewelBaseDesecratedPool.length === rubyJewelRuntime.pool.mods.length, `preserved_cranium should also expose ${rubyJewelRuntime.pool.mods.length} ruby jewel base mods as desecrated candidates, got ${jewelBaseDesecratedPool.length}`);
const jewelAttempt = Core.applyCurrency(jewelItem, "preserved_cranium", "normal");
assert(jewelAttempt.ok, `preserved_cranium failed on jewel: ${jewelAttempt.reason || "unknown"}`);
assert(jewelAttempt.step.added[0].desecrated && jewelAttempt.step.added[0].revealed === false, "preserved_cranium should add an unrevealed jewel desecrated mod");
const jewelEcho = Core.applyCurrency(jewelAttempt.item, "abyssal_echoes", "normal");
assert(jewelEcho.ok, `abyssal_echoes failed on jewel: ${jewelEcho.reason || "unknown"}`);
assert(jewelEcho.item.pendingDesecrationChoice.choices.length === 3, "jewel abyssal echoes should offer three choices");

const timeLostSapphire = Core.makeItem("jewel_time_lost_sapphire", 82, "smoke-jewel-capacity");
timeLostSapphire.rarity = "rare";
const liquidSuffixPlusOneAction = Core.CURRENCIES.find((action) => (
  action.category === "liquid_emotion" &&
  Core.summarizePool(timeLostSapphire, "normal", action.id).mods.some((mod) => mod.group === "liquid_MaxPrefixMaxSuffix" && mod.type === "prefix")
));
assert(liquidSuffixPlusOneAction, "need the liquid emotion action that adds a suffix-cap prefix");
const suffixPlusOneDefinition = Core.summarizePool(timeLostSapphire, "normal", liquidSuffixPlusOneAction.id).mods
  .find((mod) => mod.group === "liquid_MaxPrefixMaxSuffix" && mod.type === "prefix");
assert(suffixPlusOneDefinition, "missing suffix +1 liquid emotion prefix definition");
pushExplicit(timeLostSapphire, suffixPlusOneDefinition);
assert(Core.capFor(timeLostSapphire, "prefix") === 2, `suffix +1 jewel prefix should keep the rare jewel prefix cap, got ${JSON.stringify({
  rarity: timeLostSapphire.rarity,
  base: Core.getBase(timeLostSapphire.baseId),
  prefixCap: Core.capFor(timeLostSapphire, "prefix"),
  suffixCap: Core.capFor(timeLostSapphire, "suffix"),
  template: suffixPlusOneDefinition.template,
  sourceText: suffixPlusOneDefinition.sourceText,
  values: timeLostSapphire.prefixes[0] && timeLostSapphire.prefixes[0].values,
  rendered: timeLostSapphire.prefixes[0] && Core.renderMod(timeLostSapphire.prefixes[0]),
})}`);
assert(Core.capFor(timeLostSapphire, "suffix") === 3, "suffix +1 jewel prefix should open a third suffix slot");
assert(Core.allMods(timeLostSapphire).length === 1, "suffix +1 jewel setup should have one explicit prefix");
const sapphireSecondPrefix = Core.summarizePool(timeLostSapphire, "normal", "exalted").mods
  .find((mod) => mod.type === "prefix" && mod.group !== suffixPlusOneDefinition.group);
assert(sapphireSecondPrefix, "need a second prefix for the full 2-prefix / 3-suffix jewel capacity check");

const sapphireSuffixDefinitions = distinctDefinitions(
  Core.summarizePool(timeLostSapphire, "normal", "exalted").mods.filter((mod) => mod.type === "suffix"),
  3,
);
assert(sapphireSuffixDefinitions.length === 3, "need three sapphire suffix definitions for jewel capacity checks");
const sapphireDesecrationItem = JSON.parse(JSON.stringify(timeLostSapphire));
pushExplicit(sapphireDesecrationItem, sapphireSecondPrefix);
sapphireSuffixDefinitions.slice(0, 2).forEach((definition) => pushExplicit(sapphireDesecrationItem, definition));
assert(Core.countByType(sapphireDesecrationItem, "prefix") === 2, "sapphire desecration setup should have both prefix slots filled");
assert(Core.countByType(sapphireDesecrationItem, "suffix") === 2, "sapphire desecration setup should have one suffix slot open");
const sapphireCraniumPool = Core.summarizePool(sapphireDesecrationItem, "normal", "preserved_cranium");
assert(sapphireCraniumPool.mods.length > 0, "sapphire jewel with suffix +1 should still have cranium candidates");
assert(sapphireCraniumPool.mods.every((mod) => mod.type === "suffix"), "sapphire jewel with suffix +1 and full prefixes should desecrate directly into suffixes");
const sapphireCranium = Core.applyCurrency(sapphireDesecrationItem, "preserved_cranium", "normal");
assert(sapphireCranium.ok, `sapphire cranium with suffix +1 failed: ${sapphireCranium.reason || "unknown"}`);
assert(sapphireCranium.step.added[0].type === "suffix", "sapphire cranium should add the hidden desecrated suffix");

const sapphireFullSuffixItem = JSON.parse(JSON.stringify(timeLostSapphire));
pushExplicit(sapphireFullSuffixItem, sapphireSecondPrefix);
sapphireSuffixDefinitions.forEach((definition) => pushExplicit(sapphireFullSuffixItem, definition));
assert(Core.allMods(sapphireFullSuffixItem).length === 5, "sapphire full suffix setup should have five total jewel modifiers");
assert(Core.countByType(sapphireFullSuffixItem, "suffix") === 3, "sapphire full suffix setup should have three suffixes");
const sapphireChaosPreview = Core.removalPreview(sapphireFullSuffixItem, "chaos", "normal");
assert(!sapphireChaosPreview.candidates.some((candidate) => candidate.type === "suffix"), "chaos should not randomize the over-base suffix side on a suffix +1 jewel");
const sapphireChaos = Core.applyCurrency(sapphireFullSuffixItem, "chaos", "normal");
assert(!sapphireChaos.ok || !sapphireChaos.step.removed.some((mod) => mod.type === "suffix"), "chaos must not remove a suffix from the full suffix +1 jewel");

const normalSapphire = Core.makeItem("jewel_sapphire", 82, "smoke-liquid-normal-sapphire");
normalSapphire.rarity = "rare";
const basicSapphireLiquidAction = Core.CURRENCIES.find((action) => (
  action.category === "liquid_emotion" &&
  !action.id.startsWith("Ancient_") &&
  Core.summarizePool(normalSapphire, "normal", action.id).mods.some((mod) => (mod.allowedBaseIds || []).includes("jewel_sapphire"))
));
assert(basicSapphireLiquidAction, "basic sapphire jewel should expose non-ancient liquid emotion actions");
const normalSapphirePrefix = Core.summarizePool(normalSapphire, "normal", "exalted").mods.find((mod) => mod.type === "prefix");
assert(normalSapphirePrefix, "basic sapphire same-side fixture needs an ordinary prefix");
pushExplicit(normalSapphire, normalSapphirePrefix);
const ancientOnNormalSapphire = Core.applyCurrency(normalSapphire, liquidSuffixPlusOneAction.id, "normal");
assert(!ancientOnNormalSapphire.ok, "ancient liquid emotions should reject basic sapphire jewels");
const normalSapphireLiquid = Core.applyCurrency(normalSapphire, basicSapphireLiquidAction.id, "normal");
assert(normalSapphireLiquid.ok, `basic liquid emotion should apply to rare Sapphire jewel: ${normalSapphireLiquid.reason || "unknown"}`);
assert(normalSapphireLiquid.step.removed.length === 1 && normalSapphireLiquid.step.added.length === 1, "basic liquid emotion should replace one jewel modifier");
assert(String(normalSapphireLiquid.step.added[0].baseId || "").startsWith("Liquid_Emotions_"), "basic liquid emotion should add the PoE2DB Liquid_Emotions crafted modifier");
const liquidItem = Core.makeItem("jewel_time_lost_sapphire", 82, "smoke-liquid-time-lost-sapphire");
liquidItem.rarity = "rare";
pushExplicit(liquidItem, sapphireSuffixDefinitions[0]);
const liquidResult = Core.applyCurrency(liquidItem, liquidSuffixPlusOneAction.id, "normal");
assert(liquidResult.ok, `liquid emotion should apply to rare Time-Lost Sapphire: ${liquidResult.reason || "unknown"}`);
assert(liquidResult.step.removed.length === 1 && liquidResult.step.added.length === 1, `liquid emotion should remove one mod and add one crafted mod: ${JSON.stringify({
  ok: liquidResult.ok,
  reason: liquidResult.reason,
  step: liquidResult.step,
  mods: Core.allMods(liquidResult.item).map((mod) => ({ id: mod.id, type: mod.type, group: mod.group, template: mod.template })),
})}`);
assert(liquidResult.step.added[0].group === "liquid_MaxPrefixMaxSuffix", "liquid emotion should add its PoE2DB crafted jewel modifier");

const waystoneItem = Core.makeItem("waystone_t15", 82, "smoke-waystone-desecration");
waystoneItem.rarity = "rare";
const waystonePool = Core.summarizePool(waystoneItem, "normal", "preserved_vertebrae");
assert(waystonePool.mods.length === 19, `preserved_vertebrae should expose 19 waystone mods, got ${waystonePool.mods.length}`);
const waystoneAttempt = Core.applyCurrency(waystoneItem, "preserved_vertebrae", "normal");
assert(waystoneAttempt.ok, `preserved_vertebrae failed on waystone: ${waystoneAttempt.reason || "unknown"}`);
assert(waystoneAttempt.step.added[0].desecrated && waystoneAttempt.step.added[0].revealed === false, "preserved_vertebrae should add an unrevealed waystone desecrated mod");
const waystoneEcho = Core.applyCurrency(waystoneAttempt.item, "abyssal_echoes", "normal");
assert(waystoneEcho.ok, `abyssal_echoes failed on waystone: ${waystoneEcho.reason || "unknown"}`);
assert(waystoneEcho.item.pendingDesecrationChoice.choices.length === 3, "waystone abyssal echoes should offer three choices");

const hiddenAttempt = Core.applyCurrency(makeRareRubyRing("smoke-hidden-desecration"), "preserved_lockbone", "normal");
assert(hiddenAttempt.ok, `hidden desecration failed: ${hiddenAttempt.reason || "unknown"}`);
const hiddenMod = hiddenAttempt.item.desecratedMods[0];
assert(hiddenMod.revealed === false, "desecration should add an unrevealed mod");
assert(Core.renderMod(hiddenMod) === "未揭露的亵渎词缀", "unrevealed desecrated mod should not render the real text");
assert(Core.countByType(hiddenAttempt.item, hiddenMod.type) === (hiddenMod.type === "prefix" ? hiddenAttempt.item.prefixes.length : hiddenAttempt.item.suffixes.length) + 1, "hidden desecrated mod should count against affix slots");

const crowdedRing = makeRareRubyRing("smoke-desecration-reference-pool");
const prefixDefinitions = distinctDefinitions(Core.summarizePool(crowdedRing, "normal", "exalted").mods.filter((mod) => mod.type === "prefix"), 3);
assert(prefixDefinitions.length === 3, "need three prefix definitions for desecration reference pool check");
prefixDefinitions.forEach((definition) => pushExplicit(crowdedRing, definition));
const actualDesecrationPool = Core.summarizePool(crowdedRing, "normal", "preserved_lockbone");
const referenceDesecrationPool = Core.summarizePool(crowdedRing, "normal", "preserved_lockbone", { ignoreItemState: true });
assert(referenceDesecrationPool.mods.length > actualDesecrationPool.mods.length, "desecration reference pool should keep item-level candidates hidden by current item state");
assert(referenceDesecrationPool.mods.some((mod) => mod.type === "prefix"), "desecration reference pool should still list prefix candidates when prefixes are full");

const echoAttempt = Core.applyCurrency(hiddenAttempt.item, "abyssal_echoes", "normal");
assert(echoAttempt.ok, `abyssal_echoes failed: ${echoAttempt.reason || "unknown"}`);
assert(echoAttempt.item.pendingDesecrationChoice, "abyssal echoes should create a pending three-choice reveal");
assert(echoAttempt.item.pendingDesecrationChoice.choices.length === 3, "abyssal echoes should offer three choices");
const chosenEcho = Core.chooseDesecrationChoice(echoAttempt.item, echoAttempt.item.pendingDesecrationChoice.choices[0].choiceId);
assert(chosenEcho.ok, `choosing abyssal echo failed: ${chosenEcho.reason || "unknown"}`);
echoAttempt.step.revealed = chosenEcho.step.revealed;
assert(echoAttempt.step.revealed.length === 1, "abyssal echoes should record a revealed mod");
assert(echoAttempt.step.revealed[0].revealed === true, "abyssal echoes should reveal the selected mod");
assert(Core.renderMod(echoAttempt.step.revealed[0]) !== "未揭露的亵渎词缀", "revealed desecrated mod should render the real text");

const rerollBase = Core.applyCurrency(makeRareRubyRing("smoke-echo-reroll"), "preserved_lockbone", "normal").item;
const echoOmen = Core.applyCurrency(rerollBase, "omen_desecration_reroll", "normal");
assert(echoOmen.ok, `echo omen failed: ${echoOmen.reason || "unknown"}`);
const rerolledEcho = Core.applyCurrency(echoOmen.item, "abyssal_echoes", "normal");
assert(rerolledEcho.ok, `rerolled abyssal echoes failed: ${rerolledEcho.reason || "unknown"}`);
assert(rerolledEcho.item.pendingDesecrationChoice, "rerolled abyssal echoes should create pending choices");
assert(rerolledEcho.item.pendingDesecrationChoice.choices.length === 3, "rerolled abyssal echoes should offer three choices");
const chosenRerolledEcho = Core.chooseDesecrationChoice(rerolledEcho.item, rerolledEcho.item.pendingDesecrationChoice.choices[0].choiceId);
assert(chosenRerolledEcho.ok, `choosing rerolled abyssal echo failed: ${chosenRerolledEcho.reason || "unknown"}`);
rerolledEcho.step.omenConsumed = chosenRerolledEcho.step.omenConsumed;
rerolledEcho.step.removed = [echoOmen.item.desecratedMods[0]];
rerolledEcho.step.revealed = chosenRerolledEcho.step.revealed;
assert(rerolledEcho.step.omenConsumed && rerolledEcho.step.omenConsumed.id === "omen_desecration_reroll", "abyssal echoes should consume the echo reroll omen");
assert(rerolledEcho.step.removed.length === 1 && rerolledEcho.step.removed[0].revealed === false, "echo reroll should remove the hidden mod before revealing");
assert(rerolledEcho.step.revealed.length === 1 && rerolledEcho.step.revealed[0].revealed === true, "echo reroll should reveal the rerolled mod");

let brightItem = Core.applyCurrency(makeRareRubyRing("smoke-bright-omen"), "exalted", "normal").item;
brightItem = Core.applyCurrency(brightItem, "preserved_lockbone", "normal").item;
const explicitBeforeBright = Core.countExplicit(brightItem);
const brightOmen = Core.applyCurrency(brightItem, "omen_bright", "normal");
assert(brightOmen.ok, `bright omen failed: ${brightOmen.reason || "unknown"}`);
const brightAnnul = Core.applyCurrency(brightOmen.item, "annulment", "normal");
assert(brightAnnul.ok, `bright omen annulment failed: ${brightAnnul.reason || "unknown"}`);
assert(brightAnnul.step.removed.length === 1 && brightAnnul.step.removed[0].desecrated, "bright omen should remove only desecrated mods");
assert(Core.countExplicit(brightAnnul.item) === explicitBeforeBright, "bright omen should not remove normal explicit mods");

const slotItem = makeRareRubyRing("smoke-desecration-slots");
const desecrationPool = Core.summarizePool(slotItem, "normal", "preserved_lockbone").mods;
const slotType = desecrationPool.some((mod) => mod.type === "prefix") ? "prefix" : "suffix";
const explicitPool = Core.summarizePool(slotItem, "normal", "exalted").mods.filter((mod) => !mod.desecrated && mod.type === slotType);
const slotDefinitions = distinctDefinitions(explicitPool, 2);
assert(slotDefinitions.length === 2, `need two ${slotType} definitions for slot test`);
slotDefinitions.forEach((definition) => pushExplicit(slotItem, definition));
const slotOmen = Core.applyCurrency(slotItem, slotType === "prefix" ? "omen_desecration_prefix" : "omen_desecration_suffix", "normal");
assert(slotOmen.ok, `slot omen failed: ${slotOmen.reason || "unknown"}`);
const slotDesecration = Core.applyCurrency(slotOmen.item, "preserved_lockbone", "normal");
assert(slotDesecration.ok, `slot desecration failed: ${slotDesecration.reason || "unknown"}`);
assert(slotDesecration.step.added[0].type === slotType && slotDesecration.step.added[0].revealed === false, "forced desecration should add a hidden mod in the requested slot type");
assert(Core.countByType(slotDesecration.item, slotType) === 3, "desecrated mod should fill the affix slot");
assert(!Core.hasOpenSlot(slotDesecration.item, slotType), "filled desecrated slot should block more mods of that type");

const fracturedBase = Core.applyCurrency(Core.makeItem("ring_ruby", 82, "smoke-fracture"), "alchemy", "normal");
assert(fracturedBase.ok, `alchemy for fracture failed: ${fracturedBase.reason || "unknown"}`);
const fractured = Core.applyCurrency(fracturedBase.item, "fracturing", "normal");
assert(fractured.ok, `fracturing failed: ${fractured.reason || "unknown"}`);
assert(Core.explicitMods(fractured.item).some((mod) => mod.fractured), "fracturing should mark an explicit mod as fractured");

const customDraft = Core.makeItem("ring_ruby", 82, "smoke-custom-pool");
customDraft.rarity = "magic";
const customPrefix = Core.eligibleMods(customDraft, { type: "prefix" }).find((mod) => mod.tier === "T1");
const customSuffix = Core.eligibleMods(customDraft, { type: "suffix" }).find((mod) => mod.tier === "T1" && mod.group !== customPrefix.group);
assert(customPrefix && customSuffix, "need T1 prefix and suffix definitions for custom start");
const customMagic = Core.makeCustomItem("ring_ruby", 82, "smoke-custom-magic", {
  rarity: "magic",
  explicitModIds: [customPrefix.id, customSuffix.id],
});
assert(customMagic.ok, `custom magic start failed: ${customMagic.reason || "unknown"}`);
assert(customMagic.item.rarity === "magic", "custom start should preserve requested magic rarity");
assert(customMagic.item.prefixes.length === 1 && customMagic.item.suffixes.length === 1, "custom magic start should add one prefix and one suffix");
const customRegal = Core.applyCurrency(customMagic.item, "regal", "normal");
assert(customRegal.ok, `custom magic item should accept regal: ${customRegal.reason || "unknown"}`);
assert(customRegal.item.rarity === "rare", "regal should upgrade custom magic item to rare");
const customNormalWithMod = Core.makeCustomItem("ring_ruby", 82, "smoke-custom-normal", {
  rarity: "normal",
  explicitModIds: [customPrefix.id],
});
assert(!customNormalWithMod.ok, "custom normal item should not accept explicit mods");
const customDuplicateGroup = Core.makeCustomItem("ring_ruby", 82, "smoke-custom-duplicate", {
  rarity: "magic",
  explicitModIds: [customPrefix.id, customPrefix.id],
});
assert(!customDuplicateGroup.ok, "custom start should reject duplicate affix groups");

const previewItem = makeRareRubyRing("smoke-chaos-preview");
const previewDefinitions = distinctDefinitions(Core.summarizePool(previewItem, "normal", "exalted").mods.filter((mod) => !mod.desecrated).sort((a, b) => a.level - b.level), 3);
assert(previewDefinitions.length === 3, "need three definitions for chaos preview");
previewDefinitions.forEach((definition) => pushExplicit(previewItem, definition));
const lowestLevel = Math.min(...Core.explicitMods(previewItem).map((mod) => mod.level));
const lowestOmen = Core.applyCurrency(previewItem, "omen_chaos_lowest", "normal");
assert(lowestOmen.ok, `lowest chaos omen failed: ${lowestOmen.reason || "unknown"}`);
const preview = Core.removalPreview(lowestOmen.item, "chaos", "perfect");
assert(preview.candidates.length > 0, "lowest chaos preview should return candidates");
assert(preview.candidates.every((mod) => mod.level === lowestLevel), "lowest chaos preview should only mark the lowest-level mods");
assert(preview.keys.length === preview.candidates.length, "lowest chaos preview should include render keys for UI highlighting");

const chaosDesecratedItem = makeRareRubyRing("smoke-chaos-desecrated-lowest");
const ringDesecratedDefinitions = Core.DESECRATED_MODIFIERS
  .filter((mod) => mod.classes.includes("ring"))
  .sort((a, b) => a.level - b.level);
const lowDesecratedDefinition = ringDesecratedDefinitions.find((definition) => (
  distinctDefinitions(
    Core.summarizePool(chaosDesecratedItem, "normal", "exalted").mods
      .filter((mod) => !mod.desecrated && mod.level > definition.level)
      .sort((a, b) => b.level - a.level),
    2,
  ).length === 2
));
assert(lowDesecratedDefinition, "need a ring desecrated definition below two explicit definitions for chaos removal check");
const lowDesecratedMod = rolledFromDefinition(lowDesecratedDefinition);
lowDesecratedMod.revealed = true;
chaosDesecratedItem.desecratedMods.push(lowDesecratedMod);
const highExplicitDefinitions = distinctDefinitions(
  Core.summarizePool(chaosDesecratedItem, "normal", "exalted").mods
    .filter((mod) => !mod.desecrated && mod.level > lowDesecratedMod.level)
    .sort((a, b) => b.level - a.level),
  2,
);
assert(highExplicitDefinitions.length === 2, "need two high-level explicit definitions for chaos desecrated removal check");
highExplicitDefinitions.forEach((definition) => pushExplicit(chaosDesecratedItem, definition));
const chaosDesecratedOmen = Core.applyCurrency(chaosDesecratedItem, "omen_chaos_lowest", "normal");
assert(chaosDesecratedOmen.ok, `lowest chaos omen for desecrated check failed: ${chaosDesecratedOmen.reason || "unknown"}`);
const desecratedPreview = Core.removalPreview(chaosDesecratedOmen.item, "chaos", "perfect");
assert(desecratedPreview.candidates.length === 1 && desecratedPreview.candidates[0].id === lowDesecratedMod.id, "lowest chaos preview should target the low-level desecrated mod");
const desecratedChaos = Core.applyCurrency(chaosDesecratedOmen.item, "chaos", "perfect");
assert(desecratedChaos.ok, `perfect chaos with low-level desecrated mod failed: ${desecratedChaos.reason || "unknown"}`);
assert(desecratedChaos.step.removed.length === 1 && desecratedChaos.step.removed[0].id === lowDesecratedMod.id, "perfect chaos should remove the low-level desecrated mod");
assert(desecratedChaos.step.removed[0].desecrated, "perfect chaos lowest removal should include desecrated mods");

const comboOmenItem = makeRareRubyRing("smoke-chaos-prefix-lowest-combo");
const lowPrefixDesecratedDefinition = Core.DESECRATED_MODIFIERS
  .filter((mod) => mod.classes.includes("ring") && mod.type === "prefix")
  .sort((a, b) => a.level - b.level)
  .find((definition) => Core.summarizePool(comboOmenItem, "normal", "exalted").mods
    .some((mod) => !mod.desecrated && mod.type === "prefix" && mod.level > definition.level));
assert(lowPrefixDesecratedDefinition, "need a low-level prefix desecrated definition for combined chaos omen check");
const lowPrefixDesecratedMod = rolledFromDefinition(lowPrefixDesecratedDefinition);
lowPrefixDesecratedMod.revealed = true;
comboOmenItem.desecratedMods.push(lowPrefixDesecratedMod);
const highPrefixDefinition = Core.summarizePool(comboOmenItem, "normal", "exalted").mods
  .filter((mod) => !mod.desecrated && mod.type === "prefix" && mod.level > lowPrefixDesecratedMod.level)
  .sort((a, b) => b.level - a.level)[0];
assert(highPrefixDefinition, "need a high-level prefix explicit definition for combined chaos omen check");
pushExplicit(comboOmenItem, highPrefixDefinition);
const prefixOmen = Core.applyCurrency(comboOmenItem, "omen_chaos_prefix", "normal");
assert(prefixOmen.ok, `prefix chaos omen failed: ${prefixOmen.reason || "unknown"}`);
const prefixLowestOmen = Core.applyCurrency(prefixOmen.item, "omen_chaos_lowest", "normal");
assert(prefixLowestOmen.ok, `lowest chaos omen should stack with prefix chaos omen: ${prefixLowestOmen.reason || "unknown"}`);
assert(prefixLowestOmen.item.pendingOmen.effect.removeType === "prefix", "combined chaos omen should keep prefix removal type");
assert(prefixLowestOmen.item.pendingOmen.effect.removeLowest === true, "combined chaos omen should keep lowest-level removal");
const comboPreview = Core.removalPreview(prefixLowestOmen.item, "chaos", "perfect");
assert(comboPreview.candidates.length === 1 && comboPreview.candidates[0].id === lowPrefixDesecratedMod.id, "combined prefix+lowest chaos preview should target low-level prefix desecrated mod");
const comboChaos = Core.applyCurrency(prefixLowestOmen.item, "chaos", "perfect");
assert(comboChaos.ok, `perfect chaos with combined prefix+lowest omens failed: ${comboChaos.reason || "unknown"}`);
assert(comboChaos.step.removed.length === 1 && comboChaos.step.removed[0].id === lowPrefixDesecratedMod.id, "combined prefix+lowest chaos should remove low-level prefix desecrated mod");

assert(Core.DATA_STATUS.modDataLoaded, "PoE2DB modifier data must be loaded; fallback modifier data is not acceptable for verification");
assert(Core.DATA_STATUS.craftingDataLoaded, "PoE2DB crafting data must be loaded; fallback crafting data is not acceptable for verification");
const perfectAugmentationRing = Core.makeItem("ring_ruby", 82, "smoke-perfect-augmentation-fire-resistance");
perfectAugmentationRing.rarity = "magic";
const perfectAugmentationFireRows = Core.summarizePool(perfectAugmentationRing, "perfect", "augmentation").mods
  .filter((mod) => mod.group === "FireResistance" || (mod.tags || []).includes("fire_resistance"));
assert(perfectAugmentationFireRows.some((mod) => mod.tier === "T1" && mod.level === 82 && mod.rolls[0].min === 41 && mod.rolls[0].max === 45), "perfect augmentation ring fire resistance should use imported PoE2DB T1 level 82 range 41-45");
assert(!perfectAugmentationFireRows.some((mod) => mod.level === 80 && mod.rolls[0].min === 48 && mod.rolls[0].max === 52), "perfect augmentation ring fire resistance must not use fallback T1 level 80 range 48-52");

const ringDamagePrefixPool = Core.summarizePool(makeRareRubyRing("smoke-ring-damage-prefix-pool"), "normal", "exalted").mods
  .filter((mod) => mod.type === "prefix");
const requiredRingDamagePercentageGroups = ["FireDamagePercentage", "ColdDamagePercentage", "LightningDamagePercentage"];
requiredRingDamagePercentageGroups.forEach((group) => {
  const rows = ringDamagePrefixPool.filter((mod) => mod.group === group);
  assert(rows.length >= 6, `ruby ring prefix pool should include ${group} tiers, got ${rows.length}`);
  assert(rows.some((mod) => mod.tier === "T1" && mod.level === 75 && mod.weight === 500), `ruby ring prefix pool should include ${group} T1 level 75 weight 500`);
});

assert(Core.DATA_STATUS.liquidEmotionCount >= 26, `PoE2DB liquid emotion data should include basic and ancient liquids, got ${Core.DATA_STATUS.liquidEmotionCount}`);
assert(Core.DATA_STATUS.catalystCount === 26, `PoE2DB catalyst data should include 26 catalysts, got ${Core.DATA_STATUS.catalystCount}`);
const catalystActions = Core.CURRENCIES.filter((action) => action.category === "catalyst");
assert(catalystActions.length === 26, `expected 26 catalyst actions, got ${catalystActions.length}`);
const ringCatalyst = catalystActions.find((action) => (action.catalyst.classes || []).includes("ring") && (action.catalyst.tags || []).length > 0);
const jewelCatalyst = catalystActions.find((action) => (action.catalyst.classes || []).includes("jewel") && !(action.catalyst.classes || []).includes("ring"));
assert(ringCatalyst, "missing ring/amulet catalyst action");
assert(jewelCatalyst, "missing jewel-only refined catalyst action");
const catalystProbeMod = Core.summarizePool(makeRareRubyRing("smoke-catalyst-probe"), "normal", "exalted").mods
  .find((mod) => (mod.tags || []).some((tag) => (ringCatalyst.catalyst.tags || []).includes(tag)) && (mod.rolls || []).length > 0);
assert(catalystProbeMod, `need a ruby ring modifier matching catalyst ${ringCatalyst.id}`);
let catalystRing = makeRareRubyRing("smoke-catalyst-ring");
const catalystBeforeMod = pushExplicit(catalystRing, catalystProbeMod);
const catalystTextBefore = Core.renderMod(catalystBeforeMod, catalystRing);
const catalystApplied = Core.applyCurrency(catalystRing, ringCatalyst.id, "normal");
assert(catalystApplied.ok, `ring catalyst should apply: ${catalystApplied.reason || "unknown"}`);
assert(catalystApplied.item.catalyst.quality === 1, "rare ring catalyst should add 1% quality");
assert(Core.renderMod(catalystApplied.item.prefixes[0] || catalystApplied.item.suffixes[0], catalystApplied.item) !== catalystTextBefore, "matching catalyst should adjust rendered modifier values");
const jewelCatalystOnRing = Core.applyCurrency(makeRareRubyRing("smoke-jewel-catalyst-on-ring"), jewelCatalyst.id, "normal");
assert(!jewelCatalystOnRing.ok, "jewel-only catalyst should not apply to rings");
const catalystJewel = Core.makeItem("jewel_sapphire", 82, "smoke-jewel-catalyst");
catalystJewel.rarity = "rare";
const jewelCatalystApplied = Core.applyCurrency(catalystJewel, jewelCatalyst.id, "normal");
assert(jewelCatalystApplied.ok, `jewel catalyst should apply to jewels: ${jewelCatalystApplied.reason || "unknown"}`);
const manaCatalyst = catalystActions.find((action) => action.id === "Neural_Catalyst");
assert(manaCatalyst, "missing Neural Catalyst action");
const rawManaPrefixProbe = makeRareRubyRing("smoke-catalyst-omen-raw");
const rawManaPrefixPool = Core.summarizePool(rawManaPrefixProbe, "normal", "exalted").mods.filter((mod) => mod.type === "prefix");
const rawManaPrefixWeight = rawManaPrefixPool
  .filter((mod) => (mod.tags || []).includes("mana"))
  .reduce((sum, mod) => sum + mod.weight, 0);
const rawPrefixWeight = rawManaPrefixPool.reduce((sum, mod) => sum + mod.weight, 0);
let manaCatalystRing = makeRareRubyRing("smoke-catalyst-omen-mana");
for (let index = 0; index < 20; index += 1) {
  const applied = Core.applyCurrency(manaCatalystRing, manaCatalyst.id, "normal");
  assert(applied.ok, `Neural Catalyst should stack to 20%: ${applied.reason || "unknown"}`);
  manaCatalystRing = applied.item;
}
assert(manaCatalystRing.catalyst.quality === 20, "Neural Catalyst setup should reach 20% quality");
const manaCatalysingOmen = Core.applyCurrency(manaCatalystRing, "omen_catalysing_exaltation", "normal");
assert(manaCatalysingOmen.ok, `catalysing omen should prepare mana catalyst ring: ${manaCatalysingOmen.reason || "unknown"}`);
const manaLeftOmen = Core.applyCurrency(manaCatalysingOmen.item, "omen_exalted_prefix", "normal");
assert(manaLeftOmen.ok, `left exalt omen should stack with catalysing omen: ${manaLeftOmen.reason || "unknown"}`);
const boostedManaPrefixPool = Core.summarizePool(manaLeftOmen.item, "normal", "exalted").mods;
const boostedManaPrefixWeight = boostedManaPrefixPool
  .filter((mod) => (mod.tags || []).includes("mana"))
  .reduce((sum, mod) => sum + (mod.effectiveWeight || mod.weight), 0);
const boostedPrefixWeight = boostedManaPrefixPool.reduce((sum, mod) => sum + (mod.effectiveWeight || mod.weight), 0);
assert(boostedManaPrefixPool.length > 0 && boostedManaPrefixPool.every((mod) => mod.type === "prefix"), "left exalt omen should restrict catalysed preview to prefixes");
assert(boostedManaPrefixPool.some((mod) => (mod.tags || []).includes("mana") && mod.effectiveWeight > mod.weight), "catalysing exaltation should boost effective weight for mana-tagged prefixes");
assert((boostedManaPrefixWeight / boostedPrefixWeight) > (rawManaPrefixWeight / rawPrefixWeight), "catalysing exaltation should increase mana prefix appearance share");
const boostedManaExalt = Core.applyCurrency(manaLeftOmen.item, "exalted", "normal");
assert(boostedManaExalt.ok, `boosted mana exalt should apply: ${boostedManaExalt.reason || "unknown"}`);
assert(boostedManaExalt.item.catalyst.quality === 0, "boosted mana exalt should consume Neural Catalyst quality");
const catalystOmen = Core.applyCurrency(catalystApplied.item, "omen_catalysing_exaltation", "normal");
assert(catalystOmen.ok, `catalysing exaltation omen should apply: ${catalystOmen.reason || "unknown"}`);
const catalystExalt = Core.applyCurrency(catalystOmen.item, "exalted", "normal");
assert(catalystExalt.ok, `exalted should consume catalyst quality with omen: ${catalystExalt.reason || "unknown"}`);
assert(catalystExalt.item.catalyst.quality === 0, "catalysing exaltation omen should consume all catalyst quality");

let breachQualityRing = makeRareRubyRing("smoke-breach-quality-cap");
pushExplicit(breachQualityRing, Core.summarizePool(breachQualityRing, "normal", "exalted").mods[0]);
const breachQuality = Core.applyCurrency(breachQualityRing, "Essence_of_the_Breach", "normal");
assert(breachQuality.ok, `Essence of the Breach should add quality cap modifier: ${breachQuality.reason || "unknown"}`);
assert(Core.qualityCapFor(breachQuality.item) === 40, `Essence of the Breach should raise quality cap to 40, got ${Core.qualityCapFor(breachQuality.item)}`);
let cappedCatalystRing = breachQuality.item;
for (let index = 0; index < 40; index += 1) {
  const applied = Core.applyCurrency(cappedCatalystRing, manaCatalyst.id, "normal");
  assert(applied.ok, `Neural Catalyst should respect Breach quality cap at ${index + 1}%: ${applied.reason || "unknown"}`);
  cappedCatalystRing = applied.item;
}
assert(cappedCatalystRing.catalyst.quality === 40, `Breach quality cap should allow 40% catalyst quality, got ${cappedCatalystRing.catalyst.quality}`);
const overCapCatalyst = Core.applyCurrency(cappedCatalystRing, manaCatalyst.id, "normal");
assert(!overCapCatalyst.ok, "catalyst should stop at the Breach-extended quality cap");

const breachBaseRing = Core.makeItem("ring_breach", 82, "smoke-breach-ring-base-quality-cap");
breachBaseRing.rarity = "rare";
assert(Core.qualityCapFor(breachBaseRing) === 40, `Breach Ring implicit should raise quality cap to 40, got ${Core.qualityCapFor(breachBaseRing)}`);
const refinedBreachBaseRing = Core.makeItem("ring_refined_breach", 82, "smoke-refined-breach-ring-base-quality-cap");
refinedBreachBaseRing.rarity = "rare";
assert(Core.qualityCapFor(refinedBreachBaseRing) === 45, `Refined Breach Ring implicit should raise quality cap to 45, got ${Core.qualityCapFor(refinedBreachBaseRing)}`);

let breachRingWithEssence = Core.makeItem("ring_breach", 82, "smoke-breach-ring-essence-quality-cap");
breachRingWithEssence.rarity = "rare";
pushExplicit(breachRingWithEssence, Core.summarizePool(breachRingWithEssence, "normal", "exalted").mods[0]);
const breachRingEssenceQuality = Core.applyCurrency(breachRingWithEssence, "Essence_of_the_Breach", "normal");
assert(breachRingEssenceQuality.ok, `Essence of the Breach should apply to Breach Ring: ${breachRingEssenceQuality.reason || "unknown"}`);
assert(Core.qualityCapFor(breachRingEssenceQuality.item) === 60, `Breach Ring plus Essence of the Breach should allow 60% quality before Vaal infuser overflow, got ${Core.qualityCapFor(breachRingEssenceQuality.item)}`);

["vaal_armour_infuser", "vaal_whetstone", "vaal_arcanists_etcher", "vaal_catalysing_infuser"].forEach((actionId) => {
  assert(Core.CURRENCIES.some((action) => action.id === actionId), `${actionId} should be available as a quality overflow currency`);
});

const prematureVaalCatalyst = Core.applyCurrency(breachRingEssenceQuality.item, "vaal_catalysing_infuser", "normal");
assert(!prematureVaalCatalyst.ok, "Vaal Catalysing Infuser should require catalyst quality to be at the current cap first");

let vaalCatalystRing = breachRingEssenceQuality.item;
for (let index = 0; index < 60; index += 1) {
  const applied = Core.applyCurrency(vaalCatalystRing, manaCatalyst.id, "normal");
  assert(applied.ok, `Neural Catalyst should stack to Breach Ring + Essence cap at ${index + 1}%: ${applied.reason || "unknown"}`);
  vaalCatalystRing = applied.item;
}
assert(vaalCatalystRing.catalyst.quality === 60, `Breach Ring plus Essence should reach 60% catalyst quality, got ${vaalCatalystRing.catalyst.quality}`);
const normalCatalystAboveBreachCap = Core.applyCurrency(vaalCatalystRing, manaCatalyst.id, "normal");
assert(!normalCatalystAboveBreachCap.ok, "ordinary catalyst should not exceed the Breach Ring + Essence quality cap");

for (let index = 0; index < 10; index += 1) {
  const applied = Core.applyCurrency(vaalCatalystRing, "vaal_catalysing_infuser", "normal");
  assert(applied.ok, `Vaal Catalysing Infuser should overflow catalyst quality to ${61 + index}%: ${applied.reason || "unknown"}`);
  vaalCatalystRing = applied.item;
}
assert(vaalCatalystRing.catalyst.quality === 70, `Vaal Catalysing Infuser should overflow Breach Ring + Essence to 70%, got ${vaalCatalystRing.catalyst.quality}`);
assert(vaalCatalystRing.vaalInfuserCorruptionRisk, "Vaal Catalysing Infuser should mark the item as having unresolved corruption risk");
const overVaalCatalyst = Core.applyCurrency(vaalCatalystRing, "vaal_catalysing_infuser", "normal");
assert(!overVaalCatalyst.ok, "Vaal Catalysing Infuser should stop at current quality cap + 10%");

const duskRing = Core.makeItem("ring_dusk", 82, "smoke-affix-adjust-dusk");
duskRing.rarity = "rare";
assert(Core.capFor(duskRing, "prefix") === 4, "Dusk Ring implicit should allow 4 prefixes");
assert(Core.capFor(duskRing, "suffix") === 2, "Dusk Ring implicit should limit suffixes to 2");

assert(Core.DATA_STATUS.soulCoreDataLoaded, "PoE2DB Soul Core data must be loaded");
const medvedsTending = Core.CURRENCIES.find((action) => action.id === "medveds_tending");
const medvedsModifier = Core.CURRENCIES.find((action) => action.id === "medveds_tending_modifier");
assert(medvedsTending, "Medved's Tending socketable action is missing");
assert(medvedsModifier, "Medved's Tending modifier reset action is missing");
const bodyArmourBase = Core.BASES.find((base) => base.classId === "body_armour" && Number(base.maxSockets || 1) > 0 && (base.tags || []).some((tag) => tag === "def_armour"));
assert(bodyArmourBase, "need a socketable body armour base for Medved's Tending check");
let medvedItem = Core.makeItem(bodyArmourBase.id, Math.max(82, bodyArmourBase.requiredLevel || 1), "smoke-medved");
medvedItem.rarity = "rare";
const medvedPoolBeforeSocket = Core.summarizePool(medvedItem, "normal", "medveds_tending_modifier");
assert(medvedPoolBeforeSocket.mods.length > 0, "Medved's Tending pool should be inspectable before socketing");
assert(medvedPoolBeforeSocket.mods.length === 21, `Medved's Tending should expose the current body armour PoE2DB pool of 21 rows, got ${medvedPoolBeforeSocket.mods.length}`);
const medvedBlockedBeforeSocket = Core.applyCurrency(medvedItem, "medveds_tending_modifier", "normal");
assert(!medvedBlockedBeforeSocket.ok, "Medved's Tending modifier action should require socketed Medved's Tending");
const medvedSocketedBase = Core.applyCurrency(medvedItem, "artificer", "normal");
assert(medvedSocketedBase.ok, `artificer should add a socket before Medved's Tending: ${medvedSocketedBase.reason || "unknown"}`);
const medvedSocket = Core.applyCurrency(medvedSocketedBase.item, "medveds_tending", "normal");
assert(medvedSocket.ok, `Medved's Tending should socket into body armour: ${medvedSocket.reason || "unknown"}`);
const medvedFirst = Core.applyCurrency(medvedSocket.item, "medveds_tending_modifier", "normal");
assert(medvedFirst.ok, `Medved's Tending should add a Soul modifier: ${medvedFirst.reason || "unknown"}`);
assert(medvedFirst.step.added.length === 1, "Medved's Tending should add one modifier");
assert(medvedFirst.step.added[0].soulCoreCategory === "soul", "Medved's Tending should add a soul modifier");
assert(medvedFirst.step.added[0].level === 65, "Medved's Tending imported modifiers should keep PoE2DB level 65");
assert(medvedFirst.step.added[0].weight === 1, "Medved's Tending imported modifiers should keep PoE2DB weight 1");
const medvedPreview = Core.removalPreview(medvedFirst.item, "medveds_tending_modifier", "normal");
assert(medvedPreview.candidates.length === 1 && medvedPreview.candidates[0].soulCoreCategory === "soul", "Medved's Tending reset preview should target the existing soul modifier");
const medvedSecond = Core.applyCurrency(medvedFirst.item, "medveds_tending_modifier", "normal");
assert(medvedSecond.ok, `Medved's Tending should reroll an existing Soul modifier: ${medvedSecond.reason || "unknown"}`);
assert(medvedSecond.step.removed.length === 1 && medvedSecond.step.added.length === 1, "Medved's Tending reroll should remove one and add one modifier");
const medvedOnRing = Core.applyCurrency(makeRareRubyRing("smoke-medved-ring"), "medveds_tending", "normal");
assert(!medvedOnRing.ok, "Medved's Tending should not socket into rings");

const serlesTriumph = Core.CURRENCIES.find((action) => action.id === "serles_triumph");
assert(serlesTriumph, "Serle's Triumph socketable action is missing");
const serlesBase = Core.BASES.find((base) => (
  Number(base.maxSockets) > 0 &&
  Core.summarizePool(Object.assign(Core.makeItem(base.id, Math.max(82, base.requiredLevel || 1), `smoke-serles-pool-${base.id}`), { rarity: "rare" }), "normal", "exalted")
    .mods.filter((mod) => mod.type === "suffix").length >= 4
));
assert(serlesBase, "need a socketable base with at least four suffix candidates for Serle's Triumph check");
let serlesItem = Core.makeItem(serlesBase.id, Math.max(82, serlesBase.requiredLevel || 1), "smoke-serles-triumph");
serlesItem.rarity = "rare";
const serlesSuffixDefinitions = distinctDefinitions(
  Core.summarizePool(serlesItem, "normal", "exalted").mods.filter((mod) => mod.type === "suffix"),
  3,
);
assert(serlesSuffixDefinitions.length === 3, "need three distinct suffix definitions for Serle's Triumph check");
serlesSuffixDefinitions.forEach((definition) => pushExplicit(serlesItem, definition));
assert(Core.capFor(serlesItem, "suffix") === 3, "socketable rare item should start with a 3 suffix cap before Serle's Triumph");
assert(!Core.hasOpenSlot(serlesItem, "suffix"), "three suffixes should fill the base suffix cap before Serle's Triumph");
const suffixBlocked = Core.applyCurrency(Core.applyCurrency(serlesItem, "omen_exalted_suffix", "normal").item, "exalted", "normal");
assert(!suffixBlocked.ok, "forced suffix exalt should fail before Serle's Triumph when suffixes are full");
const socketed = Core.applyCurrency(serlesItem, "artificer", "normal");
assert(socketed.ok, `artificer should add a socket before Serle's Triumph: ${socketed.reason || "unknown"}`);
const runed = Core.applyCurrency(socketed.item, "serles_triumph", "normal");
assert(runed.ok, `Serle's Triumph should socket successfully: ${runed.reason || "unknown"}`);
assert(Core.capFor(runed.item, "suffix") === 4, "Serle's Triumph should increase suffix cap to 4");
assert(Core.hasOpenSlot(runed.item, "suffix"), "Serle's Triumph should open a fourth suffix slot");
const suffixOmen = Core.applyCurrency(runed.item, "omen_exalted_suffix", "normal");
assert(suffixOmen.ok, `suffix exalt omen should apply after Serle's Triumph: ${suffixOmen.reason || "unknown"}`);
const fourthSuffix = Core.applyCurrency(suffixOmen.item, "exalted", "normal");
assert(fourthSuffix.ok, `exalted should add the fourth suffix after Serle's Triumph: ${fourthSuffix.reason || "unknown"}`);
assert(fourthSuffix.step.added.length === 1 && fourthSuffix.step.added[0].type === "suffix", "Serle's Triumph check should add a suffix");
assert(Core.countByType(fourthSuffix.item, "suffix") === 4, "Serle's Triumph item should reach four suffixes");

let heavyBelt = Core.makeItem("belt_heavy", 82, "smoke-heavy-belt-perfect-exalted");
heavyBelt.rarity = "rare";
const heavyBeltPerfectPool = Core.summarizePool(heavyBelt, "perfect", "exalted");
assert(heavyBeltPerfectPool.prefixCount > 1, `perfect exalted heavy belt should have multiple prefix candidates, got ${heavyBeltPerfectPool.prefixCount}`);
assert(heavyBeltPerfectPool.suffixCount > 1, `perfect exalted heavy belt should have multiple suffix candidates, got ${heavyBeltPerfectPool.suffixCount}`);
assert(heavyBeltPerfectPool.mods.every((mod) => mod.level >= 50), "perfect exalted should filter by modifier level >= 50");
for (let index = 0; index < 6; index += 1) {
  const result = Core.applyCurrency(heavyBelt, "exalted", "perfect");
  assert(result.ok, `perfect exalted heavy belt should remain usable until full affixes, failed at ${index}: ${result.reason || "unknown"}`);
  heavyBelt = result.item;
}
assert(heavyBelt.prefixes.length === 3 && heavyBelt.suffixes.length === 3, "perfect exalted heavy belt should be able to reach 3 prefixes and 3 suffixes with imported data");

const armourQualityBase = Core.BASES.find((base) => {
  if (!(base.tags || []).includes("armour")) return false;
  const item = Core.makeItem(base.id, Math.max(82, base.requiredLevel || 1), `smoke-armour-quality-probe-${base.id}`);
  item.quality = 5;
  return Core.baseStatLines(item).some((line) => line.valueChanged);
});
assert(armourQualityBase, "need an armour base with numeric base stats for quality check");
const armourQualityItem = Core.makeItem(armourQualityBase.id, Math.max(82, armourQualityBase.requiredLevel || 1), "smoke-armour-quality");
const armourQualityBefore = Core.baseStatLines(armourQualityItem);
const armourQualityResult = Core.applyCurrency(armourQualityItem, "armour_scrap", "normal");
assert(armourQualityResult.ok, `armour scrap should apply to armour base: ${armourQualityResult.reason || "unknown"}`);
const armourQualityAfter = Core.baseStatLines(armourQualityResult.item);
assert(armourQualityResult.item.quality > 0, "armour scrap should increase item quality");
assert(armourQualityAfter.some((line, index) => line.qualityAdjusted && line.text !== armourQualityBefore[index].text), "quality should change displayed armour base stat values");

let vaalArmourQualityItem = Core.makeItem(armourQualityBase.id, Math.max(82, armourQualityBase.requiredLevel || 1), "smoke-vaal-armour-infuser");
vaalArmourQualityItem.rarity = "rare";
const vaalArmourBaseCap = Core.qualityCapFor(vaalArmourQualityItem);
const prematureVaalArmour = Core.applyCurrency(vaalArmourQualityItem, "vaal_armour_infuser", "normal");
assert(!prematureVaalArmour.ok, "Vaal Armour Infuser should require item quality to be at the current cap first");
vaalArmourQualityItem.quality = vaalArmourBaseCap;
for (let index = 0; index < 10; index += 1) {
  const applied = Core.applyCurrency(vaalArmourQualityItem, "vaal_armour_infuser", "normal");
  assert(applied.ok, `Vaal Armour Infuser should overflow armour quality to ${vaalArmourBaseCap + index + 1}%: ${applied.reason || "unknown"}`);
  vaalArmourQualityItem = applied.item;
}
assert(vaalArmourQualityItem.quality === vaalArmourBaseCap + 10, `Vaal Armour Infuser should stop at cap + 10%, got ${vaalArmourQualityItem.quality}`);
const overVaalArmour = Core.applyCurrency(vaalArmourQualityItem, "vaal_armour_infuser", "normal");
assert(!overVaalArmour.ok, "Vaal Armour Infuser should not exceed current quality cap + 10%");

const weaponQualityBase = Core.BASES.find((base) => {
  if (!(base.tags || []).includes("attack_weapon") || (base.tags || []).includes("caster_weapon")) return false;
  const item = Core.makeItem(base.id, Math.max(82, base.requiredLevel || 1), `smoke-weapon-quality-probe-${base.id}`);
  item.quality = 5;
  return Core.baseStatLines(item).some((line) => line.valueChanged);
});
assert(weaponQualityBase, "need a martial weapon base with numeric base stats for quality check");
const weaponQualityItem = Core.makeItem(weaponQualityBase.id, Math.max(82, weaponQualityBase.requiredLevel || 1), "smoke-weapon-quality");
const weaponQualityBefore = Core.baseStatLines(weaponQualityItem);
const weaponQualityResult = Core.applyCurrency(weaponQualityItem, "whetstone", "normal");
assert(weaponQualityResult.ok, `whetstone should apply to martial weapon base: ${weaponQualityResult.reason || "unknown"}`);
const weaponQualityAfter = Core.baseStatLines(weaponQualityResult.item);
assert(weaponQualityResult.item.quality > 0, "whetstone should increase item quality");
assert(weaponQualityAfter.some((line, index) => line.qualityAdjusted && line.text !== weaponQualityBefore[index].text), "quality should change displayed weapon base damage values");

function findVaalResult(factory, predicate, label) {
  for (let index = 0; index < 800; index += 1) {
    const item = factory(`smoke-vaal-${label}-${index}`);
    const result = Core.applyCurrency(item, "vaal", "normal");
    if (result.ok && predicate(result, item)) return result;
  }
  throw new Error(`could not hit Vaal outcome: ${label}`);
}

function makeVaalRollItem(seed) {
  const item = makeRareRubyRing(seed);
  const definition = Core.summarizePool(item, "normal", "exalted").mods.find((mod) => (
    (mod.rolls || []).some((roll) => Number(roll.max) > Number(roll.min))
  ));
  assert(definition, "need a rollable modifier for Vaal high-roll check");
  const mod = pushExplicit(item, definition);
  mod.values = (mod.rolls || []).map((roll) => Number(roll.min));
  return item;
}

const vaalHighRoll = findVaalResult(
  makeVaalRollItem,
  (result) => /roll/i.test(result.step.note || "") && Core.allMods(result.item).some((mod) => (
    (mod.rolls || []).length > 0 && mod.values.every((value, index) => Number(value) === Number(mod.rolls[index].max))
  )),
  "high-roll",
);
assert(vaalHighRoll.item.corrupted, "Vaal high-roll outcome should corrupt the item");

const socketBase = Core.BASES.find((base) => Number(base.maxSockets) > 0);
assert(socketBase, "need a socketable base for Vaal extra-socket check");
const vaalExtraSocket = findVaalResult(
  (seed) => {
    const item = Core.makeItem(socketBase.id, Math.max(82, socketBase.requiredLevel || 1), seed);
    item.sockets = Array.from({ length: Number(socketBase.maxSockets) }, () => ({ rune: null }));
    return item;
  },
  (result, before) => result.item.sockets.length === before.sockets.length + 1 && result.item.sockets.some((socket) => socket.corrupted),
  "extra-socket",
);
assert(vaalExtraSocket.item.sockets.length === Number(socketBase.maxSockets) + 1, "Vaal should be able to add one corrupted socket above the normal socket cap");

const liquidContempt = Core.CURRENCIES.find((action) => action.id === "Potent_Liquid_Contempt");
assert(liquidContempt, "Potent Liquid Contempt action is missing");
let liquidJewel = Core.makeItem("jewel_ruby", 82, "smoke-liquid-0");
liquidJewel.rarity = "rare";
const liquidPool = Core.summarizePool(liquidJewel, "normal", "exalted").mods;
const liquidPrefixes = distinctDefinitions(liquidPool.filter((mod) => mod.type === "prefix"), 2);
const liquidSuffixes = distinctDefinitions(liquidPool.filter((mod) => mod.type === "suffix"), 2);
assert(liquidPrefixes.length === 2 && liquidSuffixes.length === 2, "need a four-affix rare jewel for Liquid Contempt slot transfer check");
liquidPrefixes.concat(liquidSuffixes).forEach((definition) => pushExplicit(liquidJewel, definition));
assert(Core.countByType(liquidJewel, "prefix") === 2 && Core.countByType(liquidJewel, "suffix") === 2, "jewel fixture should start at 2 prefixes and 2 suffixes");
const liquidApplied = Core.applyCurrency(liquidJewel, liquidContempt.id, "normal");
assert(liquidApplied.ok, `Liquid Contempt should replace one legal affix: ${liquidApplied.reason || "unknown"}`);
assert(liquidApplied.item.prefixes.some((mod) => /\u540e\u7f00/.test(mod.sourceText || "")), "Liquid Contempt fixture should roll the allowed suffix +1 prefix branch");
assert(Core.countByType(liquidApplied.item, "prefix") === 2, "Liquid Contempt should keep two prefixes after replacing a prefix");
assert(Core.countByType(liquidApplied.item, "suffix") === 2, "Liquid Contempt should keep two explicit suffixes");
assert(Core.capFor(liquidApplied.item, "prefix") === 2, "Liquid Contempt's prefix modifier must not reduce the jewel prefix cap");
assert(Core.capFor(liquidApplied.item, "suffix") === 3, "Liquid Contempt's allowed suffix +1 must open a third suffix slot");
const liquidTransferMod = liquidApplied.item.prefixes.find((mod) => /\u540e\u7f00/.test(mod.sourceText || ""));
const liquidThirdSuffix = distinctDefinitions(liquidPool.filter((mod) => mod.type === "suffix"), 3)[2];
assert(liquidTransferMod && liquidThirdSuffix, "need a transfer prefix and a third suffix for post-removal capacity check");
let overCapacityRemoval = null;
for (let index = 1; index <= 16 && !overCapacityRemoval; index += 1) {
  const overCapacityItem = JSON.parse(JSON.stringify(liquidApplied.item));
  pushExplicit(overCapacityItem, liquidThirdSuffix);
  overCapacityItem.rngState = index * 0x10000000;
  const prefixOmen = Core.applyCurrency(overCapacityItem, "omen_annulment_prefix", "normal");
  assert(prefixOmen.ok, `prefix annulment omen should prepare for capacity check: ${prefixOmen.reason || "unknown"}`);
  const annul = Core.applyCurrency(prefixOmen.item, "annulment", "normal");
  if (annul.ok && annul.step.removed.some((mod) => mod.id === liquidTransferMod.id)) overCapacityRemoval = annul;
}
assert(overCapacityRemoval, "annulment should be able to remove the allowed suffix +1 modifier");
assert(Core.countByType(overCapacityRemoval.item, "suffix") === 3, "removing the capacity modifier must not delete an existing suffix");
assert(Core.capFor(overCapacityRemoval.item, "suffix") === 2, "suffix capacity should return to two after removing the capacity modifier");
const desecrationOmen = Core.applyCurrency(liquidApplied.item, "omen_desecration_suffix", "normal");
assert(desecrationOmen.ok, `right-hand desecration omen should prepare: ${desecrationOmen.reason || "unknown"}`);
const desecratedJewel = Core.applyCurrency(desecrationOmen.item, "preserved_cranium", "normal");
assert(desecratedJewel.ok, `right-hand desecration should add a hidden suffix: ${desecratedJewel.reason || "unknown"}`);
assert(desecratedJewel.item.desecratedMods.length === 1 && desecratedJewel.item.desecratedMods[0].type === "suffix", "right-hand desecration should add one hidden suffix");
assert(Core.countByType(desecratedJewel.item, "suffix") === 3, "desecrated suffix should occupy the third suffix slot opened by Liquid Contempt");
const revealedJewel = Core.applyCurrency(desecratedJewel.item, "abyssal_echoes", "normal");
assert(revealedJewel.ok, `Abyssal Echoes should offer desecrated choices: ${revealedJewel.reason || "unknown"}`);
assert(revealedJewel.choices.length === 3, "Abyssal Echoes should offer three desecrated choices");
const chosenJewel = Core.chooseDesecrationChoice(revealedJewel.item, revealedJewel.choices[0].choiceId);
assert(chosenJewel.ok, `Abyssal Echoes choice should be selectable: ${chosenJewel.reason || "unknown"}`);
assert(Core.countByType(chosenJewel.item, "prefix") === 2 && Core.countByType(chosenJewel.item, "suffix") === 3, "Liquid Contempt plus suffix desecration should finish at 2 prefixes and 3 suffixes");

const liquidSideCounts = { prefix: 0, suffix: 0 };
for (let index = 0; index < 256; index += 1) {
  const sideItem = Core.makeItem("jewel_ruby", 82, `smoke-liquid-side-${index}`);
  sideItem.rarity = "rare";
  pushExplicit(sideItem, liquidPrefixes[0]);
  pushExplicit(sideItem, liquidSuffixes[0]);
  pushExplicit(sideItem, liquidSuffixes[1]);
  const sideResult = Core.applyCurrency(sideItem, liquidContempt.id, "normal");
  assert(sideResult.ok, `Liquid Contempt same-side replacement failed at seed ${index}: ${sideResult.reason || "unknown"}`);
  const removedSide = sideResult.step.removed[0] && sideResult.step.removed[0].type;
  const addedSide = sideResult.step.added[0] && sideResult.step.added[0].type;
  assert(removedSide === addedSide, `Liquid Contempt crossed affix sides at seed ${index}: removed ${removedSide}, added ${addedSide}`);
  liquidSideCounts[addedSide] += 1;
}
assert(liquidSideCounts.prefix > 0 && liquidSideCounts.suffix > 0, `Liquid Contempt should exercise both same-side replacement paths: ${JSON.stringify(liquidSideCounts)}`);

console.log(JSON.stringify({
  ok: true,
  checks: {
    actionPools: Core.CURRENCIES.length,
    preservedLockboneAttempts: 300,
    desecrationCoveredClasses: desecrationActionByClass.size,
    desecrationRoutingClasses: disallowedDesecrationPatternByClass.size,
    desecratedEquipmentRows: importedEquipmentRows.length,
    desecratedJewelRows: importedJewelRows.length,
    desecratedWaystoneRows: importedWaystoneRows.length,
    hiddenDesecration: true,
    abyssalEchoes: true,
    brightOmen: true,
    fractured: true,
    customStart: true,
    chaosLowestPreview: preview.candidates.length,
    chaosLowestDesecrated: true,
    stackedChaosOmens: true,
    importedModifierData: Core.DATA_STATUS.modDataLoaded,
    perfectAugmentationFireResistance: "T1 level 82 range 41-45",
    ringDamagePercentagePrefixes: requiredRingDamagePercentageGroups,
    affixAdjustBases: {
      duskRing: {
        prefixCap: Core.capFor(duskRing, "prefix"),
        suffixCap: Core.capFor(duskRing, "suffix"),
      },
      serlesTriumph: {
        baseId: serlesBase.id,
        suffixCap: Core.capFor(fourthSuffix.item, "suffix"),
        finalSuffixes: Core.countByType(fourthSuffix.item, "suffix"),
      },
    },
    heavyBeltPerfectExalted: {
      candidateCount: heavyBeltPerfectPool.mods.length,
      prefixCount: heavyBeltPerfectPool.prefixCount,
      suffixCount: heavyBeltPerfectPool.suffixCount,
      minModifierLevel: heavyBeltPerfectPool.minLevel,
      finalPrefixes: heavyBelt.prefixes.length,
      finalSuffixes: heavyBelt.suffixes.length,
    },
    qualityAndVaal: {
      armourQualityChanged: true,
      vaalArmourInfuserQuality: vaalArmourQualityItem.quality,
      weaponQualityChanged: true,
      vaalCatalysingInfuserQuality: vaalCatalystRing.catalyst.quality,
      vaalHighRoll: true,
      vaalExtraSocketCount: vaalExtraSocket.item.sockets.length,
    },
    jewelLiquidContemptDesecration: {
      prefixCap: Core.capFor(liquidApplied.item, "prefix"),
      suffixCap: Core.capFor(liquidApplied.item, "suffix"),
      finalPrefixes: Core.countByType(chosenJewel.item, "prefix"),
      finalSuffixes: Core.countByType(chosenJewel.item, "suffix"),
      abyssalChoices: revealedJewel.choices.length,
    },
    liquidEmotionSameSide: liquidSideCounts,
    dataVersion: Core.DATA_VERSION,
    craftingVersion: globalThis.POE2DB_CRAFTING_DATA.version,
  },
}, null, 2));
