const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const PROJECT_ROOT = path.join(__dirname, "..");
const OUT_PATH = path.join(PROJECT_ROOT, "data", "ring-craft-optimizer-report.json");

const TARGET = {
  baseId: "ring_ruby",
  itemLevel: 82,
  prefixes: ["FireDamage", "ColdDamage", "LightningDamage"],
  suffixes: ["FireResistance", "AllResistances", "ItemFoundRarityIncrease"],
  tier: "T1",
};

const DEFAULT_TRIALS = 120;
const MAX_SIDE_CYCLES = 220000;
const TARGET_PREFIX = new Set(TARGET.prefixes);
const TARGET_SUFFIX = new Set(TARGET.suffixes);

function loadCore() {
  const context = { console };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(PROJECT_ROOT, "data", "poe2db-mod-data.js"), "utf8"), context, {
    filename: "poe2db-mod-data.js",
  });
  vm.runInContext(fs.readFileSync(path.join(PROJECT_ROOT, "data", "poe2db-base-data.js"), "utf8"), context, {
    filename: "poe2db-base-data.js",
  });
  vm.runInContext(fs.readFileSync(path.join(PROJECT_ROOT, "data", "poe2db-crafting-data.js"), "utf8"), context, {
    filename: "poe2db-crafting-data.js",
  });
  vm.runInContext(fs.readFileSync(path.join(PROJECT_ROOT, "crafting-core.js"), "utf8"), context, {
    filename: "crafting-core.js",
  });
  return {
    Core: context.CraftingCore,
    dataVersion: context.POE2DB_MOD_DATA && context.POE2DB_MOD_DATA.version,
  };
}

const loaded = loadCore();
const Core = loaded.Core;
const DATA_VERSION = loaded.dataVersion;
const ringMods = Core.MODIFIERS.filter((mod) => mod.classes.includes("ring") && mod.level <= TARGET.itemLevel && mod.weight > 0);
const ringDesecratedMods = Core.DESECRATED_MODIFIERS.filter((mod) => mod.classes.includes("ring") && mod.level <= TARGET.itemLevel && mod.weight > 0);

