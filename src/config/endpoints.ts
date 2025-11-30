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
  AUTH_REFRESH: "/auth/refresh",

  // User
  USER_ME: "/users/me",
  USER_UPDATE: "/users/me",

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
  LOG_DEPOSIT: "/users/log_deposit",
  MANUAL_WITHDRAW: "/users/manual-withdraw",
  PARTIAL_WITHDRAW: "/users/partial-withdraw",

  // Session Keys
  SESSION_KEYS_CONFIG: "/data/config", // Public endpoint, uses API key
  SESSION_KEYS_HASH: "/session-keys/hash",
  SESSION_KEYS: "/session-keys",
  SESSION_KEYS_ACTIVATE: (chainId: number) =>
    `/session-keys/activate/${chainId}`,
  SESSION_KEYS_ACTIVE: "/session-keys/active",

  // Protocols
  PROTOCOLS: "/protocols",

  // History
  HISTORY: (userId: string) => `/history/${userId}`,
  HISTORY_LATEST: (userId: string) => `/history/${userId}/latest`,

  // Data
  DATA_POSITION: "/data/position",
  DATA_TVL: (chainId: number) => `/data/tvl/${chainId}`,
} as const;

