# Zyfai SDK

[![npm version](https://img.shields.io/npm/v/@zyfai/sdk.svg)](https://www.npmjs.com/package/@zyfai/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

TypeScript SDK for interacting with the Zyfai Yield Optimization Engine. This SDK provides easy-to-use methods for deploying Safe smart wallets, managing DeFi positions, and optimizing yield across multiple protocols.

You can generate an api key from here: https://sdk.zyf.ai/

## Features

- **Safe Smart Wallet Deployment**: Deploy Safe wallets with deterministic addresses
- **Flexible Authentication**: Support for private keys and modern wallet providers
- **Multi-Chain Support**: Works on Ethereum Mainnet, Base, and Arbitrum
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

1. **API Key**: Single API key for both Execution API (Safe deployment, transactions, session keys) and Data API (earnings, opportunities, analytics)

**Get your API key from [Zyfai Dashboard](https://sdk.zyf.ai)**

## Quick Start

### Initialize the SDK

The SDK can be initialized with either a configuration object or just the API key string:

```typescript
import { ZyfaiSDK } from "@zyfai/sdk";

// Option 1: Full configuration object
const sdk = new ZyfaiSDK({
  apiKey: "your-api-key",
});

// Option 2: Simple string initialization (API key only)
const sdk = new ZyfaiSDK("your-api-key");
```

**Configuration Options:**

| Option   | Required | Description                                                                                          |
| -------- | -------- | ---------------------------------------------------------------------------------------------------- |
| `apiKey` | Yes      | API key for both Execution API and Data API (Safe deployment, transactions, session keys, analytics) |

### Connect Account

The SDK accepts either a private key or a modern wallet provider. **The SDK automatically authenticates the user via SIWE (Sign-In with Ethereum) when connecting.**

```typescript
// Option 1: With private key (chainId required)
await sdk.connectAccount("0x...", 8453);

// Option 2: With wallet provider (chainId optional - uses provider's chain)
const provider = await connector.getProvider();
await sdk.connectAccount(provider); // SDK detects chain from provider

// Option 3: With EIP-1193 provider
const provider = window.ethereum; // Client passes this from their frontend
await sdk.connectAccount(provider); // Automatically uses provider's current chain

// Now call methods with explicit user addresses
const userAddress = "0xUser...";
await sdk.deploySafe(userAddress, 8453);
```

**Note:**

- When using a wallet provider, the SDK automatically detects the chain from the provider. You can optionally specify `chainId` to override.
- The SDK automatically performs SIWE authentication when connecting, so you don't need to call any additional authentication methods.

### Disconnect Account

Disconnect the current account and clear all authentication state:

```typescript
// Disconnect account and clear JWT token
await sdk.disconnectAccount();
console.log("Account disconnected and authentication cleared");
```

This method:

- Clears the wallet connection
- Resets authentication state
- Clears the JWT token
- Resets session key tracking

## Core Features

> **Predeployed (pool) wallets.** Wallets provisioned by ZyFi's predeployment
> service are already deployed, already have the agent session enabled, and are
> backend-owned until the user's first deposit rotates ownership to them. The SDK
> detects these automatically from the sign-in response (`predeployed: true`) and
> adjusts, with no extra flags from the integrator:
>
> - `deploySafe()` returns the assigned wallet without sending a deploy tx.
> - `createSessionKey()` returns `{ alreadyActive: true }` without prompting a
>   signature — the pool enabled the session at deploy time.
> - The address is always the backend-assigned one; it is **never** derived with
>   `getDeterministicSafeAddress`.
>
> Net effect: onboarding a predeployed wallet takes a **single signature — the
> USDC deposit** (no wallet-deploy or session-key signatures).
>
> The pool's ERC-7579 module addresses are exported as reference constants
> (`POOL_MODULE_ADDRESSES`, `INTENT_SMART_SESSIONS`, `PROXY_EXECUTOR`, …) for
> parity/validation only — the SDK does not install them.

### 1. Deploy Safe Smart Wallet

Deploy a Safe smart wallet:

```typescript
const userAddress = "0xUser..."; // User's EOA address

// Get the deterministic Safe address (before deployment)
const walletInfo = await sdk.getSmartWalletAddress(userAddress, 8453);
console.log("Safe Address:", walletInfo.address);
console.log("Is Deployed:", walletInfo.isDeployed);

// Deploy the Safe with default conservative strategy (automatically checks if already deployed)
const result = await sdk.deploySafe(userAddress, 8453);

// Or deploy with aggressive strategy
const aggressiveResult = await sdk.deploySafe(userAddress, 8453, "aggressive");

if (result.success) {
  console.log("Safe Address:", result.safeAddress);
  console.log("Status:", result.status); // 'deployed' | 'failed'
  console.log("Transaction Hash:", result.txHash);
}
```

**Note:** The SDK proactively checks if the Safe is already deployed before attempting deployment. If it exists, it returns early without making any transactions.

**Strategy Options:**

- `"conservative"` (default): Low-risk, stable yield strategy
- `"aggressive"`: High-risk, high-reward strategy

### 2. Multi-Chain Support

The SDK supports the following chains:

| Chain            | Chain ID | Status |
| ---------------- | -------- | ------ |
| Ethereum Mainnet | 1        | ✅     |
| Base             | 8453     | ✅     |
| Arbitrum         | 42161    | ✅     |

Example with different chains:

```typescript
import { getSupportedChainIds, isSupportedChain } from "@zyfai/sdk";

// Get all supported chains
const chains = getSupportedChainIds();
console.log("Supported chains:", chains);

// Check if a chain is supported
if (isSupportedChain(8453)) {
  const userAddress = "0xUser...";
  const result = await sdk.deploySafe(userAddress, 8453); // Base
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
  - If a string is provided, it's treated as the `apiKey`
  - If an object is provided:
    - `apiKey` (string): Your Zyfai API key (required)
    - `rpcUrls` (object, optional): Custom RPC URLs per chain to avoid rate limiting (optional, only needed for local operations like `getSmartWalletAddress`)
      - `1` (string, optional): Ethereum Mainnet RPC URL
      - `8453` (string, optional): Base Mainnet RPC URL
      - `42161` (string, optional): Arbitrum One RPC URL

**Examples:**

```typescript
// Option 1: String initialization (API key only)
const sdk = new ZyfaiSDK("your-api-key");

// Option 2: Object initialization (full configuration)
const sdk = new ZyfaiSDK({
  apiKey: "your-api-key",
});

// Option 3: With custom RPC URLs (recommended to avoid rate limiting)
const sdk = new ZyfaiSDK({
  apiKey: "your-api-key",
  rpcUrls: {
    1: "https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY", // Ethereum Mainnet
    8453: "https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY", // Base
    42161: "https://arb-mainnet.g.alchemy.com/v2/YOUR_API_KEY", // Arbitrum
  },
});
```

#### Methods

##### `connectAccount(account: string | any, chainId?: SupportedChainId): Promise<Address>`

Connect account for signing transactions and authenticate via SIWE. Accepts either a private key string or a modern wallet provider.

**Parameters:**

- `account`: Private key string or wallet provider object (EIP-1193 provider, viem WalletClient, etc.)
- `chainId`: Target chain ID
  - **Required** for private key
  - **Optional** for wallet providers (auto-detects from provider)
  - Default: 8453 (Base)

**Returns:** Connected wallet address

**Automatic Actions:**

- Connects the wallet
- Authenticates via SIWE (Sign-In with Ethereum)
- Stores JWT token for authenticated endpoints

**Examples:**

```typescript
// With private key (chainId required)
await sdk.connectAccount("0x...", 8453);

// With wallet provider (chainId optional)
const provider = await connector.getProvider();
await sdk.connectAccount(provider); // Uses provider's current chain
```

##### `disconnectAccount(): Promise<void>`

Disconnect account and clear all authentication state.

**Returns:** Promise that resolves when disconnection is complete

**Actions:**

- Clears wallet connection
- Resets authentication state
- Clears JWT token
- Resets session key tracking

**Example:**

```typescript
await sdk.disconnectAccount();
console.log("Disconnected and cleared");
```

##### `getSmartWalletAddress(userAddress: string, chainId: SupportedChainId): Promise<SmartWalletResponse>`

Get the Smart Wallet (Safe) address for a user.

**Note:** This is a **read-only** operation and does **not** require `connectAccount()`.

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

##### `deploySafe(userAddress: string, chainId: SupportedChainId, strategy?: Strategy): Promise<DeploySafeResponse>`

> **Deprecated** for partner integrations. Prefer `depositFunds()` — predeployed Safes and session keys are handled on first deposit. This method remains available for legacy flows and emits a console warning when called.

Deploy a Safe smart wallet for a user. **Deployment is handled by the backend API**, which manages all RPC calls and bundler interactions. This avoids rate limiting issues.

**Parameters:**

- `userAddress`: User's EOA address
- `chainId`: Target chain ID
- `strategy`: Optional strategy selection (default: `"conservative"`)
  - `"conservative"`: Low-risk, stable yield strategy (default)
  - `"aggressive"`: High-risk, high-reward strategy

**Returns:**

```typescript
{
  success: boolean;
  safeAddress: Address;
  txHash: string;
  status: "deployed" | "failed";
}
```

**Note:**

- User must be authenticated (automatically done via `connectAccount()`)
- Backend handles all RPC calls, avoiding rate limiting
- Protocol / asset patching runs in `deploySafe` (all paths). `depositFunds` still patches on the account's **first** deposit if USDC `chains` are empty (see Deposit Funds below)

##### `addWalletToSdk(walletAddress: string): Promise<AddWalletToSdkResponse>`

Add a wallet address to the SDK API key's allowedWallets list. This endpoint requires SDK API key authentication (API key starting with "zyfai\_").

**Parameters:**

- `walletAddress`: Wallet address to add to the allowed list

**Returns:**

```typescript
{
  success: boolean;
  message: string; // Status message
}
```

**Note**: This method is only available when using an SDK API key (starts with "zyfai\_"). Regular API keys cannot use this endpoint.

### 3. Session Keys

Session keys enable delegated transaction execution without exposing the main private key.

#### Simple Usage (Legacy — deprecated)

> **Deprecated** for partner integrations. Prefer `depositFunds()` — predeployed wallets already have the agent session enabled. This method remains available for legacy flows and emits a console warning when called.

The SDK automatically fetches optimal session configuration from Zyfai API:

```typescript
// SDK automatically:
// 1. Uses existing SIWE authentication (from connectAccount)
// 2. Checks if user already has an active session key (returns early if so)
// 3. Calculates the deterministic Safe address
// 4. Retrieves personalized config via /session-keys/config
// 5. Signs the session key
// 6. Calls /session-keys/add so the session becomes active immediately

const result = await sdk.createSessionKey(userAddress, 8453);

// Check if session key already existed
if (result.alreadyActive) {
  console.log("Session key already active:", result.message);
} else {
  console.log("Session created:", result.signature);
  console.log("Safe address:", result.sessionKeyAddress);
  console.log("Activation ID:", result.sessionActivation?.id);
}
console.log("User ID:", result.userId);
```

**Important**:

- User must be authenticated (automatically done via `connectAccount()`)
- The SDK proactively checks if the user already has an active session key and returns early without requiring any signature if one exists
- The user record must have `smartWallet` and `chainId` set (predeployed assignment / first deposit)
- Protocol selection is **not** touched by `createSessionKey` — it's set by `deploySafe` and on the first `depositFunds` call if USDC `chains` are still empty
- **Deprecated**: prefer `depositFunds()` for partner onboarding; `createSessionKey` remains for legacy flows
- When `alreadyActive` is `true`, `sessionKeyAddress` and `signature` are not available in the response

### 4. Deposit Funds

Transfer tokens to your Safe smart wallet. Token address is automatically selected based on chain and the requested asset (defaults to USDC):

- **Ethereum Mainnet (1), Base (8453), Arbitrum (42161)**: USDC (default) or WETH
- **Ethereum Mainnet (1), Base (8453)**: EURC (6 decimals; not available on Arbitrum)

**Minimum portfolio balance (enforced on Safe balance + deposit amount):**

- Ethereum Mainnet (1) / USDC: 5 USDC (test threshold — will be raised before production)
- All other (chain, asset) pairs: no minimum enforced

Only deposits on Mainnet in USDC that would leave the Safe below 5 USDC are rejected. Deposits on Base or Arbitrum, or in WETH/EURC, have no minimum today.

```typescript
// Deposit 10 USDC (6 decimals) to Safe on Base — no minimum on Base
const result = await sdk.depositFunds(
  userAddress,
  8453, // Chain ID
  "10000000", // Amount: 10 USDC = 10 * 10^6
  "USDC"
);

// First deposit with aggressive strategy (protocol patching)
await sdk.depositFunds(userAddress, 8453, "10000000", "USDC", "aggressive");

if (result.success) {
  console.log("Deposit successful!");
  console.log("Transaction Hash:", result.txHash);
}
```

**Note:**

- Amount must be in least decimal units. For USDC (6 decimals): 1 USDC = 1000000
- `asset` is required (`"USDC"`, `"WETH"`, or `"EURC"` — EURC on Mainnet/Base only); token address is selected from that for the chain
- On Ethereum Mainnet, the total Safe balance in USDC must be at least 5 USDC after the deposit (test threshold); smaller top-ups are allowed if the Safe already holds enough USDC to meet the minimum
- The SDK automatically authenticates via SIWE before logging the deposit with Zyfai's API, so no extra steps are required on your end once the transfer confirms
- **First deposit only** (before transfer + `log_deposit`): if the USDC profile has no `chains` yet, the SDK patches protocols for **USDC, WETH, and EURC** across all supported chains (EURC on Mainnet/Base only → `assetTypeSettings.[usdc|eth|eurc]`). Pass optional `strategy` (`"conservative"` default or `"aggressive"`) — same role as the former `deploySafe` strategy argument. Later deposits skip this.

#### Log External Deposit (For Sponsored Transactions)

If you execute deposits client-side (e.g., with Privy, Biconomy, or other sponsored/gasless transaction providers), use `logDeposit` to register the deposit with Zyfai's backend:

```typescript
// 1. Execute deposit with your own wallet implementation (e.g., Privy)
const txHash = await privyWallet.sendTransaction({
  to: safeAddress,
  data: transferData, // ERC20 transfer encoded data
});

// 2. Log the deposit to Zyfai backend for tracking and yield optimization
const result = await sdk.logDeposit(
  8453,           // chainId
  txHash,         // transaction hash from your wallet
  "100000000"     // 100 USDC (6 decimals)
);

if (result.success) {
  console.log("Deposit logged successfully");
}
```

**When to use `logDeposit`:**

- You use sponsored/gasless transactions (Privy, Biconomy, Gelato, etc.)
- You have a custom wallet implementation
- You need more control over transaction execution
- You want to pay gas fees for your users

**Parameters:**

- `chainId`: Chain ID where the deposit was made
- `txHash`: Transaction hash of the deposit (must start with "0x")
- `amount`: Amount in least decimal units
- `tokenAddress` (optional): Token address (auto-selected based on chain if not provided)

### 5. Withdraw Funds

Initiate a withdrawal from your Safe. **Note: Withdrawals are processed asynchronously by the backend.**
Funds are always withdrawn to the Safe owner's address (userAddress).

```typescript
// Full withdrawal
const result = await sdk.withdrawFunds(userAddress, 8453);

// Partial withdrawal of 50 USDC (6 decimals)
const result = await sdk.withdrawFunds(
  userAddress,
  8453,
  "50000000" // Amount: 50 USDC = 50 * 10^6
);

if (result.success) {
  console.log("Withdrawal initiated!");
  console.log("Message:", result.message); // e.g., "Withdrawal request sent"
  if (result.txHash) {
    console.log("Transaction Hash:", result.txHash);
  } else {
    console.log("Transaction will be processed asynchronously");
  }
}
```

**Important Notes:**

- Amount must be in least decimal units. For USDC (6 decimals): 1 USDC = 1000000
- The SDK authenticates via SIWE before calling the withdrawal endpoints
- Withdrawals are processed asynchronously - the `txHash` may not be immediately available
- Check the `message` field for the withdrawal status
- Use `getHistory()` to track the withdrawal transaction once it's processed

### 6. Get Available Protocols

Retrieve all available DeFi protocols and pools for a specific chain:

```typescript
const protocols = await sdk.getAvailableProtocols(8453);

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

#### Get Portfolio (with fee-adjusted balances)

Returns the full wallet portfolio plus net-of-pending-fee fields. Pending fee is
`current` onchain earnings × 10%. Gross balances are unchanged.

```typescript
const { portfolio } = await sdk.getPortfolio(userAddress);

// Gross vs net (after pending Zyfi fee)
console.log(portfolio.portfolioByAssetType?.usdc?.balance);
console.log(portfolio.portfolioByAssetType?.usdc?.balanceWithFee);

portfolio.positions?.forEach((slot) => {
  console.log(slot.pool, slot.underlyingAmount, slot.underlyingAmountWithFee);
});
```

**Fee formula**

- Pending fee = `current_earnings × 0.1` (unrealised yield only)
- `balanceWithFee` / `underlyingAmountWithFee` = live − pending fee share
- If earnings cannot be fetched, `*WithFee` equals the gross value

**Note**: Portfolio balances are live; earnings used for the fee may come from a
snapshot, so net values can differ slightly from a fully live calculation.

### 8. Analytics & Data Endpoints

The SDK provides access to various analytics and data endpoints:

#### Get User Details

Fetch complete authenticated user profile including smart wallet, chains, protocols, and all configuration settings:

```typescript
const user = await sdk.getUserDetails();

console.log("Smart Wallet:", user.user.smartWallet);
console.log("Active Chains:", user.user.chains);
console.log("Active Protocols:", user.user.protocols);
console.log("Strategy:", user.user.strategy); // "conservative" | "aggressive"
console.log("Has Active Session:", user.user.hasActiveSessionKey);

// Feature flags
console.log("Auto-compounding:", user.user.autocompounding);
console.log("Auto-select Protocols:", user.user.autoSelectProtocols);
console.log("Omni Account:", user.user.omniAccount);
console.log("Cross-chain Strategy:", user.user.crosschainStrategy);
console.log("Executor Proxy:", user.user.executorProxy);
console.log("Splitting:", user.user.splitting);
console.log("Min Splits:", user.user.minSplits);

// Optional fields
console.log("Email:", user.user.email);
console.log("Telegram ID:", user.user.telegramId);
console.log("Agent Name:", user.user.agentName);
console.log("Wallet Type:", user.user.walletType);
```

**Available Fields:**
- **Core Info**: `id`, `address`, `smartWallet`, `chains`, `protocols`
- **Strategy**: `strategy` (conservative or aggressive)
- **Session**: `hasActiveSessionKey` (boolean)
- **Features**: `autocompounding`, `autoSelectProtocols`, `omniAccount`, `crosschainStrategy`, `executorProxy`, `splitting`, `minSplits`
- **Optional**: `email`, `telegramId`, `agentName`, `walletType`, `customization`, `registered`

#### Pause Agent

Pause the agent by clearing all protocols. This effectively stops automated operations:

```typescript
// Pause the agent (clears all protocols)
const result = await sdk.pauseAgent();

if (result.success) {
  console.log("Agent paused successfully");
  console.log("User ID:", result.userId);
}

// Verify the agent is paused
const userDetails = await sdk.getUserDetails();
console.log("Active protocols:", userDetails.user.protocols.length); // Should be 0
```

**Note**:
- User must be authenticated (automatically done via `connectAccount()`)
- Clears protocols for USDC, WETH, and EURC
- To resume operations, call `resumeAgent()` or `updateUserProfile()` with the desired protocols

#### Splitting Management

Control how deposits are split across multiple protocols for diversification.

**Enable Splitting:**

```typescript
// Enable splitting with minimum 3 protocols
const result = await sdk.enableSplitting(3);

if (result.success) {
  console.log("Splitting enabled with min splits: 3");
}

// Verify splitting is enabled
const userDetails = await sdk.getUserDetails();
console.log("Splitting enabled:", userDetails.user.splitting); // true
console.log("Min splits:", userDetails.user.minSplits); // 3
```

**Disable Splitting:**

```typescript
// Disable splitting
const result = await sdk.disableSplitting();

if (result.success) {
  console.log("Splitting disabled");
}
```

**Update Minimum Splits:**

```typescript
// Update minimum number of protocols to split across
const result = await sdk.updateMinSplits(5);

if (result.success) {
  console.log("Minimum splits updated to 5");
}
```

**Note**:
- User must be authenticated (automatically done via `connectAccount()`)
- When splitting is enabled, deposits are distributed across multiple protocols based on `minSplits`
- `minSplits` must be at least 1
- Splitting helps with diversification and risk management

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

Get the smart wallet address associated with an EOA address:

```typescript
const result = await sdk.getSmartWalletByEOA("0xYourEOA...");
console.log("Smart Wallet:", result.smartWallet);
console.log("Chains:", result.chains);
console.log("EOA:", result.eoa);
```

**Returns:**

```typescript
{
  success: boolean;
  eoa: string;
  smartWallet: Address | null;
  chains: number[];
}
```

#### Get First Topup

Get information about the first deposit/topup for a wallet:

```typescript
const firstTopup = await sdk.getFirstTopup(walletAddress, 8453);
console.log("First Topup Date:", firstTopup.date);
console.log("First Topup Amount:", firstTopup.amount);
console.log("Chain ID:", firstTopup.chainId);
```

**Returns:**

```typescript
{
  success: boolean;
  walletAddress: string;
  date: string;
  amount?: string;
  chainId?: number;
}
```

**Note**: Returns an error if the wallet has no deposits yet.

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

Earnings are returned per-token (multi-asset support).

```typescript
const earnings = await sdk.getOnchainEarnings(walletAddress);
// Per-token earnings: { "USDC": "0.020667", "WETH": "0.000009" }
console.log("Total by token:", earnings.data.totalEarningsByToken);
// Per-chain totals (chain → token → amount): { "8453": { "USDC": "0.01" }, "42161": {...} }
console.log("Total by chain:", earnings.data.totalEarningsByChain);
// Net totals: lifetime + unrealized + current × 0.9 (never total × 0.9)
console.log("Net by token:", earnings.data.totalEarningsByTokenWithFee);
console.log("Net by chain:", earnings.data.totalEarningsByChainWithFee);
```

**Fee formula for `*WithFee` earnings fields**

- `totalWithFee = lifetime + unrealized + current × 0.9`
- Do **not** apply `× 0.9` to lifetime or unrealized
- Aligns with portfolio: pending fee = `current × 0.1` only

#### Calculate Onchain Earnings (Refresh)

```typescript
const updated = await sdk.calculateOnchainEarnings(walletAddress);
console.log("Updated earnings:", updated.data.totalEarningsByToken);
console.log("Net earnings:", updated.data.totalEarningsByTokenWithFee);
```

#### Get Daily Earnings

Daily earnings snapshots with per-token breakdowns.

```typescript
const daily = await sdk.getDailyEarnings(
  walletAddress,
  "2024-01-01",
  "2024-01-31"
);
daily.data.forEach((d) => {
  console.log(d.snapshot_date, d.total_earnings_by_token);
});
```

#### Get Daily APY History

Returns per-position APY breakdowns with per-token weighted averages.

```typescript
const apyHistory = await sdk.getDailyApyHistory(walletAddress, "30D");
// Per-token weighted APY: { "USDC": 4.64, "WETH": 1.94 }
console.log("Weighted APY after fee:", apyHistory.weightedApyAfterFee);
console.log("Weighted APY (with rZFI Merkl):", apyHistory.weightedApyWithRzfiAfterFee);
console.log("Avg rZFI Merkl APR:", apyHistory.averageRzfiMerklApr);
// Per-chain breakdowns: { "8453": { "USDC": 4.59 }, "42161": { "WETH": 1.82 } }
console.log("By chain:", apyHistory.weightedApyAfterFeeByChain);
console.log("By chain (with rZFI):", apyHistory.weightedApyWithRzfiAfterFeeByChain);
// Each date entry has positions (with tokenSymbol), and per-token weighted_apy, fee, etc.
```

### 10. Opportunities & Strategies

#### Get Conservative Opportunities (Low Risk)

```typescript
// Filter by chain and/or asset
const conservativeOpps = await sdk.getConservativeOpportunities(8453, "USDC");
conservativeOpps.data.forEach((o) => {
  console.log(`${o.protocolName} - ${o.poolName}: ${o.apy}% APY`);
});
```

#### Get Aggressive Opportunities (High Risk)

```typescript
// Filter by chain and/or asset
const aggressiveOpps = await sdk.getAggressiveOpportunities(8453, "WETH");
aggressiveOpps.data.forEach((o) => {
  console.log(`${o.protocolName} - ${o.poolName}: ${o.apy}% APY`);
});
```

### 11. APY Per Strategy

#### Get APY Per Strategy

```typescript
// Get same-chain rebalances, optionally filter by chainId and tokenSymbol
const apyPerStrategy = await sdk.getAPYPerStrategy(false, 7, "conservative", 8453, "USDC");
console.log("APY per strategy:", apyPerStrategy.data);
```

### 12. SDK API Key Management

#### Add Wallet to SDK API Key

Add a wallet address to the SDK API key's allowedWallets list. This endpoint requires SDK API key authentication (API key starting with "zyfai\_").

```typescript
const result = await sdk.addWalletToSdk("0x1234...");
console.log(result.message); // "Wallet successfully added to allowed list"
```

**Note**: This method is only available when using an SDK API key (starts with "zyfai\_"). Regular API keys cannot use this endpoint.

### 13. Portfolio (Premium)

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
10. **`pause-agent.ts`** - Pause agent by clearing all protocols
11. **`update-profile-with-protocols.ts`** - Configure user profile with protocols, chains, and advanced features
12. **`customize-batch.ts`** - Configure specific pools for protocols across chains
13. **`get-tvl-volume.ts`** - Get TVL and trading volume
14. **`get-active-wallets.ts`** - Get active wallets by chain
15. **`get-smart-wallets-by-eoa.ts`** - Get smart wallets by EOA
16. **`get-first-topup.ts`** - Get first deposit information
17. **`get-history.ts`** - Get transaction history

### Analytics & Earnings

18. **`get-onchain-earnings.ts`** - Get/calculate onchain earnings
19. **`get-daily-earnings.ts`** - Get daily earnings breakdown
20. **`get-apy-history.ts`** - Get daily APY history with weighted averages

### Opportunities & Rebalancing

21. **`get-opportunities.ts`** - Get conservative and aggressive yield opportunities
22. **`get-rebalance-info.ts`** - Get rebalance events and frequency tier

### Premium Features

23. **`get-debank-portfolio.ts`** - Get Debank multi-chain portfolio

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

### Example 1: Deploy Safe on Base

```typescript
import { ZyfaiSDK } from "@zyfai/sdk";

async function main() {
  const sdk = new ZyfaiSDK({
    apiKey: process.env.ZYFAI_API_KEY!,
  });

  // Connect account (automatically authenticates via SIWE)
  await sdk.connectAccount(process.env.PRIVATE_KEY!, 8453);

  const userAddress = "0xUser..."; // User's EOA address

  // Check if Safe already exists
  const walletInfo = await sdk.getSmartWalletAddress(userAddress, 8453);

  if (walletInfo.isDeployed) {
    console.log("Safe already deployed at:", walletInfo.address);
    return;
  }

  // Deploy Safe with default conservative strategy
  const result = await sdk.deploySafe(userAddress, 8453);

  // Or deploy with aggressive strategy
  // const result = await sdk.deploySafe(userAddress, 8453, "aggressive");

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
  const [sdk] = useState(() => new ZyfaiSDK(process.env.ZYFAI_API_KEY!));

  const [userAddress, setUserAddress] = useState<string>("");
  const [safeAddress, setSafeAddress] = useState<string>("");
  const [isDeploying, setIsDeploying] = useState(false);

  const handleConnect = async (walletProvider: any) => {
    try {
      // Client passes the wallet provider from their frontend
      // e.g., from wagmi: const provider = await connector.getProvider();
      // connectAccount automatically authenticates via SIWE
      const address = await sdk.connectAccount(walletProvider); // chainId auto-detected
      setUserAddress(address);
      console.log("Connected and authenticated:", address);

      // Get Safe address for this user
      const walletInfo = await sdk.getSmartWalletAddress(address, 8453);
      setSafeAddress(walletInfo.address);
    } catch (error) {
      console.error("Connection failed:", error);
    }
  };

  const handleDeploy = async () => {
    if (!userAddress) return;

    setIsDeploying(true);
    try {
      const result = await sdk.deploySafe(userAddress, 8453);
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
  const result = await sdk.deploySafe(userAddress, 8453);
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
5. **Validate Chain IDs**: Ensure you're using supported chains (Ethereum Mainnet, Base, Arbitrum)
6. **Use Explicit Parameters**: Always pass explicit `userAddress` and `chainId` to methods

## Environment Variables

For running the examples, set up the following environment variables:

```bash
# Required: API key (used for both Execution API and Data API)
ZYFAI_API_KEY=your-api-key

# Required for examples: Private key for signing transactions
# WARNING: Never commit your private key to version control!
PRIVATE_KEY=0x...

# Optional: Chain ID (default: 8453 for Base)
# Supported: 1 (Ethereum Mainnet), 8453 (Base), 42161 (Arbitrum)
CHAIN_ID=8453
```

## Troubleshooting

### "No account connected" Error

Make sure to call `connectAccount()` before calling methods that require **signing or SIWE authentication** (e.g. `deploySafe`, `createSessionKey`, `withdrawFunds`, `updateUserProfile`). Read-only data methods (e.g. `getPositions`, `getHistory`, `getOnchainEarnings`) do not require a connected wallet.

### "Unsupported chain" Error

Check that the chain ID is in the supported chains list: Ethereum Mainnet (1), Base (8453), or Arbitrum (42161).

### SIWE Authentication Issues in Browser

The SDK automatically performs SIWE authentication when you call `connectAccount()`. The SDK automatically detects browser vs Node.js environments:

- **Browser**: Uses `window.location.origin` for the SIWE message domain/uri to match the browser's automatic `Origin` header
- **Node.js**: Uses the API endpoint URL

If you encounter SIWE authentication failures in a browser, ensure:

1. Your frontend origin is allowed by the API's CORS configuration
2. The user approves the SIWE signature request in their wallet

### Session Key Already Exists

If `createSessionKey` returns `{ alreadyActive: true }`, the user already has an active session key. This is not an error - the SDK proactively checks before attempting to create a new one.

### Withdrawal Transaction Hash Not Available

If `withdrawFunds` returns without a `txHash`, the withdrawal is being processed asynchronously by the backend. You can:

1. Check the `message` field for status information
2. Use `getHistory()` to track when the withdrawal transaction is processed
3. The transaction will appear in the history once it's been executed

### Data API CORS Errors

Some Data API endpoints may require server-side CORS configuration. If you see CORS errors for endpoints like `onchain-earnings`, `calculate-onchain-earnings`, or `opportunities`, contact Zyfai support to ensure your origin is whitelisted.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

MIT
