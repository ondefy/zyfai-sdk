# Zyfai SDK Documentation - Developer Reference

**Note:**

1. The sdk should support the test environment, would be linked to our staging environment, as well as prod environment, and would be linked to our prod environment.

2. Currently, our staging is pointing to the Base, Arbitrum, Plasma (and Sonic) mainnets, so even test environment safe wallet deployment would cost us a gas fee, but that I assume should be fine initially, unless an institutional client/developer exploits it.

3. We'd have to allow the dashboard where the api key is generated for the clients to have an option of the whitelist domains to allow calling the relevant endpoints, since the api key provided by Zyfai would be sitting in the client's ui.

---

## 🏗️ SDK Architecture

### Flexible, Parameter-Based Design

```typescript
// 1. Initialize SDK with configuration
const sdk = new ZyfaiSDK({
  apiKey: "YOUR_API_KEY",
  bundlerApiKey: "YOUR_BUNDLER_API_KEY", // Required for Safe deployment
  environment: "production", // or 'staging'
});

// 2. Connect account (separate step)
// Option A: With private key (chainId required)
await sdk.connectAccount("0x...", 42161);

// Option B: With wallet provider (chainId defaults to 42161)
await sdk.connectAccount(walletProvider, 42161);

// 3. Call functions with explicit parameters
// The connected account is used only for signing, not for determining which user's data to fetch
await sdk.deploySafe("0xUserAddress", chainId);
await sdk.createSessionKey("0xUserAddress", chainId);
const earnings = await sdk.getEarnings("0xUserAddress");
```

**Important:**

- **Environment-Based Endpoints**: API URLs are hardcoded based on environment:
  - `production` → `https://api.zyf.ai`
  - `staging` → `https://staging-api.zyf.ai`
- **SIWE Authentication**: Session key creation requires SIWE (Sign-In with Ethereum) authentication
- **Least Decimal Units**: Deposit and withdrawal amounts use raw token units (e.g., 1 USDC = 1000000)
- The SDK does not connect to wallets directly. The client handles wallet connection on their frontend and passes the provider.

---

## 📚 API Functions

### 1. Deploy Safe Smart Wallet

Deploy an ERC-4337 compliant Safe Smart Account for a user.

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
}
```

#### Example Response

```json
{
  "success": true,
  "safeAddress": "0x9f3597d54c28a7945d9Ddf384ca0eD7e66f43776",
  "txHash": "https://basescan.org/tx/0x26180d7afd86cebff4903c34b1863671800631a2e4a84cbe809bf39a106c7e8e",
  "status": "deployed"
}
```

---

### 2. Create Session Key

Create a session key with limited permissions for delegated transactions.

**Endpoint**: `GET /api/v1/data/config?walletAddress={safeAddress}&chainId={chainId}`

#### Simple Usage (Recommended)

Automatically fetches optimal session configuration from ZyFAI API:

```typescript
createSessionKey(
  userAddress: string,
  chainId: number
): Promise<SessionKeyResponse>
```

**Process:**

1. **Authenticates via SIWE** - Creates user record if it doesn't exist
2. SDK calculates the Safe address for the user
3. SDK calls `/data/config` with `walletAddress` (Safe address) and `chainId`
4. SDK receives session configuration from API
5. SDK signs the session key with the connected wallet

**Requirements:**
- **SIWE Authentication**: User must sign a message to authenticate (handled automatically)
- **User Profile**: User record must have `smartWallet` and `chainId` fields populated
  - Automatically set by `deploySafe` method
  - Or manually set via `updateUserProfile` method

**Important**: The `/data/config` endpoint queries the database for a user with matching `smartWallet` + `chainId`. If the user record doesn't exist or is missing these fields, you'll get a "User not found" error.

#### Advanced Usage (Custom Configuration)

For custom permissions and manual session configuration:

```typescript
createSessionKeyWithConfig(
  userAddress: string,
  chainId: number,
  sessions: Session[]
): Promise<SessionKeyResponse>
```

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
  sessionKeyAddress: string;
  signature: string;
  sessionNonces?: bigint[];
}
```

#### Usage Examples

**Simple (Recommended):**

```typescript
// No manual configuration needed
const result = await sdk.createSessionKey(userAddress, 42161);
console.log("Signature:", result.signature);
```

