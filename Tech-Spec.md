# Tech-Spec.md

## Desecration Coverage

### Goal

Every equipment class that has PoE2DB desecrated modifier rows must have a reachable desecration material path in the simulator.

### Acceptance Criteria

- Jewellery desecration materials cover rings, amulets, belts, and talismans.
- Armour desecration materials cover boots, body armours, gloves, helmets, shields, bucklers, and foci.
- Weapon desecration materials cover weapons and quivers.
- Representative rare bases from every equipment class can validate and roll at least one desecrated modifier through the appropriate material.
- Smoke tests fail if any equipment class with desecrated modifiers has no usable desecration action.

### Risk

The PoE2DB desecrated modifier table contains many rows without explicit item-class prefixes. Those rows are intentionally treated as globally eligible unless the source text names a narrower class.

## Desecration Routing

### Goal

Explicit equipment-only desecrated rows must only appear on matching equipment, while broad rows and base affixes remain available according to the current base.

### Acceptance Criteria

- Sceptres do not receive exclusive desecrated modifier rows, matching the PoE2DB note that sceptres have no exclusive desecrated modifiers.
- Sceptres still receive broad desecrated rows and desecrated base affixes when the source text does not name a narrower equipment class.
- Abyssal Echoes creates a pending three-choice reveal and only finalizes the selected choice.
- Rows mentioning quivers, shields/blocking, crossbows/reload/grenades, maces/slams, staves, wands, foci, bows, or sceptres are narrowed to matching equipment classes.
- Jewel Desecrated Mods are imported as `jewel`-only modifiers and must match PoE2DB's `JewelsDesecratedMods` table row-for-row.
- Desecrated Waystone Mods are imported as `waystone`-only modifiers and must match PoE2DB's `DesecratedWaystoneMods` table row-for-row.
- `tools/audit-desecration-routing.mjs` fails if explicit equipment rows expand to all classes or leak into another equipment pool.

### Risk

Some Lich-name desecrated rows are intentionally broad because PoE2DB says revealed desecrated modifiers may include base modifiers and Lich-specific omens are only constrained to weapons and jewellery. The simulator should narrow only when the row text names an equipment class or base-defence dependency.

## Frontend Usability Pass

### Goal

Make the simulator faster to operate during real crafting tests without changing crafting rules or duplicating core logic in the UI.

### Acceptance Criteria

- Currency controls stay easy to reach on desktop and mobile, with clear category filtering and usable/unusable state.
- Currency actions are grouped by crafting material category in both the "All" view and category-filtered views, so global search never presents an unstructured mixed list.
- The sticky currency panel must render as an opaque isolated scroll layer that fills from its sticky top to the viewport bottom; scrolling its action list must not reveal or overlap other currency buttons or the modifier pool behind it.
- Base selection exposes top-level equipment categories before the detailed base dropdown, so users can narrow bases by weapons, armour, offhands, jewellery, jewels, or other classes before text search.
- Users can quickly hide unusable currencies for the current item state, while still being able to inspect every material.
- The current item, currency panel, history, and modifier pool remain scannable without nested cards or marketing-style layout.
- Custom starting item modifier selects put the modifier text first and provide a dedicated text filter so entries such as elemental damage prefixes are findable.
- The history panel shows crafting consumption derived from `item.history`, excluding custom-start setup, so undo and Abyssal Echoes choices automatically keep the cost summary in sync.
- The modifier pool panel shows candidate counts, total weight, current-state availability, and per-mod appearance chance. Displayed chance must use the same prefix/suffix type pool denominator as PoE2DB for the current equipment/action pool, not the combined prefix+suffix total.
- Data-load warnings remain visible when imported PoE2DB data files fail to load.

### Verification

- Run JavaScript syntax checks for changed files.
- Run `tools/smoke-crafting-core.mjs`.
- Run browser verification for the main UI workflow: base search, custom modifier search, usable currency filter, and pool search.

