# @zyfai/sdk

## 0.13.0

### Minor Changes

- [#84](https://github.com/ondefy/zyfai-sdk/pull/84) [`547e53a`](https://github.com/ondefy/zyfai-sdk/commit/547e53a144145bd8db0464e8a325a9d2dc515db7) Thanks [@ihebabidi24](https://github.com/ihebabidi24)! - Add `buildRzfiClaimTransaction`: the rZFI claim as unsigned `{ to, data, value }` for the owner EOA to sign and send.

## 0.12.0

### Minor Changes

- [#83](https://github.com/ondefy/zyfai-sdk/pull/83) [`3d69227`](https://github.com/ondefy/zyfai-sdk/commit/3d6922735ed733fdf148a6fd6c6db33820ea3f47) Thanks [@ihebabidi24](https://github.com/ihebabidi24)! - Add `getBaseMerklCampaigns()`: current APR, TVL and dates for Zyfai's Merkl incentive campaigns on Base.

- [#83](https://github.com/ondefy/zyfai-sdk/pull/83) [`3d69227`](https://github.com/ondefy/zyfai-sdk/commit/3d6922735ed733fdf148a6fd6c6db33820ea3f47) Thanks [@ihebabidi24](https://github.com/ihebabidi24)! - Add `prepareRzfiClaim` / `submitRzfiClaim`: a gas-sponsored rZFI claim where the integrator signs the userOp hash in its own pipeline (the SDK never signs).

## 0.11.2

### Patch Changes

- [#79](https://github.com/ondefy/zyfai-sdk/pull/79) [`9b5fb4d`](https://github.com/ondefy/zyfai-sdk/commit/9b5fb4d29d3a913444de64698869ac9d2fe30fae) Thanks [@joepegler](https://github.com/joepegler)! - Fix agent-channel `setStrategyWithProtocols` so strategy changes on assets that already include the target chain persist via `PATCH /users/me` instead of a silent `agent-deposit-setup` no-op. Treat `applied: false` from deposit-setup as an error.

- [#79](https://github.com/ondefy/zyfai-sdk/pull/79) [`9b5fb4d`](https://github.com/ondefy/zyfai-sdk/commit/9b5fb4d29d3a913444de64698869ac9d2fe30fae) Thanks [@joepegler](https://github.com/joepegler)! - Run `ensureFirstDepositSetup` and `prepareDeposit` profile setup when an asset has chains configured but `protocols` is empty, so deposits can allocate instead of skipping setup.

## 0.11.1

### Patch Changes

- [#81](https://github.com/ondefy/zyfai-sdk/pull/81) [`b4caaac`](https://github.com/ondefy/zyfai-sdk/commit/b4caaaca12446e7c222f4495b48c9d8b3646b359) Thanks [@joepegler](https://github.com/joepegler)! - Accept optional slippageBps on swap deposits. The default stays 200 basis points, with a maximum of 500, and the value is fixed when the funding order is created.

## 0.11.0

### Minor Changes

- [#81](https://github.com/ondefy/zyfai-sdk/pull/81) [`3174262`](https://github.com/ondefy/zyfai-sdk/commit/3174262be97868161fc9251dc490755a9a7e7a3a) Thanks [@joepegler](https://github.com/joepegler)! - Add sendDirectDeposit and sendSwapDeposit. sendDeposit still transfers a collateral the wallet already holds, and swaps any other spend token into that collateral through Relay.

### Patch Changes

- [#81](https://github.com/ondefy/zyfai-sdk/pull/81) [`3174262`](https://github.com/ondefy/zyfai-sdk/commit/3174262be97868161fc9251dc490755a9a7e7a3a) Thanks [@joepegler](https://github.com/joepegler)! - sendSwapDeposit rejects a reused orderId when the caller origin or destination does not match the stored funding order.

- [#81](https://github.com/ondefy/zyfai-sdk/pull/81) [`3174262`](https://github.com/ondefy/zyfai-sdk/commit/3174262be97868161fc9251dc490755a9a7e7a3a) Thanks [@joepegler](https://github.com/joepegler)! - Use the refreshed Relay quote's destination minimum for the portfolio floor when a funding order has no stored minimum.

## 0.10.0

### Minor Changes

- [#74](https://github.com/ondefy/zyfai-sdk/pull/74) [`d4891e1`](https://github.com/ondefy/zyfai-sdk/commit/d4891e1c89b8fe03622ffda3e8366f35ce958e4c) Thanks [@joepegler](https://github.com/joepegler)! - Add deposit position and withdraw lifecycle polling helpers (`waitForDepositPosition`, `getWithdrawStatus`, `waitForWithdrawSettlement`, `waitForWithdrawComplete`) with chain-specific intervals. Treat `async_claiming` as a terminal short-poll state so resume/retry does not spuriously time out.

- [#75](https://github.com/ondefy/zyfai-sdk/pull/75) [`0dadf89`](https://github.com/ondefy/zyfai-sdk/commit/0dadf8912031193224a8eccf4360ad33fbdf099a) Thanks [@PaulDeFi](https://github.com/PaulDeFi)! - Waive the Ethereum mainnet minimum portfolio balance for one POC wallet (EOA `0x2db791F63C8b12BDe9A3fe31aFA8ad491F47d60F` and Safe `0xAe72CB0F7d604a8FF742D96031104506186638E3`). `prepareDeposit` and `sendDeposit` still enforce the 10,000 unit and $10,000 floors for every other address.

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
