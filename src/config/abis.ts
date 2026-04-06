/**
 * Smart Contract ABIs
 */

import { parseAbi } from "viem";

/**
 * ERC20 Token Standard ABI
 * Contains essential functions for token interactions
 */
export const ERC20_ABI = [
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    name: "symbol",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    name: "name",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    name: "totalSupply",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

/**
 * Identity Registry ABI (ERC-8004)
 * Contract: 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432
 * Used for registering agents on the identity registry
 */
export const IDENTITY_REGISTRY_ABI = parseAbi([
  'function register() external returns (uint256 agentId)',
  'function register(string tokenUri) external returns (uint256 agentId)',
  'function register(string tokenUri, (string key, bytes value)[] metadata) external returns (uint256 agentId)',
]);

export const IDENTITY_REGISTRY_ADDRESS =
  "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432" as const;

/**
 * Zyfai Vault ABI
 * Contract: 0xD580071c47d4a667858B5FafAb85BC9C609beC5D (Base)
 * ERC-4626 compatible vault with async withdrawals
 */
export const VAULT_ABI = [
  {
    name: "deposit",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "assets", type: "uint256" },
      { name: "receiver", type: "address" },
    ],
    outputs: [{ name: "shares", type: "uint256" }],
  },
  {
    name: "requestRedeem",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "shares", type: "uint256" },
      { name: "controller", type: "address" },
      { name: "owner", type: "address" },
    ],
    outputs: [{ name: "requestId", type: "uint256" }],
  },
  {
    name: "claim",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "withdrawKey", type: "bytes32" }],
    outputs: [{ name: "assets", type: "uint256" }],
  },
  {
    name: "getWithdrawKey",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "user", type: "address" },
      { name: "nonce", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bytes32" }],
  },
  {
    name: "nonces",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "isClaimable",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "withdrawKey", type: "bytes32" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "isClaimed",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "withdrawKey", type: "bytes32" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "maxRequestRedeem",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "symbol",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
] as const;

export const VAULT_ADDRESS = "0xD580071c47d4a667858B5FafAb85BC9C609beC5D" as const;
