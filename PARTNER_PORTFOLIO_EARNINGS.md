# Partner guide: Portfolio & earnings (net of Zyfi fee)

This guide explains how to display **user-facing** portfolio balances and earnings using the Zyfai SDK. Use it when you want the same numbers as the Zyfai app.

## What to show users

| UI surface | Field to display | Meaning |
| ---------- | ---------------- | ------- |
| Portfolio totals / asset balances | `portfolioByAssetType.*.balanceWithFee` | Live balance minus pending Zyfi fee |
| Portfolio by chain | `portfolioByChain[chainId].*.balanceWithFee` | Same, scoped to one chain |
| Per position | `positions[].underlyingAmountWithFee` | Position share of that pending fee |
| Total / lifetime-style earnings | `totalEarningsByTokenWithFee` / `totalEarningsByChainWithFee` | Earnings net of pending fee |

**Recommendation:** show the `*WithFee` fields as the primary numbers in your product UI.

Gross fields (`balance`, `underlyingAmount`, `totalEarningsByToken`, …) remain available for debugging or advanced transparency, but they still include yield subject to the pending 10% fee.

---

## Fee model (short)

Zyfi takes a **10% performance fee** on unrealised (`current`) earnings only.

| Component | Pending fee applied? |
| --------- | -------------------- |
| `current` earnings | Yes — pending fee = `current × 0.1` |
| `lifetime` earnings | No — fee already crystallised |
| `unrealized` earnings | No — treat like lifetime for display |

### Consistency

```text
Portfolio shown  ≈ live − current × 0.1
Earnings shown   ≈ lifetime + unrealized + current × 0.9
Pending fee      = current × 0.1   (same fee both sides)
```

Equivalent earnings form:

```text
totalWithFee = total − current × 0.1
```

Never display `total × 0.9`.

---

## 1. `getPortfolio(userAddress)`

### Signature

```typescript
const { success, userAddress, portfolio } = await sdk.getPortfolio(userEoa);
```

- **Input:** user EOA address
- **Auth:** not required for this read path
- The SDK resolves the smart wallet, fetches the live portfolio, fetches onchain earnings (for the fee), then enriches the response

### Fields to use

```typescript
// Hex balances — decode with `decimals` (USDC/EURC = 6, WETH = 18, …)
portfolio.portfolioByAssetType?.usdc?.balance;        // gross
portfolio.portfolioByAssetType?.usdc?.balanceWithFee; // SHOW THIS
portfolio.portfolioByAssetType?.usdc?.decimals;

portfolio.portfolioByChain?.["8453"]?.usdc?.balanceWithFee;

portfolio.positions?.forEach((p) => {
  // decimal wei strings — decode with p.decimals
  p.underlyingAmount;        // gross
  p.underlyingAmountWithFee; // SHOW THIS
});
```

### How `*WithFee` is built on portfolio

```text
pendingFee(token[, chain]) = current_earnings × 0.1
balanceWithFee             = liveBalance − pendingFee
```

- Fee source: **`current_earnings_by_chain` only**
- Multiple positions on the same chain + token: fee is split **proportionally** by `underlyingAmount`
- If earnings cannot be fetched: `*WithFee` equals the gross value (stable response shape)
- Caveat: portfolio is live; earnings may be a snapshot — small mismatches are possible

### Example (viem)

```typescript
import { formatUnits } from "viem";

const { portfolio } = await sdk.getPortfolio(userEoa);
const usdc = portfolio.portfolioByAssetType?.usdc;

if (usdc) {
  const display = formatUnits(
    BigInt(usdc.balanceWithFee ?? usdc.balance),
    usdc.decimals
  );
  console.log("USDC portfolio (user-facing):", display);
}
```

---

## 2. `getOnchainEarnings(smartWalletAddress)`

### Signature

```typescript
const { success, data } = await sdk.getOnchainEarnings(smartWallet);
```

- **Input:** smart wallet address (not the EOA)
- Prefer `calculateOnchainEarnings(smartWallet)` first if GET returns “no V2 snapshot”

### Fields to use

```typescript
data.totalEarningsByToken;           // gross
data.totalEarningsByTokenWithFee;    // SHOW THIS  (human decimal strings)
data.totalEarningsByChain;           // gross
data.totalEarningsByChainWithFee;    // SHOW THIS
```

### How `*WithFee` is built on earnings

```text
totalWithFee = lifetime + unrealized + current × 0.9
```

- Apply `× 0.9` **only** to `current`
- Do **not** apply `× 0.9` to `lifetime` or `unrealized`

### Example

```typescript
const { data } = await sdk.getOnchainEarnings(smartWallet);

const usdcNet = data.totalEarningsByTokenWithFee["USDC"] ?? "0";
console.log("USDC earnings (user-facing):", usdcNet);

const usdcOnBase = data.totalEarningsByChainWithFee?.["8453"]?.["USDC"];
```

### Refresh flow

```typescript
try {
  const earnings = await sdk.getOnchainEarnings(smartWallet);
  // use earnings.data.totalEarningsByTokenWithFee
} catch {
  await sdk.calculateOnchainEarnings(smartWallet);
  const earnings = await sdk.getOnchainEarnings(smartWallet);
}
```

---

## Quick checklist for partners

1. Resolve EOA → smart wallet (`getSmartWalletAddress` / `getSmartWalletByEOA`).
2. Portfolio UI → `getPortfolio(eoa)` → display `balanceWithFee` / `underlyingAmountWithFee`.
3. Earnings UI → `getOnchainEarnings(smartWallet)` → display `totalEarnings*WithFee`.
4. Decode hex / wei with the correct `decimals`.
5. Do not primary-display gross totals if you want parity with the Zyfai app.

---

## Related SDK methods

| Method | Input | Primary display fields |
| ------ | ----- | ---------------------- |
| `getPortfolio` | EOA | `balanceWithFee`, `underlyingAmountWithFee` |
| `getOnchainEarnings` | Smart wallet | `totalEarningsByTokenWithFee`, `totalEarningsByChainWithFee` |
| `calculateOnchainEarnings` | Smart wallet | Same shape as `getOnchainEarnings` (refresh) |