function makeRng(seed) {
  let hash = 2166136261;
  for (const char of String(seed)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  let state = hash >>> 0 || 1;
  return {
    next() {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state / 4294967296;
    },
    int(min, max) {
      if (min === max) return min;
      return Math.floor(this.next() * (max - min + 1)) + min;
    },
  };
}

function capFor(rarity) {
  if (rarity === "magic") return 1;
  if (rarity === "rare") return 3;
  return 0;
}

function cloneMod(mod) {
  return Object.assign({}, mod, { fractured: Boolean(mod.fractured) });
}

function makeState(rarity) {
  return { rarity, prefixes: [], suffixes: [], desecratedMods: [] };
}

function explicitMods(state) {
  return state.prefixes.concat(state.suffixes);
}

function allMods(state) {
  return explicitMods(state).concat(state.desecratedMods || []);
}

function occupiedGroups(state) {
  return new Set(allMods(state).map((mod) => mod.group));
}

function sideList(state, type) {
  return type === "prefix" ? state.prefixes : state.suffixes;
}

function targetSet(type) {
  return type === "prefix" ? TARGET_PREFIX : TARGET_SUFFIX;
}

function isTargetT1(mod) {
  return (TARGET_PREFIX.has(mod.group) || TARGET_SUFFIX.has(mod.group)) && mod.tier === TARGET.tier;
}

function isSideTargetT1(mod, type) {
  return targetSet(type).has(mod.group) && mod.tier === TARGET.tier;
}

function targetMod(group) {
  const mod = ringMods.find((entry) => entry.group === group && entry.tier === TARGET.tier);
  if (!mod) throw new Error(`Target modifier not found: ${group}`);
  return cloneMod(mod);
}

function targetComplete(state, type) {
  const mods = sideList(state, type);
  for (const group of targetSet(type)) {
    if (!mods.some((mod) => mod.group === group && mod.tier === TARGET.tier)) return false;
  }
  return true;
}

function missingGroups(state, type) {
  const mods = sideList(state, type);
  return Array.from(targetSet(type)).filter((group) => !mods.some((mod) => mod.group === group && mod.tier === TARGET.tier));
}

function eligibleMods(state, options) {
  const opts = options || {};
  const groups = occupiedGroups(state);
  const cap = capFor(state.rarity);
  return ringMods.filter((mod) => {
    if (opts.type && mod.type !== opts.type) return false;
    if (opts.tag && !mod.tags.includes(opts.tag)) return false;
    if (mod.level < (opts.minLevel || 0)) return false;
    if (groups.has(mod.group)) return false;
    if (sideList(state, mod.type).length >= cap) return false;
    return true;
  });
}

function eligibleDesecratedMods(state, options) {
  const opts = options || {};
  const groups = occupiedGroups(state);
  return ringDesecratedMods.filter((mod) => {
    if (opts.type && mod.type !== opts.type) return false;
    if (mod.level < (opts.minLevel || 0)) return false;
    if (groups.has(mod.group)) return false;
    return true;
  });
}

function totalWeight(mods) {
  return mods.reduce((sum, mod) => sum + mod.weight, 0);
}

function pickWeighted(mods, rng) {
  let roll = rng.next() * totalWeight(mods);
  for (const mod of mods) {
    roll -= mod.weight;
    if (roll <= 0) return cloneMod(mod);
  }
  return cloneMod(mods[mods.length - 1]);
}

function addRandomMod(state, options, rng) {
  const pool = eligibleMods(state, options);
  if (pool.length === 0) return null;
  const mod = pickWeighted(pool, rng);
  sideList(state, mod.type).push(mod);
  return mod;
}

function addDesecratedPrefix(state, rng, counts) {
  increment(counts, "omen_desecration_prefix");
  increment(counts, "preserved_lockbone");
  const pool = eligibleDesecratedMods(state, { type: "prefix" });
  if (pool.length === 0) return null;
  const mod = pickWeighted(pool, rng);
  state.desecratedMods.push(mod);
  return mod;
}

function removalCandidates(state, options) {
  const opts = options || {};
  let mods = explicitMods(state).filter((mod) => !mod.fractured);
  if (opts.type) mods = mods.filter((mod) => mod.type === opts.type);
  if (opts.lowest && mods.length > 0) {
    const lowest = Math.min(...mods.map((mod) => mod.level));
    mods = mods.filter((mod) => mod.level === lowest);
  }
  return mods;
}

function removeSpecificMod(state, target) {
  const list = sideList(state, target.type);
  const index = list.findIndex((mod) => mod === target);
  if (index >= 0) return list.splice(index, 1)[0];
  const fallbackIndex = list.findIndex((mod) => mod.group === target.group && mod.tier === target.tier && mod.level === target.level);
  if (fallbackIndex >= 0) return list.splice(fallbackIndex, 1)[0];
  return null;
}

function removeRandomMod(state, options, rng) {
  const candidates = removalCandidates(state, options);
  if (candidates.length === 0) return null;
  return removeSpecificMod(state, candidates[rng.int(0, candidates.length - 1)]);
}

function increment(counts, key, amount) {
  counts[key] = (counts[key] || 0) + (amount || 1);
}

function addWithCost(state, action, rng, counts) {
  if (action.omen) increment(counts, action.omen);
  if (action.cost) increment(counts, action.cost);
  if (action.kind === "transmutation") {
    state.rarity = "magic";
  } else if (action.kind === "regal" || action.kind === "alchemy") {
    state.rarity = "rare";
  }
  return addRandomMod(state, { minLevel: action.minLevel || 0, type: action.type || null, tag: action.tag || null }, rng);
}

function addPerfectExalt(state, rng, counts) {
  increment(counts, "perfect_exalted");
  return addRandomMod(state, { minLevel: 50 }, rng);
}

function applyAlchemy(state, forcedType, rng, counts) {
  increment(counts, forcedType === "prefix" ? "omen_alchemy_prefixes" : "omen_alchemy_suffixes");
  increment(counts, "alchemy");
  state.rarity = "rare";
  while (sideList(state, forcedType).length < 3) addRandomMod(state, { type: forcedType }, rng);
  while (explicitMods(state).length < 4) addRandomMod(state, {}, rng);
}

function safeWhittleType(state, type) {
  const candidates = removalCandidates(state, { lowest: true });
  return candidates.length > 0 && candidates.every((mod) => mod.type === type && !isSideTargetT1(mod, type));
}

function chaosTierForSide(state, type) {
  if (type === "prefix") return "perfect";
  return missingGroups(state, type).includes("ItemFoundRarityIncrease") ? "greater" : "perfect";
}

function minLevelForTier(tier) {
  if (tier === "perfect") return 50;
  if (tier === "greater") return 35;
  return 0;
}

function chaosCycle(state, type, rng, counts) {
  const tier = chaosTierForSide(state, type);
  if (safeWhittleType(state, type)) {
    increment(counts, "omen_chaos_lowest");
    increment(counts, `${tier}_chaos_lowest`);
    removeRandomMod(state, { lowest: true }, rng);
  } else {
    increment(counts, type === "prefix" ? "omen_chaos_prefix" : "omen_chaos_suffix");
    increment(counts, `${tier}_chaos_${type}`);
    removeRandomMod(state, { type }, rng);
  }
  return addRandomMod(state, { minLevel: minLevelForTier(tier) }, rng);
}

function annulExaltCycle(state, type, rng, counts) {
  const tier = chaosTierForSide(state, type);
  increment(counts, type === "prefix" ? "omen_annulment_prefix" : "omen_annulment_suffix");
  increment(counts, "annulment");
  removeRandomMod(state, { type }, rng);
  increment(counts, type === "prefix" ? "omen_exalted_prefix" : "omen_exalted_suffix");
  increment(counts, `${tier}_exalted_${type}`);
  addRandomMod(state, { minLevel: minLevelForTier(tier), type }, rng);
}

function elementTagForGroup(group) {
  if (group === "FireDamage") return { tag: "fire", cost: "perfect_essence_flames" };
  if (group === "ColdDamage") return { tag: "cold", cost: "perfect_essence_ice" };
  if (group === "LightningDamage") return { tag: "lightning", cost: "perfect_essence_electricity" };
  throw new Error(`No elemental essence for ${group}`);
}

function essencePrefixCycle(state, group, rng, counts) {
  const essence = elementTagForGroup(group);
  increment(counts, "omen_essence_prefix");
  increment(counts, essence.cost);
  removeRandomMod(state, { type: "prefix" }, rng);
  return addRandomMod(state, { tag: essence.tag }, rng);
}

function optimizeSide(state, type, rng, counts, cycle) {
  let cycles = 0;
  while (!targetComplete(state, type) && cycles < MAX_SIDE_CYCLES) {
    cycle(state, type, rng, counts);
    cycles += 1;
  }
  return cycles < MAX_SIDE_CYCLES;
}

function optimizePrefixesWithEssence(state, rng, counts) {
  let cycles = 0;
  while (!targetComplete(state, "prefix") && cycles < MAX_SIDE_CYCLES) {
    const missing = missingGroups(state, "prefix");
    essencePrefixCycle(state, missing[0], rng, counts);
    cycles += 1;
  }
  return cycles < MAX_SIDE_CYCLES;
}

function fillAfterTransmuteFracture(state, rng, counts) {
  while (state.suffixes.length < 3) {
    addWithCost(state, {
      kind: "exalt",
      type: "suffix",
      minLevel: 35,
      omen: "omen_exalted_suffix",
      cost: "greater_exalted_suffix",
    }, rng, counts);
  }
  while (state.prefixes.length < 3) {
    addWithCost(state, {
      kind: "exalt",
      type: "prefix",
      minLevel: 50,
      omen: "omen_exalted_prefix",
      cost: "perfect_exalted_prefix",
    }, rng, counts);
  }
}

function fillAfterAlchemyPrefix(state, rng, counts) {
  while (state.suffixes.length < 3) {
    addWithCost(state, {
      kind: "exalt",
      type: "suffix",
      minLevel: 35,
      omen: "omen_exalted_suffix",
      cost: "greater_exalted_suffix",
    }, rng, counts);
  }
}

function fillAfterAlchemySuffix(state, rng, counts) {
  while (state.prefixes.length < 3) {
    addWithCost(state, {
      kind: "exalt",
      type: "prefix",
      minLevel: 50,
      omen: "omen_exalted_prefix",
      cost: "perfect_exalted_prefix",
    }, rng, counts);
  }
}

function setupTransmuteTargetPrefix(seed, withFracture) {
  const rng = makeRng(seed);
  const counts = {};
  let attempts = 0;

  while (attempts < 200000) {
    attempts += 1;
    const state = makeState("normal");
    const first = addWithCost(state, {
      kind: "transmutation",
      minLevel: 70,
      cost: "perfect_transmutation",
    }, rng, counts);
    if (!first || !isSideTargetT1(first, "prefix")) continue;

    addWithCost(state, {
      kind: "regal",
      type: "suffix",
      omen: "omen_regal_suffix",
      cost: "regal",
    }, rng, counts);

    if (!withFracture) return { state, rng, counts, attempts };

    while (explicitMods(state).length < 4) {
      if (!addPerfectExalt(state, rng, counts)) break;
    }
    if (explicitMods(state).length < 4) continue;

    increment(counts, "fracturing_orb");
    const candidates = explicitMods(state);
    const fractured = candidates[rng.int(0, candidates.length - 1)];
    fractured.fractured = true;
    if (isSideTargetT1(fractured, "prefix")) return { state, rng, counts, attempts };
  }

  return null;
}

function setupAlchemyFracture(seed, type) {
  const rng = makeRng(seed);
  const counts = {};
  let attempts = 0;

  while (attempts < 200000) {
    attempts += 1;
    const state = makeState("normal");
    applyAlchemy(state, type, rng, counts);
    const targets = sideList(state, type).filter((mod) => isSideTargetT1(mod, type));
    if (targets.length === 0) continue;
    increment(counts, "fracturing_orb");
    const candidates = explicitMods(state);
    const fractured = candidates[rng.int(0, candidates.length - 1)];
    fractured.fractured = true;
    if (isSideTargetT1(fractured, type)) return { state, rng, counts, attempts };
  }

  return null;
}

function setupProvidedLightningFracture(seed) {
  const rng = makeRng(seed);
  const counts = {};
  let attempts = 0;

  while (attempts < 200000) {
    attempts += 1;
    const state = makeState("magic");
    const lightning = targetMod("LightningDamage");
    state.prefixes.push(lightning);

    addWithCost(state, {
      kind: "regal",
      type: "suffix",
      omen: "omen_regal_suffix",
      cost: "regal",
    }, rng, counts);

    while (explicitMods(state).length < 4) {
      if (!addPerfectExalt(state, rng, counts)) break;
    }
    if (explicitMods(state).length < 4) continue;

    increment(counts, "fracturing_orb");
    const candidates = explicitMods(state);
    const fractured = candidates[rng.int(0, candidates.length - 1)];
    fractured.fractured = true;
    if (isSideTargetT1(fractured, "prefix")) return { state, rng, counts, attempts };
  }

  return null;
}

function setupProvidedLightningPrefixRegalFracture(seed) {
  const rng = makeRng(seed);
  const counts = {};
  let attempts = 0;

  while (attempts < 200000) {
    attempts += 1;
    const state = makeState("magic");
    state.prefixes.push(targetMod("LightningDamage"));

    addWithCost(state, {
      kind: "regal",
      type: "prefix",
      minLevel: 50,
      omen: "omen_regal_prefix",
      cost: "perfect_regal_prefix",
    }, rng, counts);

    while (explicitMods(state).length < 4) {
      if (!addPerfectExalt(state, rng, counts)) break;
    }
    if (explicitMods(state).length < 4) continue;

    increment(counts, "fracturing_orb");
    const candidates = explicitMods(state);
    const fractured = candidates[rng.int(0, candidates.length - 1)];
    fractured.fractured = true;
    if (isSideTargetT1(fractured, "prefix")) return { state, rng, counts, attempts };
  }

  return null;
}

function setupProvidedLightningRareDesecrateFracture(seed) {
  const rng = makeRng(seed);
  const lockSetupCounts = {};
  let attempts = 0;

  while (attempts < 200000) {
    attempts += 1;
    const state = makeState("rare");
    state.prefixes.push(targetMod("LightningDamage"));

    if (!addDesecratedPrefix(state, rng, lockSetupCounts)) continue;
    for (let index = 0; index < 2; index += 1) {
      if (!addPerfectExalt(state, rng, lockSetupCounts)) break;
    }
    if (explicitMods(state).length !== 3 || allMods(state).length < 4) continue;

    increment(lockSetupCounts, "fracturing_orb");
    const candidates = explicitMods(state);
    const fractured = candidates[rng.int(0, candidates.length - 1)];
    fractured.fractured = true;
    if (isSideTargetT1(fractured, "prefix")) {
      return {
        state,
        rng,
        counts: {},
        lockSetupCounts,
        attempts,
        fractureCandidateCount: candidates.length,
        lockFractureChance: 1 / candidates.length,
        lockSetupCostExcluded: true,
      };
    }
  }

  return null;
}

function runTransmutePrefixFracture(seed) {
  const setup = setupTransmuteTargetPrefix(seed, true);
  if (!setup) return { ok: false };
  fillAfterTransmuteFracture(setup.state, setup.rng, setup.counts);
  const prefixOk = optimizeSide(setup.state, "prefix", setup.rng, setup.counts, chaosCycle);
  const suffixOk = optimizeSide(setup.state, "suffix", setup.rng, setup.counts, chaosCycle);
  return Object.assign({ ok: prefixOk && suffixOk, strategy: "transmute-prefix-fracture-chaos" }, setup);
}

function runAlchemyPrefixFracture(seed) {
  const setup = setupAlchemyFracture(seed, "prefix");
  if (!setup) return { ok: false };
  fillAfterAlchemyPrefix(setup.state, setup.rng, setup.counts);
  const prefixOk = optimizeSide(setup.state, "prefix", setup.rng, setup.counts, chaosCycle);
  const suffixOk = optimizeSide(setup.state, "suffix", setup.rng, setup.counts, chaosCycle);
  return Object.assign({ ok: prefixOk && suffixOk, strategy: "alchemy-prefix-fracture-chaos" }, setup);
}

function runAlchemySuffixFracture(seed) {
  const setup = setupAlchemyFracture(seed, "suffix");
  if (!setup) return { ok: false };
  fillAfterAlchemySuffix(setup.state, setup.rng, setup.counts);
  const prefixOk = optimizeSide(setup.state, "prefix", setup.rng, setup.counts, chaosCycle);
  const suffixOk = optimizeSide(setup.state, "suffix", setup.rng, setup.counts, chaosCycle);
  return Object.assign({ ok: prefixOk && suffixOk, strategy: "alchemy-suffix-fracture-chaos" }, setup);
}

function runNoFracture(seed) {
  const setup = setupTransmuteTargetPrefix(seed, false);
  if (!setup) return { ok: false };
  fillAfterTransmuteFracture(setup.state, setup.rng, setup.counts);
  const prefixOk = optimizeSide(setup.state, "prefix", setup.rng, setup.counts, chaosCycle);
  const suffixOk = optimizeSide(setup.state, "suffix", setup.rng, setup.counts, chaosCycle);
  return Object.assign({ ok: prefixOk && suffixOk, strategy: "no-fracture-chaos" }, setup);
}

function runFractureAnnulExalt(seed) {
  const setup = setupTransmuteTargetPrefix(seed, true);
  if (!setup) return { ok: false };
  fillAfterTransmuteFracture(setup.state, setup.rng, setup.counts);
  const prefixOk = optimizeSide(setup.state, "prefix", setup.rng, setup.counts, annulExaltCycle);
  const suffixOk = optimizeSide(setup.state, "suffix", setup.rng, setup.counts, annulExaltCycle);
  return Object.assign({ ok: prefixOk && suffixOk, strategy: "transmute-prefix-fracture-annul-exalt" }, setup);
}

function runProvidedLightningFractureChaos(seed) {
  const setup = setupProvidedLightningFracture(seed);
  if (!setup) return { ok: false };
  fillAfterTransmuteFracture(setup.state, setup.rng, setup.counts);
  const prefixOk = optimizeSide(setup.state, "prefix", setup.rng, setup.counts, chaosCycle);
  const suffixOk = optimizeSide(setup.state, "suffix", setup.rng, setup.counts, chaosCycle);
  return Object.assign({ ok: prefixOk && suffixOk, strategy: "provided-lightning-fracture-chaos" }, setup);
}

function runProvidedLightningFractureEssence(seed) {
  const setup = setupProvidedLightningFracture(seed);
  if (!setup) return { ok: false };
  fillAfterTransmuteFracture(setup.state, setup.rng, setup.counts);
  const prefixOk = optimizePrefixesWithEssence(setup.state, setup.rng, setup.counts);
  const suffixOk = optimizeSide(setup.state, "suffix", setup.rng, setup.counts, chaosCycle);
  return Object.assign({ ok: prefixOk && suffixOk, strategy: "provided-lightning-fracture-essence" }, setup);
}

function runProvidedLightningRareDesecrateFractureEssence(seed) {
  const setup = setupProvidedLightningRareDesecrateFracture(seed);
  if (!setup) return { ok: false };
  fillAfterTransmuteFracture(setup.state, setup.rng, setup.counts);
  const prefixOk = optimizePrefixesWithEssence(setup.state, setup.rng, setup.counts);
  const suffixOk = optimizeSide(setup.state, "suffix", setup.rng, setup.counts, chaosCycle);
  return Object.assign({ ok: prefixOk && suffixOk, strategy: "provided-lightning-rare-desecrate-fracture-essence-postlock" }, setup);
}

function runProvidedLightningPrefixRegalFractureEssence(seed) {
  const setup = setupProvidedLightningPrefixRegalFracture(seed);
  if (!setup) return { ok: false };
  fillAfterTransmuteFracture(setup.state, setup.rng, setup.counts);
  const prefixOk = optimizePrefixesWithEssence(setup.state, setup.rng, setup.counts);
  const suffixOk = optimizeSide(setup.state, "suffix", setup.rng, setup.counts, chaosCycle);
  return Object.assign({ ok: prefixOk && suffixOk, strategy: "provided-lightning-prefix-regal-fracture-essence" }, setup);
}

function costOf(counts, weights) {
  return Object.entries(counts).reduce((sum, entry) => sum + entry[1] * (weights[entry[0]] == null ? 1 : weights[entry[0]]), 0);
}

function loadCostModel() {
  const weightFile = process.env.CRAFT_OPTIMIZER_WEIGHTS;
  if (!weightFile) {
    return {
      name: "unit material count",
      weights: {},
      note: "Every consumed currency, omen, essence, and fracturing orb costs 1 by default.",
    };
  }

  const filePath = path.isAbsolute(weightFile) ? weightFile : path.join(PROJECT_ROOT, weightFile);
  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const weights = parsed.weights || parsed;
  return {
    name: parsed.name || `custom weights from ${weightFile}`,
    weights,
    source: filePath,
    note: "Costs are weighted by the supplied JSON values. Missing entries default to 1.",
  };
}

function quantile(values, q) {
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) * q)];
}

