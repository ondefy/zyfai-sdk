# ZyFAI SDK

TypeScript SDK for interacting with the ZyFAI Yield Optimization Engine. This SDK provides easy-to-use methods for deploying Safe smart wallets, managing DeFi positions, and optimizing yield across multiple protocols.

## Features

- 🔐 **Safe Smart Wallet Deployment**: Deploy Safe wallets with deterministic addresses
- 🔑 **Flexible Authentication**: Support for private keys and modern wallet providers
- ⛓️ **Multi-Chain Support**: Works on Arbitrum, Base, and Plasma
- 💰 **Yield Optimization**: Access to multiple DeFi protocols and strategies
- 📊 **Position Tracking**: Monitor and manage your DeFi positions across chains

## Installation

```bash
npm install @zyfai/sdk viem
# or
yarn add @zyfai/sdk viem
# or
pnpm add @zyfai/sdk viem
```

## Prerequisites

1. **ZyFAI API Key**: Get your API key from [ZyFAI Dashboard](https://app.zyf.ai)
2. **Bundler API Key**: Required for Safe deployment. Get it from:
   - [Pimlico](https://www.pimlico.io/) (Recommended)

## Quick Start

### Initialize the SDK

```typescript
import { ZyfaiSDK } from "@zyfai/sdk";

const sdk = new ZyfaiSDK({
  apiKey: "your-zyfai-api-key",
  bundlerApiKey: "your-bundler-api-key", // Required for Safe deployment
  environment: "production", // or 'staging'
});
```

**Note**: The SDK uses Pimlico as the default bundler provider. To use a custom bundler, you can extend the SDK configuration.

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
  - `environment` ('production' | 'staging', optional): API environment
  - `baseURL` (string, optional): Custom API base URL

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
// No manual configuration needed!
const result = await sdk.createSessionKey(userAddress, 42161);

console.log("Session created:", result.signature);
console.log("Safe address:", result.sessionKeyAddress);
```

#### Advanced Usage (Custom Configuration)

For custom permissions, use `createSessionKeyWithConfig`:

```typescript
import { type Session } from "@zyfai/sdk";

const sessions: Session[] = [
  {
    sessionValidator: "0x...",
    sessionValidatorInitData: "0x",
    salt: "0x00...01",
    userOpPolicies: [],
    erc7739Policies: { allowedERC7739Content: [], erc1271Policies: [] },
    actions: [
      {
        actionTarget: "0xUSDC",
        actionTargetSelector: "0xa9059cbb",
        actionPolicies: [],
      },
    ],
    permitERC4337Paymaster: true,
    chainId: BigInt(42161),
  },
];

const result = await sdk.createSessionKeyWithConfig(
  userAddress,
  42161,
  sessions
);
```

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

### 6. Get Available Protocols

```typescript
const protocols = await sdk.getAvailableProtocols(42161);

protocols.forEach((protocol) => {
  console.log(`${protocol.name}: ${protocol.apy}% APY`);
});
```

### 7. Monitor Positions

```typescript
const positions = await sdk.getPositions(userAddress);

positions.forEach((position) => {
  console.log(`${position.protocol}: $${position.value}`);
});
```

### 8. Track Earnings

```typescript
const earnings = await sdk.getEarnings(userAddress);

console.log(`Total Earnings: $${earnings.total}`);
console.log(`24h Earnings: $${earnings.daily}`);
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

## Troubleshooting

### "No account connected" Error

Make sure to call `connectAccount()` before calling other methods that require signing.

### "Unsupported chain" Error

Check that the chain ID is in the supported chains list: Arbitrum (42161), Base (8453), or Plasma (9745).

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

MIT
