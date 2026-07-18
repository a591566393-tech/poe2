import { readFileSync } from "node:fs";

globalThis.window = globalThis;
await import(new URL("../data/poe2db-mod-data.js", import.meta.url));
await import(new URL("../data/poe2db-base-data.js", import.meta.url));
await import(new URL("../data/poe2db-crafting-data.js", import.meta.url));
const Core = (await import(new URL("../crafting-core.js", import.meta.url))).default;

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
      if (depth === 0) return JSON.parse(html.slice(pos, index + 1));
    }
  }
  throw new Error(`ModsView payload is incomplete in ${sourceName}`);
}

function removeCandidate(item, candidate) {
  const draft = JSON.parse(JSON.stringify(item));
  const list = candidate.desecrated
    ? draft.desecratedMods
    : (candidate.type === "prefix" ? draft.prefixes : draft.suffixes);
  const index = list.findIndex((mod) => (
    mod.id === candidate.id && mod.group === candidate.group && mod.template === candidate.template
  ));
  assert(index >= 0, `could not remove ${candidate.id} from probability branch`);
  list.splice(index, 1);
  return draft;
}

const baseId = "one_hand_mace_wooden_club";
const targetId = "poe2db_One_Hand_Maces_41";
const fillerIds = [
  "poe2db_One_Hand_Maces_31",
  "poe2db_One_Hand_Maces_51",
  "poe2db_One_Hand_Maces_59",
  "poe2db_One_Hand_Maces_71",
  "poe2db_One_Hand_Maces_95",
  "poe2db_One_Hand_Maces_107",
];

const target = Core.MODIFIERS.find((mod) => mod.id === targetId);
const importedTarget = globalThis.POE2DB_MOD_DATA.modifiers.find((mod) => mod.id === targetId);
assert(target, `missing representative T1 cold damage modifier ${targetId}`);
assert(importedTarget, `missing imported representative modifier ${targetId}`);
assert(target.type === "prefix" && target.tier === "T1", "representative modifier must be a T1 prefix");

const sourceHtml = readFileSync(new URL("../.cache/One_Hand_Maces.html", import.meta.url), "utf8");
const sourcePayload = extractModsViewObject(sourceHtml, "One_Hand_Maces");
const sourceRow = (sourcePayload.normal || []).find((row) => row.hover === importedTarget.raw?.hover);
assert(sourceRow, `PoE2DB source row missing for ${targetId}`);
assert(Number(sourceRow.DropChance) === 80 && target.weight === 80, "T1 cold damage weight must match PoE2DB weight 80");
assert(Number(sourceRow.Level) === 81 && target.level === 81, "T1 cold damage level must match PoE2DB level 81");
assert(String(sourceRow.ModGenerationTypeID) === "1", "T1 cold damage source row must be a prefix");

const reference = Core.makeItem(baseId, 82, "chaos-probability-reference");
reference.rarity = "rare";
const referencePrefixes = Core.eligibleMods(reference, { ignoreItemState: true })
  .filter((mod) => mod.type === "prefix");
const referencePrefixWeight = referencePrefixes.reduce((sum, mod) => sum + mod.weight, 0);
const normalChance = target.weight / referencePrefixWeight;
assert(Math.abs(normalChance - 0.001791512708543276) < 1e-12,
  `unexpected normal prefix chance ${normalChance}`);

const custom = Core.makeCustomItem(baseId, 82, "chaos-probability-full-item", {
  rarity: "rare",
  explicitModIds: fillerIds,
});
assert(custom.ok, `could not build representative full item: ${custom.reason || "unknown"}`);
assert(custom.item.prefixes.length === 3 && custom.item.suffixes.length === 3,
  "representative item must have three prefixes and three suffixes");

const omen = Core.applyCurrency(custom.item, "omen_chaos_prefix", "normal");
assert(omen.ok, `could not apply Sinistral Erasure: ${omen.reason || "unknown"}`);
const summary = Core.summarizePool(omen.item, "perfect", "chaos");
const summarizedTarget = summary.mods.find((mod) => mod.id === targetId);
assert(summary.probabilityMode === "chaos_action", "Perfect Chaos summary must use final action probability mode");
assert(summary.branchCount === 3, `expected three prefix-removal branches, got ${summary.branchCount}`);
assert(summarizedTarget, "T1 cold damage is missing from the Perfect Chaos result pool");

const removalPreview = Core.removalPreview(omen.item, "chaos", "perfect");
assert(removalPreview.candidates.length === 3, "Sinistral Erasure must expose exactly three prefix candidates");
const branches = removalPreview.candidates.map((candidate) => {
  const draft = removeCandidate(omen.item, candidate);
  const mods = Core.eligibleMods(draft, { minLevel: 50 });
  const totalWeight = mods.reduce((sum, mod) => sum + mod.weight, 0);
  const branchTarget = mods.find((mod) => mod.id === targetId);
  return {
    removedGroup: candidate.group,
    totalWeight,
    targetWeight: branchTarget ? branchTarget.weight : 0,
    chance: branchTarget ? branchTarget.weight / totalWeight : 0,
  };
});
const exactChance = branches.reduce((sum, branch) => sum + branch.chance, 0) / branches.length;
assert(Math.abs(summarizedTarget.actionChance - exactChance) < 1e-15,
  `summarized ${summarizedTarget.actionChance} does not match exact ${exactChance}`);
assert(Math.abs(exactChance - 0.009936660757959402) < 1e-12,
  `unexpected Perfect Chaos + Sinistral Erasure chance ${exactChance}`);
assert(Math.abs(summary.totalActionChance - 1) < 1e-12,
  `all Perfect Chaos outcomes must sum to 100%, got ${summary.totalActionChance}`);

const attempts = 5000;
let hits = 0;
for (let index = 0; index < attempts; index += 1) {
  const item = JSON.parse(JSON.stringify(omen.item));
  item.rngState = Math.imul(index + 1, 2654435761) >>> 0;
  const result = Core.applyCurrency(item, "chaos", "perfect");
  assert(result.ok, `Perfect Chaos simulation failed at attempt ${index}: ${result.reason || "unknown"}`);
  if (result.step.added[0]?.id === targetId) hits += 1;
}
const simulatedChance = hits / attempts;
assert(Math.abs(simulatedChance - exactChance) < 0.006,
  `simulated chance ${simulatedChance} is too far from exact chance ${exactChance}`);

console.log(JSON.stringify({
  ok: true,
  source: {
    page: "https://poe2db.tw/cn/One_Hand_Maces",
    modifier: targetId,
    level: target.level,
    weight: target.weight,
  },
  normalPrefixPool: {
    totalWeight: referencePrefixWeight,
    chancePercent: normalChance * 100,
  },
  perfectChaosWithSinistralErasure: {
    branches,
    exactChancePercent: exactChance * 100,
    totalOutcomePercent: summary.totalActionChance * 100,
    simulatedAttempts: attempts,
    simulatedHits: hits,
    simulatedChancePercent: simulatedChance * 100,
  },
}, null, 2));
