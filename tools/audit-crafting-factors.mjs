import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const cacheDir = join(rootDir, ".cache");

await import("../data/poe2db-mod-data.js");
await import("../data/poe2db-base-data.js");
await import("../data/poe2db-crafting-data.js");
await import("../crafting-core.js");

const Core = globalThis.CraftingCore;

const pages = [
  { id: "crafting", title: "Crafting", file: "Crafting.html", url: "https://poe2db.tw/cn/Crafting" },
  { id: "currency", title: "Currency", file: "Currency.html", url: "https://poe2db.tw/cn/Currency" },
  { id: "essence", title: "Essence", file: "Essence.html", url: "https://poe2db.tw/cn/Essence" },
  { id: "desecrated", title: "Desecrated Modifiers", file: "Desecrated_Modifiers.html", url: "https://poe2db.tw/cn/Desecrated_Modifiers" },
  { id: "aldur", title: "Runes of Aldur league", file: "Runes_of_Aldur_league.html", url: "https://poe2db.tw/cn/Runes_of_Aldur_league" },
];

const implementedSlugMap = {
  Orb_of_Transmutation: "transmutation",
  Greater_Orb_of_Transmutation: "greater transmutation",
  Perfect_Orb_of_Transmutation: "perfect transmutation",
  Orb_of_Augmentation: "augmentation",
  Greater_Orb_of_Augmentation: "greater augmentation",
  Perfect_Orb_of_Augmentation: "perfect augmentation",
  Orb_of_Alchemy: "alchemy",
  Orb_of_Chance: "chance",
  Regal_Orb: "regal",
  Greater_Regal_Orb: "greater regal",
  Perfect_Regal_Orb: "perfect regal",
  Exalted_Orb: "exalted",
  Greater_Exalted_Orb: "greater exalted",
  Perfect_Exalted_Orb: "perfect exalted",
  Chaos_Orb: "chaos",
  Greater_Chaos_Orb: "greater chaos",
  Perfect_Chaos_Orb: "perfect chaos",
  Orb_of_Annulment: "annulment",
  Divine_Orb: "divine",
  Vaal_Orb: "vaal",
  Fracturing_Orb: "fracturing",
  Artificers_Orb: "artificer",
  Armourers_Scrap: "armour quality",
  Blacksmiths_Whetstone: "weapon quality",
  Arcanists_Etcher: "caster weapon quality",
  Mirror_of_Kalandra: "mirror",
  Lesser_Essence_of_the_Body: "essence_body",
  Greater_Essence_of_the_Body: "greater_essence_body",
  Perfect_Essence_of_the_Body: "perfect_essence_body",
  Lesser_Essence_of_the_Mind: "essence_mind",
  Greater_Essence_of_the_Mind: "greater_essence_mind",
  Perfect_Essence_of_the_Mind: "perfect_essence_mind",
  Lesser_Essence_of_Flames: "essence_flames",
  Greater_Essence_of_Flames: "greater_essence_flames",
  Perfect_Essence_of_Flames: "perfect_essence_flames",
  Lesser_Essence_of_Ice: "essence_ice",
  Greater_Essence_of_Ice: "greater_essence_ice",
  Perfect_Essence_of_Ice: "perfect_essence_ice",
  Lesser_Essence_of_Electricity: "essence_electricity",
  Greater_Essence_of_Electricity: "greater_essence_electricity",
  Perfect_Essence_of_Electricity: "perfect_essence_electricity",
  Lesser_Essence_of_Battle: "essence_battle",
  Greater_Essence_of_Battle: "greater_essence_battle",
  Perfect_Essence_of_Battle: "perfect_essence_battle",
  Lesser_Essence_of_Sorcery: "essence_sorcery",
  Greater_Essence_of_Sorcery: "greater_essence_sorcery",
  Perfect_Essence_of_Sorcery: "perfect_essence_sorcery",
  Omen_of_Sinistral_Alchemy: "omen_alchemy_prefixes",
  Omen_of_Dextral_Alchemy: "omen_alchemy_suffixes",
  Omen_of_Sinistral_Coronation: "omen_regal_prefix",
  Omen_of_Dextral_Coronation: "omen_regal_suffix",
  Omen_of_Homogenising_Coronation: "omen_regal_homogenising",
  Omen_of_the_Ancients: "omen_chance_ancient",
  Omen_of_Chance: "omen_chance_safe",
  Omen_of_Greater_Exaltation: "omen_exalted_powerful",
  Omen_of_Sinistral_Exaltation: "omen_exalted_prefix",
  Omen_of_Dextral_Exaltation: "omen_exalted_suffix",
  Omen_of_Homogenising_Exaltation: "omen_exalted_homogenising",
  Omen_of_Greater_Annulment: "omen_annulment_powerful",
  Omen_of_Sinistral_Annulment: "omen_annulment_prefix",
  Omen_of_Dextral_Annulment: "omen_annulment_suffix",
  Omen_of_Sinistral_Erasure: "omen_chaos_prefix",
  Omen_of_Dextral_Erasure: "omen_chaos_suffix",
  Omen_of_Whittling: "omen_chaos_lowest",
  Omen_of_Sinistral_Crystallisation: "omen_essence_prefix",
  Omen_of_Dextral_Crystallisation: "omen_essence_suffix",
  Omen_of_Abyssal_Echoes: "omen_desecration_reroll",
  Omen_of_Dextral_Necromancy: "omen_desecration_suffix",
  Omen_of_Sinistral_Necromancy: "omen_desecration_prefix",
  Omen_of_Putrefaction: "omen_desecration_rotting",
  Omen_of_Light: "omen_bright",
  Ancient_Collarbone: "ancient_lockbone",
  Preserved_Collarbone: "preserved_lockbone",
  Gnawed_Collarbone: "gnawing_lockbone",
  Ancient_Rib: "ancient_rib",
  Preserved_Rib: "preserved_rib",
  Gnawed_Rib: "gnawing_rib",
  Ancient_Jawbone: "ancient_jawbone",
  Preserved_Jawbone: "preserved_jawbone",
  Gnawed_Jawbone: "gnawing_jawbone",
  Preserved_Cranium: "preserved_cranium",
  Preserved_Vertebrae: "preserved_vertebrae",
};

