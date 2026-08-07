/**
 * Pure helpers used by ZyfaiSDK.updateUserProtocols to select the correct
 * protocol IDs for a user based on chain, strategy and asset.
 *
 * Mirrors the front-end logic (`getMatchingProtocolIds`, pool-availability
 * filter) so the SDK produces the same protocol selection.
 */

import { ASSET_CONFIGS } from "../config/chains";
import type { InternalStrategy } from "./strategy";

type AssetSymbol = "USDC" | "WETH" | "EURC";

interface ProtocolAssetEntry {
  chainId: number;
  symbol: string;
}

interface ProtocolLike {
  id: string;
  chains?: number[];
  strategies?: string[];
  assets?: ProtocolAssetEntry[];
}

/**
 * Get the list of token symbols considered "the asset" (e.g. USDC also
 * accepts USDC.e, USDT, USDT0 on chains that lack native USDC).
 */
const getValidSymbols = (asset: AssetSymbol): string[] =>
  (ASSET_CONFIGS[asset]?.tokenSymbols as string[] | undefined) ?? [];

/**
 * True when the protocol supports the requested asset on at least one of the
 * selected chains. Falls back to `true` when protocol.assets is absent so we
 * don't over-filter based on missing metadata (the pool filter downstream
 * will still catch it).
 */
const hasAssetOnSelectedChains = (
  protocol: ProtocolLike,
  chains: number[],
  asset: AssetSymbol
): boolean => {
  if (!protocol.assets || protocol.assets.length === 0) return true;
  const validSymbols = getValidSymbols(asset);
  return protocol.assets.some(
    (a) => chains.includes(a.chainId) && validSymbols.includes(a.symbol)
  );
};

/**
 * Filter protocols by chain + asset support + strategy.
 * - conservative (safe_strategy): keeps protocols that support safe_strategy
 * - aggressive (degen_strategy): keeps protocols that support degen OR safe
 */
export const getMatchingProtocolIds = (
  protocols: ProtocolLike[],
  internalStrategy: InternalStrategy,
  chains: number[],
  asset: AssetSymbol
): string[] => {
  if (chains.length === 0) return [];

  return protocols
    .filter((protocol) => {
      if (!protocol || !protocol.strategies) return false;
      if (!protocol.chains?.some((c) => chains.includes(c))) return false;
      if (!hasAssetOnSelectedChains(protocol, chains, asset)) return false;

      if (internalStrategy === "degen_strategy") {
        return (
          protocol.strategies.includes("degen_strategy") ||
          protocol.strategies.includes("safe_strategy")
        );
      }
      return protocol.strategies.includes("safe_strategy");
    })
    .map((protocol) => protocol.id);
};

/**
 * Raw shape returned by /customization/pools (chainId -> tokenSymbol -> data).
 * Kept loose (`any`) since the endpoint returns rich nested data we don't
 * fully model in the SDK — we only need pool presence for filtering.
 */
type PoolsResponse = Record<string, Record<string, { pools?: unknown[] }>>;

/**
 * True when the pool response contains at least one pool on one of the
 * selected chains for a token symbol that matches the requested asset.
 */
export const hasMatchingPool = (
  data: PoolsResponse | null | undefined,
  chains: number[],
  asset: AssetSymbol
): boolean => {
  if (!data || typeof data !== "object") return false;
  const validSymbols = getValidSymbols(asset);

  for (const [chainIdStr, chainData] of Object.entries(data)) {
    const chainIdNum = Number.parseInt(chainIdStr, 10);
    if (!chains.includes(chainIdNum)) continue;
    if (!chainData || typeof chainData !== "object") continue;

    for (const [tokenSymbol, tokenData] of Object.entries(chainData)) {
      if (!validSymbols.includes(tokenSymbol)) continue;
      const pools = tokenData?.pools;
      if (Array.isArray(pools) && pools.length > 0) return true;
    }
  }
  return false;
};
