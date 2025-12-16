# Zyfai SDK Documentation - Developer Reference

**Note:**

1. The sdk should support the test environment, would be linked to our staging environment, as well as prod environment, and would be linked to our prod environment.

2. Currently, our staging is pointing to the Base, Arbitrum, Plasma (and Sonic) mainnets, so even test environment safe wallet deployment would cost us a gas fee, but that I assume should be fine initially, unless an institutional client/developer exploits it.

3. We'd have to allow the dashboard where the api key is generated for the clients to have an option of the whitelist domains to allow calling the relevant endpoints, since the api key provided by Zyfai would be sitting in the client's ui.

---

## 🏗️ SDK Architecture

### Dual Backend Design

The SDK connects to two separate backends:

| Backend           | Purpose                                                  | API Version |
| ----------------- | -------------------------------------------------------- | ----------- |
| **Execution API** | Safe deployment, transactions, session keys, withdrawals | `/api/v1`   |
| **Data API**      | Earnings, opportunities, APY history, analytics          | `/api/v2`   |

### Initialization

```typescript
// 1. Initialize SDK with configuration
const sdk = new ZyfaiSDK({
  apiKey: "YOUR_API_KEY", // API key for both Execution API and Data API
  bundlerApiKey: "YOUR_BUNDLER_API_KEY", // Required for Safe deployment
  environment: "production", // or 'staging'
});

// 2. Connect account and authenticate (happens automatically)
// Option A: With private key (chainId required)
await sdk.connectAccount("0x...", 42161); // Automatically authenticates via SIWE

// Option B: With wallet provider (chainId defaults to 42161)
await sdk.connectAccount(walletProvider, 42161); // Automatically authenticates via SIWE

// 3. Call functions with explicit parameters
// The connected account is used only for signing, not for determining which user's data to fetch
await sdk.deploySafe("0xUserAddress", chainId);
await sdk.createSessionKey("0xUserAddress", chainId);
const positions = await sdk.getPositions("0xUserAddress");

// 4. Disconnect when done (optional)
await sdk.disconnectAccount(); // Clears wallet connection and JWT token
```

### Configuration Options

| Option          | Required | Description                                             |
| --------------- | -------- | ------------------------------------------------------- |
| `apiKey`        | Yes      | API key for both Execution API and Data API             |
| `bundlerApiKey` | No\*     | Pimlico API key (\*required for `deploySafe`)           |
| `environment`   | No       | `"production"` or `"staging"` (default: `"production"`) |

### API Endpoints

| Environment  | Execution API                | Data API                         |
| ------------ | ---------------------------- | -------------------------------- |
| `production` | `https://api.zyf.ai`         | `https://defiapi.zyf.ai`         |
| `staging`    | `https://staging-api.zyf.ai` | `https://staging-defiapi.zyf.ai` |

**Important:**

- **Automatic Authentication**: `connectAccount()` automatically performs SIWE (Sign-In with Ethereum) authentication and stores the JWT token
- **Browser vs Node.js**: The SDK automatically detects browser context and uses `window.location.origin` for SIWE domain/uri to match the browser's automatic `Origin` header
- **Environment-Aware Salt**: Safe addresses use environment-specific salts (`zyfai-staging` for staging, `zyfai` for production)
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
| `getOnchainEarnings`       | **Data API**  | Yes (JWT)\*   |
| `calculateOnchainEarnings` | **Data API**  | Yes (JWT)\*   |
| `getDailyEarnings`         | **Data API**  | Yes (JWT)\*   |
| `getDebankPortfolio`       | **Data API**  | Yes (JWT)\*   |
| `getSafeOpportunities`     | **Data API**  | No            |
| `getDegenStrategies`       | **Data API**  | No            |
| `getDailyApyHistory`       | **Data API**  | No            |
| `getRebalanceInfo`         | **Data API**  | No            |

\* JWT token is automatically forwarded from SIWE authentication

---

## 📚 API Functions

### 1. Deploy Safe Smart Wallet

Deploy an ERC-4337 with ERC-7579 launchpad + smart session module standard compliant Safe Smart Account for a user.

#### Function Signature

```typescript
deploySafe(
  userAddress: string,
  chainId: number,
): Promise<DeploySafeResponse>
```

#### Request Parameters

| Parameter     | Type   | Required | Description                      |
| ------------- | ------ | -------- | -------------------------------- |
| `userAddress` | string | ✅       | User's EOA address               |
| `chainId`     | number | ✅       | Target chain (8453, 42161, 9745) |

#### Response Type

```typescript
interface DeploySafeResponse {
  success: boolean;
  safeAddress: string;
  txHash: string;
  status: "deployed" | "failed";
  /** True if the Safe was already deployed (no new deployment needed) */
  alreadyDeployed?: boolean;
}
```

**Note:** The SDK proactively checks if the Safe is already deployed before attempting deployment. If it exists, it returns `alreadyDeployed: true` without making any transactions.

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
  "status": "deployed",
  "alreadyDeployed": true
}
```

---

### 2. Create Session Key

Create a session key with limited permissions for delegated transactions.

**Endpoints auto-invoked by SDK:**

- `GET /api/v1/session-keys/config`
- `POST /api/v1/session-keys/add`

#### Simple Usage (Recommended)

Automatically fetches optimal session configuration from ZyFAI API:

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
const result = await sdk.createSessionKey(userAddress, 42161);

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
  tokenAddress: string,
  amount: string
): Promise<DepositResponse>
```

