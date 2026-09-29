import { afterEach, describe, expect, it, vi } from "vitest";
import {
  integrationExplorerAddressUrl,
  integrationExplorerTxUrl,
  logIntegrationEvidence,
} from "../integration/utils";

describe("integration evidence logging", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("builds explorer URLs for SDK execution chains", () => {
    expect(integrationExplorerTxUrl(8453, "0x" + "a".repeat(64))).toBe(
      "https://basescan.org/tx/0x" + "a".repeat(64),
    );
    expect(integrationExplorerAddressUrl(8453, "0x" + "b".repeat(40))).toBe(
      "https://basescan.org/address/0x" + "b".repeat(40),
    );
  });

  it("logIntegrationEvidence adds links from known payload fields", () => {
    vi.stubEnv("ZYFAI_ENV", "staging");
    vi.stubEnv("STAGING_ZYFAI_API_KEY", "test-key");

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    logIntegrationEvidence("deposit-withdraw", {
      chainId: 8453,
      userAddress: "0x" + "1".repeat(40),
      smartWallet: "0x" + "2".repeat(40),
      depositTxHash: "0x" + "3".repeat(64),
      withdrawTxHash: "0x" + "4".repeat(64),
      depositId: "dep-1",
    });

    expect(logSpy).toHaveBeenCalledTimes(2);
    const jsonLine = logSpy.mock.calls[0]?.[0];
    expect(typeof jsonLine).toBe("string");
    const parsed = JSON.parse(jsonLine as string) as {
      evidence: string;
      links: Record<string, string>;
    };
    expect(parsed.evidence).toBe("deposit-withdraw");
    expect(parsed.links.executionApi).toBe("https://staging-api.zyf.ai");
    expect(parsed.links.depositTx).toContain("basescan.org/tx/");
    expect(parsed.links.withdrawTx).toContain("basescan.org/tx/");
    expect(parsed.links.user).toContain("basescan.org/address/");
    expect(parsed.links.smartWallet).toContain("basescan.org/address/");

    const humanBlock = logSpy.mock.calls[1]?.[0] as string;
    expect(humanBlock).toContain("[integration] deposit-withdraw links");
    expect(humanBlock).toContain("depositTx: https://basescan.org/tx/");
  });
});
