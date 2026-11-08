import { isAddressEqual } from "viem";
import type { SupportedChainId } from "../config/chains";
import type { Address, FirstPermitDepositStatus } from "../types";

export const firstPermitTypes = {
  Permit: [
    { name: "owner", type: "address" },
    { name: "spender", type: "address" },
    { name: "value", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
} as const;

export interface FirstPermitDepositRequest {
  owner: Address;
  safe: Address;
  chainId: SupportedChainId;
  token: Address;
  amount: bigint;
}

export interface FirstPermitDepositAvailability {
  enabledTokens: string[];
  intent: FirstPermitDepositStatus | null;
}

export interface PreparedFirstPermitDeposit {
  id: string;
  domain: {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: Address;
  };
  message: {
    owner: Address;
    spender: Address;
    value: string;
    nonce: string;
    deadline: number;
  };
}

export function matchesFirstPermitDeposit(
  intent: FirstPermitDepositStatus,
  request: FirstPermitDepositRequest,
): boolean {
  return intent.chainId === request.chainId &&
    isAddressEqual(intent.token, request.token) &&
    intent.amount === request.amount.toString();
}

export function validateFirstPermit(
  { domain, message }: PreparedFirstPermitDeposit,
  request: FirstPermitDepositRequest,
) {
  const value = BigInt(message.value);
  const nonce = BigInt(message.nonce);
  if (
    domain.chainId !== request.chainId ||
    !isAddressEqual(domain.verifyingContract, request.token) ||
    !isAddressEqual(message.owner, request.owner) ||
    !isAddressEqual(message.spender, request.safe) ||
    value !== request.amount ||
    nonce < 0n ||
    !Number.isSafeInteger(message.deadline) ||
    message.deadline <= Math.floor(Date.now() / 1000)
  ) {
    throw new Error("Prepared permit does not match this deposit");
  }
  return { ...message, value, nonce, deadline: BigInt(message.deadline) };
}
