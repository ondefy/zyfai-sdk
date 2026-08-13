/**
 * Zyfi pending-fee helpers.
 *
 * Pending fee is derived only from `current_earnings_by_chain`
 * (yield not yet crystallised). Lifetime earnings already had the fee
 * taken and must never be multiplied by (1 - FEE_RATE).
 */

import { ZYFI_FEE_RATE } from "../config/constants";
import type {
  ChainTokenEarnings,
  PortfolioAssetBalance,
  PortfolioDetailed,
  PositionSlot,
  TokenEarnings,
} from "../types";
import type { Hex } from "viem";

export interface PendingFees {
  byToken: Record<string, number>;
  byChain: Record<string, number>;
  byChainByToken: Record<string, Record<string, number>>;
  total: number;
}

export interface OnchainEarningsWithFeeTotals {
  totalEarningsByTokenWithFee: TokenEarnings;
  totalEarningsByChainWithFee: ChainTokenEarnings;
}

const CHAIN_NAME_TO_ID: Record<string, string> = {
  ethereum: "1",
  "ethereum mainnet": "1",
  mainnet: "1",
  base: "8453",
  arbitrum: "42161",
  "arbitrum one": "42161",
};

/**
 * Map an earnings / position token symbol to portfolio assetType.
 * USDC -> usdc, WETH/ETH -> eth, EURC -> eurc, etc.
 */
export function symbolToAssetType(symbol: string): string {
  const upper = symbol.trim().toUpperCase();
  if (upper === "USDC") return "usdc";
  if (upper === "WETH" || upper === "ETH") return "eth";
  if (upper === "EURC") return "eurc";
  if (upper === "CBBTC") return "cbbtc";
  if (upper === "CBETH") return "cbeth";
  return symbol.trim().toLowerCase();
}

/**
 * Map a portfolio assetType to the earnings token symbol key.
 */
export function assetTypeToSymbol(assetType: string): string {
  const lower = assetType.trim().toLowerCase();
  if (lower === "usdc") return "USDC";
  if (lower === "eth") return "WETH";
  if (lower === "eurc") return "EURC";
  if (lower === "cbbtc") return "CBBTC";
  if (lower === "cbeth") return "CBETH";
  return assetType.trim().toUpperCase();
}

/**
 * Map a position chain name (e.g. "Base") to a chainId string ("8453").
 */
export function chainNameToId(chain: string): string | undefined {
  if (!chain) return undefined;
  const trimmed = chain.trim();
  if (/^\d+$/.test(trimmed)) return trimmed;
  return CHAIN_NAME_TO_ID[trimmed.toLowerCase()];
}

