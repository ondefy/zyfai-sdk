import { describe, expect, it, vi, beforeEach } from "vitest";
import { ZyfaiSDK } from "./ZyfaiSDK";
import { ENDPOINTS } from "../config/endpoints";

const SESSION_EOA = "0x5006793977cC87D267a175d14b47B9D7a48513EF";

describe("ZyfaiSDK agent deposit intent polling", () => {
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

  it("waitForAgentDepositIntent resolves when status becomes completed", async () => {
    const sdk = sessionSdk();
    mockHttpClient.get
      .mockResolvedValueOnce({ data: { status: "pending" } })
      .mockResolvedValueOnce({
        data: {
          status: "completed",
          depositId: "dep-1",
          txHash: "0xabc",
        },
      });

    const intent = await sdk.waitForAgentDepositIntent("act-1", {
      intervalMs: 1,
      timeoutMs: 5_000,
    });

    expect(intent.status).toBe("completed");
    expect(mockHttpClient.get).toHaveBeenCalledWith(
      ENDPOINTS.USER_AGENT_DEPOSIT_INTENT("act-1"),
    );
  });

  it("waitForAgentDepositIntent rejects when intent expires", async () => {
    const sdk = sessionSdk();
    mockHttpClient.get.mockResolvedValueOnce({ data: { status: "expired" } });

    await expect(
      sdk.waitForAgentDepositIntent("act-1", { intervalMs: 1 }),
    ).rejects.toThrow(/expired/);
  });
});
