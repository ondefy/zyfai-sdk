/**
 * Chain configuration for SDK execution chains (Ethereum, Base, Arbitrum).
 *
 * @remarks
 * Sonic and other data-only chains may appear in asset metadata but are not
 * {@link SupportedChainId} execution targets.
 */

import { createPublicClient, http, type Chain, type PublicClient } from "viem";
import type { RpcUrlsConfig } from "../types";
import { arbitrum, base, mainnet } from "viem/chains";

/** Chain IDs supported for deposits, withdrawals, and on-chain SDK calls. */
export type SupportedChainId = 1 | 8453 | 42161;

/** viem chain, RPC URL, and public client for a {@link SupportedChainId}. */
export interface ChainConfig {
  chain: Chain;
  rpcUrl: string;
  publicClient: PublicClient;
}

/** Default USDC token addresses per execution chain. */
export const DEFAULT_TOKEN_ADDRESSES: Record<SupportedChainId, string> = {
  1: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC on Ethereum Mainnet
  8453: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC on Base
  42161: "0xaf88d065e77c8cc2239327c5edb3a432268e5831", // USDC on Arbitrum
};
export const ASSET_CONFIGS: Readonly<Record<string, any>> = {
  USDC: {
    symbol: 'USDC',
    assetType: 'usdc',
    displayName: 'USDC',
    icon: '/ai-dashboard/usdc-token.png',
    decimals: 6,
    tokenSymbols: ['USDC', 'USDC.e', 'USDT', 'USDT0'],
    tokenSymbolsByChainId: {
      1: 'USDC',
      8453: 'USDC',
      42161: 'USDC',
      146: 'USDC.e',
      59144: 'USDC',
    },
    addresses: {
      1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // Ethereum
      8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base
      42161: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // Arbitrum
      146: '0x29219dd400f2bf60e5a23d13be72b486d4038894', // Sonic
      59144: '0x176211869ca2b568f2a7d4ee941e073a821ee1ff', // Linea
    },
    enabled: true,
  },
  WETH: {
    symbol: 'WETH',
    assetType: 'eth',
    displayName: 'WETH',
    icon: '/ai-dashboard/eth-token.png',
    decimals: 18,
    // Data API `/price?token=` identifier, used for USD-denominated minimums.
    priceTokenSymbol: 'eth',
    tokenSymbols: ['WETH', 'ETH'],
    tokenSymbolsByChainId: {
      1: 'WETH',
      8453: 'WETH',
      42161: 'WETH',
      146: 'WETH',
      59144: 'WETH',
    },
    addresses: {
      1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // Ethereum
      8453: '0x4200000000000000000000000000000000000006', // Base
      42161: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', // Arbitrum
      146: '0x039e64f90d4199560e7533692f69448878db85c7', // Sonic
      59144: '0xe5d7c2a44ffddf6b295a15c148167daaaf5cf34f', // Linea
    },
    enabled: true,
  },
  EURC: {
    symbol: 'EURC',
    assetType: 'eurc',
    displayName: 'EURC',
    icon: '/ai-dashboard/eurc-token.png',
    decimals: 6,
    tokenSymbols: ['EURC'],
    tokenSymbolsByChainId: {
      1: 'EURC',
      8453: 'EURC',
    },
    addresses: {
      1: '0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c', // Ethereum
      8453: '0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42', // Base
    },
    enabled: true,
  },
  // Coinbase B20 tokenized NVIDIA equity. Base only, and only reachable through
  // protocols with delayed withdrawals — see the `yieldmaxxing` strategy.
  NVDAc: {
    symbol: 'NVDAc',
    assetType: 'nvdac',
    displayName: 'NVIDIA',
    icon: 'https://metadata.coinbase.com/equity_icons/1fee9b7a44e800d438dd9d96c3283e05784c925c2c871a48ff735950740b551a.png',
    decimals: 8,
    priceTokenSymbol: 'nvdac',
    tokenSymbols: ['NVDAc'],
    tokenSymbolsByChainId: {
      8453: 'NVDAc',
    },
    addresses: {
      8453: '0xb20000000000000000000078ee7ce2fE4908108C', // Base
    },
    enabled: true,
  },
};

/**
 * Resolve a caller-supplied asset name to its canonical `ASSET_CONFIGS` key.
 *
 * Matching is case-insensitive because the keys are not all upper-case —
 * tokenized equities keep the issuer's casing (`NVDAc`), so the old
 * `toUpperCase()` would have missed them.
 */
export const resolveAssetSymbol = (asset: string): string => {
  const match = Object.keys(ASSET_CONFIGS).find(
    (key) => key.toLowerCase() === asset.toLowerCase()
  );
  if (!match) {
    throw new Error(
      `Unsupported asset: ${asset}. Supported: ${Object.keys(ASSET_CONFIGS).join(", ")}.`
    );
  }
  return match;
};

/** Chains on which an asset can be deposited, derived from its addresses. */
export const getAssetChainIds = (asset: string): SupportedChainId[] =>
  Object.keys(ASSET_CONFIGS[asset]?.addresses ?? {})
    .map(Number)
    .filter((chainId): chainId is SupportedChainId => chainId in CHAINS);

/**
 * Resolve the canonical ERC-20 address for an asset on a chain.
 *
 * @param chainId - Execution chain
 * @param asset - Asset symbol (defaults to USDC)
 * @returns Token contract address
 * @throws If the asset is not configured on the chain
 */
export const getDefaultTokenAddress = (chainId: SupportedChainId, asset?: string): string => {
  const address = ASSET_CONFIGS[asset || "USDC"]?.addresses[chainId];
  if (!address || address === "0x0000000000000000000000000000000000000000") {
    throw new Error(
      `Default token address not configured for chain ${chainId}. Please provide tokenAddress explicitly.`
    );
  }
  return address;
};

/**
 * Default RPC URLs for each chain.
 * SDK consumers can override these by passing `rpcUrls` in `SDKConfig`.
 */
const DEFAULT_RPC_URLS: Record<SupportedChainId, string> = {
  1: "https://mainnet.infura.io/v3/8e6cdd06e30d40ac9990bf61bed3a3d0",
  8453: "https://mainnet.base.org",
  42161: "https://arb1.arbitrum.io/rpc",
};

/**
 * Chain configurations mapped by chain ID
 */
export const CHAINS: Record<SupportedChainId, Chain> = {
  1: mainnet,
  8453: base,
  42161: arbitrum,
};

/**
 * Get chain configuration for a given chain ID.
 *
 * @param chainId - Supported chain ID
 * @param rpcUrls - Optional per-chain RPC URL overrides from {@link SDKConfig}
 * @returns Chain metadata and a viem `PublicClient`
 * @throws If `chainId` is not supported
 */
export const getChainConfig = (
  chainId: SupportedChainId,
  rpcUrls?: RpcUrlsConfig
): ChainConfig => {
  const chain = CHAINS[chainId];

  if (!chain) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }

  const rpcUrl = (rpcUrls && rpcUrls[chainId]) || DEFAULT_RPC_URLS[chainId];

  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl),
  });

  return {
    chain,
    rpcUrl,
    publicClient,
  };
};

/**
 * Check whether a numeric chain id is an SDK execution chain.
 *
 * @param chainId - Chain id to test
 * @returns True when `chainId` is {@link SupportedChainId}
 */
export const isSupportedChain = (
  chainId: number
): chainId is SupportedChainId => {
  return chainId in CHAINS;
};

/** List all {@link SupportedChainId} values. */
export const getSupportedChainIds = (): SupportedChainId[] => {
  return Object.keys(CHAINS).map(Number) as SupportedChainId[];
};