function parseHumanAmount(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  const parsed = Number.parseFloat(String(value ?? "0"));
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Convert a human-readable token amount to raw integer units.
 */
export function humanAmountToRaw(human: number, decimals: number): bigint {
  if (!Number.isFinite(human) || human <= 0 || decimals < 0) {
    return 0n;
  }
  const fixed = human.toFixed(decimals);
  const [whole, frac = ""] = fixed.split(".");
  const wholePart = BigInt(whole);
  const fracPart = BigInt(frac.padEnd(decimals, "0").slice(0, decimals) || "0");
  return wholePart * 10n ** BigInt(decimals) + fracPart;
}

/**
 * Format a human decimal string without scientific notation noise.
 */
function formatHumanAmount(value: number): string {
  if (!Number.isFinite(value) || value === 0) return "0";
  // Keep enough precision for wei-scale tokens while trimming trailing zeros.
  const fixed = value.toFixed(18);
  return fixed.replace(/\.?0+$/, "") || "0";
}

/**
 * Compute pending Zyfi fees from current (unrealised) earnings by chain.
 * Mirrors frontend `useZyfiFees`.
 */
export function computePendingFees(
  currentEarningsByChain?: ChainTokenEarnings | null
): PendingFees {
  const byToken: Record<string, number> = {};
  const byChain: Record<string, number> = {};
  const byChainByToken: Record<string, Record<string, number>> = {};
  let total = 0;

  if (!currentEarningsByChain) {
    return { byToken, byChain, byChainByToken, total };
  }

  Object.entries(currentEarningsByChain).forEach(([chainId, chainEarnings]) => {
    const feeByToken: Record<string, number> = {};
    let chainFee = 0;

    Object.entries(chainEarnings || {}).forEach(([tokenSymbol, tokenAmount]) => {
      const numericValue = parseHumanAmount(tokenAmount);
      const tokenFee = numericValue > 0 ? numericValue * ZYFI_FEE_RATE : 0;
      feeByToken[tokenSymbol] = tokenFee;
      chainFee += tokenFee;
      byToken[tokenSymbol] = (byToken[tokenSymbol] ?? 0) + tokenFee;
    });

    byChainByToken[chainId] = feeByToken;
    byChain[chainId] = chainFee;
    total += chainFee;
  });

  return { byToken, byChain, byChainByToken, total };
}

/**
 * Look up pending fee for an assetType, trying WETH then ETH for eth.
 */
function feeForAssetType(
  feesByToken: Record<string, number>,
  assetType: string
): number {
  const symbol = assetTypeToSymbol(assetType);
  if (feesByToken[symbol] !== undefined) return feesByToken[symbol] ?? 0;
  if (assetType.toLowerCase() === "eth") {
    return feesByToken["ETH"] ?? feesByToken["WETH"] ?? 0;
  }
  // Also try uppercase assetType as symbol fallback
  return feesByToken[assetType.toUpperCase()] ?? 0;
}

function feeForChainAsset(
  byChainByToken: Record<string, Record<string, number>>,
  chainId: string,
  assetType: string
): number {
  const chainFees = byChainByToken[chainId] || {};
  return feeForAssetType(chainFees, assetType);
}

/**
 * Subtract a human fee from a hex balance. Clamps at 0x0.
 */
export function applyFeeToHexBalance(
  balanceHex: string,
  feeHuman: number,
  decimals: number
): Hex {
  let balance: bigint;
  try {
    balance = BigInt(balanceHex || "0x0");
  } catch {
    balance = 0n;
  }
  const feeRaw = humanAmountToRaw(feeHuman, decimals);
  const net = balance > feeRaw ? balance - feeRaw : 0n;
  return `0x${net.toString(16)}` as Hex;
}

/**
 * Subtract a human fee from a decimal-wei string amount. Clamps at "0".
 */
export function applyFeeToDecimalWei(
  amount: string,
  feeHuman: number,
  decimals: number
): string {
  let balance: bigint;
  try {
    balance = BigInt(amount || "0");
  } catch {
    balance = 0n;
  }
  const feeRaw = humanAmountToRaw(feeHuman, decimals);
  const net = balance > feeRaw ? balance - feeRaw : 0n;
  return net.toString();
}

function enrichAssetBalance(
  entry: PortfolioAssetBalance,
  feeHuman: number
): PortfolioAssetBalance {
  const balanceWithFee = applyFeeToHexBalance(
    entry.balance,
    feeHuman,
    entry.decimals
  );
  return {
    ...entry,
    balanceWithFee,
  };
}

function resolvePositionSymbol(position: PositionSlot): string | undefined {
  if (position.token_symbol) return position.token_symbol;
  if (position.assetType) return assetTypeToSymbol(position.assetType);
  return undefined;
}

function resolvePositionDecimals(position: PositionSlot): number {
  if (typeof position.decimals === "number") return position.decimals;
  const asset = position.assetType || symbolToAssetType(position.token_symbol || "");
  if (asset === "usdc" || asset === "eurc") return 6;
  if (asset === "cbbtc") return 8;
  return 18;
}

/**
 * Apply proportional pending-fee share to each position's underlyingAmount.
 */
function enrichPositions(
  positions: PositionSlot[],
  byChainByToken: Record<string, Record<string, number>>
): PositionSlot[] {
  // Group indices by (chainId, symbol) for proportional split
  const groups = new Map<string, number[]>();

  positions.forEach((position, index) => {
    const chainId = chainNameToId(position.chain || "");
    const symbol = resolvePositionSymbol(position);
    if (!chainId || !symbol) {
      return;
    }
    const key = `${chainId}:${symbol.toUpperCase()}`;
    const list = groups.get(key) || [];
    list.push(index);
    groups.set(key, list);
  });

  const feeShareByIndex = new Map<number, number>();

  groups.forEach((indices, key) => {
    const [chainId, symbol] = key.split(":");
    const chainFees = byChainByToken[chainId] || {};
    let totalFee =
      chainFees[symbol] ??
      (symbol === "WETH" ? chainFees["ETH"] : undefined) ??
      (symbol === "ETH" ? chainFees["WETH"] : undefined) ??
      0;

    if (totalFee <= 0) {
      indices.forEach((i) => feeShareByIndex.set(i, 0));
      return;
    }

    let totalUnderlying = 0n;
    const underlyings: bigint[] = indices.map((i) => {
      try {
        return BigInt(positions[i].underlyingAmount || "0");
      } catch {
        return 0n;
      }
    });
    underlyings.forEach((u) => {
      totalUnderlying += u;
    });

    if (totalUnderlying === 0n) {
      // Equal split when no underlying amounts
      const share = totalFee / indices.length;
      indices.forEach((i) => feeShareByIndex.set(i, share));
      return;
    }

    indices.forEach((i, idx) => {
      const share =
        (totalFee * Number(underlyings[idx])) / Number(totalUnderlying);
      feeShareByIndex.set(i, share);
    });
  });

  return positions.map((position, index) => {
    const underlying = position.underlyingAmount;
    if (underlying === undefined) {
      return { ...position };
    }
    const feeShare = feeShareByIndex.get(index) ?? 0;
    const decimals = resolvePositionDecimals(position);
    return {
      ...position,
      underlyingAmountWithFee: applyFeeToDecimalWei(
        underlying,
        feeShare,
        decimals
      ),
    };
  });
}

/**
 * Enrich a portfolio response with net-of-pending-fee balances.
 * When fees are missing/zero, `*WithFee` equals the gross value.
 */
export function enrichPortfolioWithFees(
  portfolio: PortfolioDetailed,
  currentEarningsByChain?: ChainTokenEarnings | null
): PortfolioDetailed {
  const { byToken, byChainByToken } = computePendingFees(currentEarningsByChain);

  const portfolioByAssetType = portfolio.portfolioByAssetType
    ? Object.fromEntries(
        Object.entries(portfolio.portfolioByAssetType).map(
          ([assetType, entry]) => [
            assetType,
            enrichAssetBalance(entry, feeForAssetType(byToken, assetType)),
          ]
        )
      )
    : undefined;

  const portfolioByChain = portfolio.portfolioByChain
    ? Object.fromEntries(
        Object.entries(portfolio.portfolioByChain).map(
          ([chainId, assets]) => [
            chainId,
            Object.fromEntries(
              Object.entries(assets).map(([assetType, entry]) => [
                assetType,
                enrichAssetBalance(
                  entry,
                  feeForChainAsset(byChainByToken, chainId, assetType)
                ),
              ])
            ),
          ]
        )
      )
    : undefined;

  const positions = portfolio.positions
    ? enrichPositions(portfolio.positions, byChainByToken)
    : undefined;

  return {
    ...portfolio,
    ...(portfolioByAssetType ? { portfolioByAssetType } : {}),
    ...(portfolioByChain ? { portfolioByChain } : {}),
    ...(positions ? { positions } : {}),
  };
}

/**
 * Sum current earnings across chains into a per-token map.
 */
function sumCurrentByToken(
  currentByChain?: ChainTokenEarnings | null
): Record<string, number> {
  const totals: Record<string, number> = {};
  if (!currentByChain) return totals;
  Object.values(currentByChain).forEach((chainEarnings) => {
    Object.entries(chainEarnings || {}).forEach(([symbol, amount]) => {
      totals[symbol] = (totals[symbol] ?? 0) + parseHumanAmount(amount);
    });
  });
  return totals;
}

/**
 * Build net total earnings maps:
 * totalWithFee = lifetime + unrealized + current × (1 - FEE_RATE)
 *
 * Unrealized is treated like lifetime (no pending fee).
 * Never applies (1 - FEE_RATE) to lifetime/unrealized or to gross total.
 */
export function enrichOnchainEarningsTotals(apiData: {
  lifetime_earnings_by_token?: TokenEarnings | null;
  lifetime_earnings_by_chain?: ChainTokenEarnings | null;
  current_earnings_by_chain?: ChainTokenEarnings | null;
  current_earnings_by_token?: TokenEarnings | null;
  /** API field name is `unrealized_earnings` (chain → token). */
  unrealized_earnings?: ChainTokenEarnings | null;
  unrealized_earnings_by_chain?: ChainTokenEarnings | null;
  unrealized_earnings_by_token?: TokenEarnings | null;
}): OnchainEarningsWithFeeTotals {
  const lifetimeByToken = apiData.lifetime_earnings_by_token || {};
  const lifetimeByChain = apiData.lifetime_earnings_by_chain || {};
  const currentByChain = apiData.current_earnings_by_chain || {};
  const unrealizedByChain =
    apiData.unrealized_earnings_by_chain ||
    apiData.unrealized_earnings ||
    {};

  const currentByToken =
    apiData.current_earnings_by_token &&
    Object.keys(apiData.current_earnings_by_token).length > 0
      ? Object.fromEntries(
          Object.entries(apiData.current_earnings_by_token).map(([k, v]) => [
            k,
            parseHumanAmount(v),
          ])
        )
      : sumCurrentByToken(currentByChain);

  const unrealizedByToken =
    apiData.unrealized_earnings_by_token &&
    Object.keys(apiData.unrealized_earnings_by_token).length > 0
      ? Object.fromEntries(
          Object.entries(apiData.unrealized_earnings_by_token).map(([k, v]) => [
            k,
            parseHumanAmount(v),
          ])
        )
      : sumCurrentByToken(unrealizedByChain);

  const keepRate = 1 - ZYFI_FEE_RATE;

  const tokenKeys = new Set([
    ...Object.keys(lifetimeByToken),
    ...Object.keys(unrealizedByToken),
    ...Object.keys(currentByToken),
  ]);

  const totalEarningsByTokenWithFee: TokenEarnings = {};
  tokenKeys.forEach((symbol) => {
    const lifetime = parseHumanAmount(lifetimeByToken[symbol]);
    const unrealized = unrealizedByToken[symbol] ?? 0;
    const current = currentByToken[symbol] ?? 0;
    totalEarningsByTokenWithFee[symbol] = formatHumanAmount(
      lifetime + unrealized + current * keepRate
    );
  });

  const chainKeys = new Set([
    ...Object.keys(lifetimeByChain),
    ...Object.keys(unrealizedByChain),
    ...Object.keys(currentByChain),
  ]);

  const totalEarningsByChainWithFee: ChainTokenEarnings = {};
  chainKeys.forEach((chainId) => {
    const lifetimeTokens = lifetimeByChain[chainId] || {};
    const unrealizedTokens = unrealizedByChain[chainId] || {};
    const currentTokens = currentByChain[chainId] || {};
    const symbols = new Set([
      ...Object.keys(lifetimeTokens),
      ...Object.keys(unrealizedTokens),
      ...Object.keys(currentTokens),
    ]);
    const chainMap: TokenEarnings = {};
    symbols.forEach((symbol) => {
      const lifetime = parseHumanAmount(lifetimeTokens[symbol]);
      const unrealized = parseHumanAmount(unrealizedTokens[symbol]);
      const current = parseHumanAmount(currentTokens[symbol]);
      chainMap[symbol] = formatHumanAmount(
        lifetime + unrealized + current * keepRate
      );
    });
    totalEarningsByChainWithFee[chainId] = chainMap;
  });

  return {
    totalEarningsByTokenWithFee,
    totalEarningsByChainWithFee,
  };
}
