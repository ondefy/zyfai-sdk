import { describe, expect, it, vi, beforeEach } from "vitest";
import { ZyfaiSDK } from "./ZyfaiSDK";

const SESSION_EOA = "0x5006793977cC87D267a175d14b47B9D7a48513EF";

describe("ZyfaiSDK.waitForDepositPosition", () => {
  const mockHttpClient = {
    hasAuthToken: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockHttpClient.hasAuthToken.mockReturnValue(true);
  });

  function sessionSdk() {
    const sdk = ZyfaiSDK.forUser("test-api-key", {
      accessToken: "jwt-abc",
      eoa: SESSION_EOA,
    });
    (sdk as unknown as { httpClient: typeof mockHttpClient }).httpClient =
      mockHttpClient;
    return sdk;
  }

  it("resolves a crosschain deposit once the bridge tx is recorded", async () => {
    const sdk = sessionSdk();
    mockHttpClient.get.mockResolvedValue({
      id: "dep-1",
      status: "position_pending",
      balanceCredited: true,
      statusUrl: "/api/v1/users/deposits/dep-1/v2",
      positionOutcome: "pending",
      crosschain: true,
      executionTxHash: "0xbridge",
    });

    const status = await sdk.waitForDepositPosition("dep-1", 8453, {
      intervalMs: 1,
      timeoutMs: 1_000,
    });

    expect(status.crosschain).toBe(true);
    expect(mockHttpClient.get).toHaveBeenCalledTimes(1);
  });
});
