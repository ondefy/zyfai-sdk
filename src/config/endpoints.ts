/**
 * API Endpoints Configuration
 */

export const API_ENDPOINTS = {
  staging: "https://staging-api.zyf.ai",
  production: "https://api.zyf.ai",
} as const;

export const API_VERSION = "/api/v1";

export const ENDPOINTS = {
  // Auth
  AUTH_SIGNIN: "/auth/signin",
  AUTH_REFRESH: "/auth/refresh",

  // Users
  USERS_ME: "/users/me",
  USERS_BY_ID: (userId: string) => `/users/${userId}`,
  USERS_POSITION: (userId: string) => `/users/${userId}/position`,
  USERS_DEPOSITS: (userId: string) => `/users/${userId}/deposits`,
  USERS_WITHDRAW: (userId: string, chainId: number) =>
    `/users/${userId}/withdraw/${chainId}`,
  USERS_PARTIAL_WITHDRAW: (userId: string, chainId: number) =>
    `/users/${userId}/partial-withdraw/${chainId}`,
  USERS_NOTIFICATIONS: (userId: string) => `/users/${userId}/notifications`,

  // Session Keys
  SESSION_KEYS_CONFIG: "/session-keys/config",
  SESSION_KEYS_HASH: "/session-keys/hash",
  SESSION_KEYS: "/session-keys",
  SESSION_KEYS_ACTIVATE: (chainId: number) =>
    `/session-keys/activate/${chainId}`,
  SESSION_KEYS_ACTIVE: "/session-keys/active",

  // Protocols
  PROTOCOL: "/protocol",

  // History
  HISTORY: (userId: string) => `/history/${userId}`,
  HISTORY_LATEST: (userId: string) => `/history/${userId}/latest`,

  // Earnings
  EARNINGS: (walletAddress: string) => `/earnings/${walletAddress}`,

  // Data
  DATA_TVL: (chainId: number) => `/data/tvl/${chainId}`,
} as const;
