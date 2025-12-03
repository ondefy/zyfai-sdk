# ZyFAI SDK

[![npm version](https://img.shields.io/npm/v/@zyfai/sdk.svg)](https://www.npmjs.com/package/@zyfai/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

TypeScript SDK for interacting with the ZyFAI Yield Optimization Engine. This SDK provides easy-to-use methods for deploying Safe smart wallets, managing DeFi positions, and optimizing yield across multiple protocols.

## Features

- **Safe Smart Wallet Deployment**: Deploy Safe wallets with deterministic addresses
- **Flexible Authentication**: Support for private keys and modern wallet providers
- **Multi-Chain Support**: Works on Arbitrum, Base, and Plasma
- **Yield Optimization**: Access to multiple DeFi protocols and strategies
- **Position Tracking**: Monitor and manage your DeFi positions across chains

## Installation

```bash
npm install @zyfai/sdk viem
# or
yarn add @zyfai/sdk viem
# or
pnpm add @zyfai/sdk viem
```

## Prerequisites

1. **Execution API Key**: API key for the Execution API (Safe deployment, transactions, session keys)
2. **Data API Key** (optional): API key for the Data API (earnings, opportunities, analytics). If not provided, uses the Execution API key.
3. **Bundler API Key**: Required for Safe deployment. Get it from:
   - [Pimlico](https://www.pimlico.io/) (Recommended)

**Get your API keys from [ZyFAI Dashboard](https://app.zyf.ai)**

## Quick Start

### Initialize the SDK

```typescript
import { ZyfaiSDK } from "@zyfai/sdk";

const sdk = new ZyfaiSDK({
  apiKey: "your-execution-api-key", // Execution API (transactions, Safe deployment)
  dataApiKey: "your-data-api-key", // Data API (analytics, earnings, opportunities)
  bundlerApiKey: "your-bundler-api-key", // Required for Safe deployment
  environment: "production", // or 'staging' (default: 'production')
});
```

**Configuration Options:**

| Option          | Required | Description                                                                                     |
| --------------- | -------- | ----------------------------------------------------------------------------------------------- |
| `apiKey`        | Yes      | API key for Execution API (Safe deployment, transactions, session keys)                         |
| `dataApiKey`    | No       | API key for Data API (earnings, opportunities, analytics). Defaults to `apiKey` if not provided |
| `bundlerApiKey` | No\*     | Pimlico API key for Safe deployment (\*required for `deploySafe`)                               |
| `environment`   | No       | `"production"` or `"staging"` (default: `"production"`)                                         |

**API Endpoints by Environment:**

| Environment  | Execution API                | Data API                         |
| ------------ | ---------------------------- | -------------------------------- |
| `production` | `https://api.zyf.ai`         | `https://defiapi.zyf.ai`         |
| `staging`    | `https://staging-api.zyf.ai` | `https://staging-defiapi.zyf.ai` |

### Connect Account

The SDK accepts either a private key or a modern wallet provider:

```typescript
// Option 1: With private key (chainId required)
await sdk.connectAccount("0x...", 42161);

// Option 2: With wallet provider (chainId optional - uses provider's chain)
const provider = await connector.getProvider();
await sdk.connectAccount(provider); // SDK detects chain from provider

// Option 3: With EIP-1193 provider
const provider = window.ethereum; // Client passes this from their frontend
await sdk.connectAccount(provider); // Automatically uses provider's current chain

// Now call methods with explicit user addresses
const userAddress = "0xUser...";
await sdk.deploySafe(userAddress, 42161);
```

**Note:** When using a wallet provider, the SDK automatically detects the chain from the provider. You can optionally specify `chainId` to override.

## Core Features

### 1. Deploy Safe Smart Wallet

Deploy a Safe smart wallet:

```typescript
const userAddress = "0xUser..."; // User's EOA address

// Get the deterministic Safe address (before deployment)
const walletInfo = await sdk.getSmartWalletAddress(userAddress, 42161);
console.log("Safe Address:", walletInfo.address);
console.log("Is Deployed:", walletInfo.isDeployed);

// Deploy the Safe
const result = await sdk.deploySafe(userAddress, 42161);

if (result.success) {
  console.log("Safe Address:", result.safeAddress);
  console.log("Status:", result.status); // 'deployed' | 'failed'
  console.log("Transaction Hash:", result.txHash);
}
```

### 2. Multi-Chain Support

The SDK supports the following chains:

| Chain    | Chain ID | Status |
| -------- | -------- | ------ |
| Arbitrum | 42161    | ✅     |
| Base     | 8453     | ✅     |
| Plasma   | 9745     | ✅     |

Example with different chains:

```typescript
import { getSupportedChainIds, isSupportedChain } from "@zyfai/sdk";

// Get all supported chains
const chains = getSupportedChainIds();
console.log("Supported chains:", chains);

// Check if a chain is supported
if (isSupportedChain(42161)) {
  const userAddress = "0xUser...";
  const result = await sdk.deploySafe(userAddress, 42161); // Arbitrum
}
```

## API Reference

### `ZyfaiSDK`

#### Constructor

```typescript
new ZyfaiSDK(config: SDKConfig | string)
```

**Parameters:**

- `config`: Configuration object or API key string
  - `apiKey` (string): Your ZyFAI API key
  - `environment` ('production' | 'staging', optional): API environment (default: 'production')
  - `bundlerApiKey` (string, optional): Bundler API key for Safe deployment (required for deploySafe)

#### Methods

##### `connectAccount(account: string | any, chainId?: SupportedChainId): Promise<Address>`

Connect account for signing transactions. Accepts either a private key string or a modern wallet provider.

**Parameters:**

- `account`: Private key string or wallet provider object (EIP-1193 provider, viem WalletClient, etc.)
- `chainId`: Target chain ID
  - **Required** for private key
  - **Optional** for wallet providers (auto-detects from provider)
  - Default: 42161 (Arbitrum)

**Returns:** Connected wallet address

**Examples:**

```typescript
// With private key (chainId required)
await sdk.connectAccount("0x...", 42161);

// With wallet provider (chainId optional)
const provider = await connector.getProvider();
await sdk.connectAccount(provider); // Uses provider's current chain
```

##### `getSmartWalletAddress(userAddress: string, chainId: SupportedChainId): Promise<SmartWalletResponse>`

Get the Smart Wallet (Safe) address for a user.

**Parameters:**

- `userAddress`: User's EOA address
- `chainId`: Target chain ID

**Returns:**

```typescript
{
  address: Address; // Safe address
  isDeployed: boolean; // Whether the Safe is deployed
}
```

##### `deploySafe(userAddress: string, chainId: SupportedChainId): Promise<DeploySafeResponse>`

Deploy a Safe smart wallet for a user.

**Parameters:**

- `userAddress`: User's EOA address
- `chainId`: Target chain ID

**Returns:**

```typescript
{
  success: boolean;
  safeAddress: Address;
  txHash: string;
  status: "deployed" | "failed";
}
```

### 3. Session Keys

Session keys enable delegated transaction execution without exposing the main private key.

#### Simple Usage (Recommended)

The SDK automatically fetches optimal session configuration from ZyFAI API:

```typescript
// SDK automatically:
// 1. Authenticates via SIWE (creates user record if needed)
// 2. Calculates the deterministic Safe address
// 3. Resolves the userId via /users/by-smart-wallet
// 4. Retrieves personalized config via /session-keys/config
// 5. Signs the session key
// 6. Calls /session-keys/add so the session becomes active immediately

const result = await sdk.createSessionKey(userAddress, 42161);

console.log("Session created:", result.signature);
console.log("Safe address:", result.sessionKeyAddress);
console.log("User ID:", result.userId);
console.log("Activation ID:", result.sessionActivation?.id);
```

**Important**:

- `createSessionKey` requires SIWE authentication (prompts wallet signature on first call)
- The user record must have `smartWallet` and `chainId` set (automatically handled after calling `deploySafe` or `updateUserProfile`)
- The SDK now auto-calls `/users/by-smart-wallet`, `/session-keys/config`, and `/session-keys/add`, so the returned payload already includes the `userId` and the activation record (`sessionActivation`)—no additional API calls are required on your side.

### 4. Deposit Funds

Transfer tokens to your Safe smart wallet:

```typescript
// Deposit 100 USDC (6 decimals) to Safe on Arbitrum
const result = await sdk.depositFunds(
  userAddress,
  42161, // Chain ID
  "0xaf88d065e77c8cc2239327c5edb3a432268e5831", // USDC on Arbitrum
  "100000000" // Amount: 100 USDC = 100 * 10^6
);

if (result.success) {
  console.log("Deposit successful!");
  console.log("Transaction Hash:", result.txHash);
}
```

**Note:** Amount must be in least decimal units. For USDC (6 decimals): 1 USDC = 1000000
The SDK automatically authenticates via SIWE before logging the deposit with ZyFAI's API, so no extra steps are required on your end once the transfer confirms.

### 5. Withdraw Funds

Withdraw funds from your Safe:

```typescript
// Full withdrawal
const result = await sdk.withdrawFunds(userAddress, 42161);

// Partial withdrawal of 50 USDC (6 decimals)
const result = await sdk.withdrawFunds(
  userAddress,
  42161,
  "50000000", // Amount: 50 USDC = 50 * 10^6
  "0xReceiverAddress" // Optional: receiver address
);

if (result.success) {
  console.log("Withdrawal successful!");
  console.log("Transaction Hash:", result.txHash);
}
```

**Note:** Amount must be in least decimal units. For USDC (6 decimals): 1 USDC = 1000000
The SDK authenticates via SIWE before calling the withdrawal endpoints (`/users/withdraw` or `/users/partial-withdraw`) so you don't need to manage tokens manually.

### 6. Get Available Protocols

Retrieve all available DeFi protocols and pools for a specific chain:

```typescript
const protocols = await sdk.getAvailableProtocols(42161);

console.log(`Found ${protocols.protocols.length} protocols`);
protocols.protocols.forEach((protocol) => {
  console.log(`${protocol.name} (${protocol.type})`);
  console.log(`Chains: ${protocol.chains.join(", ")}`);
  console.log(`Strategies: ${protocol.strategies?.join(", ") ?? "n/a"}`);
  console.log(`Website: ${protocol.website ?? "n/a"}`);
  console.log(`Pools: ${protocol.pools?.length ?? 0}`);
});
```

**Note**: This endpoint fetches protocols from `/api/v1/protocols?chainId={chainId}` and returns additional metadata such as `type`, `strategies`, `chains`, `website`, and an optional `imageUrl`.

### 7. Monitor Positions

Track all active DeFi positions for a user:

```typescript
const positions = await sdk.getPositions(userAddress);
positions.positions.forEach((bundle) => {
  console.log(`Chain: ${bundle.chain}, Strategy: ${bundle.strategy}`);
  bundle.positions.forEach((slot) => {
    console.log(`Token: ${slot.token_symbol}, Pool: ${slot.pool}`);
    console.log(`Underlying Amount: ${slot.underlyingAmount}`);
  });
});
```

**Note**: This endpoint uses `/api/v1/data/position?walletAddress={address}` (Smart wallet address) and returns bundles with nested slot data. Use each slot's `underlyingAmount` for the canonical token balance.

### 8. Analytics & Data Endpoints

The SDK provides access to various analytics and data endpoints:

#### Get User Details

```typescript
const user = await sdk.getUserDetails();
console.log("Smart Wallet:", user.user.smartWallet);
console.log("Active Chains:", user.user.chains);
```

#### Get TVL & Volume

```typescript
const tvl = await sdk.getTVL();
console.log("Total TVL:", tvl.totalTvl);

const volume = await sdk.getVolume();
console.log("Total Volume:", volume.volumeInUSD);
```

#### Get Active Wallets

```typescript
const wallets = await sdk.getActiveWallets(8453); // Base chain
console.log("Active wallet count:", wallets.count);
```

#### Get Smart Wallets by EOA

```typescript
const result = await sdk.getSmartWalletsByEOA("0xYourEOA...");
console.log("Smart wallets:", result.smartWallets);
```

#### Get Transaction History

```typescript
const history = await sdk.getHistory(walletAddress, 8453, {
  limit: 50,
  fromDate: "2024-01-01",
});
history.data.forEach((tx) => console.log(tx.type, tx.amount));
```

### 9. Earnings & Performance

#### Get Onchain Earnings

```typescript
const earnings = await sdk.getOnchainEarnings(walletAddress);
console.log("Total Earnings:", earnings.data.totalEarnings);
console.log("Current Earnings:", earnings.data.currentEarnings);
console.log("Lifetime Earnings:", earnings.data.lifetimeEarnings);
```

#### Calculate Onchain Earnings (Refresh)

```typescript
const updated = await sdk.calculateOnchainEarnings(walletAddress);
console.log("Updated earnings:", updated.data.totalEarnings);
```

#### Get Daily Earnings

```typescript
const daily = await sdk.getDailyEarnings(
  walletAddress,
  "2024-01-01",
  "2024-01-31"
);
daily.data.forEach((d) => console.log(d.date, d.earnings));
```

#### Get Daily APY History

```typescript
const apyHistory = await sdk.getDailyApyHistory(walletAddress, "30D");
console.log("Average Weighted APY:", apyHistory.averageWeightedApy);
```

### 10. Opportunities & Strategies

#### Get Safe Opportunities (Low Risk)

```typescript
const safeOpps = await sdk.getSafeOpportunities(8453);
safeOpps.data.forEach((o) => {
  console.log(`${o.protocolName} - ${o.poolName}: ${o.apy}% APY`);
});
```

#### Get Degen Strategies (High Risk)

```typescript
const degenStrats = await sdk.getDegenStrategies(8453);
degenStrats.data.forEach((s) => {
  console.log(`${s.protocolName} - ${s.poolName}: ${s.apy}% APY`);
});
```

### 11. Rebalancing

#### Get Rebalance Info

```typescript
// Get same-chain rebalances
const rebalances = await sdk.getRebalanceInfo(false);
console.log("Rebalance events:", rebalances.count);

// Get cross-chain rebalances
const crossChain = await sdk.getRebalanceInfo(true);
```

#### Get Rebalance Frequency

```typescript
const frequency = await sdk.getRebalanceFrequency(walletAddress);
console.log("Tier:", frequency.tier);
console.log("Max rebalances/day:", frequency.frequency);
```

### 12. Portfolio (Premium)

#### Get Debank Portfolio (Multi-chain)

```typescript
const portfolio = await sdk.getDebankPortfolio(walletAddress);
console.log("Total Value:", portfolio.totalValueUsd);
Object.entries(portfolio.chains).forEach(([chain, data]) => {
  console.log(`${chain}: $${data.totalValueUsd}`);
});
```

**Note**: The Debank portfolio endpoint is a premium feature and may require additional authorization.

## Examples

All examples are available in the `examples/` directory:

### Core Features

1. **`end-to-end.ts`** - Complete workflow demonstrating all SDK features
2. **`basic-usage.ts`** - Simple Safe deployment workflow
3. **`create-session-key.ts`** - Session key creation + registration
4. **`deposit.ts`** - Deposit funds to Safe
5. **`withdraw.ts`** - Withdraw funds from Safe
6. **`deposit-withdraw.ts`** - Combined fund management examples

### Data Retrieval

7. **`get-protocols.ts`** - Fetch available protocols for a chain
8. **`get-positions.ts`** - Get active positions for a wallet
9. **`get-user-details.ts`** - Get authenticated user details
10. **`get-tvl-volume.ts`** - Get TVL and trading volume
11. **`get-active-wallets.ts`** - Get active wallets by chain
12. **`get-smart-wallets-by-eoa.ts`** - Get smart wallets by EOA
13. **`get-first-topup.ts`** - Get first deposit information
14. **`get-history.ts`** - Get transaction history

### Analytics & Earnings

15. **`get-onchain-earnings.ts`** - Get/calculate onchain earnings
16. **`get-daily-earnings.ts`** - Get daily earnings breakdown
17. **`get-apy-history.ts`** - Get daily APY history with weighted averages

### Opportunities & Rebalancing

18. **`get-opportunities.ts`** - Get safe and degen yield opportunities
19. **`get-rebalance-info.ts`** - Get rebalance events and frequency tier

### Premium Features

20. **`get-debank-portfolio.ts`** - Get Debank multi-chain portfolio

### Quick Start: Run the End-to-End Example

```bash
# 1. Set up environment variables
cp .env.example .env
# Edit .env with your API keys

# 2. Build the SDK
pnpm install
pnpm build

# 3. Run the complete workflow
pnpm tsx examples/end-to-end.ts
```

## Complete Examples

### Example 1: Deploy Safe on Arbitrum

```typescript
import { ZyfaiSDK } from "@zyfai/sdk";

async function main() {
  const sdk = new ZyfaiSDK({
    apiKey: process.env.ZYFAI_API_KEY!,
    bundlerApiKey: process.env.BUNDLER_API_KEY!,
  });

  // Connect account (for signing)
  await sdk.connectAccount(process.env.PRIVATE_KEY!, 42161);

  const userAddress = "0xUser..."; // User's EOA address

  // Check if Safe already exists
  const walletInfo = await sdk.getSmartWalletAddress(userAddress, 42161);

  if (walletInfo.isDeployed) {
    console.log("Safe already deployed at:", walletInfo.address);
    return;
  }

  // Deploy Safe
  const result = await sdk.deploySafe(userAddress, 42161);

  if (result.success) {
    console.log("✅ Successfully deployed Safe");
    console.log("Address:", result.safeAddress);
    console.log("Tx Hash:", result.txHash);
  }
}

main();
```

### Example 2: Browser Integration with React

```typescript
import { ZyfaiSDK } from "@zyfai/sdk";
import { useState } from "react";

function SafeDeployment() {
  const [sdk] = useState(
    () =>
      new ZyfaiSDK({
        apiKey: process.env.ZYFAI_API_KEY!,
        bundlerApiKey: process.env.BUNDLER_API_KEY!,
      })
  );

  const [userAddress, setUserAddress] = useState<string>("");
  const [safeAddress, setSafeAddress] = useState<string>("");
  const [isDeploying, setIsDeploying] = useState(false);

  const handleConnect = async (walletProvider: any) => {
    try {
      // Client passes the wallet provider from their frontend
      // e.g., from wagmi: const provider = await connector.getProvider();
      const address = await sdk.connectAccount(walletProvider); // chainId auto-detected
      setUserAddress(address);
      console.log("Connected:", address);

      // Get Safe address for this user
      const walletInfo = await sdk.getSmartWalletAddress(address, 42161);
      setSafeAddress(walletInfo.address);
    } catch (error) {
      console.error("Connection failed:", error);
    }
  };

  const handleDeploy = async () => {
    if (!userAddress) return;

    setIsDeploying(true);
    try {
      const result = await sdk.deploySafe(userAddress, 42161);
      if (result.success) {
        alert(`Safe deployed at ${result.safeAddress}`);
      }
    } catch (error) {
      console.error("Deployment failed:", error);
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div>
      <button
        onClick={async () => {
          // Client gets provider from their wallet connection library
          const provider = window.ethereum; // or from wagmi, web3-react, etc.
          await handleConnect(provider);
        }}
      >
        Connect Wallet
      </button>
      {userAddress && (
        <>
          <p>Connected: {userAddress}</p>
          <p>Your Safe: {safeAddress}</p>
          <button onClick={handleDeploy} disabled={isDeploying}>
            {isDeploying ? "Deploying..." : "Deploy Safe"}
          </button>
        </>
      )}
    </div>
  );
}
```

**Important Note:** The SDK doesn't connect to wallets directly. The client integrating the SDK should handle wallet connection on their frontend and pass the provider to `connectAccount()`.

## Architecture

The SDK is built on top of:

- **Viem**: Low-level Ethereum interactions
- **Axios**: HTTP client for API communication

### How Safe Deployment Works

1. **Deterministic Address Generation**: Safe addresses are generated deterministically using CREATE2
2. **Explicit Parameters**: All methods take explicit user addresses - the connected account is only used for signing
3. **Multi-User Support**: One SDK instance can manage multiple users
4. **Backend-Friendly**: Perfect for services managing Safe wallets for multiple users

## Error Handling

```typescript
try {
  const userAddress = "0xUser...";
  const result = await sdk.deploySafe(userAddress, 42161);
  if (!result.success) {
    console.error("Deployment failed:", result.status);
  }
} catch (error) {
  if (error instanceof Error) {
    console.error("Error:", error.message);
  }
}
```

## Best Practices

1. **Store API Keys Securely**: Never commit API keys to version control
2. **Use Environment Variables**: Store keys in `.env` files
3. **Check Deployment Status**: Always check if Safe is already deployed before deploying
4. **Handle Errors Gracefully**: Implement proper error handling for all SDK methods
5. **Validate Chain IDs**: Ensure you're using supported chains (Arbitrum, Base, Plasma)
6. **Use Explicit Parameters**: Always pass explicit `userAddress` and `chainId` to methods

## Environment Variables

For running the examples, set up the following environment variables:

```bash
# Required: Execution API key (Safe deployment, transactions, session keys)
ZYFAI_API_KEY=your-execution-api-key

# Optional: Data API key (earnings, opportunities, analytics)
# Falls back to ZYFAI_API_KEY if not provided
ZYFAI_DATA_API_KEY=your-data-api-key

# Required for Safe deployment: Bundler API key (e.g., Pimlico)
BUNDLER_API_KEY=your-pimlico-api-key

# Required for examples: Private key for signing transactions
# WARNING: Never commit your private key to version control!
PRIVATE_KEY=0x...

# Optional: Chain ID (default: 8453 for Base)
# Supported: 42161 (Arbitrum), 8453 (Base), 9745 (Plasma)
CHAIN_ID=8453
```

## Troubleshooting

### "No account connected" Error

Make sure to call `connectAccount()` before calling other methods that require signing.

### "Unsupported chain" Error

Check that the chain ID is in the supported chains list: Arbitrum (42161), Base (8453), or Plasma (9745).

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

MIT
