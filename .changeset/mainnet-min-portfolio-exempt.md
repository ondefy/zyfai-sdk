---
"@zyfai/sdk": patch
---

Waive the Ethereum mainnet minimum portfolio balance for one POC wallet (EOA `0x2db791F63C8b12BDe9A3fe31aFA8ad491F47d60F` and Safe `0xAe72CB0F7d604a8FF742D96031104506186638E3`). `prepareDeposit` and `sendDeposit` still enforce the 10,000 unit and $10,000 floors for every other address.
