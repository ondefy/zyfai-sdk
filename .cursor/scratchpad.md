# Scratchpad: Protocols on first depositFunds

## Background and Motivation

Partners stop using `deploySafe` for onboarding. Predeployed Safes exist on Mainnet/Base/Arbitrum. Protocol + asset patching must run from `depositFunds` before transfer + `log_deposit`, and only on the account's first deposit.

## Key Challenges and Analysis

- Gate: USDC `chains` empty → first deposit (survives `pauseAgent` which clears protocols but keeps chains).
- All chains `[1, 8453, 42161]` for USDC/WETH; EURC `[1, 8453]`.
- Non-fatal on protocol patch failure so deposit still proceeds.

## High-level Task Breakdown

1. Refactor `updateUserProtocols` for all chains
2. Wire into `depositFunds` (first deposit only, before transfer)
3. Clean `deploySafe` (no protocol patch, no debug logs)
4. Docs

## Project Status Board

- [x] Task 1: Refactor updateUserProtocols
- [x] Task 2: Wire depositFunds first-deposit gate
- [x] Task 3: Clean deploySafe
- [x] Task 4: Docs

## Current Status / Progress Tracking

Implementation complete. Awaiting user verification.

## Executor's Feedback or Assistance Requests

Please verify with a fresh predeployed account: first `depositFunds` should patch protocols; second deposit should skip.

## Lessons

- Gate first-deposit init on `chains` length, not empty `protocols` (pause clears protocols).
