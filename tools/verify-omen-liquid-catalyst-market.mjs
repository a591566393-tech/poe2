import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const sandbox = { console, window: {}, self: {}, globalThis: {} };
sandbox.window = sandbox;
sandbox.self = sandbox;
sandbox.globalThis = sandbox;

[
  "data/poe2db-base-data.js",
  "data/poe2db-mod-data.js",
  "data/poe2db-crafting-data.js",
  "crafting-core.js",
].forEach((file) => {
  vm.runInNewContext(readFileSync(new URL(file, root), "utf8"), sandbox, { filename: file });
});

const Core = sandbox.CraftingCore;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function makeRare(baseId, seed) {
  const item = Core.makeItem(baseId, 82, seed);
  item.rarity = "rare";
  return item;
}

function firstBase(match) {
  const base = Core.BASES.find(match);
  assert(base, "base not found");
  return base.id;
}

function catalystBoost(actionId, groupNeedle) {
  const ringBase = firstBase((base) => base.classId === "ring");
  let item = makeRare(ringBase, `catalyst-${actionId}`);
  const omen = Core.applyCurrency(item, "omen_catalysing_exaltation", "normal");
  assert(omen.ok, omen.reason);
  const catalyst = Core.applyCurrency(omen.item, actionId, "normal");
  assert(catalyst.ok, catalyst.reason);
  const mod = Core.summarizePool(catalyst.item, "normal", "exalted").mods
    .find((entry) => String(entry.group || "").includes(groupNeedle));
  assert(mod, `No ${groupNeedle} candidate found for ${actionId}`);
  assert(Number(mod.effectiveWeight) > Number(mod.weight), `${actionId} did not boost ${groupNeedle}`);
  return {
    id: mod.id,
    weight: mod.weight,
    effectiveWeight: mod.effectiveWeight,
    tags: mod.tags,
  };
}

const rubyBase = firstBase((base) => base.id === "jewel_ruby");
const contempt = Core.getAction("Potent_Liquid_Contempt");
assert(contempt, "Potent Liquid Contempt action missing");

const contemptPool = Core.summarizePool(makeRare(rubyBase, "liquid-pool"), "normal", contempt.id).mods;
const allowedSuffix = contemptPool.find((mod) => mod.id.includes("jewel_ruby_prefix_2"));
const allowedPrefix = contemptPool.find((mod) => mod.id.includes("jewel_ruby_prefix_3"));
assert(allowedSuffix && allowedSuffix.type === "prefix", "Allowed suffix +1 must occupy prefix side");
assert(allowedPrefix && allowedPrefix.type === "suffix", "Allowed prefix +1 must occupy suffix side");

let liquidItem = makeRare(rubyBase, "liquid-real");
const exalt = Core.applyCurrency(liquidItem, "exalted", "normal");
assert(exalt.ok, exalt.reason);
const firstLiquid = Core.applyCurrency(exalt.item, contempt.id, "normal");
assert(firstLiquid.ok, firstLiquid.reason);
const secondLiquid = Core.applyCurrency(firstLiquid.item, contempt.id, "normal");
assert(!secondLiquid.ok, "Second Liquid Emotion use should be rejected");

const leftExalt = Core.applyCurrency(Core.makeItem(rubyBase, 82, "omen-switch"), "omen_exalted_prefix", "normal");
assert(leftExalt.ok, leftExalt.reason);
const rightExalt = Core.applyCurrency(leftExalt.item, "omen_exalted_suffix", "normal");
assert(rightExalt.ok, rightExalt.reason);
assert(rightExalt.item.pendingOmen.effect.addType === "suffix", "Right Exalted omen should replace left addType");
assert(!String(rightExalt.item.pendingOmen.id).includes("omen_exalted_prefix"), "Left Exalted omen component should be removed");

const chaosLeft = Core.applyCurrency(Core.makeItem(rubyBase, 82, "omen-stack"), "omen_chaos_prefix", "normal");
assert(chaosLeft.ok, chaosLeft.reason);
const chaosLowest = Core.applyCurrency(chaosLeft.item, "omen_chaos_lowest", "normal");
assert(chaosLowest.ok, chaosLowest.reason);
assert(chaosLowest.item.pendingOmen.effect.removeType === "prefix", "Chaos removeType should remain");
assert(chaosLowest.item.pendingOmen.effect.removeLowest === true, "Omen of Reduction should stack");

const result = {
  ok: true,
  liquidContempt: {
    allowedSuffixType: allowedSuffix.type,
    allowedPrefixType: allowedPrefix.type,
    secondUseRejected: secondLiquid.reason,
  },
  omens: {
    rightExalt: rightExalt.item.pendingOmen,
    stackedChaos: chaosLowest.item.pendingOmen,
  },
  catalysingExaltation: {
    caster: catalystBoost("Sibilant_Catalyst", "CastSpeed"),
    speed: catalystBoost("Skittering_Catalyst", "CastSpeed"),
    chaos: catalystBoost("Chayulas_Catalyst", "Chaos"),
  },
};

if (process.env.CHECK_MARKET === "1") {
  const leaguesResponse = await fetch("https://poe2scout.com/api/poe2/Leagues", { headers: { Accept: "application/json" } });
  assert(leaguesResponse.ok, `Market leagues HTTP ${leaguesResponse.status}`);
  const leagues = await leaguesResponse.json();
  const league = leagues.find((entry) => entry.IsCurrent) || leagues[0];
  assert(league && league.ShortName, "Market league ShortName missing");
  const ratesResponse = await fetch(`https://poe2scout.com/api/poe2/Leagues/${encodeURIComponent(league.ShortName)}/ReferenceCurrencies`, { headers: { Accept: "application/json" } });
  assert(ratesResponse.ok, `Market rates HTTP ${ratesResponse.status}`);
  const rates = await ratesResponse.json();
  const required = ["chaos", "exalted", "divine"];
  required.forEach((id) => assert(rates.some((entry) => String(entry.ApiId).toLowerCase() === id), `Missing market currency ${id}`));
  result.market = {
    league: league.Value || league.ShortName,
    currencyCount: rates.length,
  };
}

console.log(JSON.stringify(result, null, 2));