const ignoredSlugMap = {
  Scroll_of_Wisdom: "identification only",
  Transmutation_Shard: "fragment, not a direct crafting action",
  Chance_Shard: "fragment, not a direct crafting action",
  Regal_Shard: "fragment, not a direct crafting action",
  Artificers_Shard: "fragment, not a direct crafting action",
  Glassblowers_Bauble: "flask quality, not equipment affixes",
  Gemcutters_Prism: "skill gem quality, not equipment affixes",
  Lesser_Jewellers_Orb: "skill gem sockets, not equipment affixes",
  Greater_Jewellers_Orb: "skill gem sockets, not equipment affixes",
  Perfect_Jewellers_Orb: "skill gem sockets, not equipment affixes",
  Waystones: "map item system, outside equipment crafting target",
  Crafting: "source page",
  Currency: "source page",
  Essence: "source page",
  Omens: "source page",
  Desecrated_Modifiers: "source page",
  Runes_of_Aldur_league: "league information page",
  "DNT-UNUSED_Bind_Spectre_Token": "unused internal token, not a player crafting action",
  Mystery_Leaguestone: "area/league item, not direct equipment crafting",
};

const knownMissing = {
  Hinekoras_Lock: {
    priority: "high",
    reason: "previews the next currency result on an item; needs deterministic outcome queue/peek support",
  },
  Altered_Collarbone: {
    priority: "high",
    reason: "Breach-style desecration for jewellery; requires imported special desecrated pools",
  },
  Omen_of_the_Blackblooded: {
    priority: "high",
    reason: "forces a random Kurgal desecrated modifier on weapons and jewellery",
  },
  Omen_of_the_Liege: {
    priority: "high",
    reason: "forces a random Amanamu desecrated modifier on weapons and jewellery",
  },
  Omen_of_the_Sovereign: {
    priority: "high",
    reason: "forces a random Ulaman desecrated modifier on weapons and jewellery",
  },
};

applyDynamicImplementedSlugMap();

function applyDynamicImplementedSlugMap() {
  for (const action of Core.CURRENCIES) {
    if (/^[A-Z]/.test(action.id)) {
      implementedSlugMap[action.id] = action.id;
    }
  }
  Object.assign(implementedSlugMap, {
    Hinekoras_Lock: "hinekoras_lock",
    Altered_Collarbone: "altered_lockbone",
    Omen_of_the_Blackblooded: "omen_desecration_kurgal",
    Omen_of_the_Liege: "omen_desecration_amanamu",
    Omen_of_the_Sovereign: "omen_desecration_ulaman",
  });
}

function decodeEntities(value) {
  return String(value)
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)));
}

