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
