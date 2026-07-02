/**
 * Chain Configuration for Zyfai SDK
 * Supports Ethereum Mainnet, Arbitrum, and Base networks
 */

import { createPublicClient, http, type Chain, type PublicClient } from "viem";
import type { RpcUrlsConfig } from "../types";
import { arbitrum, base, mainnet } from "viem/chains";

export type SupportedChainId = 1 | 8453 | 42161;

export interface ChainConfig {
  chain: Chain;
  rpcUrl: string;
  publicClient: PublicClient;
}

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
};

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
 * @param rpcUrls - Optional per-chain RPC URL overrides
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
 * Check if a chain ID is supported
 */
export const isSupportedChain = (
  chainId: number
): chainId is SupportedChainId => {
  return chainId in CHAINS;
};

/**
 * Get all supported chain IDs
 */
export const getSupportedChainIds = (): SupportedChainId[] => {
  return Object.keys(CHAINS).map(Number) as SupportedChainId[];
};