## Ordinary Jewel Coverage

> Superseded by `Jewel Colour Pools And Capacity` below. The original `JewelMods /193` table is retained as a completeness reference only; it is not a valid per-colour runtime pool.

### Goal

普通珠宝底材和普通珠宝词缀必须从 PoE2DB `Jewels` 页面导入，并能被普通通货和珠宝亵渎流程使用。

### Acceptance Criteria

- `data/poe2db-base-data.js` imports the 9 PoE2DB ordinary jewel bases from the `珠宝 物品 /9` tab.
- Soul Core entries such as `Cadigan's Epiphany` are not imported as jewel bases.
- `data/poe2db-mod-data.js` imports all 193 rows from PoE2DB `JewelMods`.
- Ruby jewel transmutation exposes 193 ordinary jewel modifiers: 83 prefixes and 110 suffixes.
- Preserved Cranium remains usable on real jewel bases and exposes the 32 exclusive jewel desecrated rows plus ordinary jewel base modifiers as desecrated candidates.

### Risk

PoE2DB `JewelMods` is an HTML table and does not expose a `DropChance` column like equipment `ModsView` pages. The importer records those rows with equal weight `1` and stores a `weightSource` note instead of inventing hidden weights.

## Soul Core Modifier Reset

### Goal

Soul Cores such as `Medved's Tending / 梅德维德的照料` must be usable as socketed items and must expose their PoE2DB-backed modifier pools as real crafting actions.

### Acceptance Criteria

- Soul Core actions are imported from PoE2DB `ModsView` categories instead of hand-written modifier pools.
- `Medved's Tending` can be socketed only into body armours with an open socket.
- A socketed `Medved's Tending` unlocks a separate reset action that removes one existing Medved/Soul Core modifier when present and rolls one new eligible `soul` modifier from the body armour pool.
- `Thrudd's Might` unlocks a weapon-only selection action for the `destruction` modifier pool.
- The modifier pool panel can inspect Soul Core reset/select pools with the same level, weight, and chance display as other actions.
- Smoke tests fail if Medved's Tending is missing, rolls outside the imported level/weight pool, applies without being socketed, or applies to a non-body-armour item.

### Risk

PoE2DB Soul Core modifier rows currently expose equal `DropChance` values of `1` in the relevant cached pages. The simulator should preserve that imported weight rather than inventing a different hidden weighting model.

## Quality And Vaal State Effects

### Goal

Quality, equipment sockets, socketed items, and Vaal Orb outcomes must change the simulated item state in ways that are visible on the item panel and reversible through history.

### Acceptance Criteria

- Armour quality changes displayed armour, evasion, energy shield, and rune ward base stat lines when the current base exposes those values.
- Weapon quality changes displayed physical damage base stat lines when the current base exposes those values.
- The UI renders base stat lines through `CraftingCore.baseStatLines(item)` instead of duplicating raw `base.defenses`, so displayed values reflect the current item quality.
- Artificer's Orb adds an empty equipment socket only; it does not invent stats before a rune or Soul Core is socketed.
- Socketed runes and Soul Cores remain responsible for their own stat or crafting effects.
- Vaal Orb corrupts the item and can produce visible state outcomes, including rerolling variable modifier values, setting variable modifier values to their high roll, adding a corrupted extra socket above the normal socket cap, adding one eligible modifier, removing one removable modifier, or no visible change.
- Corrupted extra sockets are represented as socket entries with `corrupted: true` and are visually distinguished in the item panel.
- Smoke tests must cover at least one armour quality value change, one weapon quality value change, one Vaal high-roll outcome, and one Vaal extra-socket outcome.

### Risk

The cached PoE2DB currency page describes Vaal Orb as randomly modifying and corrupting an item, but it does not expose outcome branch probabilities. The simulator should model explicit reachable state branches without claiming precise Vaal branch odds until a sourced probability table is available.

