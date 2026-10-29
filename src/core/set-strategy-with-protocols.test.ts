import { beforeEach, describe, expect, it, vi } from "vitest";
import { ENDPOINTS } from "../config/endpoints";
import { ZyfaiSDK } from "./ZyfaiSDK";

const SESSION_EOA = "0x5006793977cC87D267a175d14b47B9D7a48513EF";

function agentSdk() {
  const sdk = ZyfaiSDK.forUser("test-api-key", {
    accessToken: "jwt-abc",
    eoa: SESSION_EOA,
    channel: "agent",
  });
  return sdk as ZyfaiSDK & {
    httpClient: {
      get: ReturnType<typeof vi.fn>;
      post: ReturnType<typeof vi.fn>;
      patch: ReturnType<typeof vi.fn>;
      hasAuthToken: ReturnType<typeof vi.fn>;
    };
    authenticateUser: ReturnType<typeof vi.fn>;
  };
}

function userMeResponse(usdcChains: number[]) {
  return {
    smartWallet: "0x2021991A69A4d8Cca9D627291a2f0620Af05e003",
    hasActiveSessionKey: true,
    assetTypeSettings: {
      usdc: {
        chains: usdcChains,
        rebalanceStrategy: "async_strategy",
        protocols: ["proto-1"],
      },
    },
  };
}

describe("setStrategyWithProtocols", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("validates all managed assets before fetching protocols or updating profiles", async () => {
    const sdk = new ZyfaiSDK("test-key") as any;
    const protocolGet = vi.fn().mockResolvedValue([]);
    sdk.httpClient = { get: protocolGet };
    sdk.updateUserProtocolsForAsset = vi.fn().mockResolvedValue({});

    await expect(
      sdk.setStrategyWithProtocols({
        strategy: "conservative",
        chains: [1],
      }),
    ).rejects.toThrow(/NVDAc/);

    expect(protocolGet).not.toHaveBeenCalled();
    expect(sdk.updateUserProtocolsForAsset).not.toHaveBeenCalled();
  });

  it("agent channel patches configure when the mandate chain is already on the asset", async () => {
    const sdk = agentSdk();
    const mockHttp = {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn().mockResolvedValue({}),
      hasAuthToken: vi.fn().mockReturnValue(true),
    };
    sdk.httpClient = mockHttp;
    sdk.authenticateUser = vi.fn().mockResolvedValue(undefined);

    mockHttp.get.mockImplementation((url: string) => {
      if (url === ENDPOINTS.USER_ME) {
        return Promise.resolve(userMeResponse([8453, 42161]));
      }
      if (url === ENDPOINTS.PROTOCOLS()) {
        return Promise.resolve([]);
      }
      return Promise.resolve({});
    });

    await sdk.setStrategyWithProtocols({
      strategy: "balance",
      asset: "USDC",
      chains: [8453, 42161],
    });

    expect(mockHttp.post).not.toHaveBeenCalled();
    expect(mockHttp.patch).toHaveBeenCalledWith(
      ENDPOINTS.USER_ME,
      expect.objectContaining({
        assetTypeSettings: {
          usdc: expect.objectContaining({
            rebalanceStrategy: "degen_strategy",
            chains: [8453, 42161],
          }),
        },
      }),
    );
  });

  it("agent channel uses deposit-setup when the mandate chain is new for the asset", async () => {
    const sdk = agentSdk();
    const mockHttp = {
      get: vi.fn(),
      post: vi.fn().mockResolvedValue({ applied: true }),
      patch: vi.fn(),
      hasAuthToken: vi.fn().mockReturnValue(true),
    };
    sdk.httpClient = mockHttp;
    sdk.authenticateUser = vi.fn().mockResolvedValue(undefined);

    mockHttp.get.mockImplementation((url: string) => {
      if (url === ENDPOINTS.USER_ME) {
        return Promise.resolve(userMeResponse([]));
      }
      if (url === ENDPOINTS.PROTOCOLS()) {
        return Promise.resolve([]);
      }
      return Promise.resolve({});
    });

    await sdk.setStrategyWithProtocols({
      strategy: "balance",
      asset: "USDC",
      chains: [8453],
    });

    expect(mockHttp.patch).not.toHaveBeenCalled();
    expect(mockHttp.post).toHaveBeenCalledWith(
      ENDPOINTS.AGENT_DEPOSIT_SETUP,
      expect.objectContaining({
        asset: "USDC",
        chainId: 8453,
        strategy: "balance",
      }),
    );
  });

  it("throws when agent deposit-setup returns applied false", async () => {
    const sdk = agentSdk();
    const mockHttp = {
      get: vi.fn(),
      post: vi.fn().mockResolvedValue({ applied: false }),
      patch: vi.fn(),
      hasAuthToken: vi.fn().mockReturnValue(true),
    };
    sdk.httpClient = mockHttp;
    sdk.authenticateUser = vi.fn().mockResolvedValue(undefined);

    mockHttp.get.mockImplementation((url: string) => {
      if (url === ENDPOINTS.USER_ME) {
        return Promise.resolve(userMeResponse([]));
      }
      if (url === ENDPOINTS.PROTOCOLS()) {
        return Promise.resolve([]);
      }
      return Promise.resolve({});
    });

    await expect(
      sdk.setStrategyWithProtocols({
        strategy: "balance",
        asset: "USDC",
        chains: [8453],
      }),
    ).rejects.toThrow(/did not apply/);
  });
});
