/**
 * API Endpoints Configuration
 */

import { SupportedChainId } from "..";

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
  USER_BY_SMART_WALLET: "/users/by-smart-wallet", // TODO: Check with Utkir if a similar endpoint is already available.
  USER_WITHDRAW: "/users/withdraw",
  PARTIAL_WITHDRAW: "/users/partial-withdraw",

  // Session Keys
  SESSION_KEYS_CONFIG: "/session-keys/config",
  SESSION_KEYS_ADD: "/session-keys/add",

  // Protocols
  PROTOCOLS: (chainId: number) => `/protocols?chainId=${chainId}`,

  // Data
  DATA_POSITION: (walletAddress: string) =>
    `/data/position?walletAddress=${walletAddress}`,
  DATA_HISTORY: (walletAddress: string, chainId: SupportedChainId) =>
    `/data/history?walletAddress=${walletAddress}&chainId=${chainId}`,
} as const;
