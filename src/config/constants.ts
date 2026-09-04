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
 * - WETH: Data API `/price?token=eth` converted to ~`MIN_WETH_USD[chainId]`
 *   (Mainnet $10,000; Base/Arbitrum $100).
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

/** Target USD value for the WETH minimum, per chain. */
export const MIN_WETH_USD: Record<SupportedChainId, bigint> = {
  1: 10000n,
  8453: 100n,
  42161: 100n,
};

/**
 * Format a minimum threshold (raw units + decimals) as a human-readable
 * string, e.g. `10000 USDC` or `0.005 WETH`. Supports fractional amounts.
 */
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
