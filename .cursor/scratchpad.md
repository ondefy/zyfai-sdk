# Scratchpad: getSmartWalletAddress ownership check

## Background and Motivation

Predeployed (pool) wallets are already deployed and reserved for a user, but OwnableValidator ownership stays backend-owned until the first deposit. `getSmartWalletAddress` currently only returns `isDeployed`, which is misleading for reserved-but-not-owned wallets. We need an on-chain ownership check against the passed `userAddress`.

## Key Challenges and Analysis

- Pool OwnableValidator address (`OWNABLE_VALIDATOR` in `src/config/modules.ts`: `0x000000000013fdB5234E4E3162a810F54d9f7E98`) differs from `@rhinestone/module-sdk` 0.2.x (`0x2483DA3A...`). Must use the pool address for predeployed wallets; also check the legacy SDK address for wallets deployed via this SDK.
- OwnableValidator API: `getOwners(address account) returns (address[])`.
- Field naming: `isOwner` — true when `userAddress` appears in OwnableValidator owners for the Safe. False if not deployed or not yet rotated.
- Keep `getSmartWalletAddress` public for now (docs will clarify reserved vs owned).

## High-level Task Breakdown

1. **Add on-chain ownership helper** — ABI fragment + `isOwnableValidatorOwner` in `src/utils/safe-account.ts` (check pool + legacy OwnableValidator addresses). Success: helper exported, reads `getOwners`, returns boolean, fails closed (false) on RPC/revert.
2. **Wire into `getSmartWalletAddress` + types** — extend `SmartWalletResponse` with `isOwner`; call helper when deployed. Success: TypeScript builds; response includes `isOwner`.
3. **Update docs** — README.md + SDK_DOCUMENTATION_SUMMARY.md for the new field and predeployed ownership semantics. Success: docs match API.
4. **Cleanup** — remove debug `console.log` in `deploySafe` predeployed path. Success: no debug logs left in that block.

## Project Status Board

- [x] Task 1: Add on-chain ownership helper
- [x] Task 2: Wire into getSmartWalletAddress + types
- [ ] Task 3: Update docs
- [ ] Task 4: Remove debug console.logs

## Current Status / Progress Tracking

Task 2 done. Waiting for user verification before Task 3.

## Executor's Feedback or Assistance Requests

**Task 2 complete — please verify before I start Task 3 (docs).**

Changes:
- `SmartWalletResponse.isOwner: boolean` in `src/types/index.ts`
- `getSmartWalletAddress` now returns `isOwner` via on-chain OwnableValidator check (skipped / false when not deployed)

`tsc --noEmit` passes. Next: README + SDK_DOCUMENTATION_SUMMARY.

## Lessons

- Pool module addresses can diverge from `@rhinestone/module-sdk` pin; always prefer `src/config/modules.ts` for predeployed on-chain reads.
- Do not use `getOwnableValidatorOwners` from module-sdk for pool wallets — it targets the wrong OwnableValidator address.
