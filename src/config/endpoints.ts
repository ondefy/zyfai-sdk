/**
 * API Endpoints Configuration
 *
 * Base URLs are grouped by environment. Default exports always target production;
 * use the maps or named constants for staging/local stacks (integration tests,
 * examples, internal tooling).
 */

import { SupportedChainId } from "../config/chains";

export type BackendEnvironment = "production" | "staging" | "local";

/** Execution API (zyfai-api) origin — no `/api/v1` suffix. */
export const EXECUTION_API_BASE_URLS = {
  production: "https://api.zyf.ai",
  staging: "https://staging-api.zyf.ai",
  local: "http://localhost:3000",
} as const satisfies Record<BackendEnvironment, string>;

/** Data API (zyfai-defi-api) origin — no `/api/v2` suffix. */
export const DATA_API_BASE_URLS = {
  production: "https://defiapi.zyf.ai",
  staging: "https://staging-defiapi.zyf.ai",
  /** Both backends default to port 3000 locally; run one at a time or override PORT. */
  local: "http://localhost:3000",
} as const satisfies Record<BackendEnvironment, string>;

/** Defi-api WebSocket URL (includes `/ws/events` path). */
export const WS_URLS = {
  production: "wss://defiapi.zyf.ai/ws/events",
  staging: "wss://staging-defiapi.zyf.ai/ws/events",
  local: "ws://localhost:3000/ws/events",
} as const satisfies Record<BackendEnvironment, string>;

/** Production execution API — default for the public SDK. */
export const API_ENDPOINT = EXECUTION_API_BASE_URLS.production;

/** Production data API — default for the public SDK. */
export const DATA_API_ENDPOINT = DATA_API_BASE_URLS.production;

/** Production defi-api WebSocket — default for the public SDK. */
export const WS_ENDPOINT = WS_URLS.production;

export const STAGING_EXECUTION_API_BASE_URL = EXECUTION_API_BASE_URLS.staging;
export const STAGING_DATA_API_BASE_URL = DATA_API_BASE_URLS.staging;
export const STAGING_WS_URL = WS_URLS.staging;

export const LOCAL_EXECUTION_API_BASE_URL = EXECUTION_API_BASE_URLS.local;
export const LOCAL_DATA_API_BASE_URL = DATA_API_BASE_URLS.local;
export const LOCAL_WS_URL = WS_URLS.local;

export function getExecutionApiBaseUrl(
  environment: BackendEnvironment = "production",
): string {
  return EXECUTION_API_BASE_URLS[environment];
}

export function getDataApiBaseUrl(
  environment: BackendEnvironment = "production",
): string {
  return DATA_API_BASE_URLS[environment];
}

