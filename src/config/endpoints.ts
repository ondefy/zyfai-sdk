/**
 * API Endpoints Configuration
 *
 */

import { SupportedChainId } from "../config/chains";

// Execution API
export const API_ENDPOINT = "https://api.zyf.ai";

// Data API
export const DATA_API_ENDPOINT = "https://defiapi.zyf.ai";

export const API_VERSION = "/api/v1";
export const DATA_API_VERSION = "/api/v2";

// Execution API Endpoints (v1)
export const ENDPOINTS = {
  // Auth
  AUTH_LOGIN: "/auth/login",
  AUTH_CHALLENGE: "/auth/challenge",

  // User
  USER_ME: "/users/me",
  USER_WITHDRAW: "/users/withdraw",
  PARTIAL_WITHDRAW: "/users/partial-withdraw",
  LOG_DEPOSIT: "/users/log_deposit",

  // Safe Deployment (single endpoint)
  SAFE_DEPLOY: "/users/safe-deploy",

  // Session Keys
  SESSION_KEYS_CONFIG: "/session-keys/config",
  SESSION_KEYS_ADD: "/session-keys/add",

  // Protocols
  PROTOCOLS: (chainId?: number) => chainId ? `/protocols?chainId=${chainId}` : "/protocols",

  // Data (v1)
  DATA_POSITION: (walletAddress: string) =>
    `/data/position?walletAddress=${walletAddress}`,
  DATA_HISTORY: (walletAddress: string, chainId: SupportedChainId) =>
    `/data/history?walletAddress=${walletAddress}&chainId=${chainId}`,
  DATA_TVL: "/data/tvl",
  DATA_VOLUME: "/data/volume",
  DATA_FIRST_TOPUP: (walletAddress: string, chainId: number) =>
    `/data/first-topup?walletAddress=${walletAddress}&chainId=${chainId}`,
  DATA_ACTIVE_WALLETS: (chainId: number) =>
    `/data/active-wallets?chainId=${chainId}`,
  DATA_BY_EOA: (address: string) => `/data/by-eoa?address=${address}`,
  DATA_REBALANCE_FREQUENCY: (walletAddress: string) =>
    `/data/rebalance-frequency?walletAddress=${walletAddress}`,

  // SDK Keys
  SDK_ALLOWED_WALLETS: "/data/sdk-allowed-wallets",
  SDK_TVL: "/data/sdk-tvl",

  // Agent Identity Registry
  AGENT_TOKEN_URI: "/users/me/agent-token-uri",

  // Customization
  CUSTOMIZE_BATCH: "/customization/customize-batch",
  CUSTOMIZATION_POOLS: (protocolId: string, strategy?: string) =>
    `/customization/pools?protocolId=${protocolId}${strategy ? `&strategy=${strategy}` : ""}`,
  CUSTOMIZATION_SELECTED_POOLS: (protocolId: string, chainId: number) =>
    `/customization/selected-pools?protocolId=${protocolId}&chainId=${chainId}`,
} as const;

// Data API Endpoints (v2)
export const DATA_ENDPOINTS = {
  // User Initialization
  USER_INITIALIZE: "/api/earnings/initialize",

  // Earnings
  ONCHAIN_EARNINGS: (walletAddress: string) =>
    `/onchain-earnings/onchain-earnings?walletAddress=${walletAddress}`,
  CALCULATE_ONCHAIN_EARNINGS: "/onchain-earnings/calculate-onchain-earnings",
  DAILY_EARNINGS: (
    walletAddress: string,
    startDate?: string,
    endDate?: string
  ) => {
    let url = `/onchain-earnings/daily-earnings?walletAddress=${walletAddress}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    return url;
  },

  // Portfolio
  DEBANK_PORTFOLIO_MULTICHAIN: (address: string) =>
    `/debank/portfolio/multichain/${address}`,

  // Opportunities
  OPPORTUNITIES_SAFE: (chainId?: number, asset?: string) => {
    const params: string[] = [];
    if (chainId !== undefined) params.push(`chainId=${chainId}`);
    if (asset) params.push(`asset=${asset}`);
    return params.length > 0 ? `/opportunities/safe?${params.join("&")}` : "/opportunities/safe";
  },
  OPPORTUNITIES_DEGEN: (chainId?: number, asset?: string) => {
    const params: string[] = [];
    if (chainId !== undefined) params.push(`chainId=${chainId}`);
    if (asset) params.push(`asset=${asset}`);
    return params.length > 0 ? `/opportunities/degen-strategies?${params.join("&")}` : "/opportunities/degen-strategies";
  },

  // APY History
  DAILY_APY_HISTORY_WEIGHTED: (walletAddress: string, days?: string) =>
    `/daily-apy-history/weighted-multi-asset/${walletAddress}${
      days ? `?days=${days}` : ""
    }`,

  // Rebalance
  REBALANCE_INFO: (options?: { isCrossChain?: boolean; tokenSymbol?: string }) => {
    const params: string[] = [];
    if (options?.isCrossChain !== undefined) params.push(`isCrossChain=${options.isCrossChain}`);
    if (options?.tokenSymbol) params.push(`tokenSymbol=${options.tokenSymbol}`);
    return params.length > 0 ? `/rebalance/rebalance-info?${params.join("&")}` : "/rebalance/rebalance-info";
  },

  // APY Per Strategy
  APY_PER_STRATEGY: (options: {
    isCrossChain?: boolean;
    days?: number;
    strategy?: string;
    chainId?: number;
    tokenSymbol?: string;
  } = {}) => {
    const params: string[] = [];
    if (options.isCrossChain !== undefined) params.push(`isCrossChain=${options.isCrossChain}`);
    if (options.days !== undefined) params.push(`days=${options.days}`);
    if (options.strategy) params.push(`strategy=${options.strategy}`);
    if (options.chainId !== undefined) params.push(`chainId=${options.chainId}`);
    if (options.tokenSymbol) params.push(`tokenSymbol=${options.tokenSymbol}`);
    return params.length > 0 ? `/rebalance/rebalance-info?${params.join("&")}` : "/rebalance/rebalance-info";
  },
} as const;