function mergeCounts(target, source) {
  for (const key of Object.keys(source)) target[key] = (target[key] || 0) + source[key];
}

function round(value, digits) {
  const factor = 10 ** (digits || 2);
  return Math.round(value * factor) / factor;
}

function summarizeStrategy(name, run, trials, weights) {
  const costs = [];
  const attempts = [];
  const totalCounts = {};
  const lockSetupCosts = [];
  const totalLockSetupCounts = {};
  let ok = 0;
  let best = null;

  for (let index = 0; index < trials; index += 1) {
    const result = run(`${name}-${index}`);
    if (!result.ok) continue;
    ok += 1;
    const cost = costOf(result.counts, weights);
    costs.push(cost);
    attempts.push(result.attempts || 0);
    mergeCounts(totalCounts, result.counts);
    if (result.lockSetupCounts) {
      lockSetupCosts.push(costOf(result.lockSetupCounts, weights));
      mergeCounts(totalLockSetupCounts, result.lockSetupCounts);
    }
    if (!best || cost < best.cost) {
      best = {
        cost,
        counts: result.counts,
        lockSetupCounts: result.lockSetupCounts,
        lockSetupCostExcluded: Boolean(result.lockSetupCostExcluded),
        lockFractureChance: result.lockFractureChance,
        fractureCandidateCount: result.fractureCandidateCount,
        attempts: result.attempts,
        prefixes: result.state.prefixes.map(describeMod),
        suffixes: result.state.suffixes.map(describeMod),
        desecratedMods: (result.state.desecratedMods || []).map(describeMod),
      };
    }
  }

  const averageCounts = {};
  if (ok > 0) {
    for (const key of Object.keys(totalCounts).sort()) averageCounts[key] = round(totalCounts[key] / ok, 2);
  }
  const averageLockSetupCounts = {};
  if (ok > 0) {
    for (const key of Object.keys(totalLockSetupCounts).sort()) averageLockSetupCounts[key] = round(totalLockSetupCounts[key] / ok, 2);
  }

  return {
    id: name,
    trials,
    successes: ok,
    successRate: round(ok / trials, 4),
    meanCost: ok ? round(costs.reduce((sum, value) => sum + value, 0) / costs.length, 2) : null,
    medianCost: ok ? quantile(costs, 0.5) : null,
    p80Cost: ok ? quantile(costs, 0.8) : null,
    p90Cost: ok ? quantile(costs, 0.9) : null,
    minCost: ok ? Math.min(...costs) : null,
    maxCost: ok ? Math.max(...costs) : null,
    meanSetupAttempts: ok ? round(attempts.reduce((sum, value) => sum + value, 0) / attempts.length, 2) : null,
    averageCounts,
    averageLockSetupCounts,
    meanLockSetupCostExcluded: lockSetupCosts.length ? round(lockSetupCosts.reduce((sum, value) => sum + value, 0) / lockSetupCosts.length, 2) : null,
    bestSample: best,
  };
}

