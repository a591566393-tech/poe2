import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
globalThis.window = globalThis;

require("../data/poe2db-mod-data.js");
require("../data/poe2db-base-data.js");
require("../data/poe2db-crafting-data.js");
const Core = require("../crafting-core.js");

const MAX_CHAOS = 250000;
const MAX_DESECRATION = 250000;

function assert(condition, message) {
  if (!condition) throw new Error(message);
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

function hashSeed(seed) {
  const text = String(seed);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0 || 1;
}

function nextFloat(rng) {
  rng.state = (Math.imul(rng.state, 1664525) + 1013904223) >>> 0;
  return rng.state / 4294967296;
}

function randomInt(rng, min, max) {
  if (min === max) return min;
  return Math.floor(nextFloat(rng) * (max - min + 1)) + min;
}

function pickWeighted(rng, mods) {
  const total = mods.reduce((sum, mod) => sum + mod.weight, 0);
  let roll = nextFloat(rng) * total;
  for (const mod of mods) {
    roll -= mod.weight;
    if (roll <= 0) return mod;
  }
  return mods[mods.length - 1];
}

function rollDefinition(rng, definition) {
  const mod = cloneDefinition(definition);
  mod.values = mod.rolls.map((roll) => {
    const scale = roll.scale || 1;
    if (scale === 1) return randomInt(rng, roll.min, roll.max);
    const value = randomInt(rng, Math.round(roll.min * scale), Math.round(roll.max * scale)) / scale;
    return Number(value.toFixed(String(scale).length - 1));
  });
  return mod;
}

function cloneItem(item) {
  return JSON.parse(JSON.stringify(item));
}

function pushExplicit(item, definition, options = {}) {
  const mod = cloneDefinition(definition);
  mod.fractured = !!options.fractured;
  if (mod.type === "prefix") item.prefixes.push(mod);
  else item.suffixes.push(mod);
  return mod;
}

function makeRare(baseId, seed) {
  const item = Core.makeItem(baseId, 82, seed);
  item.rarity = "rare";
  return item;
}

function modText(mod) {
  return `${mod.type === "prefix" ? "前缀" : "后缀"} ${mod.desecrated ? "亵渎 " : ""}${mod.fractured ? "破溃 " : ""}${mod.tier} Lv${mod.level} W${mod.weight} ${Core.renderMod(mod)}`;
}

function hasGroup(item, group) {
  return Core.allMods(item).some((mod) => mod.group === group);
}

function findTargetDefinitions(baseId) {
  const draft = makeRare(baseId, "target-definition-pool");
  const pool = Core.summarizePool(draft, "normal", "exalted").mods;
  const target = {
    attackElemental: pool.find((mod) => mod.type === "prefix" && mod.tier === "T1" && mod.group === "IncreasedWeaponElementalDamagePercent"),
    lightningFlat: pool.find((mod) => mod.type === "prefix" && mod.tier === "T1" && mod.group === "LightningDamage"),
    fireFlat: pool.find((mod) => mod.type === "prefix" && mod.tier === "T1" && mod.group === "FireDamage"),
    critChance: pool.find((mod) => mod.type === "suffix" && mod.tier === "T1" && mod.group === "CriticalStrikeChanceIncrease"),
    meleePlusFive: pool.find((mod) => (
      mod.type === "suffix" &&
      mod.tier === "T1" &&
      mod.template.includes("所有近战技能等级") &&
      mod.rolls.some((roll) => Number(roll.max) === 5)
    )),
    critMultiplier: pool.find((mod) => mod.type === "suffix" && mod.tier === "T1" && mod.group === "CriticalStrikeMultiplier"),
  };
  Object.entries(target).forEach(([key, value]) => assert(value, `missing target definition: ${key}`));
  return target;
}

function buildStartingItem(baseId, target, seed) {
  const item = makeRare(baseId, seed);
  pushExplicit(item, target.attackElemental);
  pushExplicit(item, target.lightningFlat);
  pushExplicit(item, target.fireFlat);
  pushExplicit(item, target.critChance, { fractured: true });
  const filler = Core.summarizePool(item, "normal", "exalted").mods.find((mod) => (
    mod.type === "suffix" &&
    mod.group !== target.critChance.group &&
    mod.group !== target.meleePlusFive.group &&
    mod.group !== target.critMultiplier.group
  ));
  assert(filler, "missing removable suffix filler for suffix chaos loop");
  pushExplicit(item, filler);
  return item;
}

function chaosUntilMeleePlusFive(startItem, rng) {
  let item = startItem;
  const cost = { omen_chaos_suffix: 0, chaos: 0 };
  for (let attempt = 1; attempt <= MAX_CHAOS; attempt += 1) {
    const removableIndex = item.suffixes.findIndex((mod) => !mod.fractured);
    assert(removableIndex >= 0, "suffix chaos needs a removable suffix");
    item.suffixes.splice(removableIndex, 1);
    cost.omen_chaos_suffix += 1;
    const pool = Core.eligibleMods(item, { type: "suffix" });
    const picked = pickWeighted(rng, pool);
    item.suffixes.push(rollDefinition(rng, picked));
    cost.chaos += 1;
    if (hasGroup(item, "IncreaseSocketedGemLevel")) {
      const hit = item.suffixes.find((mod) => (
        mod.group === "IncreaseSocketedGemLevel" &&
        mod.template.includes("所有近战技能等级") &&
        mod.values.some((value) => Number(value) === 5)
      ));
      if (hit) return { item, cost, attempts: attempt, hit };
    }
  }
  throw new Error(`did not hit all melee skills +5 in ${MAX_CHAOS} suffix chaos attempts`);
}

function desecrateUntilCritMultiplier(startItem, rng) {
  const cost = { omen_desecration_suffix: 0, preserved_jawbone: 0, abyssal_echoes: 0 };
  for (let attempt = 1; attempt <= MAX_DESECRATION; attempt += 1) {
    let item = cloneItem(startItem);
    cost.omen_desecration_suffix += 1;
    const desecrationOmen = Core.applyCurrency(item, "omen_desecration_suffix", "normal");
    assert(desecrationOmen.ok, `suffix desecration omen failed: ${desecrationOmen.reason || "unknown"}`);
    const pool = Core.summarizePool(desecrationOmen.item, "normal", "preserved_jawbone").mods;
    assert(pool.length > 0, "suffix jawbone pool is empty");
    const hiddenType = pickWeighted(rng, pool).type;
    item = desecrationOmen.item;
    const hiddenMod = {
      id: `fast_hidden_desecrated_${attempt}`,
      baseId: "hidden_desecrated",
      type: hiddenType,
      group: `fast_hidden_desecrated_${hiddenType}_${attempt}`,
      name: "隐藏亵渎词缀",
      tier: "D?",
      level: 1,
      weight: 1,
      tags: [],
      template: "未揭露的亵渎词缀",
      rolls: [],
      values: [],
      desecrated: true,
      revealed: false,
      fractured: false,
      sourceText: "",
      desecrationActionId: "preserved_jawbone",
    };
    item.desecratedMods.push(hiddenMod);
    cost.preserved_jawbone += 1;
    cost.abyssal_echoes += 1;
    const choicePool = pool.filter((mod) => mod.type === hiddenType);
    const available = choicePool.slice();
    const choices = [];
    while (available.length > 0 && choices.length < 3) {
      const definition = pickWeighted(rng, available);
      const mod = rollDefinition(rng, definition);
      mod.revealed = true;
      mod.desecrated = true;
      mod.desecrationActionId = "preserved_jawbone";
      mod.choiceId = `fast_choice_${attempt}_${choices.length}_${mod.id}`;
      choices.push(mod);
      const usedIndex = available.findIndex((candidate) => candidate.id === definition.id);
      if (usedIndex >= 0) available.splice(usedIndex, 1);
    }

    const choice = choices.find((mod) => mod.group === "CriticalStrikeMultiplier" && mod.tier === "T1");
    if (!choice) continue;
    item.desecratedMods = item.desecratedMods.filter((mod) => mod.id !== hiddenMod.id);
    item.desecratedMods.push(choice);
    item.pendingOmen = null;
    return { item, cost, attempts: attempt, hit: choice, choices };
  }
  throw new Error(`did not find desecrated T1 critical multiplier in ${MAX_DESECRATION} suffix desecration attempts`);
}

function summarizeCost(costs) {
  return costs.reduce((total, cost) => {
    Object.entries(cost).forEach(([key, value]) => {
      total[key] = (total[key] || 0) + value;
    });
    return total;
  }, {});
}

const base = Core.BASES.find((entry) => entry.id === "quarterstaff_sinister_quarterstaff");
assert(base, "quarterstaff_sinister_quarterstaff base is missing");

const rng = { state: hashSeed("simulate-sinister-quarterstaff-real-weighted") };
const target = findTargetDefinitions(base.id);
const startingItem = buildStartingItem(base.id, target, "simulate-sinister-quarterstaff-start");
const chaosResult = chaosUntilMeleePlusFive(startingItem, rng);
const desecrationResult = desecrateUntilCritMultiplier(chaosResult.item, rng);
const totalCost = summarizeCost([chaosResult.cost, desecrationResult.cost]);

const finalItem = desecrationResult.item;
const finalMods = Core.allMods(finalItem).map(modText);

console.log(JSON.stringify({
  ok: true,
  base: {
    id: base.id,
    name: base.name,
    english: base.english,
    classId: base.classId,
    itemLevel: finalItem.itemLevel,
  },
  startingAssumption: "从 3 条目标 T1 前缀 + 已破溃 T1 暴击几率后缀 + 1 条可被右旋消抹混沌替换的后缀开始，后续通货全部按 CraftingCore 真实权重随机执行。",
  chaosPhase: {
    attempts: chaosResult.attempts,
    hit: modText(chaosResult.hit),
    cost: chaosResult.cost,
  },
  desecrationPhase: {
    attempts: desecrationResult.attempts,
    hit: modText(desecrationResult.hit),
    choices: desecrationResult.choices.map(modText),
    cost: desecrationResult.cost,
  },
  totalCost,
  finalItem: {
    prefixes: finalItem.prefixes.map(modText),
    suffixes: finalItem.suffixes.map(modText),
    desecratedMods: (finalItem.desecratedMods || []).map(modText),
    allMods: finalMods,
  },
}, null, 2));
