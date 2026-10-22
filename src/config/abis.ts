/**
 * Smart Contract ABIs
 */

import { parseAbi } from "viem";

/**
 * OwnableValidator (ERC-7579) — used to read whether an EOA owns a Safe.
 * Call getOwners(safeAddress) on the validator singleton.
 */
export const OWNABLE_VALIDATOR_ABI = [
  {
    name: "getOwners",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "ownersArray", type: "address[]" }],
  },
] as const;

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

/** Mainnet USDT `transfer` returns no data; viem simulation fails with a bool output. */
/** WETH `deposit()` — wrap native ETH in the funding wallet. */
export const WETH_DEPOSIT_ABI = [
  {
    name: "deposit",
    type: "function",
    stateMutability: "payable",
    inputs: [],
    outputs: [],
  },
] as const;

export const ERC20_TRANSFER_LEGACY_ABI = [
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

export const ERC20_TRANSFER_WITH_BOOL_ABI = [
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
] as const;

/** ABI for `writeContract` / simulation of ERC-20 `transfer` by deposit asset. */
export function erc20TransferWriteAbi(assetSymbol: string) {
  return assetSymbol === "USDT"
    ? ERC20_TRANSFER_LEGACY_ABI
    : ERC20_TRANSFER_WITH_BOOL_ABI;
}

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

/** Merkl Distributor (Base). Pays rZFI rewards to the user's Safe. */
export const MERKL_DISTRIBUTOR_ADDRESS =
  "0x3Ef3D8bA38EBe18DB133cEc108f4D14CE00Dd9Ae" as const;

/** rZFI reward token (Base). */
export const RZFI_TOKEN_ADDRESS =
  "0x1c08C7df416062b472F553DCC1ed3045489520C5" as const;

export const MERKL_DISTRIBUTOR_ABI = parseAbi([
  "function claim(address[] users, address[] tokens, uint256[] amounts, bytes32[][] proofs)",
  "function claimed(address user, address token) view returns (uint208 amount, uint48 timestamp, bytes32 merkleRoot)",
  "function getMerkleRoot() view returns (bytes32)",
]);

/** Safe core functions used to let the owner EOA send a Safe call directly. */
export const SAFE_ABI = parseAbi([
  "function execTransaction(address to, uint256 value, bytes data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, bytes signatures) payable returns (bool success)",
  "function getOwners() view returns (address[])",
  "function getThreshold() view returns (uint256)",
]);