function describeMod(mod) {
  return {
    group: mod.group,
    tier: mod.tier,
    type: mod.type,
    level: mod.level,
    weight: mod.weight,
    fractured: Boolean(mod.fractured),
    desecrated: Boolean(mod.desecrated),
    name: mod.name,
    range: Core.renderRange(mod),
  };
}

function poolStats() {
  const statsFor = (type, minLevel, predicate) => {
    const mods = ringMods.filter((mod) => (!type || mod.type === type) && mod.level >= minLevel);
    const total = totalWeight(mods);
    const targetWeight = totalWeight(mods.filter(predicate));
    return {
      minLevel,
      candidateCount: mods.length,
      totalWeight: total,
      targetWeight,
      probability: total ? round(targetWeight / total, 6) : 0,
      expectedAttempts: targetWeight ? round(total / targetWeight, 2) : null,
    };
  };

  return {
    perfectTransmutationAnyTargetPrefix: statsFor(null, 70, (mod) => isSideTargetT1(mod, "prefix")),
    perfectPrefixAddAnyTargetPrefix: statsFor("prefix", 50, (mod) => isSideTargetT1(mod, "prefix")),
    greaterSuffixAddAnyTargetSuffix: statsFor("suffix", 35, (mod) => isSideTargetT1(mod, "suffix")),
    perfectSuffixAddFireOrAllResOnly: statsFor("suffix", 50, (mod) => isSideTargetT1(mod, "suffix")),
    normalPrefixAddAnyTargetPrefix: statsFor("prefix", 0, (mod) => isSideTargetT1(mod, "prefix")),
    providedRareDesecrateFractureSetup: {
      normalExplicitCandidates: 3,
      totalModifiersForRequirement: 4,
      lockLightningChance: round(1 / 3, 6),
      expectedLockAttempts: 3,
      setupCostExcludedFromPostLockMean: true,
    },
    essencePrefixSetup: ["fire", "cold", "lightning"].map((tag) => {
      const mods = ringMods.filter((mod) => mod.tags.includes(tag));
      const targetGroup = tag === "fire" ? "FireDamage" : tag === "cold" ? "ColdDamage" : "LightningDamage";
      const targetWeight = totalWeight(mods.filter((mod) => mod.group === targetGroup && mod.tier === TARGET.tier));
      const total = totalWeight(mods);
      return {
        tag,
        candidateCount: mods.length,
        totalWeight: total,
        targetWeight,
        probability: total ? round(targetWeight / total, 6) : 0,
        expectedAttempts: targetWeight ? round(total / targetWeight, 2) : null,
      };
    }),
  };
}

