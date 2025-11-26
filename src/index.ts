/**
 * ZyFAI SDK
 * TypeScript SDK for ZyFAI Yield Optimization Engine
 */

export { ZyfaiSDK } from './core/ZyfaiSDK';

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
} from './types';

