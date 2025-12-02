/**
 * ZyFAI SDK
 * TypeScript SDK for ZyFAI Yield Optimization Engine
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
  type SupportedChainId,
  type ChainConfig,
} from "./config/chains";

export type {
  // Configuration
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
  DepositResponse,
  WithdrawResponse,

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
