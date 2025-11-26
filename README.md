# ZyFAI TypeScript SDK

Official TypeScript SDK for the ZyFAI Yield Optimization Engine.

## Installation

```bash
npm install @zyfai/sdk
# or
yarn add @zyfai/sdk
# or
pnpm add @zyfai/sdk
```

## Quick Start

```typescript
import { ZyfaiSDK } from "@zyfai/sdk";

// Initialize SDK with API key
const sdk = new ZyfaiSDK({
  apiKey: "YOUR_API_KEY",
  environment: "production", // 'test' | 'staging' | 'production'
});

// Set up wallet
sdk.setPrivateKey("0x...");
// OR
await sdk.connectBrowserWallet();

// Deploy Safe Smart Wallet
const userAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb";
const result = await sdk.deploySafe(userAddress, 8453); // Base chain

console.log("Safe deployed at:", result.safeAddress);
```

## Environment Configuration

- **Test**: Uses Base Sepolia testnet (84532)
- **Staging**: Uses mainnet chains (Base, Arbitrum, Plasma, Sonic)
- **Production**: Full production environment

## API Functions

### 1. Deploy Safe Smart Wallet

```typescript
const result = await sdk.deploySafe(userAddress, chainId);
```

**Parameters:**

- `userAddress` (string): User's EOA address
- `chainId` (number): Target chain ID

**Returns:** `DeploySafeResponse`

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Development mode with watch
npm run dev

# Run linter
npm run lint
```

## License

MIT

## Support

- Documentation: https://docs.zyf.ai
- Discord: [Join Server]
- Email: dev@zyf.ai
