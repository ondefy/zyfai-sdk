---
"@zyfai/sdk": patch
---

Fall back to ERC-20 transfer on any 404 from the first-permit-deposit availability endpoint, not only when the error message matches a legacy Express shape.
