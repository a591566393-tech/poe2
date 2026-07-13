import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
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

const LEVEL_CAP = 100;
const ACTION_IDS = ["transmutation", "augmentation", "alchemy", "regal", "exalted", "chaos"];
const TIER_IDS = ["normal", "greater", "perfect"];
const DETAIL_LIMIT = 80;
const PERFECT_EXALTED_BREAKPOINT_LIMIT = 18;
const PERFECT_EXALTED_EXAMPLE_LIMIT = 80;
const PERFECT_EXALTED_SAMPLE_POOL_LIMIT = 40;
const ENTRY_SAMPLE_LIMIT = 160;
const EMPTY_POOL_SAMPLE_LIMIT = 160;
const DEFENCE_BASE_TAGS = ["def_armour", "def_evasion", "def_energy_shield"];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function stageName(actionId) {
  return {
    transmutation: "normal_empty_add_one",
    augmentation: "magic_one_mod_add_one",
    alchemy: "normal_empty_rare_four_mods",
    regal: "magic_one_mod_upgrade_rare_add_one",
    exalted: "rare_one_mod_add_one",
    chaos: "rare_one_mod_remove_one_add_one",
  }[actionId] || "unknown";
}

function modifierLevelFloor(actionId, tierId) {
  const probe = Core.makeItem(Core.BASES[0].id, LEVEL_CAP, `tier-floor-${actionId}-${tierId}`);
  return Core.summarizePool(probe, tierId, actionId).minLevel || 0;
}

function canMatchBaseTags(mod, base) {
  const required = mod.requiredBaseTags || [];
  if (required.length === 0) return true;
  const tags = base.tags || [];
  if (
    required.every((tag) => DEFENCE_BASE_TAGS.includes(tag)) &&
    tags.some((tag) => tag === "armour" || tag === "offhand") &&
    !tags.some((tag) => DEFENCE_BASE_TAGS.includes(tag))
  ) {
    return true;
  }
  if (
    base.classId === "shield" &&
    required.every((tag) => DEFENCE_BASE_TAGS.includes(tag)) &&
    required.some((tag) => tags.includes(tag))
  ) {
    return true;
  }
  return required.every((tag) => tags.includes(tag));
}

function sortMods(a, b) {
  return a.type.localeCompare(b.type) ||
    a.group.localeCompare(b.group) ||
    a.level - b.level ||
    String(a.tier).localeCompare(String(b.tier)) ||
    a.id.localeCompare(b.id);
}

function modSummary(mod, totalWeight) {
  return {
    id: mod.id,
    sourcePage: mod.sourcePage || "",
    sourceUrl: mod.sourceUrl || "",
    type: mod.type,
    group: mod.group,
    name: mod.name,
    tier: mod.tier,
    level: mod.level,
    weight: mod.weight,
    probability: totalWeight > 0 ? Number((mod.weight / totalWeight).toFixed(8)) : 0,
    range: Core.renderRange(mod),
    tags: mod.tags || [],
    requiredBaseTags: mod.requiredBaseTags || [],
  };
}

