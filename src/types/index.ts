/**
 * ZyFAI SDK Types
 */

export type Address = `0x${string}`;
export type Hex = `0x${string}`;

export type Environment = "staging" | "production";

export interface SDKConfig {
  apiKey: string;
  environment?: Environment;
  bundlerApiKey?: string;
}

// Response Types

export interface DeploySafeResponse {
  success: boolean;
  safeAddress: Address;
  txHash: string;
  status: "deployed" | "failed";
}

export interface SessionKeyResponse {
  success: boolean;
  sessionKeyAddress: Address;
  signature: Hex;
  sessionNonces?: bigint[];
}

export interface SmartWalletResponse {
  address: Address;
  isDeployed: boolean;
}

export interface Protocol {
  id: string;
  name: string;
  description: string;
  tvl: string;
  minApy: number;
  maxApy: number;
  pools: Pool[];
}

export interface Pool {
  id: string;
  name: string;
  asset: string;
  apy: number;
  tvl: string;
}

export interface ProtocolsResponse {
  success: boolean;
  chainId: number;
  protocols: Protocol[];
}

export interface Position {
  id: string;
  protocol: string;
  pool: string;
  chainId: number;
  asset: {
    address: string;
    symbol: string;
    decimals: number;
  };
  amount: string;
  valueUsd: number;
  apy: number;
  unrealizedEarnings: number;
  lastUpdate: number;
}

export interface PositionsResponse {
  success: boolean;
  userAddress: string;
  totalValueUsd: number;
  positions: Position[];
}

export interface EarningsResponse {
  success: boolean;
  userAddress: string;
  totalEarningsUsd: number;
  unrealizedEarningsUsd: number;
  realizedEarningsUsd: number;
}

export interface DepositResponse {
  success: boolean;
  txHash: string;
  smartWallet: string;
  amount: string;
  status: "pending" | "confirmed" | "failed";
}

export interface WithdrawResponse {
  success: boolean;
  txHash: string;
  type: "full" | "partial";
  amount: string;
  receiver: string;
  status: "pending" | "confirmed" | "failed";
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
