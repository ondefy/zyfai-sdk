import { expect, it } from "vitest";
import {
  describeIntegrationSuite,
  integrationSdkConfig,
  logIntegrationEvidence,
} from "./utils";

/**
 * Mirrors `examples/get-protocols.ts` — connect via SIWE, then fetch protocols.
 * Opt-in: copy `env.test.example` to `.env.test` and run against local zyfai-api.
 */
describeIntegrationSuite("get-protocols", { spendProfile: "readonly" }, () => {
  it("returns a protocol list for Base", async () => {
    const { ZyfaiSDK } = await import("../core/ZyfaiSDK");

    const sdk = new ZyfaiSDK(integrationSdkConfig());

    const userAddress = await sdk.connectAccount(process.env.PRIVATE_KEY!, 8453);

    const response = await sdk.getAvailableProtocols(8453);

    expect(response.success).toBe(true);
    expect(response.chainId).toBe(8453);
    expect(Array.isArray(response.protocols)).toBe(true);

    logIntegrationEvidence("get-protocols", {
      chainId: 8453,
      userAddress,
      protocolCount: response.protocols.length,
    });
  });
});
