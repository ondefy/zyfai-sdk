# Engineering history

## Fee-adjusted portfolio and earnings (2026)

- Partners need the same fee-adjusted numbers as the Zyfai frontend (`useZyfiFees` logic).
- Gate first-deposit init on `chains` length, not empty `protocols` (pause clears protocols).
- Fee math: pending fee on **current** balance only — never multiply lifetime by 0.9.
- Portfolio vs earnings key normalization differs (`assetType` vs `USDC` symbol).

## Test runner

- `jest` was listed in package.json but not installed; unit tests run via `tsx --test`.
- Canonical validation is `npm run check` (typecheck + test:unit + build).
