import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");

await import("../data/poe2db-mod-data.js");
await import("../data/poe2db-base-data.js");
await import("../crafting-core.js");

const Core = globalThis.CraftingCore;

const itemLevels = [82, 100];
const addActions = ["transmutation", "augmentation", "alchemy", "regal", "exalted", "chaos"];
const detailedPoolLimit = 12;
const modifierSampleLimit = 80;
const stageByAction = {
  transmutation: "normal_empty_add_one",
  augmentation: "magic_open_add_one",
  alchemy: "normal_empty_rare_first_roll",
  regal: "magic_open_upgrade_rare_add_one",
  exalted: "rare_open_add_one",
  chaos: "magic_or_rare_after_remove_add_one",
};

function tiersFor(action) {
  if (!action.supportsTiers) return ["normal"];
  return ["normal", "greater", "perfect"];
}

function makeStageItem(baseId, itemLevel, actionId) {
  const item = Core.makeItem(baseId, itemLevel, `audit-${baseId}-${itemLevel}-${actionId}`);
  if (actionId === "augmentation" || actionId === "regal") {
    item.rarity = "magic";
    seedExistingMod(item);
  }
  if (actionId === "exalted" || actionId === "chaos") {
    item.rarity = "rare";
    seedExistingMod(item);
  }
  return item;
}

function seedExistingMod(item) {
  const mod = Core.eligibleMods(item, {}).slice().sort((a, b) => b.weight - a.weight || a.id.localeCompare(b.id))[0];
  if (!mod) return false;
  const entry = {
    ...mod,
    rolls: mod.rolls.map((roll) => ({ ...roll })),
    values: mod.rolls.map((roll) => roll.min),
    desecrated: false,
    revealed: true,
    fractured: false,
    sourceText: mod.sourceText || "",
  };
  if (entry.type === "prefix") item.prefixes.push(entry);
  else item.suffixes.push(entry);
  return true;
}

function modEntry(mod, totalWeight) {
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
  };
}

function summarize(base, itemLevel, action, tier, includeModifiers = false) {
  const item = makeStageItem(base.id, itemLevel, action.id);
  const pool = Core.summarizePool(item, tier, action.id);
  const entry = {
    actionId: action.id,
    currencyName: Core.currencyNameFor(action.id, tier),
    tier,
    stage: stageByAction[action.id],
    baseId: base.id,
    baseClass: base.classId,
    itemLevel,
    minModifierLevel: pool.minLevel || 0,
    candidateCount: pool.mods.length,
    prefixCount: pool.prefixCount,
    suffixCount: pool.suffixCount,
    totalWeight: pool.totalWeight,
    minCandidateLevel: pool.mods.length ? Math.min(...pool.mods.map((mod) => mod.level)) : null,
    maxCandidateLevel: pool.mods.length ? Math.max(...pool.mods.map((mod) => mod.level)) : null,
  };

  if (includeModifiers) {
    entry.modifierSampleLimit = modifierSampleLimit;
    entry.modifiers = pool.mods
      .slice()
      .sort((a, b) => a.type.localeCompare(b.type) || a.group.localeCompare(b.group) || a.level - b.level || a.id.localeCompare(b.id))
      .slice(0, modifierSampleLimit)
      .map((mod) => modEntry(mod, pool.totalWeight)),
    entry.note = "This is a bounded sample of the open-stage candidate pool. During real crafting, occupied affix groups and filled prefix/suffix slots further remove candidates; the app's live pool panel shows that exact current-state pool after every step.";
  }

  return entry;
}

function audit() {
  const actions = Core.CURRENCIES.filter((action) => addActions.includes(action.id));
  const bases = Core.BASES;
  const entries = [];
  const samplePools = [];

  for (const itemLevel of itemLevels) {
    for (const base of bases) {
      const level = Math.max(itemLevel, base.requiredLevel || 1);
      for (const action of actions) {
        for (const tier of tiersFor(action)) {
          const includeModifiers = samplePools.length < detailedPoolLimit;
          const entry = summarize(base, level, action, tier, includeModifiers);
          if (includeModifiers) samplePools.push(entry);
          const { modifiers, note, ...summary } = entry;
          entries.push(summary);
        }
      }
    }
  }

  const emptyPools = entries.filter((entry) => entry.candidateCount === 0);

  const report = {
    generatedAt: new Date().toISOString(),
    coreVersion: Core.DATA_VERSION,
    dataVersion: globalThis.POE2DB_MOD_DATA && globalThis.POE2DB_MOD_DATA.version,
    source: "PoE2DB cached modifier and currency pages under .cache/",
    currencyTierRules: globalThis.POE2DB_MOD_DATA && globalThis.POE2DB_MOD_DATA.currencyTiers,
    itemLevels,
    entryCount: entries.length,
    emptyPoolCount: emptyPools.length,
    emptyPoolSample: emptyPools.slice(0, 200),
    detailedPoolLimit,
    samplePools,
    entries,
  };

  const outPath = join(rootDir, "data", "currency-pool-audit.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");
  return {
    outPath,
    entryCount: entries.length,
    totalCandidateRows: entries.reduce((sum, entry) => sum + entry.candidateCount, 0),
    emptyPoolCount: emptyPools.length,
    detailedPools: samplePools.length,
    sample: entries.slice(0, 3).map((entry) => ({
      baseId: entry.baseId,
      actionId: entry.actionId,
      tier: entry.tier,
      itemLevel: entry.itemLevel,
      minModifierLevel: entry.minModifierLevel,
      candidateCount: entry.candidateCount,
      totalWeight: entry.totalWeight,
    })),
  };
}

export const result = audit();
