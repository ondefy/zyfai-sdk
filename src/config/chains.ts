/**
 * Chain Configuration for ZyFAI SDK
 * Supports Arbitrum, Base, and Plasma networks
 */

import { createPublicClient, http, type Chain, type PublicClient } from "viem";
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
      http: ["https://rpc.plasma.io"],
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

/**
 * Default RPC URLs for each chain
 * You can override these with your own RPC providers
 */
const DEFAULT_RPC_URLS: Record<SupportedChainId, string> = {
  8453: "https://mainnet.base.org",
  42161: "https://arb1.arbitrum.io/rpc",
  9745: "https://rpc.plasma.io",
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
 * Get chain configuration for a given chain ID
 */
export const getChainConfig = (
  chainId: SupportedChainId,
  customRpcUrl?: string
): ChainConfig => {
  const chain = CHAINS[chainId];

  if (!chain) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }

  const rpcUrl = customRpcUrl || DEFAULT_RPC_URLS[chainId];

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
