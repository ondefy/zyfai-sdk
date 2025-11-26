# Zyfai SDK Documentation - Developer Reference

**Note:**

1. The sdk should support the test environment, would be linked to our staging environment, as well as prod environment, and would be linked to our prod environment.

2. Currently, our staging is pointing to the Base, Arbitrum, Plasma (and Sonic) mainnets, so even test environment safe wallet deployment would cost us a gas fee, but that I assume should be fine initially, unless an institutional client/developer exploits it.

3. We'd have to allow the dashboard where the api key is generated for the clients to have an option of the whitelist domains to allow calling the relevant endpoints, since the api key provided by Zyfai would be sitting in the client's ui.

---

## 🏗️ SDK Architecture

### Flexible, Parameter-Based Design

```typescript
// 1. Initialize SDK with API key (once)
const sdk = new ZyfaiSDK('YOUR_API_KEY');

// 2. Set up wallet/signer (separate step)
sdk.setPrivateKey('0x...');
// OR
await sdk.connectBrowserWallet(); // Could be any common browser wallets, such as Metamask or Rabby, etc

// 3. Call functions with explicit parameters | The web3 provider or the private key if set in the previous step would be able to execute the necessary signing required
await sdk.deploySafe('0xUserAddress', chainId);
await sdk.createSessionKey('0xUserAddress', chainId);
const earnings = await sdk.getEarnings('0xUserAddress');
```

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
  status: 'deployed' | 'failed';
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

#### Function Signature

```typescript
createSessionKey(
  userAddress: string,
  chainId?: number
  sessions?: Session[]
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

| Parameter      | Type   | Required | Description                                    |
| -------------- | ------ | -------- | ---------------------------------------------- |
| `userAddress`  | string | ✅       | User's EOA address                             |
| `chainId`      | number | ✅       | Chain to deposit on                            |
| `tokenAddress` | string | ✅       | Token contract address                         |
| `amount`       | string | ✅       | Amount in raw units (e.g., "1000000" = 1 USDC) |

#### Response Type

```typescript
interface DepositResponse {
  success: boolean;
  txHash: string;
  smartWallet: string;
  amount: string;
  status: 'pending' | 'confirmed';
  failed;
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

| Parameter     | Type   | Required | Description                                   |
| ------------- | ------ | -------- | --------------------------------------------- |
| `userAddress` | string | ✅       | User's EOA address                            |
| `chainId`     | number | ✅       | Chain to withdraw from                        |
| `amount`      | string | ❌       | Amount to withdraw (omit for full withdrawal) |
| `receiver`    | string | ❌       | Receiver address (defaults to user's EOA)     |

#### Response Type

```typescript
interface WithdrawResponse {
  success: boolean;
  txHash: string;
  type: 'full' | 'partial';
  amount: string;
  receiver: string;
  status: 'pending' | 'confirmed' | 'failed';
}
```

---

## 🎯 Integration Examples

```typescript
const sdk = new ZyfaiSDK(API_KEY);
sdk.setPrivateKey(PRIVATE_KEY);

const userAddress = '0xUser...';
await sdk.deploySafe(userAddress, 8453);
const wallet = await sdk.getSmartWalletAddress(userAddress, 8453);
console.log('Deposit to:', wallet.address);
```

OR

```typescript
class YieldService {
  private sdk: ZyfaiSDK;

  constructor(apiKey: string) {
    this.sdk = new ZyfaiSDK(apiKey);
  }

  async setupWallet(privateKey: string) {
    this.sdk.setPrivateKey(privateKey);
  }

  async onboardUser(userAddress: string, chainId: number) {
    await this.sdk.deploySafe(userAddress, chainId);
    await this.sdk.createSessionKey(userAddress, chainId);
    return await this.sdk.getSmartWalletAddress(userAddress, chainId);
  }

  async getUserStats(userAddress: string) {
    const [positions, earnings] = await Promise.all([this.sdk.getPositions(userAddress), this.sdk.getEarnings(userAddress)]);
    return { positions, earnings };
  }
}
```
