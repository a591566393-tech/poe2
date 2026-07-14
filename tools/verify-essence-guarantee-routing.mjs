import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

require("../data/poe2db-crafting-data.js");

const data = globalThis.POE2DB_CRAFTING_DATA;
const failures = [];

const expectedOneHandOrBow = [
  "claw",
  "dagger",
  "one_hand_sword",
  "one_hand_axe",
  "one_hand_mace",
  "spear",
  "flail",
  "bow",
];

const expectedTwoHandOrCrossbow = [
  "two_hand_sword",
  "two_hand_axe",
  "two_hand_mace",
  "quarterstaff",
  "crossbow",
];

function sameArray(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function hasPureSkillLevelGuarantee(mod) {
  const text = `${mod.sourceText || ""} ${mod.template || ""}`;
  return /\u6280\u80fd\s*\u7b49\u7ea7/u.test(text) && !/\u9b54\u529b\u4e0a\u9650|\u547d\u4e2d|\u901f\u5ea6/u.test(text);
}

for (const bucketName of ["essences", "alloys", "liquidEmotions"]) {
  for (const entry of data[bucketName] || []) {
    for (const mod of entry.mods || []) {
      if ((bucketName === "essences" || bucketName === "alloys") && hasPureSkillLevelGuarantee(mod) && mod.type !== "suffix") {
        failures.push(`${entry.id}/${mod.id}: pure skill-level guarantee must be suffix, got ${mod.type}`);
      }

      if (/\u5355\u624b\s*\u8fd1\u6218\s*\u6b66\u5668\s*\u6216\s*\u5f13\u7c7b/u.test(mod.sourceText || "") && !sameArray(mod.classes || [], expectedOneHandOrBow)) {
        failures.push(`${entry.id}/${mod.id}: one-handed melee or bow classes are ${JSON.stringify(mod.classes)}`);
      }

      if (/\u53cc\u624b\s*\u8fd1\u6218\s*\u6b66\u5668\s*\u6216\s*\u6218\u5f29/u.test(mod.sourceText || "") && !sameArray(mod.classes || [], expectedTwoHandOrCrossbow)) {
        failures.push(`${entry.id}/${mod.id}: two-handed melee or crossbow classes are ${JSON.stringify(mod.classes)}`);
      }

      if (entry.id === "Potent_Liquid_Contempt" && /\u5141\u8bb8\u7684\u524d\u7f00/u.test(mod.sourceText || "") && mod.type !== "suffix") {
        failures.push(`${entry.id}/${mod.id}: allowed-prefix cap modifier must occupy a suffix slot, got ${mod.type}`);
      }

      if (entry.id === "Potent_Liquid_Contempt" && /\u5141\u8bb8\u7684\u540e\u7f00/u.test(mod.sourceText || "") && mod.type !== "prefix") {
        failures.push(`${entry.id}/${mod.id}: allowed-suffix cap modifier must occupy a prefix slot, got ${mod.type}`);
      }
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("essence guarantee routing ok");
