/**
 * Zyfai SDK Types
 */

export type Address = `0x${string}`;
export type Hex = `0x${string}`;

/**
 * Public strategy names.
 * `yieldmaxxing` unlocks protocols with asynchronous (delayed) withdrawals —
 * see `PortfolioDetailed.pendingAsyncWithdrawals`.
 */
export type Strategy = "conservative" | "aggressive" | "yieldmaxxing";

/** Public asset symbols supported by the SDK */
export type SupportedAsset = "USDC" | "WETH" | "EURC" | "NVDAc";

export interface RpcUrlsConfig {
  1?: string;
  8453?: string;
  42161?: string;
}

export interface SDKConfig {
  apiKey: string;
  rpcUrls?: RpcUrlsConfig;
  referralSource?: string;
  /** @internal Local integration tests only — not part of the public SDK contract. */
  executionApiUrl?: string;
  /** @internal Local integration tests only — not part of the public SDK contract. */
  dataApiUrl?: string;
}

// Response Types

export interface DeploySafeResponse {
  success: boolean;
  safeAddress: Address;
  txHash: string;
  status: "deployed" | "failed";
  sessionKeyCreated?: boolean;
}

// User Profile types

export interface UpdateUserProfileRequest {
  strategy?: string;
  protocols?: string[];
  autoSelectProtocols?: boolean;
  omniAccount?: boolean;
  chains?: number[];
  autocompounding?: boolean;
  agentName?: string;
  crosschainStrategy?: boolean;
  splitting?: boolean;
  minSplits?: number;
  asset?: SupportedAsset;
}

/** @internal */
export interface UpdateUserProfileInternalRequest {
  omniAccount?: boolean;
  chains?: number[];
  agentName?: string;
  customization?: Record<string, any>;
  assetTypeSettings?: AssetTypeSettings;
}

export interface UpdateUserProfileResponse {
  success: boolean;
  smartWallet?: Address;
  chains?: number[];
  strategy?: string;
  protocols?: string[];
  autoSelectProtocols?: boolean;
  omniAccount?: boolean;
  autocompounding?: boolean;
  agentName?: string;
  crosschainStrategy?: boolean;
  executorProxy?: boolean;
  hasActiveSessionKey?: boolean;
  splitting?: boolean;
  minSplits?: number;
  customization?: Record<string, any>;
  asset?: SupportedAsset;
}

/** @internal */
export interface InitializeUserResponse {
  success: boolean;
  userId: string;
  smartWallet?: Address;
  chainId?: number;
  message?: string;
}

/** @internal */
export interface LoginResponse {
  userId: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpires?: number;
  hasActiveSessionKey?: boolean;
  smartWallet?: string | null;
  /**
   * True when the smart wallet was provisioned by the predeployment pool
   * (backend-owned at deploy, rotated to the user on first deposit). Such
   * wallets are already deployed with the agent session enabled, so the client
   * skips deploy, never signs a session key, and never derives the address.
   */
  predeployed?: boolean;
}

/** @internal */
export interface AddSessionKeyRequest {
  signer: Address;
  hash: Hex;
  nonces: number[];
}

/** @internal */
export interface AddSessionKeyResponse {
  id: string;
  hash: string;
  signer: string;
  nonces: number[];
  expiresAt: string;
  txHash?: string;
  isActive: boolean;
  isEnabled: boolean;
  permissionId?: string;
  permissionEnableHash?: string;
  customHash?: string;
}

export interface SessionKeyResponse {
  success: boolean;
  /** Signature (not available when alreadyActive is true) */
  signature?: Hex;
  sessionNonces?: bigint[];
  userId?: string;
  sessionActivation?: AddSessionKeyResponse;
  /** Message when session key already exists */
  message?: string;
  /** True if a session key was already active for this user */
  alreadyActive?: boolean;
}

export interface SmartWalletResponse {
  address: Address;
  isDeployed: boolean;
  /**
   * True when userAddress is an OwnableValidator owner of the Safe on-chain.
   * For predeployed (pool) wallets this becomes true only after the first
   * deposit rotates ownership from the backend to the user. Always false when
   * the Safe is not deployed.
   */
  isOwner: boolean;
}

export interface Protocol {
  id: string;
  name: string;
  type: string;
  description?: string;
  imageUrl?: string;
  website?: string;
  strategies?: string[];
  chains: number[];
  pools?: Pool[];
}

