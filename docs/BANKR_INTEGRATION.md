# Bankr Integration with Zyfai SDK

## Status

**We have already built an EIP-1193 provider wrapper** for Bankr's Agent API, included in the Zyfai SDK at `src/providers/bankr.ts`.

**Current blocker**: Bankr's `/agent/sign` endpoint only supports text messages, not raw hash signing required for ERC-4337.

## What Works

- SIWE authentication (text messages)
- EIP-712 typed data signing
- Regular transactions
- Reading wallet address, positions, user details

## What's Blocked

Safe deployment fails with `AA24 signature error` because ERC-4337 requires signing raw 32-byte hashes:

```
Hash:     0x7660040c0b9c4d129db0800c60e40a80f7c1a583fbe860135c661f706a374ac6
Expected: sign(keccak256("\x19Ethereum Signed Message:\n32" + rawBytes))
Bankr:    sign(keccak256("\x19Ethereum Signed Message:\n66" + "0x7660..."))
```

Bankr signs the hex string as text (66 chars) instead of raw bytes (32 bytes), producing invalid signatures for ERC-4337.

## Request for Bankr

Add raw hash signing support (either option):

```typescript
// Option 1: Add flag to existing endpoint
POST /agent/sign
{ "signatureType": "personal_sign", "message": "0x7660...", "isRawHash": true }

// Option 2: Add new endpoint for raw signing
POST /agent/sign
{ "signatureType": "eth_sign", "digest": "0x7660..." }
```

Once added, Bankr agents can:
- Deploy Safe smart accounts (ERC-4337)
- Create session keys for autonomous yield optimization
- Full integration with Zyfai yield engine

## Usage (Once Raw Hash Signing is Supported)

```typescript
import { ZyfaiSDK, createBankrProvider } from '@zyfai/sdk';

const provider = createBankrProvider({ apiKey: BANKR_API_KEY });
const sdk = new ZyfaiSDK({ apiKey: ZYFAI_API_KEY });

const address = await sdk.connectAccount(provider, 8453);
await sdk.deploySafe(address, 8453, 'conservative', true);
await sdk.depositFunds(address, 8453, '1000000', 'USDC');
```

## Links

- [Zyfai SDK](https://github.com/zyfai/sdk)
- [Bankr Agent API](https://docs.bankr.bot/agent-api/sign-endpoint)
