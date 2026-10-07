# @zyfai/sdk

## 0.8.0

### Minor Changes

- [#72](https://github.com/ondefy/zyfai-sdk/pull/72) [`e234c44`](https://github.com/ondefy/zyfai-sdk/commit/e234c44202311071d6a086dbbaba90b120e86a01) Thanks [@joepegler](https://github.com/joepegler)! - Add USDT and PYUSD as Ethereum mainnet managed deposit assets (10,000 unit minimum on mainnet, same as USDC/EURC). USDT is no longer aliased under the USDC asset config. `sendDeposit` uses a no-return `transfer` ABI for USDT so mainnet simulation succeeds.

  `convertAssetInternally()` now maps USDT and PYUSD via `ASSET_CONFIGS`, so managed-asset flows (`pauseAgent`, `resumeAgent`, `setStrategyWithProtocols` without `asset`, and strict first-deposit protocol setup) no longer throw when iterating past USDC/WETH/EURC.

## 0.6.0

### Patch Changes

- Pre-validate managed assets and chains in `setStrategyWithProtocols` before any profile writes.

- Split validation in setStrategyWithProtocols

### Minor Changes

- [#70](https://github.com/ondefy/zyfai-sdk/pull/70) [`445067a`](https://github.com/ondefy/zyfai-sdk/commit/445067aa423092794c8c9184a787856cc6587c1c) Thanks [@joepegler](https://github.com/joepegler)! - Add `getManagedAssets()` and `ZyfaiSDK.setStrategyWithProtocols()` for bulk strategy changes with auto-selected protocols.

## 0.5.0

### Minor Changes

- [#67](https://github.com/ondefy/zyfai-sdk/pull/67) [`2d3c22a`](https://github.com/ondefy/zyfai-sdk/commit/2d3c22af135b8d3e87d94d0bbe2654b46aa48042) Thanks [@joepegler](https://github.com/joepegler)! - Add `waitForAgentDepositIntent` and `waitForAgentDepositHandover` so MCP agents can poll signing completion and custody credit during browser deposit handoff.

- [#67](https://github.com/ondefy/zyfai-sdk/pull/67) [`2d3c22a`](https://github.com/ondefy/zyfai-sdk/commit/2d3c22af135b8d3e87d94d0bbe2654b46aa48042) Thanks [@joepegler](https://github.com/joepegler)! - Add agent deposit intent helpers for MCP prepare/enter flows, rename enter-intent APIs to deposit intents, and align consume with deposit proof fields.

## 0.4.1

### Patch Changes

- [#62](https://github.com/ondefy/zyfai-sdk/pull/62) [`7415c5a`](https://github.com/ondefy/zyfai-sdk/commit/7415c5aa06808be9073edf34044a3a4e22b5a790) Thanks [@joepegler](https://github.com/joepegler)! - Align the npm package description and discovery keywords with Zyfai's current self-custodial yield-agent positioning and supported execution chains.

- [#63](https://github.com/ondefy/zyfai-sdk/pull/63) [`8a8d831`](https://github.com/ondefy/zyfai-sdk/commit/8a8d831ddb5ef55bd0c0de28b0658f3ef56bb7d7) Thanks [@joepegler](https://github.com/joepegler)! - Lower L2 minimum portfolio balances to 10 USDC/EURC and $10 of WETH or NVDAc so small deposits pass client-side checks. Mainnet floors stay at 10,000 units and $10,000 of WETH.

## 0.4.0

### Minor Changes

- [#60](https://github.com/ondefy/zyfai-sdk/pull/60) [`63b0cc4`](https://github.com/ondefy/zyfai-sdk/commit/63b0cc425db4afcc6f14890b7d60572ff099bd41) Thanks [@joepegler](https://github.com/joepegler)! - Add agent deposit-setup endpoint support for MCP prepare flows; scope first-deposit profile to prepare asset and chain when `channel` is `agent`.

- [#60](https://github.com/ondefy/zyfai-sdk/pull/60) [`4d179c1`](https://github.com/ondefy/zyfai-sdk/commit/4d179c1b561477e7e544748c71fb8f35fa9159b4) Thanks [@joepegler](https://github.com/joepegler)! - Agent enter-intent consume now requires `txHash` and `depositId` after `log_deposit`, returns intent status, and resolve includes `ownerAddress` for signing-page wallet checks.

- [#60](https://github.com/ondefy/zyfai-sdk/pull/60) [`63b0cc4`](https://github.com/ondefy/zyfai-sdk/commit/63b0cc425db4afcc6f14890b7d60572ff099bd41) Thanks [@joepegler](https://github.com/joepegler)! - Add agent enter-intent status, complete, and signing-ticket resolve helpers for MCP external signing

- [#59](https://github.com/ondefy/zyfai-sdk/pull/59) [`9927e31`](https://github.com/ondefy/zyfai-sdk/commit/9927e31a9857f070e48eaa447d765ed90fad0a51) Thanks [@joepegler](https://github.com/joepegler)! - Add forUser sessions, prepareDeposit, getAssetTypeSettings, and agent deposit-intent APIs for MCP agents

### Patch Changes

- [#61](https://github.com/ondefy/zyfai-sdk/pull/61) [`a7e596e`](https://github.com/ondefy/zyfai-sdk/commit/a7e596e890f3865e2cbfa52dc49edbbc45a7897f) Thanks [@PaulDeFi](https://github.com/PaulDeFi)! - Net onchain earnings now apply the 10% fee to lifetime and unrealized as well as current. Those ledger buckets are gross, so the previous net total included fees already paid.

- [#58](https://github.com/ondefy/zyfai-sdk/pull/58) [`29ded4c`](https://github.com/ondefy/zyfai-sdk/commit/29ded4c56ce037c433ab32ee7415ca5e075a1571) Thanks [@joepegler](https://github.com/joepegler)! - Improved integration test flows for smoke tests

- Add MCP support

## 0.3.0

### Minor Changes

- [#50](https://github.com/ondefy/zyfai-sdk/pull/50) [`f6afa9f`](https://github.com/ondefy/zyfai-sdk/commit/f6afa9fad2e502da1871cf3f45ed0ab8b68be346) Thanks [@joepegler](https://github.com/joepegler)! - Deposit lifecycle helpers

- [#54](https://github.com/ondefy/zyfai-sdk/pull/54) [`80ca377`](https://github.com/ondefy/zyfai-sdk/commit/80ca377859eed9b99e8f2ff10be3a8eeaf53d8e5) Thanks [@PaulDeFi](https://github.com/PaulDeFi)! - Add NVDAc as a Base-only managed asset, with `setAssetStrategy` to switch one asset's strategy and a `withdrawFunds` error when an async redemption is already in flight for the same pool.

## 0.2.57

### Patch Changes

- [#46](https://github.com/ondefy/zyfai-sdk/pull/46) [`a84a61b`](https://github.com/ondefy/zyfai-sdk/commit/a84a61bdd99bbaa169157b417d418fe19dfa0716) Thanks [@joepegler](https://github.com/joepegler)! - Add Changesets for versioning and changelogs (manual npm publish).