#### Request Parameters

| Parameter      | Type   | Required | Description                                                                    |
| -------------- | ------ | -------- | ------------------------------------------------------------------------------ |
| `userAddress`  | string | ✅       | User's EOA address                                                             |
| `chainId`      | number | ✅       | Chain to deposit on                                                            |
| `tokenAddress` | string | ✅       | Token contract address                                                         |
| `amount`       | string | ✅       | Amount in least decimal units (e.g., "100000000" for 100 USDC with 6 decimals) |

#### Response Type

```typescript
interface DepositResponse {
  success: boolean;
  txHash: string;
  smartWallet: string;
  amount: string;
  status: "pending" | "confirmed" | "failed";
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

#### Function Signature

```typescript
withdrawFunds(
  userAddress: string,
  chainId: number,
  amount?: string,
  receiver?: string
): Promise<WithdrawResponse>
```

#### Request Parameters

| Parameter     | Type   | Required | Description                                                          |
| ------------- | ------ | -------- | -------------------------------------------------------------------- |
| `userAddress` | string | ✅       | User's EOA address                                                   |
| `chainId`     | number | ✅       | Chain to withdraw from                                               |
| `amount`      | string | ❌       | Amount in least decimal units to withdraw (omit for full withdrawal) |
| `receiver`    | string | ❌       | Receiver address (defaults to user's EOA)                            |

#### Response Type

```typescript
interface WithdrawResponse {
  success: boolean;
  message: string; // e.g., "Withdrawal request sent"
  txHash?: string; // May not be immediately available (async processing)
  type: "full" | "partial";
  amount: string;
  receiver: string;
  status: "pending" | "confirmed" | "failed";
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

```typescript
const result = await sdk.getSmartWalletByEOA(eoaAddress);
// Returns: { success, eoa, smartWallets }
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
// Returns: { success, chainId, strategyType: "safe", data }
```

---

### 18. Get Degen Strategies

```typescript
const strategies = await sdk.getDegenStrategies(chainId);
// Returns: { success, chainId, strategyType: "degen", data }
```

---

### 19. Get Daily APY History

```typescript
const apyHistory = await sdk.getDailyApyHistory(walletAddress, "30D");
// Returns: { success, walletAddress, history, totalDays, averageWeightedApy }
```

---

### 20. Get Rebalance Info

```typescript
const rebalances = await sdk.getRebalanceInfo(false); // same-chain
const crossChain = await sdk.getRebalanceInfo(true); // cross-chain
// Returns: { success, data, count }
```

---

### 21. Get Rebalance Frequency

```typescript
const frequency = await sdk.getRebalanceFrequency(walletAddress);
// Returns: { success, walletAddress, tier, frequency, description? }
```

---

### 22. Get Debank Portfolio (Premium)

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
await sdk.deploySafe(userAddress, 8453);
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
await sdk.connectAccount(provider, 42161);

const userAddress = "0xUser...";
await sdk.deploySafe(userAddress, 42161);

// Disconnect when done
await sdk.disconnectAccount();
```

### Example 3: Complete Deposit & Yield Flow

```typescript
const sdk = new ZyfaiSDK({
  apiKey: API_KEY,
  bundlerApiKey: BUNDLER_API_KEY,
  environment: "production",
});

// Connect wallet (automatically authenticates via SIWE)
await sdk.connectAccount(privateKey, 42161);

const userAddress = "0xUser...";
const chainId = 42161; // Arbitrum
const USDC = "0xaf88d065e77c8cc2239327c5edb3a432268e5831";

// 1. Deploy Safe
const wallet = await sdk.getSmartWalletAddress(userAddress, chainId);
if (!wallet.isDeployed) {
  await sdk.deploySafe(userAddress, chainId);
}

// 2. Create session key (uses existing authentication)
await sdk.createSessionKey(userAddress, chainId);

// 3. Deposit funds - 100 USDC (least decimal units: 100 * 10^6)
const depositResult = await sdk.depositFunds(
  userAddress,
  chainId,
  USDC,
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

  constructor(apiKey: string, bundlerApiKey: string) {
    this.sdk = new ZyfaiSDK({
      apiKey,
      bundlerApiKey,
    });
  }

  async connectAccount(account: string | any, chainId: number = 42161) {
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
    tokenAddress: string,
    amount: string
  ) {
    await this.sdk.depositFunds(userAddress, chainId, tokenAddress, amount);
    return await this.sdk.getPositions(userAddress, chainId);
  }

  async getUserStats(userAddress: string) {
    const positions = await this.sdk.getPositions(userAddress);
    return { positions };
  }

  async withdrawFunds(
    userAddress: string,
    chainId: number,
    amount?: string,
    receiver?: string
  ) {
    const result = await this.sdk.withdrawFunds(
      userAddress,
      chainId,
      amount,
      receiver
    );
    // Handle async withdrawal
    if (!result.txHash) {
      console.log("Withdrawal initiated:", result.message);
      // Could poll getHistory() to track transaction
    }
    return result;
  }
}
```
