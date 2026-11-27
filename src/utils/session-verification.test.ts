import { getEnableSessionDetails, SMART_SESSIONS_ADDRESS } from "@rhinestone/module-sdk";
import { buildV1ChainSessions, parseV1ChainSessions, serializeV1ChainSessions } from "./session-verification";
import type { PublicClient } from "viem";
import { describe, expect, it } from "vitest";
import { hashV1SessionEnable, type V1ChainSessions } from "./session-verification";

describe("v1 session verification", () => {
  it("reproduces the v1 message and personal-sign digest", () => {
    const address = "0x0000000000000000000000000000000000000001" as const;
    const sessions: V1ChainSessions = [{ chainId: 1n, session: {
      account: address, sessionValidator: address, sessionValidatorInitData: "0x",
      salt: `0x${"00".repeat(32)}`, smartSession: address, nonce: 0n,
      permissions: { permitGenericPolicy: false, permitAdminAccess: false,
        ignoreSecurityAttestations: false, permitERC4337Paymaster: false,
        userOpPolicies: [], erc7739Policies: { allowedERC7739Content: [], erc1271Policies: [] }, actions: [] },
    } }];
    expect(hashV1SessionEnable(sessions)).toEqual({
      permissionEnableHash: "0x8b497a77491a3cca45423a41d0c0227d6f554780ca9efb317f276550bdece041",
      personalSignDigest: "0xf864cfc96cc0dc5f9037940dcabcaa4c001815e997bfac38c8d0080d8ba2afee",
    });
    sessions[0].session.nonce = 1n;
    expect(hashV1SessionEnable(sessions).permissionEnableHash).not.toBe("0x8b497a77491a3cca45423a41d0c0227d6f554780ca9efb317f276550bdece041");
  });
  it("rejects empty input", () => expect(() => hashV1SessionEnable([])).toThrow());
});


it("matches the signer SDK for all signed inputs and round-trips JSON", async () => {
  const address = "0x0000000000000000000000000000000000000001" as const;
  const session = {
    chainId: 8453n, sessionValidator: address, sessionValidatorInitData: "0x1234" as const,
    salt: `0x${"ab".repeat(32)}` as `0x${string}`, permitERC4337Paymaster: true,
    userOpPolicies: [{ policy: address, initData: "0x1234" as const }],
    erc7739Policies: { allowedERC7739Content: [{ appDomainSeparator: `0x${"12".repeat(32)}` as `0x${string}`, contentName: ["Permit"] }], erc1271Policies: [] },
    actions: [{ actionTarget: address, actionTargetSelector: "0xaabbccdd" as const, actionPolicies: [{ policy: address, initData: "0x5678" as const }] }],
  };
  const nonce = 9007199254740993n;
  const payload = buildV1ChainSessions([{ account: address, smartSession: SMART_SESSIONS_ADDRESS, nonce, session, permitGenericPolicy: true, permitAdminAccess: false, ignoreSecurityAttestations: false }]);
  const client = { chain: { id: 8453 }, readContract: async () => `0x${"00".repeat(32)}` } as unknown as PublicClient;
  const signer = await getEnableSessionDetails({ sessions: [session], account: { address, type: "safe" }, clients: [client], sessionNonces: [nonce], permitGenericPolicy: true });
  expect(hashV1SessionEnable(payload).permissionEnableHash).toBe(signer.permissionEnableHash);
  const json = serializeV1ChainSessions(payload);
  expect(json).toContain('"9007199254740993"');
  expect(parseV1ChainSessions(json)).toEqual(payload);
  const missing = JSON.parse(json);
  delete missing[0].session.permissions.permitAdminAccess;
  expect(() => parseV1ChainSessions(JSON.stringify(missing))).toThrow();
  missing[0].session.permissions.permitAdminAccess = false;
  missing[0].session.nonce = 1;
  expect(() => parseV1ChainSessions(JSON.stringify(missing))).toThrow();
});
