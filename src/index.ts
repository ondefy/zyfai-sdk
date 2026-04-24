/**
 * Zyfai SDK
 * TypeScript SDK for Zyfai Yield Optimization Engine
 *
 * @packageDocumentation
 * @module @zyfai/sdk
 */

export { ZyfaiSDK } from "./core/ZyfaiSDK";

// Providers
export { createBankrProvider, type BankrProviderConfig, type BankrProvider } from "./providers/bankr";

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
  PortfolioResponse,
  DepositResponse,
  LogDepositResponse,
  WithdrawResponse,
  AddWalletToSdkResponse,
  UpdateUserProfileRequest,
  UpdateUserProfileResponse,

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
  TokenEarnings,
  ChainTokenEarnings,
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
  TokenApy,
  ApyPosition,
  DailyApyEntry,
  DailyApyHistoryResponse,

  // Rebalance Types
  RebalanceFrequencyResponse,

  // APY Per Strategy Types
  APYPerStrategy,
  APYPerStrategyResponse,

  // SDK Key & TVL Types
  WalletTVL,
  SdkKeyTVLResponse,

  // Best Opportunity Types
  OpportunityPosition,
  BestOpportunityDetails,
  BestOpportunityResponse,

  // Agent Identity Registry Types
  RegisterAgentResponse,

  // Customization Types
  CustomizationConfig,
  CustomizeBatchRequest,
  CustomizeBatchResponse,
  GetPoolsResponse,
  GetSelectedPoolsResponse,

  // Protocol Types
  Protocol,
  Pool,
  Portfolio,
  PositionSlot,
  PortfolioDetailed,
  PortfolioDetailedResponse,

  // Session Types
  Session,
  PolicyData,
  ERC7739Data,
  ERC7739Context,
  ActionData,

  // Vault Types
  VaultAsset,
  VaultDepositResponse,
  VaultWithdrawResponse,
  VaultClaimResponse,
  VaultWithdrawStatusResponse,
  VaultSharesResponse,
} from "./types";

// Vault constants
export { VAULT_ADDRESS } from "./config/abis";
