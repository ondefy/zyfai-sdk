/**
 * Chain Configuration for Zyfai SDK
 * Supports Arbitrum, Base, and Plasma networks
 */

import { createPublicClient, http, type Chain, type PublicClient } from "viem";
import type { RpcUrlsConfig } from "../types";
import { arbitrum, base } from "viem/chains";
import { defineChain } from "viem";

// Define Plasma chain (not in viem/chains yet)
export const plasma = defineChain({
  id: 9745,
  name: "Plasma",
  nativeCurrency: {
    decimals: 18,
    name: "Plasma",
    symbol: "PLSM",
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.plasma.to"],
    },
  },
  blockExplorers: {
    default: {
      name: "Plasma Explorer",
      url: "https://explorer.plasma.io",
    },
  },
});

export type SupportedChainId = 8453 | 42161 | 9745;

export interface ChainConfig {
  chain: Chain;
  rpcUrl: string;
  publicClient: PublicClient;
}

export const DEFAULT_TOKEN_ADDRESSES: Record<SupportedChainId, string> = {
  8453: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC on Base
  42161: "0xaf88d065e77c8cc2239327c5edb3a432268e5831", // USDC on Arbitrum
  9745: "0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb", // USDT on Plasma
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
      8453: 'USDC',
      42161: 'USDC',
      9745: 'USDT0',
      146: 'USDC.e',
      1: 'USDC',
    },
    addresses: {
      8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base
      42161: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // Arbitrum
      9745: '0xb8ce59fc3717ada4c02eadf9682a9e934f625ebb', // Plasma
      146: '0x29219dd400f2bf60e5a23d13be72b486d4038894', // Sonic
      59144: '0x176211869ca2b568f2a7d4ee941e073a821ee1ff', // Linea
      1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // Ethereum
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
      8453: 'WETH',
      42161: 'WETH',
      9745: 'WETH',
      146: 'WETH',
      59144: 'WETH',
      1: 'WETH',
    },
    addresses: {
      8453: '0x4200000000000000000000000000000000000006', // Base
      42161: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', // Arbitrum
      9745: '0x4200000000000000000000000000000000000006', // Plasma
      146: '0x039e64f90d4199560e7533692f69448878db85c7', // Sonic
      59144: '0xe5d7c2a44ffddf6b295a15c148167daaaf5cf34f', // Linea
      1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // Ethereum
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
  8453: "https://mainnet.base.org",
  42161: "https://arb1.arbitrum.io/rpc",
  9745: "https://rpc.plasma.to",
};

/**
 * Chain configurations mapped by chain ID
 */
export const CHAINS: Record<SupportedChainId, Chain> = {
  8453: base,
  42161: arbitrum,
  9745: plasma,
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
