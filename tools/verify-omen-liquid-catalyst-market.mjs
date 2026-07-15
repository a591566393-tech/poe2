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
  for (let index = 0; index < 20; index += 1) {
    const catalyst = Core.applyCurrency(item, actionId, "normal");
    assert(catalyst.ok, catalyst.reason);
    item = catalyst.item;
  }
  const omen = Core.applyCurrency(item, "omen_catalysing_exaltation", "normal");
  assert(omen.ok, omen.reason);
  const right = Core.applyCurrency(omen.item, "omen_exalted_suffix", "normal");
  assert(right.ok, right.reason);
  const pool = Core.summarizePool(right.item, "normal", "exalted").mods;
  assert(pool.length > 0 && pool.every((entry) => entry.type === "suffix"), "Right Exalted omen should restrict catalyst preview to suffixes");
  const mod = pool
    .find((entry) => String(entry.group || "").includes(groupNeedle));
  assert(mod, `No ${groupNeedle} candidate found for ${actionId}`);
  assert(Number(mod.effectiveWeight) > Number(mod.weight), `${actionId} did not boost ${groupNeedle}`);
  const totalWeight = pool.reduce((sum, entry) => sum + Number(entry.effectiveWeight || entry.weight || 0), 0);
  const groupWeight = pool
    .filter((entry) => String(entry.group || "").includes(groupNeedle))
    .reduce((sum, entry) => sum + Number(entry.effectiveWeight || entry.weight || 0), 0);
  return {
    id: mod.id,
    weight: mod.weight,
    effectiveWeight: mod.effectiveWeight,
    totalWeight,
    groupWeight,
    chance: totalWeight > 0 ? groupWeight / totalWeight : 0,
    tags: mod.tags,
  };
}

const rubyBase = firstBase((base) => base.id === "jewel_ruby");
const contempt = Core.getAction("Potent_Liquid_Contempt");
assert(contempt, "Potent Liquid Contempt action missing");

const contemptPool = Core.summarizePool(makeRare(rubyBase, "liquid-pool"), "normal", contempt.id).mods;
const allowedSuffix = contemptPool.find((mod) => /后缀|Suffix/i.test(mod.sourceText || mod.template || ""));
const allowedPrefix = contemptPool.find((mod) => /前缀|Prefix/i.test(mod.sourceText || mod.template || ""));
assert(allowedSuffix && allowedSuffix.type === "prefix", "Allowed suffix +1 must occupy prefix side");
assert(allowedPrefix && allowedPrefix.type === "suffix", "Allowed prefix +1 must occupy suffix side");

let liquidItem = makeRare(rubyBase, "liquid-real");
const exalt = Core.applyCurrency(liquidItem, "exalted", "normal");
assert(exalt.ok, exalt.reason);
const firstLiquid = Core.applyCurrency(exalt.item, contempt.id, "normal");
assert(firstLiquid.ok, firstLiquid.reason);
const secondLiquid = Core.applyCurrency(firstLiquid.item, contempt.id, "normal");
assert(!secondLiquid.ok, "Second Liquid Emotion use should be rejected");

function fillJewel(baseId, seed) {
  const item = makeRare(baseId, seed);
  const pool = Core.summarizePool(item, "normal", "exalted").mods;
  ["prefix", "suffix"].forEach((type) => {
    const seen = new Set();
    for (const definition of pool.filter((mod) => mod.type === type)) {
      if (seen.has(definition.group)) continue;
      seen.add(definition.group);
      const mod = {
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
        desecrated: false,
        revealed: true,
        fractured: false,
        sourceText: definition.sourceText || "",
      };
      item[type === "prefix" ? "prefixes" : "suffixes"].push(mod);
      if (seen.size === 2) break;
    }
  });
  assert(Core.countByType(item, "prefix") === 2 && Core.countByType(item, "suffix") === 2, `Could not fill ${baseId}`);
  return item;
}

const fullRubyJewel = fillJewel(rubyBase, "liquid-full-ruby");
assert(Core.validateCurrency(fullRubyJewel, contempt.id, "normal").ok, "Potent Liquid Contempt should be usable on a full rare basic jewel");
const timeLostRubyBase = firstBase((base) => base.id === "jewel_time_lost_ruby");
const ancientContempt = Core.getAction("Ancient_Potent_Liquid_Contempt");
assert(ancientContempt, "Ancient Potent Liquid Contempt action missing");
const fullTimeLostRuby = fillJewel(timeLostRubyBase, "liquid-full-time-lost-ruby");
assert(Core.validateCurrency(fullTimeLostRuby, ancientContempt.id, "normal").ok, "Ancient Potent Liquid Contempt should be usable on a full rare Time-Lost jewel");

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

const marketCache = JSON.parse(readFileSync(new URL("data/market-rates.json", root), "utf8"));
const marketIds = new Set((marketCache.rates || []).map((entry) => String(entry.ApiId || "").toLowerCase()));
[
  "sibilant-catalyst",
  "skittering-catalyst",
  "perfect-exalted-orb",
  "omen-of-catalysing-exaltation",
].forEach((apiId) => assert(marketIds.has(apiId), `Market cache missing ${apiId}`));
result.marketCache = {
  rateCount: marketIds.size,
  pricedSpecials: ["sibilant-catalyst", "skittering-catalyst", "perfect-exalted-orb", "omen-of-catalysing-exaltation"],
};

if (process.env.CHECK_MARKET === "1") {
  const leaguesResponse = await fetch("https://poe2scout.com/api/poe2/Leagues", { headers: { Accept: "application/json" } });
  assert(leaguesResponse.ok, `Market leagues HTTP ${leaguesResponse.status}`);
  const leagues = await leaguesResponse.json();
  const league = leagues.find((entry) => entry.IsCurrent) || leagues[0];
  assert(league && league.ShortName, "Market league ShortName missing");
  const ratesResponse = await fetch(`https://poe2scout.com/api/poe2/Leagues/${encodeURIComponent(league.ShortName)}/Items`, { headers: { Accept: "application/json" } });
  assert(ratesResponse.ok, `Market items HTTP ${ratesResponse.status}`);
  const rates = await ratesResponse.json();
  const required = ["chaos", "exalted", "divine", "perfect-exalted-orb", "sibilant-catalyst"];
  required.forEach((id) => assert(rates.some((entry) => String(entry.ApiId).toLowerCase() === id), `Missing market item ${id}`));
  result.market = {
    league: league.Value || league.ShortName,
    itemCount: rates.length,
  };
}

console.log(JSON.stringify(result, null, 2));
