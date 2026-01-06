/**
 * Zyfai SDK
 * TypeScript SDK for Zyfai Yield Optimization Engine
 *
 * @packageDocumentation
 * @module @zyfai/sdk
 */

export { ZyfaiSDK } from "./core/ZyfaiSDK";

// Chain utilities
export {
  getChainConfig,
  isSupportedChain,
  getSupportedChainIds,
  getDefaultTokenAddress,
  DEFAULT_TOKEN_ADDRESSES,
  type SupportedChainId,
  type ChainConfig,
} from "./config/chains";

export type {
  // Configuration
  SDKConfig,

  // Common Types
  Address,
  Hex,
  Strategy,

  // Core Response Types
  DeploySafeResponse,
  SessionKeyResponse,
  SmartWalletResponse,
  ProtocolsResponse,
  PositionsResponse,
  DepositResponse,
  WithdrawResponse,
  AddWalletToSdkResponse,

  // User Types
  UserDetails,
  UserDetailsResponse,

  // Data Types
  TVLResponse,
  VolumeResponse,
  ActiveWallet,
  ActiveWalletsResponse,
  SmartWalletByEOAResponse,
  FirstTopupResponse,
  HistoryPosition,
  HistoryEntry,
  HistoryResponse,

  // Earnings Types
  OnchainEarnings,
  OnchainEarningsResponse,
  DailyEarning,
  DailyEarningsResponse,

  // Portfolio Types
  PortfolioToken,
  ChainPortfolio,
  DebankPortfolioResponse,

  // Opportunities Types
  Opportunity,
  OpportunitiesResponse,

  // APY History Types
  DailyApyEntry,
  DailyApyHistoryResponse,

  // Rebalance Types
  RebalanceInfo,
  RebalanceInfoResponse,
  RebalanceFrequencyResponse,

  // Protocol Types
  Protocol,
  Pool,
  Position,
  PositionSlot,

  // Session Types
  Session,
  PolicyData,
  ERC7739Data,
  ERC7739Context,
  ActionData,
} from "./types";