function targetMods() {
  return TARGET.prefixes.concat(TARGET.suffixes).map((group) => {
    const mod = ringMods.find((entry) => entry.group === group && entry.tier === TARGET.tier);
    return describeMod(mod);
  });
}

function buildReport() {
  const trials = Number(process.env.CRAFT_OPTIMIZER_TRIALS || DEFAULT_TRIALS);
  const costModel = loadCostModel();
  const strategies = [
    summarizeStrategy("provided-lightning-rare-desecrate-fracture-essence-postlock", runProvidedLightningRareDesecrateFractureEssence, trials, costModel.weights),
    summarizeStrategy("provided-lightning-prefix-regal-fracture-essence", runProvidedLightningPrefixRegalFractureEssence, trials, costModel.weights),
    summarizeStrategy("provided-lightning-fracture-essence", runProvidedLightningFractureEssence, trials, costModel.weights),
    summarizeStrategy("provided-lightning-fracture-chaos", runProvidedLightningFractureChaos, trials, costModel.weights),
    summarizeStrategy("alchemy-prefix-fracture-chaos", runAlchemyPrefixFracture, trials, costModel.weights),
    summarizeStrategy("transmute-prefix-fracture-chaos", runTransmutePrefixFracture, trials, costModel.weights),
    summarizeStrategy("transmute-prefix-fracture-annul-exalt", runFractureAnnulExalt, Math.max(20, Math.floor(trials / 4)), costModel.weights),
    summarizeStrategy("alchemy-suffix-fracture-chaos", runAlchemySuffixFracture, Math.max(12, Math.floor(trials / 8)), costModel.weights),
    summarizeStrategy("no-fracture-chaos", runNoFracture, Math.max(12, Math.floor(trials / 8)), costModel.weights),
  ];

  const finished = strategies.filter((entry) => entry.successes > 0);
  const best = finished.slice().sort((a, b) => a.meanCost - b.meanCost)[0];

  return {
    generatedAt: new Date().toISOString(),
    coreVersion: Core.DATA_VERSION,
    dataVersion: DATA_VERSION,
    target: TARGET,
    costModel,
    assumptions: [
      "PoE2DB explicit modifier level, tier, and DropChance weight data are used for normal explicit modifiers.",
      "Only mechanics implemented in crafting-core.js are planned here. Crafting bench and meta-crafts are not included until their real PoE2DB data is imported.",
      "The provided-lightning-rare-desecrate-fracture-essence-postlock strategy assumes the supplied base is already rare with exactly one normal explicit prefix: T1 LightningDamage. Its lock setup cost is reported separately and excluded from meanCost, matching the requested 'cost starts after locking' rule.",
      "For that desecration setup, Fracturing Orb's minimum requirement counts normal explicit plus desecrated modifiers, but the locked target is chosen from normal explicit modifiers only: T1 LightningDamage plus two Perfect Exalted modifiers, so the lock chance is 1/3.",
      "Other provided-base fracture strategies assume a clean magic Ruby Ring with a single T1 LightningDamage prefix; they now add enough explicit modifiers before fracturing, so their fracture chance is based on at least four normal explicit candidates.",
      "Whittling/lowest chaos is used only when every lowest-level removable modifier is a non-target modifier on the side being fixed.",
      "Perfect suffix chaos/exalt is avoided while ItemFoundRarityIncrease is missing because that T1 modifier is level 40.",
      "Desecrated modifiers are kept as separate modifiers in the simulator. They do not occupy the normal 3-prefix/3-suffix explicit slots, but their groups still block duplicates.",
    ],
    targetMods: targetMods(),
    poolStats: poolStats(),
    strategies,
    recommended: best && {
      strategy: best.id,
      meanCost: best.meanCost,
      medianCost: best.medianCost,
      p90Cost: best.p90Cost,
      averageCounts: best.averageCounts,
      averageLockSetupCounts: best.averageLockSetupCounts,
      meanLockSetupCostExcluded: best.meanLockSetupCostExcluded,
      bestSample: best.bestSample,
    },
  };
}

function main() {
  const report = buildReport();
  fs.writeFileSync(OUT_PATH, JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify({
    outPath: OUT_PATH,
    recommended: report.recommended && {
      strategy: report.recommended.strategy,
      meanCost: report.recommended.meanCost,
      medianCost: report.recommended.medianCost,
      p90Cost: report.recommended.p90Cost,
      meanLockSetupCostExcluded: report.recommended.meanLockSetupCostExcluded,
    },
    strategies: report.strategies.map((entry) => ({
      id: entry.id,
      successRate: entry.successRate,
      meanCost: entry.meanCost,
      medianCost: entry.medianCost,
      p90Cost: entry.p90Cost,
      meanLockSetupCostExcluded: entry.meanLockSetupCostExcluded,
    })),
  }, null, 2));
}

if (require.main === module) main();

module.exports = {
  buildReport,
  runAlchemyPrefixFracture,
  runTransmutePrefixFracture,
  runNoFracture,
  runFractureAnnulExalt,
    runProvidedLightningFractureChaos,
    runProvidedLightningFractureEssence,
    runProvidedLightningRareDesecrateFractureEssence,
    runProvidedLightningPrefixRegalFractureEssence,
};
