# Scratchpad: Portfolio + Onchain Earnings fee-adjusted fields

## Background and Motivation

Partners/integrators need the same fee-adjusted portfolio and earnings numbers the Zyfai frontend already computes client-side (`useZyfiFees` + `useLifetimeEarnings`).

## High-level Task Breakdown

1. Fee utils + constant + unit tests (TDD)
2. Types
3. Wire `getPortfolio`
4. Wire earnings methods
5. Docs
6. Build / lint / tests

## Project Status Board

- [x] Task 1: Fee utils + constant + unit tests
- [x] Task 2: Types
- [x] Task 3: Wire `getPortfolio`
- [x] Task 4: Wire earnings methods
- [x] Task 5: Docs
- [x] Task 6: Build / lint / tests

## Current Status / Progress Tracking

**Mode: Executor** — WETH min is ~$10,000 on Mainnet and ~$100 on Base/Arbitrum via `GET /api/v2/price?token=eth`.

**Previous:** all fee-adjusted tasks implemented. 14/14 unit tests pass; `npm run build` succeeds.

Please verify manually:
1. `getPortfolio(eoa)` returns `balanceWithFee` / `underlyingAmountWithFee`
2. `getOnchainEarnings(smartWallet)` returns `totalEarningsByTokenWithFee ≈ lifetime + current×0.9`

## Executor's Feedback or Assistance Requests

Implementation complete per plan. Asking Planner/human to confirm task completion.

## Lessons

- Gate first-deposit init on `chains` length, not empty `protocols` (pause clears protocols).
- Fee math must use **current only** for pending fee; never `× 0.9` on lifetime.
- Portfolio keys use assetType (`usdc`); earnings keys use symbol (`USDC`) — always normalize at the boundary.
- Jest is listed in package.json scripts but not installed; unit tests run via `npx tsx --test`.
