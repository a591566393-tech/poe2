# AGENTS.md

## Project

- Name: poe2-craft-simulator
- Date initialized: 2026-07-10
- Product language: Chinese
- Stack: static HTML, CSS, vanilla JavaScript, Node.js data import and audit scripts
- Package manager: none detected
- Main files: `index.html`, `styles.css`, `app.js`, `crafting-core.js`
- Data files: `data/poe2db-base-data.js`, `data/poe2db-mod-data.js`, `data/poe2db-crafting-data.js`, `data/poe2db-i18n-data.js`
- Tooling: `tools/*.mjs`, workspace `.cache/`

## Product Rules

- This is a Path of Exile 2 crafting simulator based on PoE2DB/编年史 data.
- Crafting behavior must use real mod pools, tiers, weights, item level gates, rarity rules, prefix/suffix caps, and current item state.
- Do not add approximate or hand-written shortcut logic when PoE2DB-backed data is available.
- Currency simulation should behave like real step-by-step crafting.
- UI copy is Chinese because the product is for a Chinese user.

## Engineering Rules

- Keep changes focused and small.
- Reuse existing `CraftingCore` APIs and current UI patterns before adding new abstractions.
- Keep generated/cache files inside the project workspace, especially `.cache/`.
- Do not touch unrelated files or revert user changes.
- Do not store secrets in code, docs, logs, or memory.

## Verification Rules

Before reporting completion:

- Run syntax checks for changed JavaScript files.
- Run `tools/smoke-crafting-core.mjs` when crafting logic changes.
- Run targeted scripts or browser checks for the user-facing workflow that changed.
- For UI changes, verify the page in a browser when available.
- Do not hand the first draft to the user for spot-checking.

## Known Commands

Use the bundled Node.js runtime when available:

```powershell
& 'C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --check '.\app.js'
& 'C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --check '.\crafting-core.js'
& 'C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' '.\tools\smoke-crafting-core.mjs'
& 'C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' '.\tools\audit-crafting-factors.mjs'
& 'C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' '.\tools\audit-currency-pools.mjs'
& 'C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' '.\tools\verify-essence-guarantee-routing.mjs'
& 'C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' '.\tools\audit-desecration-completeness.mjs'
& 'C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' '.\tools\audit-chaos-action-probability.mjs'
```

Local preview:

```powershell
Start-Process -FilePath 'C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' -ArgumentList @('D:\Administrator\Documents\gongzuo\poe2-craft-simulator\tools\static-server.mjs','8123') -WorkingDirectory 'D:\Administrator\Documents\gongzuo\poe2-craft-simulator' -WindowStyle Hidden
```
