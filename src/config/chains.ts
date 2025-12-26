/**
 * Chain Configuration for ZyFAI SDK
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

export const getDefaultTokenAddress = (chainId: SupportedChainId): string => {
  const address = DEFAULT_TOKEN_ADDRESSES[chainId];
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

