---
"@zyfai/sdk": patch
---

Fix agent-channel `setStrategyWithProtocols` so strategy changes on assets that already include the target chain persist via `PATCH /users/me` instead of a silent `agent-deposit-setup` no-op. Treat `applied: false` from deposit-setup as an error.
