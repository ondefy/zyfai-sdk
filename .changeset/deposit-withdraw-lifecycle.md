---
"@zyfai/sdk": minor
---

Add deposit position and withdraw lifecycle polling helpers (`waitForDepositPosition`, `getWithdrawStatus`, `waitForWithdrawSettlement`, `waitForWithdrawComplete`) with chain-specific intervals. Treat `async_claiming` as a terminal short-poll state so resume/retry does not spuriously time out.
