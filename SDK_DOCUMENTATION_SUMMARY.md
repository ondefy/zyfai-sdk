# Zyfai SDK Documentation - Developer Reference

**Note:**

1. The SDK connects to the production environment only.

2. We'd have to allow the dashboard where the api key is generated for the clients to have an option of the whitelist domains to allow calling the relevant endpoints, since the api key provided by Zyfai would be sitting in the client's ui.

---

## 🏗️ SDK Architecture

### Dual Backend Design

The SDK connects to two separate backends:

| Backend           | Purpose                                                  | API Version |
| ----------------- | -------------------------------------------------------- | ----------- |
| **Execution API** | Safe deployment, transactions, session keys, withdrawals | `/api/v1`   |
| **Data API**      | Earnings, opportunities, APY history, analytics          | `/api/v2`   |

### Initialization

The SDK can be initialized with either a configuration object or just the API key string:

```typescript
// Option 1: Full configuration object
const sdk = new ZyfaiSDK({
  apiKey: "YOUR_API_KEY",
  // rpcUrls is optional - only needed for local operations like getSmartWalletAddress
  rpcUrls: {
    // Optional: Custom RPC URLs to avoid rate limiting from public RPCs
    8453: "https://base-mainnet.g.alchemy.com/v2/YOUR_KEY", // Base
    42161: "https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY", // Arbitrum
    9745: "https://your-plasma-rpc-provider.com", // Plasma
  },
});

// Option 2: Simple string initialization (API key only)
const sdk = new ZyfaiSDK("YOUR_API_KEY");

// 2. Connect account and authenticate (happens automatically)
// Option A: With private key (chainId required)
await sdk.connectAccount("0x...", 8453); // Automatically authenticates via SIWE

// Option B: With wallet provider (chainId defaults to 8453)
await sdk.connectAccount(walletProvider, 8453); // Automatically authenticates via SIWE

// 3. Call functions with explicit parameters
// The connected account is used only for signing, not for determining which user's data to fetch
await sdk.deploySafe("0xUserAddress", chainId);
await sdk.createSessionKey("0xUserAddress", chainId);
const positions = await sdk.getPositions("0xUserAddress");

// 4. Disconnect when done (optional)
await sdk.disconnectAccount(); // Clears wallet connection and JWT token
```

### Configuration Options

| Option    | Required | Description                                                                                   |
| --------- | -------- | --------------------------------------------------------------------------------------------- |
| `apiKey`  | Yes      | API key for both Execution API and Data API                                                   |
| `rpcUrls` | No       | Custom RPC URLs per chain to avoid rate limiting (optional, only needed for local operations) |
|           |          | - `8453` (string): Base Mainnet RPC URL                                                       |
|           |          | - `42161` (string): Arbitrum One RPC URL                                                      |
|           |          | - `9745` (string): Plasma Mainnet RPC URL                                                     |

**Important:**

- **Automatic Authentication**: `connectAccount()` automatically performs SIWE (Sign-In with Ethereum) authentication and stores the JWT token
- **Browser vs Node.js**: The SDK automatically detects browser context and uses `window.location.origin` for SIWE domain/uri to match the browser's automatic `Origin` header
- **Production Environment**: The SDK connects to the production environment only
- **Least Decimal Units**: Deposit and withdrawal amounts use raw token units (e.g., 1 USDC = 1000000)
- **JWT Token Forwarding**: The SDK automatically forwards JWT tokens to Data API endpoints that require authentication
- **Async Withdrawals**: Withdrawals are processed asynchronously - the `txHash` may not be immediately available in the response
- The SDK does not connect to wallets directly. The client handles wallet connection on their frontend and passes the provider.

### Method to API Mapping

