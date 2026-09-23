/**
 * TypeScript client for the Zyfai yield agent.
 *
 * The SDK is a thin facade over two backends: the execution API (`api.zyf.ai`)
 * for deposits, withdrawals, and smart-wallet lifecycle, and the data API
 * (`defiapi.zyf.ai`) for opportunities, earnings, and analytics.
 *
 * @remarks
 * Integration checklist:
 * 1. Construct {@link ZyfaiSDK} with your partner API key.
 * 2. {@link ZyfaiSDK.connectAccount} (SIWE) for user-scoped execution calls.
 * 3. {@link ZyfaiSDK.sendDeposit} then {@link ZyfaiSDK.waitForDepositCredit} for funding.
 *
 * Pass the user's **EOA** as `userAddress` on execution methods, never the Safe.
 * Deposit amounts use **least units** (USDC/EURC: 6 decimals, WETH: 18).
 *
 * Secondary exports: {@link createBankrProvider}, chain helpers, environment URL
 * maps, vault/module reference constants, and shared types.
 *
 * @packageDocumentation
 *
 * @see {@link https://docs.zyf.ai/docs/sdk/agent-quickstart | Agent quickstart}
 * @see README.md in the npm package for tutorials
 */

/** Main SDK class — execution and analytics methods. */
export { ZyfaiSDK } from "./core/ZyfaiSDK";

/** EIP-1193 provider adapter for Bankr Agent API signing. */
export {
  createBankrProvider,
  type BankrProviderConfig,
  type BankrProvider,
} from "./providers/bankr";

/** Supported chains, RPC helpers, and default token addresses. */
export {
  getChainConfig,
  isSupportedChain,
  getSupportedChainIds,
  getDefaultTokenAddress,
  DEFAULT_TOKEN_ADDRESSES,
  type SupportedChainId,
  type ChainConfig,
} from "./config/chains";

/** Shared constants (history windows, deposit polling defaults). */
export {
  ALLOWED_HISTORY_DAYS,
  type AllowedHistoryDays,
  type DailyApyHistoryPeriod,
} from "./config/constants";

/** Production and staging/local backend base URLs (advanced integrators). */
export {
  API_ENDPOINT,
  DATA_API_ENDPOINT,
  WS_ENDPOINT,
  EXECUTION_API_BASE_URLS,
  DATA_API_BASE_URLS,
  WS_URLS,
  STAGING_EXECUTION_API_BASE_URL,
  STAGING_DATA_API_BASE_URL,
  STAGING_WS_URL,
  LOCAL_EXECUTION_API_BASE_URL,
  LOCAL_DATA_API_BASE_URL,
  LOCAL_WS_URL,
  getExecutionApiBaseUrl,
  getDataApiBaseUrl,
  getWsUrl,
  type BackendEnvironment,
} from "./config/endpoints";

/** Public request/response and event types. */
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
  DepositLifecycleResponse,
  DepositLifecycleStatus,
  WaitForDepositCreditOptions,
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
  AsyncWithdrawal,
  AsyncWithdrawalStatus,
  staleBalances,

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

/** On-chain vault contract address used by vault helpers. */
export { VAULT_ADDRESS } from "./config/abis";

/**
 * Predeployment (wallet pool) module addresses — reference constants mirroring
 * the predeployment service. The SDK does not install these modules.
 */
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
