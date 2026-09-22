/**
 * Global SDK Constants
 */

import type { SupportedChainId } from "./chains";

/**
 * Zyfi performance fee rate applied to unrealised (`current`) earnings.
 * Pending fee = current × ZYFI_FEE_RATE; user-keep = current × (1 - rate).
 */
export const ZYFI_FEE_RATE = 0.1;

/** Allowed lookback windows for `getDailyApyHistory`, in days. */
export const ALLOWED_HISTORY_DAYS = [7, 14, 30, 60, 120, 180] as const;

export type AllowedHistoryDays = (typeof ALLOWED_HISTORY_DAYS)[number];

/** Query period passed to the daily APY history endpoint, e.g. `"30D"`. */
export type DailyApyHistoryPeriod = `${AllowedHistoryDays}D`;

/**
 * Minimum total portfolio balance required to deposit, per chain and per
 * asset, expressed in the asset's least significant units (wei).
 *
 * If no entry exists for a given (chainId, asset) pair, no minimum is
 * enforced for that combination.
 *
 * The check is applied on the post-deposit Safe balance
 * (current Safe balance + deposit amount). A deposit is rejected only if
 * a minimum is configured AND the resulting total would be below it.
 *
 * Current configuration:
 * - Mainnet USDC/EURC: 10,000 units; Base/Arbitrum USDC/EURC: 100 units
 * - WETH and NVDAc: quoted in USD, see `MIN_PORTFOLIO_USD`
 */
export const MIN_PORTFOLIO_BALANCE: Partial<
  Record<SupportedChainId, Record<string, bigint>>
> = {
  1: {
    USDC: 10000n * 10n ** 6n, // 10,000 USDC (6 decimals)
    EURC: 10000n * 10n ** 6n, // 10,000 EURC (6 decimals)
  },
  8453: {
    USDC: 100n * 10n ** 6n, // 100 USDC (6 decimals)
    EURC: 100n * 10n ** 6n, // 100 EURC (6 decimals)
  },
  42161: {
    USDC: 100n * 10n ** 6n, // 100 USDC (6 decimals)
    EURC: 100n * 10n ** 6n, // 100 EURC (6 decimals)
  },
};

/**
 * Minimums quoted in USD rather than in token units, per chain and per asset.
 *
 * Volatile assets cannot use a fixed least-unit threshold, so the SDK reads the
 * live price from Data API `/price?token=<asset.priceTokenSymbol>` and converts
 * at deposit time. Takes precedence over `MIN_PORTFOLIO_BALANCE`.
 */
export const MIN_PORTFOLIO_USD: Partial<
  Record<SupportedChainId, Record<string, bigint>>
> = {
  1: { WETH: 10000n },
  8453: { WETH: 100n, NVDAc: 100n },
  42161: { WETH: 100n },
};

/**
 * Default poll interval for `waitForDepositCredit`, per chain (ms).
 *
 * L2s use tighter polling so credit is detected within a few blocks.
 */
export const DEPOSIT_CREDIT_INTERVAL_MS: Record<SupportedChainId, number> = {
  1: 2_000,
  8453: 500,
  42161: 250,
};

/**
 * Default timeout for `waitForDepositCredit`, per chain (ms).
 *
 * These are user-facing completion windows, not the backend's full recovery
 * budget. A caller that needs to wait longer can pass `timeoutMs` explicitly.
 */
export const DEPOSIT_CREDIT_TIMEOUT_MS: Record<SupportedChainId, number> = {
  1: 60_000, // 1 minute
  8453: 20_000, // ~10 Base blocks
  42161: 20_000, // ~10 Arbitrum blocks
};

export const getDepositCreditIntervalMs = (
  chainId: SupportedChainId,
): number => DEPOSIT_CREDIT_INTERVAL_MS[chainId];

export const getDepositCreditTimeoutMs = (
  chainId: SupportedChainId,
): number => DEPOSIT_CREDIT_TIMEOUT_MS[chainId];

export const formatMinPortfolioLabel = (
  raw: bigint,
  decimals: number,
  symbol: string
): string => {
  const base = 10n ** BigInt(decimals);
  const whole = raw / base;
  const fraction = raw % base;
  if (fraction === 0n) {
    return `${whole.toString()} ${symbol}`;
  }
  const fractionStr = fraction
    .toString()
    .padStart(decimals, "0")
    .replace(/0+$/, "");
  return `${whole.toString()}.${fractionStr} ${symbol}`;
};
