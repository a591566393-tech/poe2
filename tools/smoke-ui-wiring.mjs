import { readFileSync } from "node:fs";
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

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const app = readFileSync(new URL("../app.js", import.meta.url), "utf8");
assert(html.includes('value="soul_core"'), "Soul Core category option is missing from index.html");
assert(html.includes('value="liquid_emotion"'), "Liquid Emotion category option is missing from index.html");
assert(html.includes('value="catalyst"'), "Catalyst category option is missing from index.html");
assert(html.includes('id="languageSelect"'), "Language switch is missing from index.html");
assert(html.includes('id="genesisRoute"'), "Genesis Tree route control is missing from index.html");
assert(html.includes('id="genesisCraftedMod"'), "Genesis 5% crafted modifier control is missing from index.html");
assert(html.includes('id="growGenesisButton"'), "Genesis Tree grow action is missing from index.html");
assert(html.includes("poe2db-i18n-data.js"), "PoE2DB i18n data script is missing from index.html");
assert(html.includes('value="zh-Hans"'), "Simplified Chinese language option is missing");
assert(html.includes('value="zh-Hant"'), "Traditional Chinese language option is missing");
assert(html.includes('value="en"'), "English language option is missing");
assert(app.includes("Core.baseStatLines"), "item UI should render quality-adjusted base stat lines through Core.baseStatLines");
assert(app.includes("socket.corrupted"), "item UI should mark corrupted extra sockets");
assert(app.includes("vaalInfuserCorruptionRisk"), "item UI should show Vaal infuser corruption risk state");
assert(app.includes("displayBaseName"), "UI should localize base names");
assert(app.includes("displayActionName"), "UI should localize action names");
assert(app.includes("renderModText"), "UI should localize modifier display text");
assert(app.includes("POE2DB_I18N_DATA"), "UI should read imported PoE2DB i18n data");
assert(app.includes("MARKET_COST_ACTION_API_IDS"), "cost summary should map spent currency to market API ids");
assert(app.includes("costMarketSummaryText"), "cost summary should render market-valued total cost");
assert(app.includes("renderCostSummary();") && app.includes("renderMarketRates();"), "market rate loading should refresh cost summary as well as rate chips");
assert(app.includes("marketReferenceTimeText"), "market rates should show an explicit reference timestamp");
assert(app.includes("市场价格参考时间"), "Chinese market reference timestamp label is missing");
assert(app.includes("SEARCH_FOLD_MAP"), "UI search should include a Simplified/Traditional folding table");
assert(app.includes("TRADITIONAL_PHRASE_MAP"), "UI should include phrase-level Traditional Chinese fallback text");
assert(app.includes('"液化情感": "液化情緒"'), "Traditional fallback should render Liquid Emotion as 液化情緒");
assert(app.includes('"显示": "顯示"'), "Traditional fallback should render common UI text as Traditional Chinese");
assert(app.includes("searchTextMatches"), "UI search should use the shared localized matcher");
assert(app.includes("藍玉珠寶"), "base search aliases should include Traditional Chinese sapphire jewel text");
assert(app.includes("失落時空藍玉珠寶"), "base search aliases should include continuous Traditional Time-Lost Sapphire text");
assert(app.includes("液化情緒"), "action search aliases should include Traditional Chinese liquid emotion text");
assert(app.includes("催化劑"), "action search aliases should include Traditional Chinese catalyst text");
assert(app.includes("褻瀆"), "action search aliases should include Traditional Chinese desecration text");
assert(app.includes("Core.makeGenesisItem"), "UI should generate Genesis Tree jewellery through CraftingCore");
assert(app.includes("Core.eligibleGenesisCraftedMods"), "UI should list item-specific Genesis crafted modifiers");
assert(app.includes("Core.summarizeGenesisCraftedPool"), "UI should expose the Genesis crafted modifier reference pool");

const genesisRing = Core.makeItem("ring_ruby", 82, "ui-genesis-ring");
genesisRing.rarity = "rare";
const genesisCraftedPool = Core.eligibleGenesisCraftedMods(genesisRing, { ignoreItemState: true });
assert(genesisCraftedPool.length === 16, `expected 16 ring Genesis crafted rows in UI pool, got ${genesisCraftedPool.length}`);
assert(genesisCraftedPool.every((mod) => mod.genesisCrafted && mod.craftChance === 0.05),
  "Genesis crafted UI pool should contain only fixed 5% node outcomes");

const soulCoreActions = Core.CURRENCIES.filter((action) => action.category === "soul_core").map((action) => action.id);
assert(soulCoreActions.length === 6, `expected 6 Soul Core modifier actions, got ${soulCoreActions.length}`);
assert(soulCoreActions.includes("medveds_tending_modifier"), "Medved's Tending modifier action is missing");
assert(Core.CURRENCIES.some((action) => action.id === "vaal_catalysing_infuser"), "Vaal Catalysing Infuser action is missing");

const base = Core.getBase("body_armour_pilgrim_vestments");
assert(base, "Pilgrim Vestments base is missing");
let item = Core.makeItem(base.id, 82, "ui-smoke-medved");
item.rarity = "rare";

const beforeSocket = Core.validateCurrency(item, "medveds_tending_modifier", "normal");
assert(!beforeSocket.ok, "Medved's Tending modifier action should be blocked before socketing");

const socketedBase = Core.applyCurrency(item, "artificer", "normal");
assert(socketedBase.ok, `Artificer should add a socket: ${socketedBase.reason || "unknown"}`);
const socketed = Core.applyCurrency(socketedBase.item, "medveds_tending", "normal");
assert(socketed.ok, `Medved's Tending should socket: ${socketed.reason || "unknown"}`);

const afterSocket = Core.validateCurrency(socketed.item, "medveds_tending_modifier", "normal");
assert(afterSocket.ok, `Medved's Tending modifier action should validate after socketing: ${afterSocket.reason || "unknown"}`);

const pool = Core.summarizePool(socketed.item, "normal", "medveds_tending_modifier");
assert(pool.mods.length === 21, `expected 21 Medved's Tending pool rows, got ${pool.mods.length}`);

const qualityBase = Core.BASES.find((candidate) => {
  if (!(candidate.tags || []).includes("armour")) return false;
  const probe = Core.makeItem(candidate.id, Math.max(82, candidate.requiredLevel || 1), `ui-quality-${candidate.id}`);
  probe.quality = 5;
  return Core.baseStatLines(probe).some((line) => line.valueChanged);
});
assert(qualityBase, "need an armour base whose displayed base stats change with quality");
const qualityItem = Core.makeItem(qualityBase.id, Math.max(82, qualityBase.requiredLevel || 1), "ui-quality");
const qualityResult = Core.applyCurrency(qualityItem, "armour_scrap", "normal");
assert(qualityResult.ok, `Armourer's Scrap should apply in UI wiring smoke: ${qualityResult.reason || "unknown"}`);
assert(Core.baseStatLines(qualityResult.item).some((line) => line.valueChanged), "quality-adjusted base stat line should be visible to UI");

console.log(JSON.stringify({
  ok: true,
  soulCoreActions,
  medvedPool: pool.mods.length,
  qualityBase: qualityBase.id,
  genesisCraftedPool: genesisCraftedPool.length,
  categoryOption: true,
}, null, 2));
