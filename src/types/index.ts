/**
 * Zyfai SDK Types
 */

export type Address = `0x${string}`;
export type Hex = `0x${string}`;

export type Strategy = "conservative" | "aggressive";

export interface RpcUrlsConfig {
  8453?: string;
  42161?: string;
  9745?: string;
}

export interface SDKConfig {
  apiKey: string;
  rpcUrls?: RpcUrlsConfig;
  referralSource?: string;
}

// Response Types

export interface DeploySafeResponse {
  success: boolean;
  safeAddress: Address;
  txHash: string;
  status: "deployed" | "failed";
}

// Internal types - used by SDK implementation

/** @internal */
export interface UpdateUserProfileRequest {
  strategy?: string;
  protocols?: string[];
  autoSelectProtocols?: boolean;
  omniAccount?: boolean;
  autocompounding?: boolean;
  agentName?: string;
  crosschainStrategy?: boolean;
  splitting?: boolean;
  minSplits?: number;
  customization?: Record<string, any>;
}

/** @internal */
export interface UpdateUserProfileResponse {
  success: boolean;
  userId: string;
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
  splitting?: boolean;
  minSplits?: number;
  customization?: Record<string, any>;
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

export interface Position {
  user?: string;
  eoa?: Address;
  chains?: number[];
  strategy?: string;
  smartWallet?: Address;
  positions: PositionSlot[];
  hasActiveSessionKey?: boolean;
  hasBalance?: boolean;
  newSessionKeyAvailable?: boolean;
  hasStaleBalance?: string[];
  contracts?: Address[];
  omniAccount?: boolean;
  crosschainStrategy?: boolean;
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
  amount?: string;
  underlyingAmount?: string;
  pool_apy?: number;
  pool_tvl?: number;
}

export interface PositionsResponse {
  success: boolean;
  userAddress: string;
  positions: Position[];
}

// ============================================================================
// User Types
// ============================================================================

export interface UserDetails {
  id: string;
  address: string;
  smartWallet: string;
  chains: number[];
  protocols: Protocol[];
  hasActiveSessionKey: boolean;
  email?: string;
  strategy?: string;
  telegramId?: string;
  walletType?: string;
  autoSelectProtocols: boolean;
  autocompounding?: boolean;
  omniAccount?: boolean;
  crosschainStrategy?: boolean;
  agentName?: string;
  customization?: Record<string, any>;
  executorProxy?: boolean;
  splitting?: boolean;
  minSplits?: number;
  registered?: boolean;
}

export interface UserDetailsResponse {
  success: boolean;
  user: UserDetails;
}

// ============================================================================
// TVL & Volume Types
// ============================================================================

export interface TVLBreakdown {
  chain_id: number;
  protocol_id: string | null;
  protocol_name: string | null;
  pool: string | null;
  total_balance: number;
}

export interface TVLResponse {
  success: boolean;
  totalTvl: number;
  byChain?: Record<number, number>;
  breakdown?: TVLBreakdown[];
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
  average_apy_without_fee: number;
  average_apy_with_rzfi_without_fee: number;
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
}

export interface HistoryEntry {
  id?: string;
  action?: string;
  date?: string;
  strategy?: string;
  positions?: HistoryPosition[];
  chainId?: number;
  transactionHash?: string;
  destinationChainId?: number;
  sourceChains?: number[];
  crosschain?: boolean;
  rebalance?: boolean;
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

export interface OnchainEarnings {
  walletAddress: string;
  totalEarnings: number;
  currentEarnings: number;
  lifetimeEarnings: number;
  unrealizedEarnings?: number;
  currentEarningsByChain?: Record<string, number>;
  unrealizedEarningsByChain?: Record<string, number>;
  lastCheckTimestamp?: string;
}

export interface OnchainEarningsResponse {
  success: boolean;
  data: OnchainEarnings;
}

export interface DailyEarning {
  wallet_address?: string;
  snapshot_date: string;
  total_current_earnings: number;
  total_lifetime_earnings: number;
  total_unrealized_earnings: number;
  total_earnings: number;
  daily_current_delta: number;
  daily_lifetime_delta: number;
  daily_unrealized_delta: number;
  daily_total_delta: number;
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
  strategyType: "conservative" | "aggressive";
  status?: string;
}

export interface OpportunitiesResponse {
  success: boolean;
  chainId?: number;
  strategyType: "conservative" | "aggressive";
  data: Opportunity[];
}

// ============================================================================
// Daily APY History Types
// ============================================================================

export interface DailyApyEntry {
  date: string;
  apy: number;
  weightedApy?: number;
  balance?: number;
  protocol?: string;
  pool?: string;
}

export interface DailyApyHistoryResponse {
  success: boolean;
  walletAddress: string;
  history: Record<string, DailyApyEntry>;
  totalDays: number;
  requestedDays?: number;
  averageWeightedApy?: number;
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
  tvlByWallet: WalletTVL[];
  metadata?: {
    sdkKeyId: string;
    clientName: string;
    walletsCount: number;
  };
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