| Method                     | API           | Requires Auth |
| -------------------------- | ------------- | ------------- |
| `deploySafe`               | Execution API | No            |
| `getSmartWalletAddress`    | Local         | No            |
| `createSessionKey`         | Execution API | Yes (SIWE)    |
| `depositFunds`             | Execution API | Yes (SIWE)    |
| `withdrawFunds`            | Execution API | Yes (SIWE)    |
| `getAvailableProtocols`    | Execution API | No            |
| `getPositions`             | Execution API | No            |
| `getUserDetails`           | Execution API | No            |
| `getTVL`                   | Execution API | No            |
| `getVolume`                | Execution API | No            |
| `getFirstTopup`            | Execution API | No            |
| `getHistory`               | Execution API | No            |
| `getActiveWallets`         | Execution API | No            |
| `getSmartWalletByEOA`      | Execution API | No            |
| `getRebalanceFrequency`    | Execution API | No            |
| `addWalletToSdk`           | Execution API | Yes (SDK Key) |
| `getOnchainEarnings`       | **Data API**  | Yes (JWT)\*   |
| `calculateOnchainEarnings` | **Data API**  | Yes (JWT)\*   |
| `getDailyEarnings`         | **Data API**  | Yes (JWT)\*   |
| `getDebankPortfolio`       | **Data API**  | Yes (JWT)\*   |
| `getSafeOpportunities`     | **Data API**  | No            |
| `getDegenStrategies`       | **Data API**  | No            |
| `getDailyApyHistory`       | **Data API**  | No            |
| `getAPYPerStrategy`        | **Data API**  | No            |

\* JWT token is automatically forwarded from SIWE authentication

---

## 📚 API Functions

### 1. Deploy Safe Smart Wallet

Deploy an ERC-4337 with ERC-7579 launchpad + smart session module standard compliant Safe Smart Account for a user.

**Note:** Safe deployment is now handled by the backend API, which manages all RPC calls and bundler interactions. This avoids rate limiting issues.

#### Function Signature

```typescript
deploySafe(
  userAddress: string,
  chainId: number,
  strategy?: Strategy
): Promise<DeploySafeResponse>
```

#### Request Parameters

| Parameter     | Type     | Required | Description                                                                     |
| ------------- | -------- | -------- | ------------------------------------------------------------------------------- |
| `userAddress` | string   | ✅       | User's EOA address                                                              |
| `chainId`     | number   | ✅       | Target chain (8453, 42161, 9745)                                                |
| `strategy`    | Strategy | ❌       | Strategy selection: `"conservative"` (default) or `"aggressive"` |

#### Response Type

```typescript
interface DeploySafeResponse {
  success: boolean;
  safeAddress: string;
  txHash: string;
  status: "deployed" | "failed";
}
```

**Strategy Options:**

- `"conservative"` (default): Low-risk, stable yield strategy
- `"aggressive"`: High-risk, high-reward strategy

**Note:**

- The backend API proactively checks if the Safe is already deployed before attempting deployment. If it exists, it returns early without making any transactions.
- User must be authenticated (automatically done via `connectAccount()`)
- Backend handles all RPC calls, avoiding rate limiting issues
- If no strategy is provided, `"conservative"` is used as the default

#### Example Response (New Deployment)

```json
{
  "success": true,
  "safeAddress": "0x9f3597d54c28a7945d9Ddf384ca0eD7e66f43776",
  "txHash": "0x26180d7afd86cebff4903c34b1863671800631a2e4a84cbe809bf39a106c7e8e",
  "status": "deployed"
}
```

#### Example Response (Already Deployed)

```json
{
  "success": true,
  "safeAddress": "0x9f3597d54c28a7945d9Ddf384ca0eD7e66f43776",
  "txHash": "0x0",
  "status": "deployed"
}
```

---

### 2. Create Session Key

Create a session key with limited permissions for delegated transactions.

**Endpoints auto-invoked by SDK:**

- `GET /api/v1/session-keys/config`
- `POST /api/v1/session-keys/add`

#### Simple Usage (Recommended)

Automatically fetches optimal session configuration from Zyfai API:

```typescript
createSessionKey(
  userAddress: string,
  chainId: number
): Promise<SessionKeyResponse>
```

**Process:**

1. **Uses existing SIWE authentication** - Already done via `connectAccount()`
2. **Checks `hasActiveSessionKey`** from login response - Returns early if session key already exists
3. SDK calls `/session-keys/config` (JWT protected) to fetch personalized configuration
4. SDK signs the session key with the connected wallet
5. SDK calls `/session-keys/add` to activate the session immediately
6. Updates local state to track active session key

**Requirements:**

- **Authentication**: User must be connected via `connectAccount()` (which automatically authenticates)
- **User Profile**: User record must have `smartWallet` and `chainId` fields populated
  - Automatically set by `deploySafe` method

