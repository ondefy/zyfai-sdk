/**
 * API Endpoints Configuration
 */

export const API_ENDPOINTS = {
  // staging: "https://staging-api.zyf.ai",
  staging: "http://localhost:3000",
  production: "https://api.zyf.ai",
} as const;

export const API_VERSION = "/api/v1";

export const ENDPOINTS = {
  // Auth
  AUTH_LOGIN: "/auth/login",
  AUTH_CHALLENGE: "/auth/challenge",

  // User
  USER_ME: "/users/me",
  USER_BY_SMART_WALLET: "/users/by-smart-wallet",
  USER_WITHDRAW: "/users/withdraw",
  PARTIAL_WITHDRAW: "/users/partial-withdraw",

  // Session Keys
  SESSION_KEYS_CONFIG: "/session-keys/config",
  SESSION_KEYS_ADD: "/session-keys/add",

  // Protocols
  PROTOCOLS: "/protocols",

  // History
  HISTORY: (userId: string) => `/history/${userId}`,

  // Data
  DATA_POSITION: "/data/position",
  DATA_TVL: (chainId: number) => `/data/tvl/${chainId}`,
} as const;
