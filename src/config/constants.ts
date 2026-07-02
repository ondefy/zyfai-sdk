/**
 * Global SDK Constants
 */

import type { SupportedChainId } from "./chains";

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
 * - Ethereum Mainnet (1) / USDC: 10,000 USDC
 * - Ethereum Mainnet (1) / WETH: 5 WETH
 * - No minimums on Base or Arbitrum.
 */
export const MIN_PORTFOLIO_BALANCE: Partial<
  Record<SupportedChainId, Record<string, bigint>>
> = {
  1: {
    USDC: 10_000n * 10n ** 6n, // 10,000 USDC (6 decimals)
    WETH: 5n * 10n ** 18n, // 5 WETH (18 decimals)
  },
};

/**
 * Format a minimum threshold (raw units + decimals) as a human-readable
 * string, e.g. `10000 USDC` or `5 WETH`. Assumes integer minimums.
 */
export const formatMinPortfolioLabel = (
  raw: bigint,
  decimals: number,
  symbol: string
): string => {
  const whole = raw / 10n ** BigInt(decimals);
  return `${whole.toString()} ${symbol}`;
};