export interface Pool {
  id: string;
  name: string;
  asset: string;
  apy?: number;
  tvl?: string;
}

export interface ProtocolsResponse {
  success: boolean;
  chainId: number;
  protocols: Protocol[];
}


export interface staleBalances {
  chainId: number;
  tokenSymbol: string;
  balance: string;
  isPending: boolean;
  updatedAt?: string;
}

export interface Portfolio {
  user?: string;
  eoa?: Address;
  chains?: number[];
  strategy?: string;
  smartWallet?: Address;
  hasBalance?: boolean;
  predeployed?: boolean;
  ownershipTransferred?: boolean;
  positions?: PositionSlot[];
  hasActiveSessionKey?: boolean;
  newSessionKeyAvailable?: boolean;
  contracts?: Address[];
  omniAccount?: boolean;
  crosschainStrategy?: boolean;
  staleBalances?: staleBalances[];
  splitting?: boolean;
  minSplits?: number;
  executorProxy?: boolean;
  assetTypeSettings?: AssetTypeSettings;
}

export interface PortfolioAssetBalance {
  balance: Hex;
  /** Net balance after pending Zyfi fee (live − current × feeRate). */
  balanceWithFee?: Hex;
  decimals: number;
}

export type PortfolioByAssetType = Record<string, PortfolioAssetBalance>;

export type PortfolioByChain = Record<string, PortfolioByAssetType>;

/**
 * Lifecycle of an asynchronous (delayed) withdrawal.
 * - `REQUESTED`: redemption asked, protocol has not released the funds yet
 * - `CLAIMABLE`: protocol released the funds, claim transaction is queued
 * - `CLAIMED`: funds are back in the Safe (or forwarded to the EOA)
 * - `FAILED`: not claimable past `estimatedClaimAt`; the position is restored
 *   and the request is retried on the next cycle
 */
export type AsyncWithdrawalStatus =
  | "REQUESTED"
  | "CLAIMABLE"
  | "CLAIMED"
  | "FAILED";

/**
 * A redemption in flight on a protocol with a delayed withdrawal
 * (Ipor, Superform). Funds are neither in `positions` nor in the Safe
 * balance while the request is `REQUESTED` or `CLAIMABLE`.
 */
