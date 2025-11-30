/**
 * ZyFAI SDK
 * TypeScript SDK for ZyFAI Yield Optimization Engine
 */

export { ZyfaiSDK } from "./core/ZyfaiSDK";

// Chain utilities
export {
  getChainConfig,
  isSupportedChain,
  getSupportedChainIds,
  type SupportedChainId,
  type ChainConfig,
} from "./config/chains";

export type {
  // Config
  SDKConfig,
  Environment,

  // Common Types
  Address,
  Hex,

  // Response Types
  DeploySafeResponse,
  SessionKeyResponse,
  SmartWalletResponse,
  ProtocolsResponse,
  PositionsResponse,
  EarningsResponse,
  DepositResponse,
  WithdrawResponse,
  UpdateUserProfileRequest,
  UpdateUserProfileResponse,
  LoginResponse,
  UserIdResponse,
  AddSessionKeyRequest,
  AddSessionKeyResponse,

  // Protocol Types
  Protocol,
  Pool,
  Position,

  // Session Types
  Session,
  PolicyData,
  ERC7739Data,
  ERC7739Context,
  ActionData,
} from "./types";
