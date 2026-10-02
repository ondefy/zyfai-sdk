# @zyfai/sdk

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
