---
"@zyfai/sdk": patch
---

Run `ensureFirstDepositSetup` and `prepareDeposit` profile setup when an asset has chains configured but `protocols` is empty, so deposits can allocate instead of skipping setup.