**Important**:

- The SDK proactively checks if the user already has an active session key before doing any work
- If `hasActiveSessionKey` is true (from login response), returns immediately with `alreadyActive: true`
- When `alreadyActive` is true, `sessionKeyAddress` and `signature` are not available in the response

#### Session Type

```typescript
type Session = {
  sessionValidator: Address;
  sessionValidatorInitData: Hex;
  salt: Hex;
  userOpPolicies: PolicyData[];
  erc7739Policies: ERC7739Data;
  actions: ActionData[];
  permitERC4337Paymaster: boolean;
  chainId: bigint;
};

type PolicyData = {
  policy: Address;
  initData: Hex;
};

type ERC7739Data = {
  allowedERC7739Content: ERC7739Context[];
  erc1271Policies: PolicyData[];
};

type ERC7739Context = {
  appDomainSeparator: Hex;
  contentName: string[];
};

type ActionData = {
  actionTargetSelector: Hex;
  actionTarget: Address;
  actionPolicies: PolicyData[];
};

// Note: Address and Hex are string types from viem
type Address = `0x${string}`;
type Hex = `0x${string}`;
```

#### Response Type

```typescript
interface SessionKeyResponse {
  success: boolean;
  /** Session key address (not available when alreadyActive is true) */
  sessionKeyAddress?: string;
  /** Signature (not available when alreadyActive is true) */
  signature?: string;
  sessionNonces?: bigint[];
  userId?: string;
  sessionActivation?: {
    id: string;
    hash: string;
    signer: string;
    nonces: number[];
    expiresAt: string;
    txHash?: string;
    isActive: boolean;
    isEnabled: boolean;
  };
  /** Message when session key already exists */
  message?: string;
  /** True if a session key was already active for this user */
  alreadyActive?: boolean;
}
```

#### Usage Examples

**Simple (Recommended):**

```typescript
const result = await sdk.createSessionKey(userAddress, 8453);

// Check if session key already existed
if (result.alreadyActive) {
  console.log("Session key already active:", result.message);
} else {
  console.log("New session created:", result.signature);
}
```

---

### 3. Get Smart Wallet Address

Retrieve the user's Safe Smart Wallet address for depositing funds.

#### Function Signature

```typescript
getSmartWalletAddress(
  userAddress: string,
  chainId: number
): Promise<SmartWalletResponse>
```

#### Request Parameters

| Parameter     | Type   | Required | Description        |
| ------------- | ------ | -------- | ------------------ |
| `userAddress` | string | ✅       | User's EOA address |
| `chainId`     | number | ✅       | Target chain ID    |

#### Response Type

```typescript
interface SmartWalletResponse {
  address: string;
  isDeployed: boolean;
}
```

**Note:** Supported chains are Arbitrum (42161), Base (8453), and Plasma (9745).

#### Example Response

```json
{
  "address": "0x9f3597d54c28a7945d9Ddf384ca0eD7e66f43776",
  "isDeployed": true
}
```

---

### 4. Deposit Funds

Transfer tokens from user's EOA to their Smart Wallet and log the deposit.

#### Function Signature

```typescript
depositFunds(
  userAddress: string,
  chainId: number,
  amount: string
): Promise<DepositResponse>
```

**Token Selection:**

Token address is automatically selected based on chain:

- **Base (8453) and Arbitrum (42161)**: USDC
- **Plasma (9745)**: USDT

#### Request Parameters

| Parameter     | Type   | Required | Description                                                                    |
| ------------- | ------ | -------- | ------------------------------------------------------------------------------ |
| `userAddress` | string | ✅       | User's EOA address                                                             |
| `chainId`     | number | ✅       | Chain to deposit on                                                            |
| `amount`      | string | ✅       | Amount in least decimal units (e.g., "100000000" for 100 USDC with 6 decimals) |

#### Response Type

```typescript
interface DepositResponse {
  success: boolean;
  txHash: string;
  smartWallet: string;
  amount: string;
}
```

### 5. Get Available Protocols

Retrieve all available DeFi protocols and pools for a specific chain.

#### Function Signature

```typescript
getAvailableProtocols(
  chainId: number
): Promise<ProtocolsResponse>
```

#### Request Parameters

