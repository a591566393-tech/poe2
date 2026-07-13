import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
globalThis.window = globalThis;

require("../data/poe2db-mod-data.js");
require("../data/poe2db-base-data.js");
require("../data/poe2db-crafting-data.js");
const Core = require("../crafting-core.js");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function textOf(mod) {
  return [Core.renderRange(mod), mod.sourceText || "", mod.template || "", mod.group || ""].join(" ");
}

function makeRareBase(classId, seed) {
  const base = Core.BASES.find((entry) => entry.classId === classId);
  assert(base, `missing base for ${classId}`);
  const item = Core.makeItem(base.id, Math.max(82, base.requiredLevel || 1), seed);
  item.rarity = "rare";
  return item;
}

function desecrationActionFor(classId) {
  if (["ring", "amulet", "belt", "talisman"].includes(classId)) return "preserved_lockbone";
  if (["boots", "body_armour", "gloves", "helmet", "shield", "buckler", "focus"].includes(classId)) return "preserved_rib";
  return "preserved_jawbone";
}

function choiceTextsFor(classId, seed) {
  const item = makeRareBase(classId, seed);
  const actionId = desecrationActionFor(classId);
  const added = Core.applyCurrency(item, actionId, "normal");
  assert(added.ok, `${classId} ${actionId} failed: ${added.reason || "unknown"}`);
  const echo = Core.applyCurrency(added.item, "abyssal_echoes", "normal");
  assert(echo.ok, `${classId} abyssal_echoes failed: ${echo.reason || "unknown"}`);
  assert(echo.item.pendingDesecrationChoice, `${classId} did not create pending desecration choices`);
  assert(echo.item.pendingDesecrationChoice.choices.length === 3, `${classId} should offer three reveal choices`);
  return echo.item.pendingDesecrationChoice.choices.map(textOf);
}

const disallowedByClass = {
  sceptre: /箭袋|盾牌|格挡|举起\s*盾牌|战弩|装填|榴弹|锤类|猛击|长杖|法杖|法器|弓类/u,
  wand: /箭袋|盾牌|格挡|举起\s*盾牌|战弩|装填|榴弹|锤类|猛击|长杖|法器|权杖|弓类/u,
  staff: /箭袋|盾牌|格挡|举起\s*盾牌|战弩|装填|榴弹|锤类|猛击|法杖|法器|权杖|弓类/u,
  crossbow: /箭袋|盾牌|格挡|举起\s*盾牌|锤类|猛击|长杖|法杖|法器|权杖/u,
  quiver: /盾牌|格挡|举起\s*盾牌|战弩|装填|榴弹|锤类|猛击|长杖|法杖|法器|权杖/u,
  shield: /箭袋|战弩|装填|榴弹|锤类|猛击|长杖|法杖|法器|权杖|弓类/u,
  focus: /箭袋|战弩|装填|榴弹|锤类|猛击|长杖|法杖|权杖|弓类/u,
};

const failures = [];
const summary = [];

for (const [classId, badPattern] of Object.entries(disallowedByClass)) {
  const item = makeRareBase(classId, `audit-pool-${classId}`);
  const actionId = desecrationActionFor(classId);
  const pool = Core.summarizePool(item, "normal", actionId).mods;
  const badPool = pool.filter((mod) => badPattern.test(textOf(mod)));
  const choices = choiceTextsFor(classId, `audit-choice-${classId}`);
  const badChoices = choices.filter((text) => badPattern.test(text));

  summary.push({
    classId,
    actionId,
    pool: pool.length,
    badPool: badPool.length,
    badChoices: badChoices.length,
    choices,
  });

  if (badPool.length > 0 || badChoices.length > 0) {
    failures.push({
      classId,
      badPool: badPool.slice(0, 8).map((mod) => ({
        text: Core.renderRange(mod),
        sourceText: mod.sourceText || "",
        classes: mod.classes,
      })),
      badChoices,
    });
  }
}

const requiredOwnKeywords = [
  { classId: "crossbow", pattern: /战弩|装填|榴弹/u },
  { classId: "quiver", pattern: /箭袋/u },
  { classId: "shield", pattern: /盾牌|格挡|举起\s*盾牌/u },
];

const missingOwnKeywords = [];
for (const check of requiredOwnKeywords) {
  const item = makeRareBase(check.classId, `audit-own-${check.classId}`);
  const pool = Core.summarizePool(item, "normal", desecrationActionFor(check.classId)).mods.map(textOf);
  if (!pool.some((text) => check.pattern.test(text))) {
    missingOwnKeywords.push(check.classId);
  }
}

assert(failures.length === 0, `desecration routing leaked explicit equipment mods: ${JSON.stringify(failures, null, 2)}`);
assert(missingOwnKeywords.length === 0, `own explicit desecration keywords missing for: ${missingOwnKeywords.join(", ")}`);

const allEquipmentClassCount = new Set(Core.BASES.map((base) => base.classId)).size;
const broadExplicitRows = Core.DESECRATED_MODIFIERS.filter((mod) => {
  const text = textOf(mod);
  return mod.classes.length >= allEquipmentClassCount && /箭袋|盾牌|格挡|举起\s*盾牌|战弩|装填|榴弹|锤类|猛击|长杖|法杖|法器|权杖|弓类/u.test(text);
});
assert(broadExplicitRows.length === 0, `explicit equipment desecrated rows expanded to all classes: ${JSON.stringify(broadExplicitRows.slice(0, 8).map((mod) => ({
  text: Core.renderRange(mod),
  sourceText: mod.sourceText || "",
  classes: mod.classes,
})), null, 2)}`);

const sceptre = summary.find((entry) => entry.classId === "sceptre");
console.log(JSON.stringify({
  ok: true,
  checkedClasses: summary.length,
  broadExplicitRows: broadExplicitRows.length,
  sceptrePool: sceptre ? sceptre.pool : 0,
  sceptreChoices: sceptre ? sceptre.choices : [],
  dataVersion: Core.DATA_VERSION,
  craftingVersion: globalThis.POE2DB_CRAFTING_DATA.version,
}, null, 2));