function stripHtml(value) {
  return decodeEntities(String(value)
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function slugFromHref(href) {
  const clean = decodeEntities(href || "").split("#")[0].split("?")[0].replace(/^https?:\/\/[^/]+\/cn\//, "").replace(/^\/cn\//, "");
  const part = clean.split("/").filter(Boolean).pop() || "";
  if (!part || part.startsWith("cache2") || part.startsWith("http")) return null;
  return part;
}

function nearestContext(html, index) {
  const card = nearestBalancedDiv(html, index);
  if (card) return stripHtml(card);

  const starts = ["<li", "<tr", "<p"];
  const ends = ["</li>", "</tr>", "</p>"];
  let bestStart = -1;
  let bestEnd = -1;
  for (let i = 0; i < starts.length; i += 1) {
    const start = html.lastIndexOf(starts[i], index);
    const end = html.indexOf(ends[i], index);
    if (start >= 0 && end >= 0 && (bestStart < 0 || start > bestStart)) {
      bestStart = start;
      bestEnd = end + ends[i].length;
    }
  }
  if (bestStart < 0 || bestEnd < 0) return "";
  return stripHtml(html.slice(bestStart, Math.min(bestEnd, bestStart + 3500)));
}

function nearestBalancedDiv(html, index) {
  const start = html.lastIndexOf("<div class=\"col\"", index);
  if (start < 0) return "";
  const nextCol = html.indexOf("<div class=\"col\"", start + 1);
  if (nextCol > 0 && nextCol < index) return "";

  const tagRe = /<\/?div\b[^>]*>/gi;
  tagRe.lastIndex = start;
  let depth = 0;
  for (const match of html.slice(start).matchAll(tagRe)) {
    const absolute = start + match.index;
    if (match[0].startsWith("</")) depth -= 1;
    else depth += 1;
    if (depth === 0 && absolute > index) {
      return html.slice(start, absolute + match[0].length);
    }
  }
  return "";
}

function extractAnchors(page) {
  const html = readFileSync(join(cacheDir, page.file), "utf8");
  const anchors = [];
  const re = /<a\b([^>]*?)href=["']([^"']+)["']([^>]*)>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(re)) {
    const attrs = `${match[1]} ${match[3]}`;
    if (!/(item_currency|Omen|currencyitem|whiteitem|StackableCurrency|Breachstone)/.test(attrs)) continue;
    const slug = slugFromHref(match[2]);
    if (!slug) continue;
    const name = stripHtml(match[4]);
    if (!name) continue;
    anchors.push({
      sourcePage: page.id,
      sourceTitle: page.title,
      sourceUrl: page.url,
      slug,
      name,
      classHint: attrs.replace(/\s+/g, " ").trim(),
      context: nearestContext(html, match.index),
    });
  }
  return anchors;
}

function uniqBySlug(records) {
  const map = new Map();
  for (const record of records) {
    if (!map.has(record.slug)) {
      map.set(record.slug, {
        slug: record.slug,
        name: record.name,
        sources: [],
        contexts: [],
      });
    }
    const target = map.get(record.slug);
    if (!target.sources.some((source) => source.page === record.sourcePage)) {
      target.sources.push({ page: record.sourcePage, title: record.sourceTitle, url: record.sourceUrl });
    }
    if (record.context && target.contexts.length < 3 && !target.contexts.includes(record.context)) {
      target.contexts.push(record.context);
    }
  }
  return Array.from(map.values()).sort((a, b) => a.slug.localeCompare(b.slug));
}

function classify(entry) {
  if (implementedSlugMap[entry.slug]) {
    return { status: "implemented", implementation: implementedSlugMap[entry.slug] };
  }
  if (ignoredSlugMap[entry.slug]) {
    return { status: "ignored", reason: ignoredSlugMap[entry.slug] };
  }
  if (knownMissing[entry.slug]) {
    return { status: "missing", ...knownMissing[entry.slug] };
  }
  const text = `${entry.slug} ${entry.name} ${entry.contexts.join(" ")}`;
  if (/Essence|精华|精髓/.test(text)) {
    return { status: "missing", priority: "high", reason: "essence item or corrupted essence not mapped into simulator action table" };
  }
  if (/Omen|预兆|之兆/.test(text)) {
    return { status: "missing", priority: "high", reason: "omen changes the next crafting action and is not mapped" };
  }
  if (/渎灵|亵渎|Abyssalify|Desecr/.test(text)) {
    return { status: "missing", priority: "high", reason: "desecration item or special desecrated pool not mapped" };
  }
  if (/词缀|affix|mod|属性|腐化|corrupt|插槽|socket|品质|quality|复制|preview|预示/.test(text)) {
    return { status: "needs_review", priority: "medium", reason: "appears to affect item state or modifiers but no simulator mapping exists" };
  }
  return { status: "ignored", reason: "not detected as equipment-affix relevant from cached text" };
}

function summarize(records) {
  const counts = {};
  for (const record of records) counts[record.status] = (counts[record.status] || 0) + 1;
  const missingByPriority = {};
  for (const record of records.filter((entry) => entry.status === "missing" || entry.status === "needs_review")) {
    const key = record.priority || "unknown";
    missingByPriority[key] = (missingByPriority[key] || 0) + 1;
  }
  return { counts, missingByPriority };
}

function run() {
  const extracted = pages.flatMap(extractAnchors);
  const factors = uniqBySlug(extracted).map((entry) => Object.assign(entry, classify(entry)));
  const report = {
    generatedAt: new Date().toISOString(),
    source: "PoE2DB pages cached under .cache/",
    pages,
    core: {
      version: Core.DATA_VERSION,
      actions: Core.CURRENCIES.length,
      modifiers: Core.MODIFIERS.length,
      desecratedModifiers: Core.DESECRATED_MODIFIERS.length,
      bases: Core.BASES.length,
    },
    summary: summarize(factors),
    missingHighPriority: factors.filter((entry) => entry.status === "missing" && entry.priority === "high"),
    needsReview: factors.filter((entry) => entry.status === "needs_review"),
    factors,
  };

  const outPath = join(rootDir, "data", "crafting-factor-audit.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");
  return {
    outPath,
    factorCount: factors.length,
    summary: report.summary,
    missingHighPriority: report.missingHighPriority.map((entry) => ({
      slug: entry.slug,
      name: entry.name,
      reason: entry.reason,
    })),
  };
}

export const result = run();

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(result, null, 2));
}