| Parameter | Type   | Required | Description     |
| --------- | ------ | -------- | --------------- |
| `chainId` | number | ✅       | Target chain ID |

#### Response Type

```typescript
interface Protocol {
  id: string;
  name: string;
  type: string;
  chains: number[];
  strategies?: string[];
  description?: string;
  imageUrl?: string;
  website?: string;
  pools?: Array<{
    id: string;
    name: string;
    asset: string;
    apy?: number;
    tvl?: string;
  }>;
}

interface ProtocolsResponse {
  success: boolean;
  chainId: number;
  protocols: Protocol[];
}
```

**Note:** Each protocol entry includes descriptive metadata (type, chains, strategies, web links, and optional pools) that can be surfaced directly in client UIs.

---

### 6. Get Positions

Retrieve all active DeFi positions for a user.

#### Function Signature

```typescript
getPositions(
  userAddress: string,
  chainId?: number
): Promise<PositionsResponse>
```

#### Request Parameters

| Parameter     | Type   | Required | Description                           |
| ------------- | ------ | -------- | ------------------------------------- |
| `userAddress` | string | ✅       | User's EOA address                    |
| `chainId`     | number | ❌       | Filter by chain (omit for all chains) |

#### Response Type

```typescript
interface PositionSlot {
  protocol_id?: string;
  protocol_name?: string;
  pool?: string;
  token_symbol?: string;
  underlyingAmount?: string;
  pool_apy?: number;
  pool_tvl?: string;
}

interface Position {
  chain?: string;
  strategy?: string;
  smartWallet?: string;
  positions: PositionSlot[];
}

interface PositionsResponse {
  success: boolean;
  userAddress: string;
  positions: Position[];
}
```

**Note:** Each `Position` represents a smart wallet + strategy bundle with nested slots. Use `underlyingAmount` from each slot as the canonical token balance.

---

### 7. Withdraw Funds

Initiate a full or partial withdrawal from active positions to user's EOA. **Note: Withdrawals are processed asynchronously by the backend.**
Funds are always withdrawn to the Safe owner's address (userAddress).

#### Function Signature

```typescript
withdrawFunds(
  userAddress: string,
  chainId: number,
  amount?: string
): Promise<WithdrawResponse>
```

#### Request Parameters

| Parameter     | Type   | Required | Description                                                          |
| ------------- | ------ | -------- | -------------------------------------------------------------------- |
| `userAddress` | string | ✅       | User's EOA address                                                   |
| `chainId`     | number | ✅       | Chain to withdraw from                                               |
| `amount`      | string | ❌       | Amount in least decimal units to withdraw (omit for full withdrawal) |

#### Response Type

```typescript
interface WithdrawResponse {
  success: boolean;
  message: string; // e.g., "Withdrawal request sent"
  txHash?: string; // May not be immediately available (async processing)
  type: "full" | "partial";
  amount: string;
}
```

**Important Notes:**

- `withdrawFunds` uses existing JWT token (from `connectAccount()`)
- Calls `/users/withdraw` (full) or `/users/partial-withdraw` (partial)
- Withdrawals are processed asynchronously - `txHash` may be `undefined` initially
- Check the `message` field for status information
- Use `getHistory()` to track the withdrawal transaction once processed

---

### 8. Get User Details

Retrieve authenticated user details.

#### Function Signature

```typescript
getUserDetails(): Promise<UserDetailsResponse>
```

#### Response Type

```typescript
interface UserDetailsResponse {
  success: boolean;
  user: {
    id: string;
    address: string;
    smartWallet: string;
    chains: number[];
    protocols: Protocol[];
    hasActiveSessionKey: boolean;
    autoSelectProtocols: boolean;
    // ... additional fields
  };
}
```

---

### 9. Get TVL & Volume

```typescript
// Get total value locked
const tvl = await sdk.getTVL();
// Returns: { success, totalTvl, byChain? }

// Get total volume
const volume = await sdk.getVolume();
// Returns: { success, volumeInUSD }
```

---

### 10. Get Active Wallets

```typescript
const wallets = await sdk.getActiveWallets(chainId);
// Returns: { success, chainId, wallets, count }
```

---

### 11. Get Smart Wallets by EOA

Get the smart wallet address associated with an EOA address.