**Advanced (Custom Config):**

```typescript
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
interface ProtocolsResponse {
  success: boolean;
  chainId: number;
  protocols: Array<{
    id: string;
    name: string;
    description: string;
    tvl: string;
    minApy: number;
    maxApy: number;
    pools: Array<{
      id: string;
      name: string;
      asset: string;
      apy: number;
      tvl: string;
    }>;
  }>;
}
```

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
interface PositionsResponse {
  success: boolean;
  userAddress: string;
  totalValueUsd: number;
  positions: Array<{
    id: string;
    protocol: string;
    pool: string;
    chainId: number;
    asset: {
      address: string;
      symbol: string;
      decimals: number;
    };
    amount: string;
    valueUsd: number;
    apy: number;
    unrealizedEarnings: number;
    lastUpdate: number;
  }>;
}
```

---

### 7. Get Earnings

Retrieve earnings summary for a user.

#### Function Signature

```typescript
getEarnings(
  userAddress: string,
  chainId?: number
): Promise<EarningsResponse>
```

#### Request Parameters

| Parameter     | Type   | Required | Description                           |
| ------------- | ------ | -------- | ------------------------------------- |
| `userAddress` | string | ✅       | User's EOA address                    |
| `chainId`     | number | ❌       | Filter by chain (omit for all chains) |

#### Response Type

```typescript
interface EarningsResponse {
  success: boolean;
  userAddress: string;
  totalEarningsUsd: number;
  unrealizedEarningsUsd: number;
  realizedEarningsUsd: number;
}
```

---

### 8. Withdraw Funds

Execute a full or partial withdrawal from active positions to user's EOA.

#### Function Signature

```typescript
withdrawFunds(
  userAddress: string,
  chainId: number,
  amount?: string,
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
  txHash: string;
  type: "full" | "partial";
  amount: string;
  receiver: string;
  status: "pending" | "confirmed" | "failed";
}
```

---

## 🎯 Integration Examples

### Example 1: Simple Usage with Private Key

```typescript
const sdk = new ZyfaiSDK(API_KEY);
await sdk.connectAccount(PRIVATE_KEY);

const userAddress = "0xUser...";
await sdk.deploySafe(userAddress, 8453);
const wallet = await sdk.getSmartWalletAddress(userAddress, 8453);
console.log("Deposit to:", wallet.address);
```

### Example 2: With Wallet Provider (Client Integration)

```typescript
// Client handles wallet connection on their frontend
const provider = await connector.getProvider(); // from wagmi, web3-react, etc.

const sdk = new ZyfaiSDK(API_KEY);
await sdk.connectAccount(provider, 42161);

const userAddress = "0xUser...";
await sdk.deploySafe(userAddress, 42161);
```

### Example 3: Complete Deposit & Yield Flow

```typescript
const sdk = new ZyfaiSDK({
  apiKey: API_KEY,
  bundlerApiKey: BUNDLER_API_KEY,
  environment: "production",
});

// Connect wallet
await sdk.connectAccount(privateKey, 42161);

const userAddress = "0xUser...";
const chainId = 42161; // Arbitrum
const USDC = "0xaf88d065e77c8cc2239327c5edb3a432268e5831";

// 1. Deploy Safe
const wallet = await sdk.getSmartWalletAddress(userAddress, chainId);
if (!wallet.isDeployed) {
  await sdk.deploySafe(userAddress, chainId);
}

// 2. Create session key (automatic SIWE authentication)
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

// 5. Track earnings
const earnings = await sdk.getEarnings(userAddress, chainId);
console.log("Total earnings:", earnings.totalEarningsUsd);

// 6. Withdraw - 50 USDC (least decimal units: 50 * 10^6)
const withdrawResult = await sdk.withdrawFunds(
  userAddress,
  chainId,
  "50000000" // 50 USDC with 6 decimals
);
```

**Notes:**

- All amounts must be in least decimal units (e.g., USDC: 1 token = 1000000)
- Session key creation requires SIWE signature on first call
- SDK reuses authentication token for subsequent calls

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
    await this.sdk.connectAccount(account, chainId);
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
    const [positions, earnings] = await Promise.all([
      this.sdk.getPositions(userAddress),
      this.sdk.getEarnings(userAddress),
    ]);
    return { positions, earnings };
  }
}
```
