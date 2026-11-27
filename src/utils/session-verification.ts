import { hashChainSessions } from "@rhinestone/module-sdk";
import { hashMessage, isAddress, isHex, size, type Address, type Hex } from "viem";
import type { Session } from "../types";

/** Exact ordered v1 chain sessions used to construct a permission enable hash. */
export type V1ChainSessions = Parameters<typeof hashChainSessions>[0];

/** Inputs for one chain, with all signing flags specified explicitly. */
export interface V1SessionEnableInput {
  account: Address;
  smartSession: Address;
  nonce: bigint;
  session: Session;
  permitGenericPolicy: boolean;
  permitAdminAccess: boolean;
  ignoreSecurityAttestations: boolean;
}

/** Construct the ordered payload from the same inputs used by the v1 signer. */
export function buildV1ChainSessions(inputs: V1SessionEnableInput[]): V1ChainSessions {
  const chainSessions = inputs.map(({ account, smartSession, nonce, session, permitGenericPolicy, permitAdminAccess, ignoreSecurityAttestations }) => ({
    chainId: session.chainId,
    session: {
      account, smartSession, nonce,
      sessionValidator: session.sessionValidator,
      sessionValidatorInitData: session.sessionValidatorInitData,
      salt: session.salt,
      permissions: {
        permitGenericPolicy, permitAdminAccess, ignoreSecurityAttestations,
        permitERC4337Paymaster: session.permitERC4337Paymaster,
        userOpPolicies: session.userOpPolicies,
        erc7739Policies: session.erc7739Policies,
        actions: session.actions,
      },
    },
  }));
  validateV1ChainSessions(chainSessions);
  return chainSessions;
}

function validateV1ChainSessions(sessions: V1ChainSessions): void {
  const fail = (): never => { throw new Error("Invalid v1 chain session payload"); };
  const address = (v: unknown) => typeof v === "string" && isAddress(v);
  const hex = (v: unknown, bytes?: number) => typeof v === "string" && isHex(v, { strict: true }) && v.length % 2 === 0 && (bytes === undefined || size(v as Hex) === bytes);
  const policies = (v: unknown): boolean => Array.isArray(v) && v.every((p) => p && address(p.policy) && hex(p.initData));
  if (!Array.isArray(sessions) || !sessions.length) fail();
  for (const entry of sessions) {
    const s = entry?.session;
    const p = s?.permissions;
    if (typeof entry?.chainId !== "bigint" || entry.chainId < 0n || entry.chainId >= 2n ** 64n ||
      !s || typeof s.nonce !== "bigint" || s.nonce < 0n || s.nonce >= 2n ** 256n ||
      !address(s.account) || !address(s.smartSession) || !address(s.sessionValidator) ||
      !hex(s.sessionValidatorInitData) || !hex(s.salt, 32) || !p ||
      typeof p.permitGenericPolicy !== "boolean" || typeof p.permitAdminAccess !== "boolean" ||
      typeof p.ignoreSecurityAttestations !== "boolean" || typeof p.permitERC4337Paymaster !== "boolean" ||
      !policies(p.userOpPolicies) || !p.erc7739Policies || !policies(p.erc7739Policies.erc1271Policies) ||
      !Array.isArray(p.erc7739Policies.allowedERC7739Content) ||
      !p.erc7739Policies.allowedERC7739Content.every((c) => c && hex(c.appDomainSeparator, 32) && Array.isArray(c.contentName) && c.contentName.every((n) => typeof n === "string")) ||
      !Array.isArray(p.actions) || !p.actions.every((a) => a && address(a.actionTarget) && hex(a.actionTargetSelector, 4) && policies(a.actionPolicies))) fail();
  }
}

/** Encode a complete payload as JSON with decimal strings for chain IDs and nonces. */
export function serializeV1ChainSessions(chainSessions: V1ChainSessions): string {
  validateV1ChainSessions(chainSessions);
  return JSON.stringify(chainSessions.map((entry) => ({
    ...entry, chainId: entry.chainId.toString(),
    session: { ...entry.session, nonce: entry.session.nonce.toString() },
  })), null, 2);
}

/** Parse and validate a JSON payload produced by {@link serializeV1ChainSessions}. */
export function parseV1ChainSessions(json: string): V1ChainSessions {
  const parsed: unknown = JSON.parse(json);
  if (!Array.isArray(parsed) || !parsed.length) throw new Error("Invalid v1 chain session payload");
  const decimal = (v: unknown): v is string => typeof v === "string" && /^(0|[1-9][0-9]*)$/.test(v);
  const sessions = parsed.map((entry) => {
    if (!entry || !decimal(entry.chainId) || !entry.session || !decimal(entry.session.nonce)) {
      throw new Error("Chain IDs and nonces must be decimal strings");
    }
    return { ...entry, chainId: BigInt(entry.chainId), session: { ...entry.session, nonce: BigInt(entry.session.nonce) } };
  }) as V1ChainSessions;
  validateV1ChainSessions(sessions);
  return sessions;
}

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
  validateV1ChainSessions(chainSessions);
  const permissionEnableHash = hashChainSessions(chainSessions);
  return { permissionEnableHash, personalSignDigest: hashMessage({ raw: permissionEnableHash }) };
}
