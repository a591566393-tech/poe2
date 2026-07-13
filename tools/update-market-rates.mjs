import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const outputPath = fileURLToPath(new URL("../data/market-rates.json", import.meta.url));
const source = "https://poe2scout.com";
const apiBase = `${source}/api/poe2`;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "poe2-craft-simulator market cache",
    },
  });
  assert(response.ok, `HTTP ${response.status} for ${url}`);
  const contentType = response.headers.get("content-type") || "";
  assert(contentType.includes("application/json"), `Non-JSON response for ${url}`);
  return response.json();
}

const leagues = await fetchJson(`${apiBase}/Leagues`);
assert(Array.isArray(leagues) && leagues.length > 0, "No leagues returned");
const league = leagues.find((entry) => entry && entry.IsCurrent) || leagues[0];
assert(league && league.ShortName, "Current league ShortName missing");

const rates = await fetchJson(`${apiBase}/Leagues/${encodeURIComponent(league.ShortName)}/ReferenceCurrencies`);
assert(Array.isArray(rates) && rates.length > 0, "No reference currency rates returned");
["chaos", "exalted", "divine"].forEach((apiId) => {
  assert(rates.some((entry) => String(entry.ApiId || "").toLowerCase() === apiId), `Missing ${apiId} rate`);
});

const payload = {
  source,
  sourceApi: `${apiBase}/Leagues/${league.ShortName}/ReferenceCurrencies`,
  generatedAt: new Date().toISOString(),
  league,
  rates,
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  ok: true,
  outputPath,
  league: league.Value || league.ShortName,
  currencyCount: rates.length,
}, null, 2));