## Jewel Colour Pools And Capacity

### Goal

普通珠宝必须使用 PoE2DB 具体底材页面的真实颜色池，并遵守珠宝自己的词缀容量。

### Acceptance Criteria

- Ruby, Emerald, Sapphire, and Diamond bases carry the PoE2DB `strjewel`, `dexjewel`, and `intjewel` tags exposed by their individual pages.
- Time-Lost Ruby, Emerald, Sapphire, and Diamond bases carry the corresponding `*_radius_jewel` tags exposed by their individual pages.
- Ordinary jewel modifiers are imported from each jewel page's `ModsView.normal` pool.
- Shared modifiers are deduplicated and store an any-of colour-tag constraint, so Diamond receives the union without duplicated weight.
- Sapphire cannot roll a modifier absent from the cached PoE2DB Sapphire pool.
- Magic jewels use 1 prefix / 1 suffix. Rare jewels use 2 prefixes / 2 suffixes before item-specific capacity modifiers.
- A modifier such as `允许的后缀 +1` changes `CraftingCore.capFor()` while occupying its own prefix slot.
- Preserved Cranium combines exclusive jewel desecrated modifiers with only the current jewel base's eligible ordinary modifier pool.

### Risk

PoE2DB currently exposes `DropChance: 1` for ordinary jewel rows on the individual `ModsView.normal` pools. The simulator preserves that source value and does not invent hidden weights.

## Jewel Liquid Emotions And Chaos

### Goal

液化情感和混沌石必须遵守当前珠宝颜色、词缀容量和可完成的替换结果。

### Acceptance Criteria

- Liquid Emotion actions are generated from the `ModsView.liquid` rows on the Time-Lost jewel pages.
- Liquid Emotions can only be used on rare Time-Lost jewels.
- Using a Liquid Emotion removes one removable modifier and adds the colour-specific crafted modifier for that emotion.
- Liquid Emotion removal and replacement must stay on the same affix side: removing a prefix can only add a prefix crafted modifier, and removing a suffix can only add a suffix crafted modifier.
- Affix-cap crafted modifiers apply immediately after being added and stop applying immediately after removal.
- Chaos validation, removal preview, and execution share one candidate function.
- A Chaos candidate is legal only when removing that exact modifier leaves at least one eligible modifier for the current tier and omen.

### Verification

- Smoke tests compare each ordinary jewel colour pool with the corresponding cached PoE2DB `ModsView.normal` payload.
- Smoke tests verify rare jewel 2/2 caps, `允许的后缀 +1`, suffix-only desecration when prefixes are full, and Chaos candidate filtering.
- Smoke tests verify a Liquid Emotion on a Time-Lost Sapphire and reject it on a normal Sapphire.

## Desecration Candidate Audit

### Goal

Every imported desecrated modifier must be reachable on the equipment classes and item-level gates stated by PoE2DB, while excluded classes must never see it.

### Acceptance Criteria

- Each imported desecrated row is checked against its source class/base tags, prefix/suffix side, modifier level, and source section.
- Explicit equipment-only rows do not leak to other equipment classes or generic fallback pools.
- Each supported equipment class has at least one reachable row when the source data provides one; missing rows are reported with the exact source id and reason.
- Abyssal Echoes choices use the same filtered candidate pool as the initial desecration action and retain the selected prefix/suffix side.

### Verification

- Run `tools/audit-desecration-routing.mjs` and the core smoke test after any desecrated data or routing change.
- Include negative checks for known invalid equipment classes and positive checks for rows previously reported as unreachable.

## Search Localisation

### Goal

底材和材料搜索支持简体、繁体和常用国际服英文名称，不复制底层数据。

### Acceptance Criteria

- Base search recognises `蓝玉`, `藍玉`, `Sapphire`, `红玉`, `紅玉`, `翡翠`, `宝钻`, and `寶鑽`.
- Action search recognises both `精华` and `精髓`, plus `液化情感` and `液化情緒`.
- Search aliases only affect filtering; source names and imported records remain unchanged.

