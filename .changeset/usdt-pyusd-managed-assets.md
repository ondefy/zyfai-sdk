---
"@zyfai/sdk": minor
---

Add USDT and PYUSD as Ethereum mainnet managed deposit assets (10,000 unit minimum on mainnet, same as USDC/EURC). USDT is no longer aliased under the USDC asset config. `sendDeposit` uses a no-return `transfer` ABI for USDT so mainnet simulation succeeds.

`convertAssetInternally()` now maps USDT and PYUSD via `ASSET_CONFIGS`, so managed-asset flows (`pauseAgent`, `resumeAgent`, `setStrategyWithProtocols` without `asset`, and strict first-deposit protocol setup) no longer throw when iterating past USDC/WETH/EURC.
