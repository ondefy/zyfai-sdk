import { describe, expect, it } from "vitest";
import { LOCAL_EXECUTION_API_BASE_URL } from "../config/endpoints";
import { integrationEnvReady } from "./utils";

/**
 * Mirrors `examples/get-protocols.ts` — connect via SIWE, then fetch protocols.
 * Opt-in: copy `env.test.example` to `.env.test` and run against local zyfai-api.
 */
describe.skipIf(!integrationEnvReady())("get-protocols", () => {
  it("returns a protocol list for Base", async () => {
    const { ZyfaiSDK } = await import("../core/ZyfaiSDK");

    const sdk = new ZyfaiSDK({
      apiKey: process.env.ZYFAI_API_KEY!,
      executionApiUrl: LOCAL_EXECUTION_API_BASE_URL,
    });

    await sdk.connectAccount(process.env.PRIVATE_KEY!, 8453);

    const response = await sdk.getAvailableProtocols(8453);

    expect(response.success).toBe(true);
    expect(response.chainId).toBe(8453);
    expect(Array.isArray(response.protocols)).toBe(true);
  });
});