export function getWsUrl(
  environment: BackendEnvironment = "production",
): string {
  return WS_URLS[environment];
}

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

  // Multichain deploy for predeployed (pool) wallets — deploys + rotates the
  // same address on the requested chains (sponsored, no user signature).
  DEPLOY_CHAINS: "/users/deploy-chains",

  // Session Keys
  SESSION_KEYS_CONFIG: "/session-keys/config",
  SESSION_KEYS_ADD: "/session-keys/add",

  // Protocols
  PROTOCOLS: (chainId?: number) =>
    chainId ? `/protocols?chainId=${chainId}` : "/protocols",

  // Data (v1)
  DATA_POSITION: (walletAddress: string) =>
    `/data/position?walletAddress=${walletAddress}`,
  DATA_PORTFOLIO: (walletAddress: string) =>
    `/data/wallet-portfolio?walletAddress=${walletAddress}`,
  DATA_HISTORY: (
    walletAddress: string,
    chainId: SupportedChainId,
    assetType?: "usdc" | "eth" | "eurc",
  ) =>
    `/data/history?walletAddress=${walletAddress}&chainId=${chainId}${
      assetType ? `&assetType=${assetType}` : ""
    }`,
  DATA_TVL: "/data/usd-tvl",
  DATA_VOLUME: (assetType: "usdc" | "eth" | "eurc") =>
    `/data/volume?assetType=${assetType}`,
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

  // Simulation
  SIMULATE_BEST_POSITIONS: (params: {
    amount: number;
    token: string;
    networks: number | number[];
    strategy: string;
    minSplit?: number;
    protocols?: string[];
    pools?: string[];
    userPositions?: { protocol: string; pool: string; tvl: number }[];
    partOfZyfiTvl?: boolean;
  }) => {
    const networks = Array.isArray(params.networks)
      ? params.networks.join(",")
      : params.networks;
    const query: string[] = [
      `amount=${params.amount}`,
      `token=${params.token}`,
      `networks=${networks}`,
      `strategy=${params.strategy}`,
    ];
    if (params.minSplit !== undefined)
      query.push(`minSplit=${params.minSplit}`);
    if (params.protocols?.length)
      query.push(`protocols=${params.protocols.join(",")}`);
    if (params.pools?.length) query.push(`pools=${params.pools.join(",")}`);
    if (params.userPositions?.length)
      query.push(
        `userPositions=${encodeURIComponent(JSON.stringify(params.userPositions))}`,
      );
    if (params.partOfZyfiTvl !== undefined)
      query.push(`partOfZyfiTvl=${params.partOfZyfiTvl}`);
    return `/simulate/best-positions?${query.join("&")}`;
  },

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
    `/onchain-earnings/onchain-earnings-v2?walletAddress=${walletAddress}`,
  CALCULATE_ONCHAIN_EARNINGS: (walletAddress: string) =>
    `/onchain-earnings/calculate-onchain-earnings-v2?walletAddress=${walletAddress}`,
  DAILY_EARNINGS: (
    walletAddress: string,
    startDate?: string,
    endDate?: string,
  ) => {
    let url = `/onchain-earnings/daily-earnings-v2?walletAddress=${walletAddress}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    return url;
  },

  // Opportunities
  OPPORTUNITIES_SAFE: (chainId?: number, asset?: string, status?: string) => {
    const params: string[] = [];
    if (chainId !== undefined) params.push(`chainId=${chainId}`);
    if (asset) params.push(`asset=${asset}`);
    if (status) params.push(`status=${status}`);
    return params.length > 0
      ? `/opportunities/safe?${params.join("&")}`
      : "/opportunities/safe";
  },
  OPPORTUNITIES_DEGEN: (chainId?: number, asset?: string, status?: string) => {
    const params: string[] = [];
    if (chainId !== undefined) params.push(`chainId=${chainId}`);
    if (asset) params.push(`asset=${asset}`);
    if (status) params.push(`status=${status}`);
    return params.length > 0
      ? `/opportunities/degen-strategies?${params.join("&")}`
      : "/opportunities/degen-strategies";
  },

  // APY History
  DAILY_APY_HISTORY_WEIGHTED: (walletAddress: string, days?: string) =>
    `/daily-apy-history/weighted-multi-asset/${walletAddress}${
      days ? `?days=${days}` : ""
    }`,

  // Rebalance
  REBALANCE_INFO: (options?: {
    isCrossChain?: boolean;
    tokenSymbol?: string;
  }) => {
    const params: string[] = [];
    if (options?.isCrossChain !== undefined)
      params.push(`isCrossChain=${options.isCrossChain}`);
    if (options?.tokenSymbol) params.push(`tokenSymbol=${options.tokenSymbol}`);
    return params.length > 0
      ? `/rebalance/rebalance-info?${params.join("&")}`
      : "/rebalance/rebalance-info";
  },

  // Token USD price (e.g. token=eth)
  TOKEN_PRICE: (token: string) => `/price?token=${encodeURIComponent(token)}`,

  // APY Per Strategy
  APY_PER_STRATEGY: (
    options: {
      isCrossChain?: boolean;
      days?: number;
      strategy?: string;
      chainId?: number;
      tokenSymbol?: string;
    } = {},
  ) => {
    const params: string[] = [];
    if (options.isCrossChain !== undefined)
      params.push(`isCrossChain=${options.isCrossChain}`);
    if (options.days !== undefined) params.push(`days=${options.days}`);
    if (options.strategy) params.push(`strategy=${options.strategy}`);
    if (options.chainId !== undefined)
      params.push(`chainId=${options.chainId}`);
    if (options.tokenSymbol) params.push(`tokenSymbol=${options.tokenSymbol}`);
    return params.length > 0
      ? `/rebalance/rebalance-info?${params.join("&")}`
      : "/rebalance/rebalance-info";
  },
} as const;