```typescript
const result = await sdk.getSmartWalletByEOA(eoaAddress);
// Returns: { success, eoa, smartWallet, chains }
// smartWallet: Address | null
// chains: number[]
```

---

### 12. Get First Topup

```typescript
const firstTopup = await sdk.getFirstTopup(walletAddress, chainId);
// Returns: { success, walletAddress, date, amount?, chainId? }
```

---

### 13. Get History

```typescript
const history = await sdk.getHistory(walletAddress, chainId, {
  limit: 50,
  offset: 0,
  fromDate: "2024-01-01",
  toDate: "2024-12-31",
});
// Returns: { success, walletAddress, data, total }
```

---

### 14. Get Onchain Earnings

```typescript
const earnings = await sdk.getOnchainEarnings(walletAddress);
// Returns: { success, data: { walletAddress, totalEarnings, currentEarnings, lifetimeEarnings, ... } }
```

---

### 15. Calculate Onchain Earnings

Trigger recalculation of earnings.

```typescript
const updated = await sdk.calculateOnchainEarnings(walletAddress);
```

---

### 16. Get Daily Earnings

```typescript
const daily = await sdk.getDailyEarnings(
  walletAddress,
  "2024-01-01",
  "2024-01-31"
);
// Returns: { success, walletAddress, data, count, filters }
```

---

### 17. Get Safe Opportunities

```typescript
const opportunities = await sdk.getSafeOpportunities(chainId);
// Returns: { success, chainId, strategyType: "conservative", data }
```

---

### 18. Get Degen Strategies

```typescript
const strategies = await sdk.getDegenStrategies(chainId);
// Returns: { success, chainId, strategyType: "aggressive", data }
```

---

### 19. Get Daily APY History

```typescript
const apyHistory = await sdk.getDailyApyHistory(walletAddress, "30D");
// Returns: { success, walletAddress, history, totalDays, averageWeightedApy }
```

---

### 20. Get APY Per Strategy

```typescript
const apyPerStrategy = await sdk.getAPYPerStrategy(false, 7, "conservative");
// Returns: { success, count, data }
```

---

### 21. Get Rebalance Frequency

```typescript
const frequency = await sdk.getRebalanceFrequency(walletAddress);
// Returns: { success, walletAddress, tier, frequency, description? }
```

---

### 22. Add Wallet to SDK API Key

Add a wallet address to the SDK API key's allowedWallets list. This endpoint requires SDK API key authentication (API key starting with "zyfai\_").

#### Function Signature

```typescript
addWalletToSdk(walletAddress: string): Promise<AddWalletToSdkResponse>
```

#### Request Parameters

| Parameter       | Type   | Required | Description                               |
| --------------- | ------ | -------- | ----------------------------------------- |
| `walletAddress` | string | ✅       | Wallet address to add to the allowed list |

#### Response Type

```typescript
interface AddWalletToSdkResponse {
  success: boolean;
  message: string; // Status message
}
```

#### Usage Examples

```typescript
const result = await sdk.addWalletToSdk("0x1234...");
console.log(result.message); // "Wallet successfully added to allowed list"
```

**Note:** This method is only available when using an SDK API key (starts with "zyfai\_"). Regular API keys cannot use this endpoint.

---

### 23. Get Debank Portfolio (Premium)

```typescript
const portfolio = await sdk.getDebankPortfolio(walletAddress);
// Returns: { success, walletAddress, totalValueUsd, chains }
```

**Note:** This is a premium endpoint requiring additional authorization.

---

## 🎯 Integration Examples

### Example 1: Simple Usage with Private Key

```typescript
const sdk = new ZyfaiSDK(API_KEY);
// Connect and authenticate automatically
await sdk.connectAccount(PRIVATE_KEY, 8453);

const userAddress = "0xUser...";
// Deploy with default conservative strategy
await sdk.deploySafe(userAddress, 8453);
// Or deploy with aggressive strategy
await sdk.deploySafe(userAddress, 8453, "aggressive");
const wallet = await sdk.getSmartWalletAddress(userAddress, 8453);
console.log("Deposit to:", wallet.address);

// Disconnect when done
await sdk.disconnectAccount();
```

### Example 2: With Wallet Provider (Client Integration)