export interface AsyncWithdrawal {
  id: string;
  status: AsyncWithdrawalStatus;
  chainId: number;
  /** Pool / vault identifier, e.g. "NVDAC". */
  pool: string;
  /**
   * Redeemed amount in the token's least units, hex-encoded like every other
   * balance in the payload (e.g. `"0x98967f"`). Read it with `BigInt`, then
   * apply `token.decimals`.
   */
  amount: string;
  token?: {
    id?: string;
    name?: string;
    symbol?: string;
    decimals?: number;
    address?: string;
    chainId?: number;
    icon?: string;
  };
  protocol?: {
    id?: string;
    name?: string;
    imageUrl?: string;
    icon?: string;
    metadata?: {
      /** Nominal redemption delay advertised by the protocol, in days. */
      asyncWithdrawalDays?: number;
    };
  };
  /**
   * `"user_eoa"` when the user initiated the withdrawal (claimed funds go to
   * the EOA); absent when the rebalancer did (funds get redeployed).
   */
  withdrawalTarget?: string | null;
  /** ISO timestamp when the protocol is expected to allow claiming. */
  estimatedClaimAt?: string | null;
  /** ISO timestamp of the successful claim (`CLAIMED` only). */
  claimedAt?: string | null;
  requestTxHash?: string | null;
  claimTxHash?: string | null;
  /** Failed claim attempts so far — the cron retries until `estimatedClaimAt`. */
  retryCount?: number;
  /** User-facing copy when the protocol temporarily refuses claims. */
  statusMessage?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PortfolioDetailed {
  hasBalance?: boolean;
  /** Idle Safe balances above the rebalance threshold, across all chains. */
  staleBalances?: staleBalances[];
  hasActiveSessionKey?: boolean;
  positions?: PositionSlot[];
  /**
   * Redemptions in flight: `REQUESTED` and `CLAIMABLE`, plus `CLAIMED` from
   * the last 24 hours. Only the first two hold funds that are missing from
   * `portfolioByAssetType` — see the total-balance note on `getPortfolio`.
   */
  pendingAsyncWithdrawals?: AsyncWithdrawal[];
  /**
   * Per-token copy explaining a temporary protocol pause (e.g. tokenized
   * stocks over the weekend), keyed by token symbol.
   */
  pauseMessageByToken?: Record<string, string>;
  /** Positions + idle Safe balances, summed per asset type. */
  portfolioByAssetType?: PortfolioByAssetType;
  portfolioByChain?: PortfolioByChain;
}

export interface AssetTypeSettings {
  [assetType: string]: {
    rebalanceStrategy?: string;
    autocompounding?: boolean;
    crosschainStrategy?: boolean;
    splitting?: boolean;
    minSplits?: number;
    chains?: number[];
    autoSelectProtocols?: boolean;
    protocols?: string[];
  };
}

export interface PositionSlot {
  chain?: string;
  protocol_id?: string;
  protocol_name?: string;
  protocol_icon?: string;
  pool?: string;
  token_id?: string;
  token_symbol?: string;
  token_icon?: string;
  assetType?: string;
  decimals?: number;
  amount?: string;
  underlyingAmount?: string;
  /** Net underlying amount after this position's share of pending Zyfi fee. */
  underlyingAmountWithFee?: string;
  pool_apy?: number;
  /** Net pool APY after Zyfi performance fee (gross × 0.9). */
  pool_apy_withFee?: number;
  pool_tvl?: number;
  liquidity?: number;
}

export interface PortfolioResponse {
  success: boolean;
  userAddress: string;
  portfolio: Portfolio;
}

export interface PortfolioDetailedResponse {
  success: boolean;
  userAddress: string;
  portfolio: PortfolioDetailed;
}

// ============================================================================
// User Types
// ============================================================================


// ============================================================================
// TVL & Volume Types
// ============================================================================

export interface TVLResponse {
  success: boolean;
  totalTvl: number;
}

// ============================================================================
// APY Per Strategy Types
// ============================================================================

export interface APYPerStrategy {
  id: string;
  timestamp: string;
  amount: number;
  fee_threshold: number;
  days: number;
  chain_id: number;
  is_cross_chain: boolean;
  average_apy: number;
  average_apy_with_rzfi: number;
  total_rebalances: number;
  created_at: string;
  strategy: string;
  token_symbol?: string;
  average_apy_withFee: number;
  average_apy_with_rzfi_withFee: number;
  events_average_apy?: Record<string, number>;
  events_average_apy_withFee?: Record<string, number>;
  events_average_apy_with_rzfi_withFee?: Record<string, number>;
}

export interface APYPerStrategyResponse {
  success: boolean;
  count: number;
  data: APYPerStrategy[];
}

export interface VolumeResponse {
  success: boolean;
  volumeInUSD: string;
}

// ============================================================================
// Active Wallets Types
// ============================================================================

export interface ActiveWallet {
  smartWallet: string;
  chains: number[];
  hasBalance: boolean;
}

export interface ActiveWalletsResponse {
  success: boolean;
  chainId: number;
  wallets: ActiveWallet[];
  count: number;
}

// ============================================================================
// Smart Wallets by EOA Types
// ============================================================================

export interface SmartWalletByEOAResponse {
  success: boolean;
  eoa: string;
  smartWallet: Address | null;
  chains: number[];
}

// ============================================================================
// First Topup Types
// ============================================================================

export interface FirstTopupResponse {
  success: boolean;
  walletAddress: string;
  date: string;
  amount?: string;
  chainId?: number;
}

// ============================================================================
// History Types
// ============================================================================

export interface HistoryPosition {
  pool?: string;
  amount?: string;
  token_id?: string;
  token_icon?: string;
  amountInUSD?: string;
  protocol_id?: string;
  token_symbol?: string;
  protocol_icon?: string;
  protocol_name?: string;
  /**
   * The amount actually moved by this action (deposit/withdraw/rebalance delta),
   * as opposed to `amount`, which is the resulting position balance after the action.
   * Optional: not present on older history entries or actions that predate this field.
   */
  deltaAmount?: string;
}

export interface HistoryFeeData {
  gasCostInToken?: string;
  gasDeducted?: boolean;
  actualGasCost?: string;
}

export interface HistoryRebalanceLog {
  oldApy?: string;
  newApy?: string;
  oldApy_withFee?: string;
  newApy_withFee?: string;
  oldOpportunity?: string;
  newOpportunity?: string;
}

export interface HistoryEntry {
  id?: string;
  action?: string;
  date?: string;
  strategy?: string;
  positions?: HistoryPosition[];
  chainId?: number;
  tokenId?: string;
  transactionHash?: string;
  destinationChainId?: number;
  sourceChains?: number[];
  crosschain?: boolean;
  rebalance?: boolean;
  feeData?: HistoryFeeData;
  rebalanceLog?: HistoryRebalanceLog;
  zkProofIpfsHash?: string;
  validationRegistryTxHash?: string;
  validationRegistryChainId?: number;
  validationRegistryAddress?: string;
}

export interface HistoryResponse {
  success: boolean;
  walletAddress: string;
  data: HistoryEntry[];
  total: number;
}

// ============================================================================
// Onchain Earnings Types
// ============================================================================

// Token-keyed earnings: { "USDC": "0.020667", "WETH": "0.000009..." }
export type TokenEarnings = Record<string, string>;

// Chain + token-keyed earnings: { "8453": { "USDC": "0.01", "WETH": "0.0001" }, "42161": {...} }
export type ChainTokenEarnings = Record<string, TokenEarnings>;

export interface OnchainEarnings {
  walletAddress: string;
  totalEarningsByToken: TokenEarnings;
  totalEarningsByChain?: ChainTokenEarnings;
  /**
   * Net totals: lifetime + unrealized + current × (1 - feeRate).
   * Unrealized is treated like lifetime (no pending fee).
   * Does not apply feeRate to lifetime (already crystallised).
   */
  totalEarningsByTokenWithFee: TokenEarnings;
  totalEarningsByChainWithFee?: ChainTokenEarnings;
  lastCheckTimestamp?: string;
  lastLogDate?: Record<string, string | null>;
}

export interface OnchainEarningsResponse {
  success: boolean;
  data: OnchainEarnings;
}

// V2 endpoint returns per-chain per-token nested maps under the `*_by_token`
// keys, e.g. `{ "8453": { "USDC": "143.10" } }`. The key name is preserved
// from the backend; the shape is `ChainTokenEarnings`.
export interface DailyEarning {
  snapshot_date: string;
  current_earnings_by_token: ChainTokenEarnings;
  lifetime_earnings_by_token: ChainTokenEarnings;
  unrealized_earnings_by_token: ChainTokenEarnings;
  total_earnings_by_token: ChainTokenEarnings;
  daily_total_delta_by_token: ChainTokenEarnings;
  /** Fee-exclusive: daily_total_delta_by_token × (1 - feeRate). */
  daily_total_delta_by_token_withoutFee: ChainTokenEarnings;
  created_at?: string;
}

export interface DailyEarningsResponse {
  success: boolean;
  walletAddress: string;
  data: DailyEarning[];
  count: number;
  filters: {
    startDate: string | null;
    endDate: string | null;
  };
}

// ============================================================================
// Portfolio Types (Debank)
// ============================================================================

export interface PortfolioToken {
  symbol: string;
  amount: number;
  valueUsd: number;
  price?: number;
}

export interface ChainPortfolio {
  chainId: number;
  chainName: string;
  totalValueUsd: number;
  tokens: PortfolioToken[];
}

export interface DebankPortfolioResponse {
  success: boolean;
  walletAddress: string;
  totalValueUsd: number;
  chains: Record<string, ChainPortfolio>;
}

// ============================================================================
// Opportunities Types
// ============================================================================

export interface Opportunity {
  id: string;
  protocolId: string;
  protocolName: string;
  poolName: string;
  chainId: number;
  apy: number;
  tvl?: number;
  asset?: string;
  risk?: string;
  strategyType: Strategy;
  status?: string;
}

export interface OpportunitiesResponse {
  success: boolean;
  chainId?: number;
  strategyType: Strategy;
  data: Opportunity[];
}

// ============================================================================
// Daily APY History Types
// ============================================================================

export interface ApyPosition {
  apy: number;
  /** Net APY after Zyfi performance fee (gross × 0.9). */
  apy_withFee?: number;
  balance: number;
  chainId: number;
  protocol: string;
  pool: string;
  strategy: string;
  tokenSymbol?: string;
}

// Per-token APY values: { "USDC": 5.05, "WETH": 1.58 }
export type TokenApy = Record<string, number>;

// Chain + token-keyed APY values: { "8453": { "USDC": 4.59 }, "42161": { "WETH": 1.82 } }
export type ChainTokenApy = Record<string, TokenApy>;

export interface DailyApyEntry {
  positions: ApyPosition[];
  weighted_apy: TokenApy;
  fee: TokenApy;
  weighted_apy_after_fee: TokenApy;
  rzfi_merkl_apr: TokenApy;
  final_weighted_apy: TokenApy;
}

export interface DailyApyHistoryResponse {
  success: boolean;
  walletAddress: string;
  history: Record<string, DailyApyEntry>;
  totalDays: number;
  requestedDays?: number;
  weightedApyWithRzfiAfterFee?: TokenApy;
  weightedApyAfterFee?: TokenApy;
  averageRzfiMerklApr?: TokenApy;
  weightedApyAfterFeeByChain?: ChainTokenApy;
  weightedApyWithRzfiAfterFeeByChain?: ChainTokenApy;
}

// ============================================================================
// Rebalance Types
// ============================================================================

export interface RebalanceFrequencyResponse {
  success: boolean;
  walletAddress: string;
  tier: string;
  frequency: number;
  description?: string;
}

export interface DepositResponse {
  success: boolean;
  txHash: string;
  smartWallet: string;
  amount: string;
}

export interface LogDepositResponse {
  success: boolean;
  message: string;
}

export interface WithdrawResponse {
  success: boolean;
  message: string;
  txHash?: string;
  type: "full" | "partial";
  amount: string;
}

export interface AddWalletToSdkResponse {
  success: boolean;
  message: string;
}

// ============================================================================
// SDK Key & TVL Types
// ============================================================================

export interface WalletTVL {
  walletAddress: Address;
  tvl: number;
  positions?: {
    chainId: number;
    protocol: string;
    amount: number;
  }[];
}

export interface SdkKeyTVLResponse {
  success: boolean;
  allowedWallets: Address[];
  totalTvl: number;
  totalVolume: number;
  tvlByWallet: WalletTVL[];
  metadata: {
    sdkKeyId: string;
    clientName: string;
    walletsCount: number;
  };
}

// ============================================================================
// Simulate Best Positions Types
// ============================================================================

export interface UserPosition {
  protocol: string;
  pool: string;
  tvl: number;
}

export interface SimulateBestPositionsParams {
  amount: number;
  token: string;
  networks: number | number[];
  strategy: Strategy;
  minSplit?: number;
  protocols?: string[];
  pools?: string[];
  userPositions?: UserPosition[];
  partOfZyfiTvl?: boolean;
}

export interface SimulateCalldataItem {
  contract_address: Address;
  function_name: string;
  parameters: string[];
  value: string;
  description: string;
}

export interface AllocationDetail {
  pool_capacity_usd: number;
  zyfi_position_usd: number;
  available_capacity_usd: number;
  fair_share_usd: number;
  overflow_usd: number;
}

export interface SimulatedPosition {
  protocol: string;
  pool: string;
  rank: number;
  simulated_apy: number;
  combined_apy: number;
  amount: number;
  amount_raw: string;
  url: string;
  tvl: number;
  liquidity: number;
  averageCombinedApy30Days: number;
  allocation_detail: AllocationDetail;
  calldata: SimulateCalldataItem[];
}

export interface ExcludedPool {
  protocol: string;
  pool: string;
  reason: string;
  detail: string;
  failed_checks?: string[];
}

export interface SimulateBestPositionsResponse {
  success: boolean;
  data: Record<string, SimulatedPosition[]>;
  excluded: Record<string, ExcludedPool[]>;
  messages: Record<string, string>;
}

// ============================================================================
// Best Opportunity Types
// ============================================================================

export interface OpportunityPosition {
  protocol: string;
  pool: string;
  apy: number;
  tvl?: number;
}

export interface BestOpportunityDetails {
  protocol: string;
  pool: string;
  apy: number;
  tvl: number;
  zyfiTvl?: number;
  poolApy?: number;
  rewardsApy?: number;
  protocolApy?: number;
}

export interface BestOpportunityResponse {
  success: boolean;
  error?: string;
  wallet?: Address;
  chainId?: number;
  strategy?: string;
  token?: {
    symbol: string;
    address: string;
    decimals: number;
  };
  currentPosition?: OpportunityPosition | null;
  bestOpportunity?: BestOpportunityDetails | null;
  shouldRebalance?: boolean;
  apyImprovement?: number | null;
  allOpportunities?: Array<{
    protocol: string;
    pool: string;
    apy: number;
    tvl: number;
    zyfiTvl?: number;
  }>;
  userConfig?: {
    autoSelectProtocols: boolean;
    enabledProtocols: string[];
  };
  enabledChains?: number[];
}

// ============================================================================
// Agent Identity Registry Types
// ============================================================================

export interface AgentTokenUriResponse {
  tokenUri: string;
}

export interface RegisterAgentResponse {
  success: boolean;
  txHash: string;
  chainId: number;
  smartWallet: string;
}

// ============================================================================
// Customization Types
// ============================================================================

export interface CustomizationConfig {
  protocolId: string;
  pools: string[];
  chainId: number;
  autoselect: boolean;
}

export interface CustomizeBatchRequest {
  customizations: CustomizationConfig[];
}

export interface CustomizeBatchResponse {
  success: boolean;
}

export interface GetPoolsResponse {
  success: boolean;
  pools: string[];
}

export interface GetSelectedPoolsResponse {
  success: boolean;
  pools: string[];
  autoselect: boolean;
}

// Session Types

export interface PolicyData {
  policy: Address;
  initData: Hex;
}

export interface ERC7739Context {
  appDomainSeparator: Hex;
  contentName: string[];
}

export interface ERC7739Data {
  allowedERC7739Content: ERC7739Context[];
  erc1271Policies: PolicyData[];
}

export interface ActionData {
  actionTargetSelector: Hex;
  actionTarget: Address;
  actionPolicies: PolicyData[];
}

export interface Session {
  sessionValidator: Address;
  sessionValidatorInitData: Hex;
  salt: Hex;
  userOpPolicies: PolicyData[];
  erc7739Policies: ERC7739Data;
  actions: ActionData[];
  permitERC4337Paymaster: boolean;
  chainId: bigint;
}

// Vault Types

export type VaultAsset = "USDC";

export interface VaultDepositRequest {
  amount: string;
  asset?: VaultAsset;
}

export interface VaultDepositResponse {
  success: boolean;
  txHash: string;
  amount: string;
  asset: VaultAsset;
  vaultAddress: Address;
}

export interface VaultWithdrawRequest {
  shares?: string;
  all?: boolean;
}

export interface VaultWithdrawResponse {
  success: boolean;
  txHash: string;
  withdrawKey: Hex;
  status: "pending" | "claimable";
}

export interface VaultClaimRequest {
  withdrawKey: Hex;
}

export interface VaultClaimResponse {
  success: boolean;
  txHash: string;
  claimed: boolean;
}

export interface VaultWithdrawStatusResponse {
  success: boolean;
  withdrawKey: Hex | null;
  isClaimable: boolean;
  isPending: boolean;
  nonce: bigint;
}

export interface VaultSharesResponse {
  success: boolean;
  shares: bigint;
  symbol: string;
}

// ============================================================================
// WebSocket Event Types
// ============================================================================

export interface DepegEvent {
  token: string;
  price: number;
  deviation: number;
  severity: "warning" | "critical";
  previousSeverity?: string;
  affectedPools: { protocol: string; pool: string; chain: string }[];
  timestamp: string;
}



export interface NewCollateralDetectedEvent {
  protocol: string;
  pool: string;
  chain: string;
  asset: string;
  exposureUsd: number;
  percentOfTvl: number;
  timestamp: string;
}

export interface LiquidityDropEvent {
  protocol: string;
  pool: string;
  chain: string;
  asset: string;
  previousLiquidityUsd: number;
  currentLiquidityUsd: number;
  dropPercent: number;
  windowMinutes: number;
  timestamp: string;
}

export interface ZyfaiEventFilters {
  chains?: string[];
  protocols?: string[];
  pools?: string[];
}

export interface ZyfaiEventHandlers {
  onDepeg?: (data: DepegEvent) => void;
  onNewCollateralDetected?: (data: NewCollateralDetectedEvent) => void;
  onLiquidityDrop?: (data: LiquidityDropEvent) => void;
  onError?: (error: unknown) => void;
}
