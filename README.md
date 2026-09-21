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

## Releasing

This package uses [Changesets](https://github.com/changesets/changesets) for versioning and changelogs. Maintainer details: [`docs/RELEASING.md`](docs/RELEASING.md).

### Adding a changeset

When your PR includes user-facing SDK changes:

```bash
npm run changeset
```

- **patch** — bug fixes
- **minor** — new features (non-breaking)
- **major** — breaking changes

Commit the generated file in `.changeset/` with your PR.

### Publishing (maintainers)

After changesets merge to `main`, a maintainer runs `npm run version-packages`, then `npm publish`. Details: [`docs/RELEASING.md`](docs/RELEASING.md).

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
> **Registering the deposit (do not skip).** For pool wallets, an on-chain
> ERC-20 transfer alone does **not** subscribe the user. The backend must also
> receive `POST /users/log_deposit` with a **user JWT** (`Authorization: Bearer
> …`) from SIWE — your SDK API key is not enough (that call returns **401**).
> Without a successful `log_deposit`, ownership is not rotated, the session key
> is not activated, and funds sit idle in the Safe.
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
- `"yieldmaxxing"`: Aggressive plus protocols with delayed withdrawals — see [Strategies](#strategies)

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
  - `"yieldmaxxing"`: Aggressive plus protocols with delayed withdrawals — see [Strategies](#strategies)

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
- **Base (8453) only**: NVDAc (8 decimals) — tokenized NVIDIA equity, see [Tokenized equities](#tokenized-equities-nvdac)

**Minimum portfolio balance (enforced on Safe balance + deposit amount):**

- Ethereum Mainnet (1) / USDC or EURC: 10,000 units
- Base (8453) and Arbitrum (42161) / USDC or EURC: 100 units
- WETH: about **$10,000** of ETH on Ethereum Mainnet, **$100** on Base and Arbitrum
- NVDAc: about **$100** on Base

Minimums for WETH and NVDAc are quoted in dollars and converted at deposit time from the live USD price (Data API `GET /api/v2/price?token=eth` and `?token=nvdac`, same API key as the SDK), so the on-chain threshold moves with the market.

Top-ups smaller than the minimum are allowed if the Safe already holds enough of the asset to meet it after the deposit.

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
- `asset` is required (`"USDC"`, `"WETH"`, `"EURC"`, or `"NVDAc"` — EURC on Mainnet/Base only, NVDAc on Base only); token address is selected from that for the chain. Depositing an asset on a chain where it does not exist throws before any transfer.
- The total Safe balance must meet the per-asset minimum after the deposit (see above). WETH uses a live ETH/USD price, so the wei threshold moves with the market.
- Call `connectAccount()` on the **same** `ZyfaiSDK` instance before `depositFunds()`. The method uses that session's JWT when it calls `log_deposit` after the transfer.
- If first-deposit protocol patching fails, the transfer still runs but `log_deposit` may run **without** a JWT (401). Treat a confirmed on-chain tx as **not** subscribed until `log_deposit` succeeds.
- **`depositFunds` can return `success: true` even when `log_deposit` failed** — failures are only `console.warn`ed. Check logs or retry `logDeposit` after `connectAccount()`.
- **First deposit only** (before transfer + `log_deposit`): if the USDC profile has no `chains` yet, the SDK patches protocols for **USDC, WETH, EURC, and NVDAc**, each across the chains it exists on (EURC on Mainnet/Base, NVDAc on Base → `assetTypeSettings.[usdc|eth|eurc|nvdac]`). Pass optional `strategy` (`"conservative"` default, `"aggressive"` or `"yieldmaxxing"`) — same role as the former `deploySafe` strategy argument. Later deposits skip this.
- **`strategy` is ignored on later deposits, and no error is raised.** Re-running the patch would overwrite a protocol selection the user may have customised, so passing `"yieldmaxxing"` to an account that has already deposited leaves it on its current strategy. To change an existing account, call `updateUserProfile({ asset, strategy })` for each asset concerned:

  ```typescript
  await sdk.updateUserProfile({ asset: "USDC", strategy: "yieldmaxxing" });
  ```

#### Log External Deposit (For Sponsored Transactions)

`depositFunds()` already calls `logDeposit` after the transfer. If you **do not** use `depositFunds()` and send the ERC20 yourself (front, Privy, Biconomy, custom wallet), you **must** call `logDeposit` — otherwise the backend never sees the deposit: a reserved pool wallet stays reserved (no ownership rotation), and yield/agent tracking does not start.

**Authentication (required).** `log_deposit` is a **user** endpoint. You need both:

| Credential | Purpose |
| ---------- | ------- |
| `X-API-Key` | Identifies your SDK integration (set when constructing `ZyfaiSDK`) |
| `Authorization: Bearer <jwt>` | Proves which user deposited (from `connectAccount()` → SIWE) |

Calling `logDeposit()` **without** `connectAccount()` on the **same** SDK instance sends only the API key → **401 Unauthorized**. A common mistake is SIWE in the browser and `logDeposit()` on a **new** server-side `ZyfaiSDK` with no JWT.

```typescript
const sdk = new ZyfaiSDK({ apiKey: process.env.ZYFAI_API_KEY! });

// Required before logDeposit — same instance that will post log_deposit
await sdk.connectAccount(walletProviderOrPrivateKey, chainId);

// 1. Execute deposit with your own wallet implementation (e.g., Privy, Bankr)
const txHash = await privyWallet.sendTransaction({
  to: safeAddress,
  data: transferData, // ERC20 transfer encoded data
});

// 2. Register the deposit (must return success — do not treat tx confirmation alone as "subscribed")
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

- You did **not** call `depositFunds()` (it already logs the deposit for you)
- You use sponsored/gasless transactions (Privy, Biconomy, Gelato, etc.)
- You have a custom wallet / frontend transfer
- You need more control over transaction execution
- You want to pay gas fees for your users

**When to prefer `depositFunds()` instead:** one SDK instance, `connectAccount()` once, transfer + `log_deposit` in one call — fewer ways to miss the JWT.

**Serverless / split frontend–backend:** if the browser calls `connectAccount()` but the server calls `logDeposit()`, the server must either (a) run `connectAccount()` itself with the user's signer, or (b) forward the JWT to the same `ZyfaiSDK` instance that posts `log_deposit`. API key alone is not sufficient.

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

**Delayed withdrawals (`yieldmaxxing` strategy)**

Positions held in protocols with asynchronous withdrawals (Ipor, Superform)
cannot be exited on demand. For those the backend sends the immediately
available portion straight away, then queues a redemption for the rest and
forwards the funds to the EOA once the protocol releases them — roughly a day
on Ipor, three on Superform.

The user has nothing else to call, but `withdrawFunds` returns as soon as the
immediate portion is sent, so its `txHash` does not cover the whole amount.
Track the remainder through `getPortfolio`:

```typescript
await sdk.withdrawFunds(userAddress, 8453);

const { portfolio } = await sdk.getPortfolio(userAddress);
portfolio.pendingAsyncWithdrawals
  ?.filter((w) => w.status === "REQUESTED" || w.status === "CLAIMABLE")
  .forEach((w) => {
    console.log(`${w.amount} ${w.token?.symbol} from ${w.protocol?.name}`);
    console.log(`Expected to be claimable around ${w.estimatedClaimAt}`);
  });
```

Once requested, that amount can no longer be withdrawn: it is gone from both
the position snapshot and the Safe balance, so a second `withdrawFunds` call
silently returns only what is left. It is also missing from
`portfolioByAssetType` while in flight, so validate user-entered amounts
against that field rather than the total — see [Total balance](#total-balance).

**Only one redemption per pool can be in flight.** While an entry for a pool is
`REQUESTED` or `CLAIMABLE`, the backend drops a further withdrawal aimed at that
same pool, because the protocols behind it (ERC-7540) hold a single request slot
per user — and it still answers `success: true`. `withdrawFunds` therefore
throws rather than returning that no-op:

```
Withdrawal failed: A redemption is already in flight for NVDAc on NVDAC
(status REQUESTED), and async pools allow only one at a time. Wait for it to
reach CLAIMED before withdrawing the rest. Estimated settlement: 2026-09-24T13:59:05.543Z.
```

It only throws when nothing the call could reach is withdrawable. Another pool,
another asset or an idle Safe balance still goes through, partially. To grey out
the action before the user tries, read `pendingAsyncWithdrawals`:

```typescript
const { portfolio } = await sdk.getPortfolio(userAddress);

const redeeming = (portfolio.pendingAsyncWithdrawals ?? []).some(
  (w) =>
    w.token?.symbol === "NVDAc" &&
    (w.status === "REQUESTED" || w.status === "CLAIMABLE")
);
```

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

**Note**: This endpoint uses `/api/v1/data/position?walletAddress={address}` (Smart wallet address) and returns bundles with nested slot data. Use each slot's `underlyingAmount` for the canonical token balance. The Safe is resolved via `getSafeAddressFor` (backend-assigned for predeployed wallets, registered agent for legacy). An EOA with no agent returns an empty portfolio — the SDK does not derive a CREATE2 address. Optional `chainId` defaults to Base (8453) for that resolution only.

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
  console.log(slot.pool_apy, slot.pool_apy_withFee);
});
```

**Fee formula**

- Pending fee = `current_earnings × 0.1` (unrealised yield only)
- `balanceWithFee` / `underlyingAmountWithFee` = live − pending fee share
- `pool_apy_withFee` = `pool_apy × 0.9`
- If earnings cannot be fetched, `*WithFee` equals the gross value

**Note**: Portfolio balances are live; earnings used for the fee may come from a
snapshot, so net values can differ slightly from a fully live calculation.

#### Total balance

`portfolioByAssetType` is **not** the user's total balance. The backend builds
it from exactly two sources: the underlying amount of every deployed position,
and the idle balances sitting in the Safe. Anything that is in neither place is
missing from it.

That gap is real under the `yieldmaxxing` strategy. When the agent requests a
redemption from a delayed-withdrawal protocol, the position leaves the snapshot
immediately while the funds stay in the vault for a day or three. During that
window they are in no balance field — only in `pendingAsyncWithdrawals`.

So you need **two different numbers**, and showing one where the other belongs
is the most common mistake:

| Number | Formula | Use it for |
| --- | --- | --- |
| **Total balance** | `portfolioByAssetType` + in-flight | "You have X" — the user still owns the in-flight funds |
| **Requestable** | `portfolioByAssetType` only | Any withdraw form, max button, or amount validation |

An in-flight amount is **no longer withdrawable**. A `withdrawFunds` call only
reaches positions in the current snapshot and idle Safe balances, and the
in-flight amount is in neither — calling it again will not pull those funds out
any faster, nor will it fail with an error. They land on the user's EOA on
their own once the protocol releases them, so the right UI is to show them as
pending with their `estimatedClaimAt`, never to offer them for withdrawal.

Note the `?? "0x0"` below: when every position of an asset is in flight, the
backend drops the asset key from `portfolioByAssetType` altogether rather than
reporting a zero balance, and `portfolioByAssetType` itself can be `{}`.
`amount` is hex-encoded least units like every other balance, so read it with
`BigInt`, never `parseInt`.

```typescript
const { portfolio } = await sdk.getPortfolio(userAddress);

const IN_FLIGHT = ["REQUESTED", "CLAIMABLE"];

const balancesFor = (assetType: string, tokenSymbol: string) => {
  // Everything a withdrawal can still act on.
  const requestable = BigInt(
    portfolio.portfolioByAssetType?.[assetType]?.balance ?? "0x0"
  );

  // Owned, but locked in a redemption until the protocol releases it.
  const inFlight = (portfolio.pendingAsyncWithdrawals ?? [])
    .filter((w) => IN_FLIGHT.includes(w.status) && w.token?.symbol === tokenSymbol)
    .reduce((sum, w) => sum + BigInt(w.amount), 0n);

  return { requestable, inFlight, total: requestable + inFlight };
};
```

`requestable` is what a withdrawal can still be asked on, **not** what arrives
immediately: it also covers async positions the user currently holds, and
withdrawing those turns them into a new in-flight redemption. Cap the amount a
user can enter at `requestable`, never at `total` — asking for more does not
fail loudly, the backend transfers what it can right away and queues a
redemption for the shortfall.

Two ways to get this wrong:

- **Do not add `staleBalances`.** They are the same idle Safe balances that
  `portfolioByAssetType` already counts, exposed as a per-chain view for
  surfacing funds waiting to be deployed. Adding them double-counts.
- **Do not add every `pendingAsyncWithdrawals` entry.** The array also keeps
  `CLAIMED` requests for 24 hours so you can show a recent history. Those funds
  are already back in the Safe and therefore already counted. Filter on
  `REQUESTED` and `CLAIMABLE`.

Each in-flight entry carries the information needed to show progress:
`status`, `amount` (in the token's least units — apply `token.decimals`),
`protocol.name`, `pool`, `estimatedClaimAt`, and `statusMessage` when the
protocol is temporarily refusing claims. A `FAILED` status is not a loss: the
position is restored and the request is retried on the next cycle.

`pauseMessageByToken` is a companion field holding user-facing copy when
deposits are paused for a token (tokenized stocks over the weekend, for
example), keyed by token symbol.

### 8. Analytics & Data Endpoints

The SDK provides access to various analytics and data endpoints:

#### Get User Details

Fetch complete authenticated user profile including smart wallet, chains, protocols, and all configuration settings:

```typescript
const user = await sdk.getUserDetails();

console.log("Smart Wallet:", user.user.smartWallet);
console.log("Active Chains:", user.user.chains);
console.log("Active Protocols:", user.user.protocols);
console.log("Strategy:", user.user.strategy); // "conservative" | "aggressive" | "yieldmaxxing"
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
- **Strategy**: `strategy` (conservative, aggressive or yieldmaxxing)
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
- Clears protocols for USDC, WETH, EURC, and NVDAc
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
  assetType: "eth",
});
history.data.forEach((tx) => {
  console.log(tx.action, tx.transactionHash);
  if (tx.rebalanceLog) {
    console.log(tx.rebalanceLog.oldApy, tx.rebalanceLog.oldApy_withFee);
    console.log(tx.rebalanceLog.newApy, tx.rebalanceLog.newApy_withFee);
  }
  tx.positions?.forEach((pos) => {
    console.log(pos.amount); // resulting position balance after the action
    console.log(pos.deltaAmount); // amount actually moved by the action (optional, not on older entries)
  });
});
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
  // daily_total_delta_by_token_withoutFee = daily_total_delta_by_token x (1 - feeRate), computed by the SDK
  console.log("Delta without fee:", d.daily_total_delta_by_token_withoutFee);
});
```

#### Get Daily APY History

Returns per-position APY breakdowns with per-token weighted averages.

```typescript
const apyHistory = await sdk.getDailyApyHistory(walletAddress, "30D");
// days: "7D" | "14D" | "30D" | "60D" | "120D" | "180D" (default "7D")
// Per-token weighted APY: { "USDC": 4.64, "WETH": 1.94 }
console.log("Weighted APY after fee:", apyHistory.weightedApyAfterFee);
console.log("Weighted APY (with rZFI Merkl):", apyHistory.weightedApyWithRzfiAfterFee);
console.log("Avg rZFI Merkl APR:", apyHistory.averageRzfiMerklApr);
// Per-chain breakdowns: { "8453": { "USDC": 4.59 }, "42161": { "WETH": 1.82 } }
console.log("By chain:", apyHistory.weightedApyAfterFeeByChain);
console.log("By chain (with rZFI):", apyHistory.weightedApyWithRzfiAfterFeeByChain);
// Each date entry has positions (with tokenSymbol and apy_withFee = apy × 0.9), and per-token weighted_apy, fee, etc.
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

#### Get Yieldmaxxing Opportunities (Delayed Withdrawals)

```typescript
const asyncOpps = await sdk.getAsyncOpportunities(8453);
asyncOpps.data.forEach((o) => {
  console.log(`${o.protocolName} - ${o.poolName}: ${o.apy}% APY`);
});
```

#### Strategies

Every method that takes a `strategy` accepts one of three values. Each tier is a
superset of the previous one: an aggressive user also gets conservative pools,
and a yieldmaxxing user gets everything.

| Strategy | Backend value | Pools unlocked |
| --- | --- | --- |
| `conservative` (default) | `safe_strategy` | Low-risk pools only |
| `aggressive` | `degen_strategy` | Conservative + higher-risk pools |
| `yieldmaxxing` | `async_strategy` | Aggressive + pools with **delayed withdrawals** |

`yieldmaxxing` is the only strategy that changes how withdrawals behave. It
unlocks protocols (Ipor, Superform) that cannot be exited on demand: a
redemption has to be requested, then claimed once the protocol releases the
funds — roughly a day on Ipor, three on Superform. The agent handles both steps,
but the funds are in flight in between. See
[Withdraw Funds](#5-withdraw-funds) and [Total balance](#total-balance).

#### Set an asset's strategy

`updateUserProfile({ asset, strategy })` stores a strategy but does **not**
compute the protocol list that goes with it, so on its own it leaves the asset
with nothing to deploy into. `setAssetStrategy` does both in one call:

```typescript
const profile = await sdk.setAssetStrategy({
  asset: "NVDAc",
  strategy: "yieldmaxxing",
});
console.log(profile.protocols); // Ipor + Superform
```

| Parameter | Default | Notes |
| --- | --- | --- |
| `asset` | — | Required |
| `strategy` | the asset's current one | Omit it to recompute the protocol list without changing strategy |
| `chains` | every chain the asset exists on | **Additive** — chains already enabled are kept, so this cannot disable one |

This is the method to reach for when changing an existing account's strategy,
since `depositFunds` ignores its `strategy` argument after the first deposit.
`resumeAgent` does the same thing for all four assets at once and is meant for
resuming after `pauseAgent`.

#### Tokenized equities (NVDAc)

`NVDAc` is Coinbase's tokenized NVIDIA share (`0xb20000000000000000000078ee7ce2fE4908108C`),
**8 decimals, Base only**. It behaves like any other asset — same `depositFunds`,
`withdrawFunds` and `getPortfolio` — with three differences worth planning for.

**It only exists under `yieldmaxxing`.** The two protocols that hold it, Ipor
and Superform, are both async-only, so a `conservative` or `aggressive` profile
resolves to zero protocols for NVDAc and the agent has nothing to deploy into.
Every NVDAc withdrawal is therefore a delayed one — read
[Total balance](#total-balance) before showing a balance.

**The minimum deposit is $100 of NVDAc, not 100 NVDAc.** It is converted from
the live price at deposit time, so the threshold in token units moves daily
(around `0.44` NVDAc at $225/share).

**Deposits pause when the market is closed**, typically over the weekend. Funds
stay idle in the Safe and are deployed at the next open; other assets are
unaffected. `getPortfolio` returns ready-to-display copy in
`pauseMessageByToken["NVDAc"]` when that happens.

```typescript
// Existing account: one call sets the strategy and selects the protocols.
// Chains default to Base, the only one NVDAc exists on.
await sdk.setAssetStrategy({ asset: "NVDAc", strategy: "yieldmaxxing" });

// 1 NVDAc = 100000000 (8 decimals). Must leave at least ~$100 in the Safe.
await sdk.depositFunds(userAddress, 8453, "100000000", "NVDAc");
```

Use `setAssetStrategy` rather than `updateUserProfile` here: the latter stores
a strategy but does not compute a protocol list, which would leave NVDAc with
nothing to deploy into. See [Set an asset's strategy](#set-an-assets-strategy).

### 11. APY Per Strategy

#### Get APY Per Strategy

```typescript
// Get same-chain rebalances, optionally filter by chainId and tokenSymbol
const apyPerStrategy = await sdk.getAPYPerStrategy(false, 7, "conservative", 8453, "USDC");
console.log("APY per strategy:", apyPerStrategy.data);
// Each item includes average_apy_withFee and average_apy_with_rzfi_withFee
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

## Integration testing

Use opt-in Vitest integration tests to prove a new backend feature end-to-end through the **public SDK** against a **local** `zyfai-api` instance. This is the normal workflow when adding or changing execution API behaviour.

Integration tests live in `src/integration/*.integration.test.ts`, mirror the matching script under `examples/`, and are **not** part of `npm run check` (no secrets required in CI). Unit tests in `src/utils/` stay mocked and fast.

### Setup

```bash
cd zyfai-sdk
cp .env.test.example .env.test   # once — fill ZYFAI_API_KEY and PRIVATE_KEY (gitignored)
```

Vitest loads `.env.test` automatically (`vitest.config.ts`). Start the local API from the workspace parent:

```bash
cd ..   # zyfai-workspace root
pnpm dev
```

### Run tests

```bash
npm run test:integration                              # all integration tests
npm run test:integration -- get-protocols             # one file by name
npm run test:integration -- src/integration/get-protocols.integration.test.ts
npm run test:integration -- -t "returns a protocol list"   # by test/describe name
npx vitest get-protocols                              # watch mode while iterating
```

Tests call `describe.skipIf(!integrationEnvReady())` and skip cleanly when `.env.test` is missing or invalid.

### Add a test for a new feature

1. Implement the API change in `zyfai-api` and expose it via a public SDK method (if new surface).
2. Add `examples/<feature>.ts` for manual smoke.
3. Add `src/integration/<feature-id>.integration.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { LOCAL_EXECUTION_API_BASE_URL } from "../config/endpoints";
import { integrationEnvReady } from "./utils";

describe.skipIf(!integrationEnvReady())("<feature-id>", { timeout: 180_000 }, () => {
  it("verifies the contract", async () => {
    const { ZyfaiSDK } = await import("../core/ZyfaiSDK");

    const sdk = new ZyfaiSDK({
      apiKey: process.env.ZYFAI_API_KEY!,
      executionApiUrl: LOCAL_EXECUTION_API_BASE_URL, // http://localhost:3000
    });

    await sdk.connectAccount(process.env.PRIVATE_KEY!, 8453);
    // public SDK calls + expect(); poll async terminal state when needed
  });
});
```

Conventions:

- Target local API via `LOCAL_EXECUTION_API_BASE_URL` from `src/config/endpoints.ts` — never production in integration tests.
- Import `ZyfaiSDK` from `../core/ZyfaiSDK` (working tree), not a published npm build.
- Use only public SDK methods; hardcode chain id and amounts per test file.
- Set `{ timeout: 180_000 }` on `describe` for async flows (deposits, handover, polling).

See `src/integration/get-protocols.integration.test.ts` for a minimal example.

### Cross-repo features

When a feature spans `zyfai-sdk`, `zyfai-api`, and optionally `predeployment-service`, follow the workspace skill **[functional-feature-verification](../.cursor/skills/functional-feature-verification/SKILL.md)** in the `zyfai-workspace` parent. It covers verification contracts, temporary diagnostics, local stack readiness, and the evidence report template.

| Command | What it runs |
| --- | --- |
| `npm run check` | typecheck + unit tests + build (every PR) |
| `npm run test:integration` | opt-in tests against local stack (feature work) |

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

PRs with user-facing SDK changes need a [changeset](docs/RELEASING.md) (`npm run changeset`).

## License

MIT