```typescript
// Client handles wallet connection on their frontend
const provider = await connector.getProvider(); // from wagmi, web3-react, etc.

const sdk = new ZyfaiSDK(API_KEY);
// Connect and authenticate automatically
await sdk.connectAccount(provider, 8453);

const userAddress = "0xUser...";
await sdk.deploySafe(userAddress, 8453);

// Disconnect when done
await sdk.disconnectAccount();
```

### Example 3: Complete Deposit & Yield Flow

```typescript
const sdk = new ZyfaiSDK({
  apiKey: API_KEY,
  rpcUrls: {
    // Optional: Use your own RPC providers to avoid rate limiting
    8453: "https://base-mainnet.g.alchemy.com/v2/YOUR_KEY",
    42161: "https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY",
    9745: "https://your-plasma-rpc-provider.com",
  },
});

// Connect wallet (automatically authenticates via SIWE)
await sdk.connectAccount(privateKey, 8453);

const userAddress = "0xUser...";
const chainId = 8453; // Base

// 1. Deploy Safe
const wallet = await sdk.getSmartWalletAddress(userAddress, chainId);
if (!wallet.isDeployed) {
  // Deploy with default conservative strategy
  await sdk.deploySafe(userAddress, chainId);
  // Or deploy with aggressive strategy: await sdk.deploySafe(userAddress, chainId, "aggressive");
}

// 2. Create session key (uses existing authentication)
await sdk.createSessionKey(userAddress, chainId);

// 3. Deposit funds - 100 USDC (least decimal units: 100 * 10^6)
// Token address is automatically selected (USDC for Base/Arbitrum, USDT for Plasma)
const depositResult = await sdk.depositFunds(
  userAddress,
  chainId,
  "100000000" // 100 USDC with 6 decimals
);

// 4. Monitor positions
const positions = await sdk.getPositions(userAddress, chainId);
console.log("Active positions:", positions.positions);

// 5. Withdraw - 50 USDC (least decimal units: 50 * 10^6)
const withdrawResult = await sdk.withdrawFunds(
  userAddress,
  chainId,
  "50000000" // 50 USDC with 6 decimals
);

if (withdrawResult.success) {
  console.log("Withdrawal initiated:", withdrawResult.message);
  if (withdrawResult.txHash) {
    console.log("Transaction hash:", withdrawResult.txHash);
  }
}

// 6. Disconnect when done
await sdk.disconnectAccount();
```

**Notes:**

- All amounts must be in least decimal units (e.g., USDC: 1 token = 1000000)
- `connectAccount()` automatically authenticates via SIWE
- SDK reuses authentication token for all subsequent calls
- Withdrawals are async - `txHash` may not be immediately available
- Use `disconnectAccount()` to clear wallet connection and JWT token

### Example 4: Service Pattern

```typescript
class YieldService {
  private sdk: ZyfaiSDK;

  constructor(apiKey: string) {
    this.sdk = new ZyfaiSDK({
      apiKey,
    });
  }

  async connectAccount(account: string | any, chainId: number = 8453) {
    // Automatically authenticates via SIWE
    await this.sdk.connectAccount(account, chainId);
  }

  async disconnectAccount() {
    // Clear wallet connection and JWT token
    await this.sdk.disconnectAccount();
  }

  async onboardUser(userAddress: string, chainId: number) {
    await this.sdk.deploySafe(userAddress, chainId);
    await this.sdk.createSessionKey(userAddress, chainId);
    return await this.sdk.getSmartWalletAddress(userAddress, chainId);
  }

  async depositAndMonitor(
    userAddress: string,
    chainId: number,
    amount: string
  ) {
    // Token address is automatically selected based on chain
    await this.sdk.depositFunds(userAddress, chainId, amount);
    return await this.sdk.getPositions(userAddress, chainId);
  }

  async getUserStats(userAddress: string) {
    const positions = await this.sdk.getPositions(userAddress);
    return { positions };
  }

  async withdrawFunds(userAddress: string, chainId: number, amount?: string) {
    // Funds are always withdrawn to the Safe owner's address (userAddress)
    const result = await this.sdk.withdrawFunds(userAddress, chainId, amount);
    // Handle async withdrawal
    if (!result.txHash) {
      console.log("Withdrawal initiated:", result.message);
      // Could poll getHistory() to track transaction
    }
    return result;
  }
}
```
