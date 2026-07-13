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

function makeRare(baseId, seed) {
  const item = Core.makeItem(baseId, 82, seed);
  item.rarity = "rare";
  return item;
}

function cloneDefinition(definition) {
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

function pushExplicit(item, definition, options = {}) {
  const mod = cloneDefinition(definition);
  mod.fractured = !!options.fractured;
  if (mod.type === "prefix") item.prefixes.push(mod);
  else item.suffixes.push(mod);
  return mod;
}

function distinctDefinitions(definitions, count, blockedGroups = new Set()) {
  const seenGroups = new Set(blockedGroups);
  const picked = [];
  for (const definition of definitions) {
    if (seenGroups.has(definition.group)) continue;
    seenGroups.add(definition.group);
    picked.push(definition);
    if (picked.length === count) break;
  }
  return picked;
}

function describe(mod, totalWeight = null) {
  return {
    id: mod.id,
    baseId: mod.baseId,
    type: mod.type,
    group: mod.group,
    tier: mod.tier,
    level: mod.level,
    weight: mod.weight,
    share: totalWeight ? `${((mod.weight / totalWeight) * 100).toFixed(4)}%` : undefined,
    text: Core.renderRange(mod),
    template: mod.template,
    rolls: mod.rolls,
    tags: mod.tags || [],
  };
}

function byHighestTierThenWeight(a, b) {
  const tierA = Number(String(a.tier || "").replace(/\D/g, "")) || 999;
  const tierB = Number(String(b.tier || "").replace(/\D/g, "")) || 999;
  if (tierA !== tierB) return tierA - tierB;
  if (b.level !== a.level) return b.level - a.level;
  return b.weight - a.weight;
}

const base = Core.BASES.find((entry) => (
  entry.id === "quarterstaff_sinister_quarterstaff" ||
  entry.name === "邪恶节杖" ||
  entry.english === "Sinister Quarterstaff"
));
assert(base, "Sinister Quarterstaff / 邪恶节杖 base is missing");

const emptyRare = makeRare(base.id, "audit-sinister-empty");
const emptyPool = Core.summarizePool(emptyRare, "normal", "exalted").mods;

const relevant = emptyPool
  .filter((mod) => /近战|暴击|火焰|闪电|元素|Elemental|Melee|Critical|Fire|Lightning/i.test([
    mod.group,
    mod.name,
    mod.template,
    ...(mod.tags || []),
  ].join(" ")))
  .sort(byHighestTierThenWeight);

const meleePlusFive = emptyPool.filter((mod) => (
  mod.template.includes("所有近战技能等级") &&
  mod.rolls.some((roll) => Number(roll.max) === 5)
));
const t1CritChance = emptyPool.filter((mod) => (
  mod.type === "suffix" &&
  mod.group === "CriticalStrikeChanceIncrease" &&
  mod.tier === "T1"
));
const t1CritMultiplier = emptyPool.filter((mod) => (
  mod.type === "suffix" &&
  mod.group === "CriticalStrikeMultiplier" &&
  mod.tier === "T1"
));
const t1AttackElemental = emptyPool.filter((mod) => (
  mod.type === "prefix" &&
  mod.tier === "T1" &&
  mod.group === "IncreasedWeaponElementalDamagePercent"
));
const t1LightningFlat = emptyPool.filter((mod) => (
  mod.type === "prefix" &&
  mod.tier === "T1" &&
  mod.group === "LightningDamage"
));
const t1FireFlat = emptyPool.filter((mod) => (
  mod.type === "prefix" &&
  mod.tier === "T1" &&
  mod.group === "FireDamage"
));

const required = {
  meleePlusFive: meleePlusFive[0],
  t1CritChance: t1CritChance[0],
  t1CritMultiplier: t1CritMultiplier[0],
  t1AttackElemental: t1AttackElemental[0],
  t1LightningFlat: t1LightningFlat[0],
  t1FireFlat: t1FireFlat[0],
};

const chaosBase = makeRare(base.id, "audit-sinister-chaos-base");
assert(required.t1CritChance, "T1 critical strike chance suffix is missing from empty pool");
pushExplicit(chaosBase, required.t1CritChance, { fractured: true });

const fillerSuffixes = distinctDefinitions(
  emptyPool.filter((mod) => (
    mod.type === "suffix" &&
    mod.group !== required.t1CritChance.group &&
    !meleePlusFive.some((target) => target.group === mod.group)
  )),
  2,
  new Set([required.t1CritChance.group]),
);
assert(fillerSuffixes.length === 2, "need two filler suffixes to fill suffixes before chaos");
fillerSuffixes.forEach((definition) => pushExplicit(chaosBase, definition));

const chaosPreview = Core.summarizePool(chaosBase, "normal", "chaos");
const chaosMelee = chaosPreview.mods.filter((mod) => (
  mod.template.includes("所有近战技能等级") &&
  mod.rolls.some((roll) => Number(roll.max) === 5)
));
assert(chaosMelee.length > 0, "locked-crit chaos pool should still contain all melee skills +5");

const suffixRemovalPreview = Core.applyCurrency(
  Core.applyCurrency(chaosBase, "omen_chaos_suffix", "normal").item,
  "chaos",
  "normal",
);
assert(suffixRemovalPreview.ok, `forced suffix chaos failed: ${suffixRemovalPreview.reason || "unknown"}`);

const finalTargetItem = makeRare(base.id, "audit-sinister-final-target");
[
  required.t1AttackElemental,
  required.t1LightningFlat,
  required.t1FireFlat,
  required.t1CritChance,
  required.meleePlusFive,
].forEach((definition) => {
  assert(definition, "required final target modifier is missing");
  pushExplicit(finalTargetItem, definition, { fractured: definition.group === required.t1CritChance.group });
});
const finalWithDesecrationOmen = Core.applyCurrency(finalTargetItem, "omen_desecration_suffix", "normal");
assert(finalWithDesecrationOmen.ok, `suffix desecration omen failed: ${finalWithDesecrationOmen.reason || "unknown"}`);
const suffixDesecrationPool = Core.summarizePool(finalWithDesecrationOmen.item, "normal", "preserved_jawbone");
const desecratedCritMultiplier = suffixDesecrationPool.mods.filter((mod) => (
  mod.desecrated &&
  mod.type === "suffix" &&
  mod.group === "CriticalStrikeMultiplier" &&
  mod.tier === "T1"
));
assert(desecratedCritMultiplier.length > 0, "suffix jawbone pool should contain desecrated T1 critical multiplier");

console.log(JSON.stringify({
  base: {
    id: base.id,
    name: base.name,
    english: base.english,
    classId: base.classId,
    itemLevel: emptyRare.itemLevel,
  },
  emptyPool: {
    totalWeight: Core.summarizePool(emptyRare, "normal", "exalted").totalWeight,
    prefixCount: Core.summarizePool(emptyRare, "normal", "exalted").prefixCount,
    suffixCount: Core.summarizePool(emptyRare, "normal", "exalted").suffixCount,
  },
  targets: Object.fromEntries(Object.entries(required).map(([key, value]) => [
    key,
    value ? describe(value, Core.summarizePool(emptyRare, "normal", "exalted").totalWeight) : null,
  ])),
  relevantTop: relevant.slice(0, 80).map((mod) => describe(mod, Core.summarizePool(emptyRare, "normal", "exalted").totalWeight)),
  chaosAfterLockedCritAndFullSuffixes: {
    suffixesBefore: chaosBase.suffixes.map((mod) => ({
      group: mod.group,
      tier: mod.tier,
      fractured: mod.fractured,
      text: Core.renderMod(mod),
    })),
    totalWeight: chaosPreview.totalWeight,
    prefixCount: chaosPreview.prefixCount,
    suffixCount: chaosPreview.suffixCount,
    meleePlusFiveCandidates: chaosMelee.map((mod) => describe(mod, chaosPreview.totalWeight)),
  },
  forcedSuffixChaosAttempt: {
    ok: suffixRemovalPreview.ok,
    reason: suffixRemovalPreview.reason || "",
    removed: suffixRemovalPreview.step ? suffixRemovalPreview.step.removed.map((mod) => ({
      group: mod.group,
      tier: mod.tier,
      fractured: mod.fractured,
      text: Core.renderMod(mod),
    })) : [],
    added: suffixRemovalPreview.step ? suffixRemovalPreview.step.added.map((mod) => describe(mod)) : [],
  },
  finalSixModPlanCheck: {
    currentExplicit: Core.countExplicit(finalTargetItem),
    prefixCount: Core.countByType(finalTargetItem, "prefix"),
    suffixCount: Core.countByType(finalTargetItem, "suffix"),
    preservedJawboneSuffixPool: {
      totalWeight: suffixDesecrationPool.totalWeight,
      prefixCount: suffixDesecrationPool.prefixCount,
      suffixCount: suffixDesecrationPool.suffixCount,
      t1CritMultiplierCandidates: desecratedCritMultiplier.map((mod) => describe(mod, suffixDesecrationPool.totalWeight)),
    },
  },
}, null, 2));