function countByTier(mods) {
  return mods.reduce((counts, mod) => {
    const key = mod.tier || "unknown";
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function countByType(mods) {
  return mods.reduce((counts, mod) => {
    counts[mod.type] = (counts[mod.type] || 0) + 1;
    return counts;
  }, {});
}

function baseSignature(base) {
  return [
    base.classId,
    (base.tags || []).slice().sort().join(","),
  ].join("|");
}

function buildSignatureMap() {
  const signatures = new Map();
  for (const base of Core.BASES) {
    const signature = baseSignature(base);
    if (!signatures.has(signature)) {
      const probe = Core.makeItem(base.id, LEVEL_CAP, `matrix-signature-${signature}`);
      signatures.set(signature, {
        signature,
        representative: base,
        bases: [],
        modLevels: [...new Set(Core.eligibleMods(probe, { ignoreItemState: true }).map((mod) => mod.level))]
          .sort((a, b) => a - b),
      });
    }
    signatures.get(signature).bases.push(base);
  }
  return signatures;
}

function seedExistingMod(item) {
  const candidates = Core.eligibleMods(item, {})
    .slice()
    .sort((a, b) => b.weight - a.weight || a.level - b.level || a.id.localeCompare(b.id));
  const definition = candidates[0];
  if (!definition) return null;
  const entry = {
    ...definition,
    rolls: definition.rolls.map((roll) => ({ ...roll })),
    values: definition.rolls.map((roll) => roll.min),
    desecrated: false,
    revealed: true,
    fractured: false,
    sourceText: definition.sourceText || "",
  };
  if (entry.type === "prefix") item.prefixes.push(entry);
  else item.suffixes.push(entry);
  return entry;
}

function makeStageItem(baseId, itemLevel, actionId) {
  const item = Core.makeItem(baseId, itemLevel, `matrix-${baseId}-${itemLevel}-${actionId}`);
  let seeded = null;
  if (actionId === "augmentation" || actionId === "regal") {
    item.rarity = "magic";
    seeded = seedExistingMod(item);
  }
  if (actionId === "exalted" || actionId === "chaos") {
    item.rarity = "rare";
    seeded = seedExistingMod(item);
  }
  return { item, seeded };
}

function relevantLevelsForBase(base, floors, modLevels) {
  const minLevel = Math.max(1, base.requiredLevel || 1);
  const levels = new Set([minLevel, LEVEL_CAP]);

  for (const floor of floors) {
    for (const level of [floor - 1, floor, floor + 1]) {
      if (level >= minLevel && level <= LEVEL_CAP) levels.add(level);
    }
  }

  for (const modLevel of modLevels) {
    for (const level of [modLevel - 1, modLevel, modLevel + 1]) {
      if (level >= minLevel && level <= LEVEL_CAP) levels.add(level);
    }
  }

  return [...levels].sort((a, b) => a - b);
}

function validatePool(base, item, actionId, tierId, pool, validation, floor) {
  const failures = [];
  const expectedValidation = pool.mods.length > 0;

  if (pool.minLevel !== floor) {
    failures.push({
      kind: "currency_min_level_mismatch",
      expected: floor,
      actual: pool.minLevel,
    });
  }

  if (item.itemLevel < floor && pool.mods.length > 0) {
    failures.push({
      kind: "pool_not_empty_below_currency_floor",
      itemLevel: item.itemLevel,
      currencyMinModifierLevel: floor,
      candidateCount: pool.mods.length,
    });
  }

  if (expectedValidation && !validation.ok) {
    failures.push({
      kind: "validation_rejected_non_empty_pool",
      reason: validation.reason || "",
      candidateCount: pool.mods.length,
    });
  }

  if (!expectedValidation && validation.ok) {
    failures.push({
      kind: "validation_allowed_empty_pool",
      candidateCount: pool.mods.length,
    });
  }

  for (const mod of pool.mods) {
    if (mod.level < floor) {
      failures.push({
        kind: "candidate_below_currency_floor",
        mod: modSummary(mod, pool.totalWeight),
        currencyMinModifierLevel: floor,
      });
    }
    if (mod.level > item.itemLevel) {
      failures.push({
        kind: "candidate_above_item_level",
        mod: modSummary(mod, pool.totalWeight),
        itemLevel: item.itemLevel,
      });
    }
    if (!mod.classes.includes(base.classId)) {
      failures.push({
        kind: "candidate_wrong_item_class",
        mod: modSummary(mod, pool.totalWeight),
        baseClass: base.classId,
      });
    }
    if (!canMatchBaseTags(mod, base)) {
      failures.push({
        kind: "candidate_wrong_base_tags",
        mod: modSummary(mod, pool.totalWeight),
        baseTags: base.tags || [],
      });
    }
  }

  return failures.map((failure) => ({
    actionId,
    tier: tierId,
    baseId: base.id,
    baseClass: base.classId,
    itemLevel: item.itemLevel,
    ...failure,
  }));
}

function summarizeEntry(base, itemLevel, actionId, tierId, pool, seeded, floor) {
  return {
    actionId,
    tier: tierId,
    stage: stageName(actionId),
    baseId: base.id,
    baseClass: base.classId,
    requiredLevel: base.requiredLevel || 1,
    itemLevel,
    currencyMinModifierLevel: floor,
    seededMod: seeded ? {
      id: seeded.id,
      type: seeded.type,
      group: seeded.group,
      tier: seeded.tier,
      level: seeded.level,
      range: Core.renderRange(seeded),
    } : null,
    candidateCount: pool.mods.length,
    prefixCount: pool.prefixCount,
    suffixCount: pool.suffixCount,
    totalWeight: pool.totalWeight,
    minCandidateLevel: pool.mods.length ? Math.min(...pool.mods.map((mod) => mod.level)) : null,
    maxCandidateLevel: pool.mods.length ? Math.max(...pool.mods.map((mod) => mod.level)) : null,
    tierCounts: countByTier(pool.mods),
    typeCounts: countByType(pool.mods),
  };
}

function perfectExaltedBreakpoint(base, itemLevel, pool) {
  return {
    itemLevel,
    candidateCount: pool.mods.length,
    prefixCount: pool.prefixCount,
    suffixCount: pool.suffixCount,
    totalWeight: pool.totalWeight,
    minCandidateLevel: pool.mods.length ? Math.min(...pool.mods.map((mod) => mod.level)) : null,
    maxCandidateLevel: pool.mods.length ? Math.max(...pool.mods.map((mod) => mod.level)) : null,
    tierCounts: countByTier(pool.mods),
  };
}

function audit() {
  assert(Core.DATA_STATUS.modDataLoaded, "PoE2DB modifier data must be loaded before matrix audit");
  assert(Core.DATA_STATUS.craftingDataLoaded, "PoE2DB crafting data must be loaded before matrix audit");

  const actions = ACTION_IDS.map((id) => Core.getAction(id));
  actions.forEach((action, index) => assert(action, `Missing action: ${ACTION_IDS[index]}`));

  const floors = {};
  for (const actionId of ACTION_IDS) {
    floors[actionId] = {};
    for (const tierId of TIER_IDS) floors[actionId][tierId] = modifierLevelFloor(actionId, tierId);
  }

  const allFloors = [...new Set(Object.values(floors).flatMap((entry) => Object.values(entry)))];
  const signatures = buildSignatureMap();
  const combinationCache = new Map();
  let entryCount = 0;
  let emptyPoolCount = 0;
  let totalCandidateRows = 0;
  let failureCount = 0;
  const entrySamples = [];
  const emptyPoolSamples = [];
  const detailedFailures = [];
  const perfectExaltedByBase = [];
  const perfectExaltedLowTierExamples = [];
  const perfectExaltedSamplePools = [];
  const perfectExaltedWorstTierExamples = [];
  let perfectExaltedWorstTierNumber = 0;

  function analyzeCombination(signatureInfo, itemLevel, actionId, tierId) {
    const cacheKey = [signatureInfo.signature, itemLevel, actionId, tierId].join("|");
    if (!combinationCache.has(cacheKey)) {
      const { item, seeded } = makeStageItem(signatureInfo.representative.id, itemLevel, actionId);
      combinationCache.set(cacheKey, {
        itemLevel,
        seeded,
        pool: Core.summarizePool(item, tierId, actionId),
        validation: Core.validateCurrency(item, actionId, tierId),
      });
    }
    return combinationCache.get(cacheKey);
  }

  for (const base of Core.BASES) {
    const signatureInfo = signatures.get(baseSignature(base));
    const itemLevels = relevantLevelsForBase(base, allFloors, signatureInfo.modLevels);
    const perfectBreakpoints = [];
    let previousPerfectSignature = "";

    for (const itemLevel of itemLevels) {
      for (const actionId of ACTION_IDS) {
        for (const tierId of TIER_IDS) {
          const { seeded, pool, validation } = analyzeCombination(signatureInfo, itemLevel, actionId, tierId);
          const floor = floors[actionId][tierId];
          const problems = validatePool(base, { itemLevel }, actionId, tierId, pool, validation, floor);
          failureCount += problems.length;
          detailedFailures.push(...problems.slice(0, Math.max(0, DETAIL_LIMIT - detailedFailures.length)));
          const entry = summarizeEntry(base, itemLevel, actionId, tierId, pool, seeded, floor);
          entryCount += 1;
          totalCandidateRows += entry.candidateCount;
          if (entry.candidateCount === 0) {
            emptyPoolCount += 1;
            if (emptyPoolSamples.length < EMPTY_POOL_SAMPLE_LIMIT) emptyPoolSamples.push(entry);
          }
          if (entrySamples.length < ENTRY_SAMPLE_LIMIT) entrySamples.push(entry);

          if (actionId === "exalted" && tierId === "perfect") {
            const signature = [
              pool.mods.length,
              pool.prefixCount,
              pool.suffixCount,
              Math.min(...pool.mods.map((mod) => mod.level), 0),
              Math.max(...pool.mods.map((mod) => mod.level), 0),
              JSON.stringify(countByTier(pool.mods)),
            ].join("|");
            if (signature !== previousPerfectSignature) {
              perfectBreakpoints.push(perfectExaltedBreakpoint(base, itemLevel, pool));
              if (perfectExaltedSamplePools.length < PERFECT_EXALTED_SAMPLE_POOL_LIMIT && pool.mods.length > 0) {
                perfectExaltedSamplePools.push({
                  baseId: base.id,
                  baseClass: base.classId,
                  itemLevel,
                  candidateCount: pool.mods.length,
                  examples: pool.mods
                    .slice()
                    .sort(sortMods)
                    .slice(0, 5)
                    .map((mod) => modSummary(mod, pool.totalWeight)),
                });
              }
              previousPerfectSignature = signature;
            }

            for (const mod of pool.mods) {
              const tierNumber = Number(String(mod.tier || "").replace(/^T/i, ""));
              if (Number.isFinite(tierNumber) && tierNumber > perfectExaltedWorstTierNumber) {
                perfectExaltedWorstTierNumber = tierNumber;
                perfectExaltedWorstTierExamples.length = 0;
              }
              if (
                Number.isFinite(tierNumber) &&
                tierNumber === perfectExaltedWorstTierNumber &&
                perfectExaltedWorstTierExamples.length < PERFECT_EXALTED_EXAMPLE_LIMIT
              ) {
                perfectExaltedWorstTierExamples.push({
                  baseId: base.id,
                  baseClass: base.classId,
                  itemLevel,
                  currencyMinModifierLevel: floor,
                  mod: modSummary(mod, pool.totalWeight),
                });
              }
              if (tierNumber >= 7 && perfectExaltedLowTierExamples.length < PERFECT_EXALTED_EXAMPLE_LIMIT) {
                perfectExaltedLowTierExamples.push({
                  baseId: base.id,
                  baseClass: base.classId,
                  itemLevel,
                  currencyMinModifierLevel: floor,
                  mod: modSummary(mod, pool.totalWeight),
                });
              }
            }
          }
        }
      }
    }

    if (perfectBreakpoints.length > 0) {
      perfectExaltedByBase.push({
        baseId: base.id,
        baseName: base.name,
        baseEnglish: base.english,
        baseClass: base.classId,
        requiredLevel: base.requiredLevel || 1,
        testedItemLevels: itemLevels.length,
        currencyMinModifierLevel: floors.exalted.perfect,
        firstAvailableItemLevel: perfectBreakpoints.find((entry) => entry.candidateCount > 0)?.itemLevel || null,
        breakpointCount: perfectBreakpoints.length,
        breakpoints: perfectBreakpoints.slice(0, PERFECT_EXALTED_BREAKPOINT_LIMIT),
        truncatedBreakpoints: Math.max(0, perfectBreakpoints.length - PERFECT_EXALTED_BREAKPOINT_LIMIT),
      });
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    coreVersion: Core.DATA_VERSION,
    dataVersion: globalThis.POE2DB_MOD_DATA.version,
    craftingVersion: globalThis.POE2DB_CRAFTING_DATA.version,
    source: "Local imported PoE2DB data files under data/*.js",
    coverage: {
      baseCount: Core.BASES.length,
      signatureCount: signatures.size,
      actions: ACTION_IDS,
      tiers: TIER_IDS,
      levelCap: LEVEL_CAP,
      levelStrategy: "Every modifier-level breakpoint from base required level through item level 100, including one level before and after each breakpoint. Item levels between breakpoints have identical candidate pools.",
    },
    currencyMinModifierLevels: floors,
    entryCount,
    cachedCombinationCount: combinationCache.size,
    totalCandidateRows,
    emptyPoolCount,
    failureCount,
    failures: detailedFailures,
    entrySampleLimit: ENTRY_SAMPLE_LIMIT,
    entrySamples,
    emptyPoolSampleLimit: EMPTY_POOL_SAMPLE_LIMIT,
    emptyPoolSamples,
    perfectExaltedWorstTierNumber,
    perfectExaltedWorstTierExamples,
    perfectExaltedLowTierExamples,
    perfectExaltedSamplePools,
    perfectExaltedByBase,
  };

  const outPath = join(rootDir, "data", "tiered-currency-matrix-audit.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");

  assert(failureCount === 0, `Tiered currency matrix audit found ${failureCount} failure(s); see ${outPath}`);

  return {
    outPath,
    baseCount: Core.BASES.length,
    entryCount,
    cachedCombinationCount: combinationCache.size,
    totalCandidateRows,
    emptyPoolCount,
    failureCount,
    perfectExaltedBases: perfectExaltedByBase.length,
    perfectExaltedWorstTierNumber,
    perfectExaltedLowTierExamples: perfectExaltedLowTierExamples.length,
    currencyMinModifierLevels: floors,
    dataVersion: globalThis.POE2DB_MOD_DATA.version,
    craftingVersion: globalThis.POE2DB_CRAFTING_DATA.version,
  };
}

const result = audit();
console.log(JSON.stringify(result, null, 2));

export { result };
