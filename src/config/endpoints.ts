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
  PROTOCOLS: (chainId: number) => `/protocols?chainId=${chainId}`,

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
} as const;

// Data API Endpoints (v2)
export const DATA_ENDPOINTS = {
  // User Initialization
  USER_INITIALIZE: "/api/earnings/initialize",

  // Earnings
  ONCHAIN_EARNINGS: (walletAddress: string) =>
    `/usercheck/onchain-earnings?walletAddress=${walletAddress}`,
  CALCULATE_ONCHAIN_EARNINGS: "/usercheck/calculate-onchain-earnings",
  DAILY_EARNINGS: (
    walletAddress: string,
    startDate?: string,
    endDate?: string
  ) => {
    let url = `/usercheck/daily-earnings?walletAddress=${walletAddress}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    return url;
  },

  // Portfolio
  DEBANK_PORTFOLIO_MULTICHAIN: (address: string) =>
    `/debank/portfolio/multichain/${address}`,

  // Opportunities
  OPPORTUNITIES_SAFE: (chainId?: number) =>
    chainId ? `/opportunities/safe?chainId=${chainId}` : "/opportunities/safe",
  OPPORTUNITIES_DEGEN: (chainId?: number) =>
    chainId
      ? `/opportunities/degen-strategies?chainId=${chainId}`
      : "/opportunities/degen-strategies",

  // APY History
  DAILY_APY_HISTORY_WEIGHTED: (walletAddress: string, days?: string) =>
    `/daily-apy-history/weighted/${walletAddress}${
      days ? `?days=${days}` : ""
    }`,

  // Rebalance
  REBALANCE_INFO: (isCrossChain?: boolean) =>
    isCrossChain !== undefined
      ? `/rebalance/rebalance-info?isCrossChain=${isCrossChain}`
      : "/rebalance/rebalance-info",

  // APY Per Strategy
  APY_PER_STRATEGY: (isCrossChain: boolean = false, days: number = 7, strategy: string = "safe") =>
    `/rebalance/rebalance-info?isCrossChain=${isCrossChain}&days=${days}&strategy=${strategy}`,
} as const;
