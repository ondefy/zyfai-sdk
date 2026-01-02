---
sidebar_position: 2
title: Quick Start
---

# Quick Start Guide

Get up and running with Zyfai in less than 5 minutes.

## Prerequisites

Before you begin, ensure you have:

- Node.js version 18.0 or above
- A wallet with some funds (ETH for gas, stablecoins for deposits)
- Basic understanding of DeFi concepts

## Installation

Install the Zyfai SDK in your project:

```bash
npm install @zyfai/sdk viem
# or
yarn add @zyfai/sdk viem
# or
pnpm add @zyfai/sdk viem
```

## Get Your API Key

1. Visit the [Zyfai Dashboard](https://sdk.zyf.ai)
2. Connect your wallet
3. Generate a new API key
4. Save it securely (never commit to version control!)

## Basic Usage

### 1. Initialize the SDK

```typescript
import { ZyfaiSDK } from "@zyfai/sdk";

// Initialize with your API key
const sdk = new ZyfaiSDK({
  apiKey: "your-api-key",
  environment: "production", // or 'staging'
});
```

### 2. Connect Your Account

The SDK automatically authenticates via SIWE (Sign-In with Ethereum):

```typescript
// With private key (for backend/scripts)
await sdk.connectAccount("0xYourPrivateKey", 8453); // Base chain

// With wallet provider (for frontend)
const provider = window.ethereum;
await sdk.connectAccount(provider); // Auto-detects chain
```

### 3. Deploy Your Smart Account

```typescript
const userAddress = "0xYourEOAAddress";

// Check if Safe already exists
const walletInfo = await sdk.getSmartWalletAddress(userAddress, 8453);

if (!walletInfo.isDeployed) {
  // Deploy Safe
  const result = await sdk.deploySafe(userAddress, 8453);
  console.log("Safe deployed at:", result.safeAddress);
} else {
  console.log("Safe already exists:", walletInfo.address);
}
```

### 4. Deposit Funds

```typescript
// Deposit 100 USDC to your Safe on Base
const result = await sdk.depositFunds(
  userAddress,
  8453,
  "100000000" // 100 USDC (6 decimals)
);

console.log("Deposit successful:", result.txHash);
```

### 5. Monitor Your Positions

```typescript
// Get all your DeFi positions
const positions = await sdk.getPositions(userAddress);

positions.positions.forEach((bundle) => {
  console.log(`Chain: ${bundle.chain}, Strategy: ${bundle.strategy}`);
  bundle.positions.forEach((pos) => {
    console.log(`  ${pos.token_symbol}: ${pos.underlyingAmount}`);
  });
});
```

### 6. Track Your Earnings

```typescript
// Get your earnings
const earnings = await sdk.getOnchainEarnings(walletAddress);
console.log("Total Earnings:", earnings.data.totalEarnings);

// Get APY history
const apyHistory = await sdk.getDailyApyHistory(walletAddress, "30D");
console.log("Average APY:", apyHistory.averageWeightedApy);
```

## Complete Example

Here's a complete workflow from start to finish:

```typescript
import { ZyfaiSDK } from "@zyfai/sdk";

async function main() {
  // 1. Initialize SDK
  const sdk = new ZyfaiSDK({
    apiKey: process.env.ZYFAI_API_KEY!,
  });

  // 2. Connect account
  await sdk.connectAccount(process.env.PRIVATE_KEY!, 8453);

  const userAddress = "0xYourAddress";

  // 3. Deploy Safe (if needed)
  const walletInfo = await sdk.getSmartWalletAddress(userAddress, 8453);
  if (!walletInfo.isDeployed) {
    await sdk.deploySafe(userAddress, 8453);
  }

  // 4. Create session key for automated actions
  await sdk.createSessionKey(userAddress, 8453);

  // 5. Deposit funds
  await sdk.depositFunds(
    userAddress,
    8453,
    "100000000" // 100 USDC
  );

  // 6. Monitor performance
  const positions = await sdk.getPositions(userAddress);
  console.log("Active positions:", positions.positions.length);

  const earnings = await sdk.getOnchainEarnings(walletInfo.address);
  console.log("Current earnings:", earnings.data.currentEarnings);
}

main();
```

## Next Steps

Now that you have the basics down, explore:

- **[Smart Accounts](/docs/smart-accounts)** - Deep dive into ERC-7579 smart accounts
- **[Session Keys](/docs/session-keys)** - Enable automated actions
- **[Yield Strategies](/docs/strategies)** - Understand different risk profiles
- **[API Reference](/docs/api)** - Complete SDK documentation

## Common Issues

### "No account connected" Error

Make sure to call `connectAccount()` before other SDK methods. This automatically authenticates via SIWE.

### "Unsupported chain" Error

Verify you're using a supported chain ID:
- Arbitrum: 42161
- Base: 8453
- Plasma: 9745

### SIWE Authentication Fails

Ensure:
1. Your wallet is unlocked
2. You approve the signature request
3. Your frontend origin is CORS-enabled (for browser use)

## Get Help

- Check the [FAQ](/docs/faq)
- Browse [Examples](https://github.com/ondefy/zyfai-sdk/tree/main/examples)
- Join our [Discord](https://discord.gg/zyfai)
- Open an [issue on GitHub](https://github.com/ondefy/zyfai-sdk/issues)
