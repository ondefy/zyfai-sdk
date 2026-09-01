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
  SupportedAsset,

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
  HistoryFeeData,
  HistoryRebalanceLog,
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

  // Simulate Best Positions Types
  UserPosition,
  SimulateBestPositionsParams,
  SimulateCalldataItem,
  AllocationDetail,
  SimulatedPosition,
  ExcludedPool,
  SimulateBestPositionsResponse,

  // WebSocket Event Types
  DepegEvent,
  NewCollateralDetectedEvent,
  LiquidityDropEvent,
  ZyfaiEventFilters,
  ZyfaiEventHandlers,

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
  PortfolioAssetBalance,
  PortfolioByAssetType,
  PortfolioByChain,
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

// Predeployment (pool) module addresses - reference/validation constants.
// The SDK does not install these; they mirror the predeployment service's set.
export {
  SMART_SESSIONS_VALIDATOR,
  SMART_SESSIONS_FALLBACK,
  INTENT_EXECUTOR,
  PROXY_EXECUTOR,
  INTENT_SMART_SESSIONS,
  OWNABLE_VALIDATOR,
  SAFE_7579_ADDRESS,
  ERC7579_LAUNCHPAD_ADDRESS,
  POOL_MODULE_ADDRESSES,
} from "./config/modules";
