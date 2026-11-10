---
"@zyfai/sdk": minor
---

Add WBTC as a managed deposit asset on Ethereum Mainnet and Arbitrum (8 decimals). Like WETH, its minimum portfolio balance is quoted in USD ($10,000 on Mainnet, $10 on Arbitrum) and converted from the live Data API `wbtc` price at deposit time. WBTC joins the first-deposit protocol setup, `pauseAgent`/`resumeAgent`, and `setStrategyWithProtocols` through `getManagedAssets()`. cbBTC on Base is a separate asset and is not aliased to WBTC.

`getVolume` now accepts `"usdt"`, and `getHistory`'s `assetType` filter accepts every supported asset (`usdt`, `pyusd`, `nvdac`, `wbtc` in addition to `usdc`, `eth`, `eurc`). New exported types: `VolumeAssetType`, `HistoryAssetType`.
