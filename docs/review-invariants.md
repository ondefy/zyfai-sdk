# Review invariants

## Public contract

- Exported API contract is also documented in source TSDoc and `npm run docs` (TypeDoc). See [`TSDOC.md`](TSDOC.md).
- Methods take **EOA** `userAddress`, never the Safe address.
- Strategy names at SDK boundary: `conservative` | `aggressive` | `yieldmaxxing` — convert via `strategy.ts` only.
- First deposit uses predeployed pool (`sendDeposit`) — do not require `deploySafe`/`createSessionKey`.
- Fee-adjusted fields: pending fee applies to **current** balance only, not lifetime earnings.
- Portfolio keys use `assetType` (`usdc`); earnings keys use symbol (`USDC`) — normalize at boundary.
- First-deposit init gates on `chains` length, not empty `protocols`.

## Code style

- No dynamic imports inside functions.
- No emojis in code, logs, or errors.
- README is the user-facing doc; do not add parallel summary files.

## Verification

```bash
npm run check
```