### Traditional Search Regression Criteria

- Search normalization folds common Traditional Chinese characters to Simplified Chinese before matching.
- Continuous Traditional queries such as `藍玉珠寶`, `失落時空藍玉珠寶`, `催化劑`, `褻瀆`, `液化情緒`, `預兆`, and `精華` must match without requiring spaces.

## Language Switch

### Goal

The simulator must expose Simplified Chinese, Traditional Chinese, and English modes from the top-right language switch. Search should work across all three modes instead of depending on the currently selected display language.

### Acceptance Criteria

- The header has a `zh-Hans / zh-Hant / en` language selector.
- Static UI labels, placeholders, category names, base names, action names, item panel labels, history, cost summary, and pool rows re-render after switching languages.
- Simplified display uses the primary PoE2DB-backed data; Traditional Chinese and English display use official localized base/action/modifier text from `data/poe2db-i18n-data.js` where a PoE2DB row match exists, with stable ids/groups/tags only as fallback.
- Search indexes include Simplified, Traditional, and English text at the same time.
- Representative searches must resolve in all three languages: `蓝玉珠宝`, `藍玉珠寶`, `Sapphire Jewel`, `催化剂`, `催化劑`, and `Catalyst`.
- Localized currency controls and modifier pool rows must wrap inside their containers without clipping or horizontal overflow.

### Verification

- A Node smoke loads `app.js` in a fake DOM and checks three-language display/search results against current `CraftingCore` data.
- `tools/smoke-ui-wiring.mjs` verifies the language selector and i18n display helpers are wired.
- Browser verification switches through `zh-Hans`, `zh-Hant`, and `en` and checks currency controls, cost chips, and pool rows for scroll overflow before packaging.

## Catalysts

### Goal

催化剂必须使用 PoE2DB 导入的适用底材、标签和品质规则，并影响匹配词缀的显示数值。

### Acceptance Criteria

- Catalyst actions are generated from the cached PoE2DB catalyst table.
- Jewellery catalysts only apply to their supported jewellery classes; refined jewel catalysts only apply to jewels.
- Catalyst quality gained per use follows item rarity and is capped at 20%.
- Matching modifier values are rendered with the current catalyst quality adjustment.
- Omen of Catalysing Exaltation is consumed by Exalted Orb and consumes the item's catalyst quality.

### Verification

- Core smoke verifies all 26 imported catalysts.
- Core smoke verifies class restrictions, value adjustment, and catalyst-quality consumption by Omen of Catalysing Exaltation.

## Omen, Liquid Emotion, And Market Rates

### Goal

Fix current crafting-state regressions without inventing unsourced crafting probabilities, and expose market exchange rates only from a reliable public source.

### Acceptance Criteria

- Potent Liquid Contempt affix-cap crafted modifiers occupy the correct side: `allowed suffix +1` is a prefix mod, and `allowed prefix +1` is a suffix mod.
- A jewel that already has a Liquid Emotion crafted modifier cannot use another Liquid Emotion.
- Omen of Catalysing Exaltation applies catalyst-weight boosts to chaos, caster, and speed tagged modifiers when the matching catalyst is active.
- Mutually exclusive same-target omens such as left/right Exalted replace each other, while compatible omens such as directional Chaos plus Reduction can still combine.
- The UI exposes a direct way to clear the current pending/locked omen.
- Market exchange rates use POE2 Scout data when reachable. Because the public API does not currently send browser CORS headers, static deployments must read the same data from a generated local cache file instead of hard-coded values.

### Verification

- Run targeted core checks for Liquid Contempt, Liquid Emotion repeat rejection, catalyst effective weights, and omen replacement/merge behavior.
- Run JavaScript syntax checks and the core smoke test.
