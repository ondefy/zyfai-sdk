import { hashChainSessions } from "@rhinestone/module-sdk";
import { hashMessage, type Hex } from "viem";

/** Exact ordered v1 chain sessions used to construct a permission enable hash. */
export type V1ChainSessions = Parameters<typeof hashChainSessions>[0];

/**
 * Recompute the message shown by personal-sign wallets and its EIP-191 digest.
 *
 * @remarks
 * The input must be the complete ordered payload used by the signer. A matching
 * hash does not establish that the encoded permissions are safe or intended.
 */
export function hashV1SessionEnable(chainSessions: V1ChainSessions): {
  permissionEnableHash: Hex;
  personalSignDigest: Hex;
} {
  if (chainSessions.length === 0) throw new Error("At least one chain session is required");
  const permissionEnableHash = hashChainSessions(chainSessions);
  return { permissionEnableHash, personalSignDigest: hashMessage({ raw: permissionEnableHash }) };
}
