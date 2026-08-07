# Scratchpad: Add EURC (Base + Mainnet)

## Background and Motivation

Add EURC as a first-class SDK asset on Ethereum Mainnet and Base only, mirroring the WETH path for deposits, withdrawals, profile/protocol calls, and docs. No Arbitrum support. No new minimum balance.

(Prior unfinished work: `getSmartWalletAddress` ownership docs + debug log cleanup — paused; Tasks 1–2 of that effort remain done in code.)

## Key Challenges and Analysis

- Public symbol `"EURC"`; internal API `assetType` `"eurc"` (lowercase like `usdc`; WETH stays special as `eth`).
- EURC addresses only on chain 1 and 8453; Arbitrum has no entry so `getDefaultTokenAddress` throws.
- Post-`deploySafe` protocol patching: include EURC on Mainnet/Base; keep USDC+WETH only on Arbitrum.

## High-level Task Breakdown

1. **Config + SupportedAsset** — EURC in `ASSET_CONFIGS`, type `SupportedAsset`.
2. **Conversion + protocol selection** — `convertAssetInternally` + `AssetSymbol`.
3. **Wire ZyfaiSDK** — profile, protocols loop, deposit, getVolume.
4. **Docs + examples** — README, SDK_DOCUMENTATION_SUMMARY, deposit/withdraw examples.

## Project Status Board

- [x] Task 1: Add EURC to ASSET_CONFIGS + SupportedAsset type
- [x] Task 2: Extend convertAssetInternally and protocol-selection
- [x] Task 3: Wire SupportedAsset through ZyfaiSDK
- [x] Task 4: Update docs and light examples

## Current Status / Progress Tracking

All EURC plan tasks implemented. Follow-up: aligned remaining examples + `pauseAgent`/`resumeAgent` to include EURC. Vault examples left USDC-only.

## Executor's Feedback or Assistance Requests

**Implementation complete — please verify.**

Circle addresses used:
- Mainnet: `0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c`
- Base: `0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42`

Key changes:
- `SupportedAsset = "USDC" | "WETH" | "EURC"` exported from package
- `convertAssetInternally("EURC")` → `"eurc"`
- `updateUserProtocols` loops EURC on chains 1/8453 only
- Docs + deposit/withdraw examples updated

Please confirm: (1) internal API key is indeed `eurc`, (2) addresses correct, (3) mark project complete.

## Lessons

- Keep asset imports at top of file (`SupportedAsset` from types in `strategy.ts`).
- WETH maps to `eth`; new stablecoins should use lowercase symbol as internal key.
