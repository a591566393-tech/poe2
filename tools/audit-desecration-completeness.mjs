import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
globalThis.window = globalThis;

require("../data/poe2db-mod-data.js");
require("../data/poe2db-base-data.js");
require("../data/poe2db-crafting-data.js");
const Core = require("../crafting-core.js");

const JEWELLERY_CLASSES = new Set(["ring", "amulet", "belt", "talisman"]);
const ARMOUR_CLASSES = new Set(["boots", "body_armour", "gloves", "helmet", "shield", "buckler", "focus"]);
const WEAPON_CLASSES = new Set([
  "claw", "dagger", "wand", "one_hand_sword", "one_hand_axe", "one_hand_mace", "sceptre", "spear", "flail",
  "bow", "staff", "two_hand_sword", "two_hand_axe", "two_hand_mace", "quarterstaff", "crossbow", "trap", "quiver",
]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function actionFor(classId) {
  if (classId === "jewel") return "preserved_cranium";
  if (classId === "waystone") return "preserved_vertebrae";
  if (JEWELLERY_CLASSES.has(classId)) return "preserved_lockbone";
  if (ARMOUR_CLASSES.has(classId)) return "preserved_rib";
  if (WEAPON_CLASSES.has(classId)) return "preserved_jawbone";
  return null;
}

function textOf(mod) {
  return `${mod.sourceText || ""} ${mod.template || ""}`;
}

function hasDefenceBaseDependency(text) {
  const value = String(text);
  return /\u8be5\u88c5\u5907\u7684\u95ea\u907f\u503c|\u5168\u5c40\s*\u62a4\u7532\s*[\u3001,]\s*\u95ea\u907f\s*与\s*\u80fd\u91cf\u62a4\u76fe|\u83b7\u5f97\s*\u9b54\u529b\u4e0a\u9650.*\u7684\s*\u62a4\u7532|\u62a4\u7532\s*\u540c\u6837\u4f5c\u7528|\u80fd\u91cf\u62a4\u76fe\s*(?:上限|充能率|提高)/u.test(value);
}

function hasDefenceBaseDependencySafe(text) {
  const value = String(text);
  return /(?:\u8be5\u88c5\u5907\u7684\u95ea\u907f\u503c|\u5168\u5c40\s*\u62a4\u7532\s*[\u3001,]\s*\u95ea\u907f\s*(?:\u4e0e|\u548c)\s*\u80fd\u91cf\u62a4\u76fe|\u83b7\u5f97\s*\u9b54\u529b\u4e0a\u9650.*\u7684\s*\u62a4\u7532|\u62a4\u7532\s*\u540c\u6837\u4f5c\u7528|\u80fd\u91cf\u62a4\u76fe\s*(?:\u4e0a\u9650|\u5145\u80fd\u7387|\u63d0\u9ad8))/u.test(value);
}

function explicitClassHints(text) {
  const value = String(text);
  const classes = new Set();
  const add = (...entries) => entries.forEach((entry) => classes.add(entry));

  if (/\u7bad\u888b/u.test(value)) add("quiver");
  if (/\u76fe\u724c|\u683c\u6321|\u4e3e\u8d77\s*\u76fe\u724c/u.test(value)) add("shield", "buckler");
  if (/\u53cc\u624b\s*\u8fd1\u6218\s*\u6b66\u5668\s*\u6216\s*\u6218\u5f29/u.test(value)) add("two_hand_sword", "two_hand_axe", "two_hand_mace", "quarterstaff", "crossbow");
  else if (/\u6218\u5f29|\u88c5\u586b|\u69b4\u5f39/u.test(value)) add("crossbow");
  if (/\u9524\u7c7b|\u731b\u51fb/u.test(value)) add("one_hand_mace", "two_hand_mace");
  if (/\u957f\u6756/u.test(value)) add("staff");
  if (/\u6cd5\u6756/u.test(value)) add("wand");
  if (/\u6cd5\u5668/u.test(value)) add("focus");
  if (/\u6743\u6756/u.test(value)) add("sceptre");
  if (/\u5f13\u7c7b/u.test(value)) add("bow");
  if (/\u79fb\u52a8\u901f\u5ea6/u.test(value)) add("boots");
  if (/\u6655\u7729\u9608\u503c|\u91cd\u5ea6\u6655\u7729/u.test(value)) add("belt");
  if (/\u8eab\u4f53\u62a4\u7532/u.test(value)) add("body_armour");

  return classes;
}

function basesByClass() {
  const result = new Map();
  for (const base of Core.BASES) {
    if (!actionFor(base.classId)) continue;
    if (!result.has(base.classId)) result.set(base.classId, []);
    result.get(base.classId).push(base);
  }
  return result;
}

function makeItem(base, seed) {
  const item = Core.makeItem(base.id, 100, seed);
  item.rarity = "rare";
  return item;
}

const bases = basesByClass();
const exclusiveRows = Core.DESECRATED_MODIFIERS.filter((mod) => mod.sourceKind !== "base");
const failures = [];
const classSummary = [];

for (const [classId, classBases] of bases) {
  const actionId = actionFor(classId);
  const representative = makeItem(classBases[0], `audit-complete-${classId}`);
  const pool = Core.summarizePool(representative, "normal", actionId, { ignoreItemState: true }).mods;
  const poolIds = new Set(pool.map((mod) => mod.id));
  const classRows = exclusiveRows.filter((mod) => mod.classes.includes(classId) && mod.level <= 100);
  const missing = classRows.filter((mod) => !classBases.some((base) => {
    const item = makeItem(base, `audit-row-${classId}-${mod.id}`);
    return Core.summarizePool(item, "normal", actionId, { ignoreItemState: true }).mods.some((candidate) => candidate.id === mod.id);
  }) && !hasDefenceBaseDependencySafe(textOf(mod)));
  const leaked = classRows.filter((mod) => {
    const hints = explicitClassHints(textOf(mod));
    return hints.size > 0 && !hints.has(classId);
  });
  const invalidChoices = pool.filter((mod) => {
    const hints = explicitClassHints(textOf(mod));
    return mod.sourceKind !== "base" && hints.size > 0 && !hints.has(classId);
  });

  if (missing.length > 0) failures.push({ classId, type: "unreachable", rows: missing.slice(0, 12).map((mod) => ({ id: mod.id, type: mod.type, level: mod.level, text: textOf(mod) })) });
  if (leaked.length > 0) failures.push({ classId, type: "wrong-class", rows: leaked.slice(0, 12).map((mod) => ({ id: mod.id, classes: mod.classes, text: textOf(mod) })) });
  if (invalidChoices.length > 0) failures.push({ classId, type: "pool-leak", rows: invalidChoices.slice(0, 12).map((mod) => ({ id: mod.id, classes: mod.classes, text: textOf(mod) })) });

  classSummary.push({ classId, baseCount: classBases.length, actionId, exclusiveRows: classRows.length, pool: pool.length, poolExclusive: pool.filter((mod) => mod.sourceKind !== "base").length, missing: missing.length });
  assert(poolIds.size === pool.length, `${classId} desecration pool contains duplicate modifier ids`);
}

const unsupportedRows = exclusiveRows.filter((mod) => mod.level > 100);
assert(failures.length === 0, `desecration completeness failures: ${JSON.stringify(failures, null, 2)}`);

console.log(JSON.stringify({
  ok: true,
  classes: classSummary,
  importedExclusiveRows: exclusiveRows.length,
  unsupportedRowsAboveItemLevel100: unsupportedRows.length,
  dataVersion: Core.DATA_VERSION,
  craftingVersion: globalThis.POE2DB_CRAFTING_DATA.version,
}, null, 2));
