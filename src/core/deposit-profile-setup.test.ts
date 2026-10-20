import { beforeEach, describe, expect, it, vi } from "vitest";
import { ZyfaiSDK } from "./ZyfaiSDK";

const SESSION_EOA = "0x5006793977cC87D267a175d14b47B9D7a48513EF";

function agentSdk() {
  const sdk = ZyfaiSDK.forUser("test-api-key", {
    accessToken: "jwt-abc",
    eoa: SESSION_EOA,
    channel: "agent",
  });
  return sdk as ZyfaiSDK & {
    authenticateUser: ReturnType<typeof vi.fn>;
    getUserDetails: ReturnType<typeof vi.fn>;
    updateUserProtocolsForAsset: ReturnType<typeof vi.fn>;
    updateUserProtocols: ReturnType<typeof vi.fn>;
    httpClient: { get: ReturnType<typeof vi.fn> };
  };
}

describe("deposit profile setup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ensureDepositProfileForPrepare skips when chain and protocols are set", async () => {
    const sdk = agentSdk();
    sdk.authenticateUser = vi.fn().mockResolvedValue(undefined);
    sdk.getUserDetails = vi.fn().mockResolvedValue({
      chains: [8453],
      protocols: ["aave-v3"],
    });
    sdk.updateUserProtocolsForAsset = vi.fn();

    const result = await (
      sdk as unknown as {
        ensureDepositProfileForPrepare: (p: {
          asset: "WETH";
          chainId: 8453;
        }) => Promise<{ applied: boolean }>;
      }
    ).ensureDepositProfileForPrepare({ asset: "WETH", chainId: 8453 });

    expect(result).toEqual({ applied: false });
    expect(sdk.updateUserProtocolsForAsset).not.toHaveBeenCalled();
  });

  it("ensureDepositProfileForPrepare runs when chain is set but protocols are empty", async () => {
    const sdk = agentSdk();
    sdk.authenticateUser = vi.fn().mockResolvedValue(undefined);
    sdk.httpClient = { get: vi.fn().mockResolvedValue([]) };
    sdk.updateUserProtocolsForAsset = vi.fn().mockResolvedValue({
      chains: [8453],
      protocols: ["aave-v3"],
    });
    sdk.getUserDetails = vi
      .fn()
      .mockResolvedValueOnce({
        chains: [8453],
        protocols: [],
        strategy: "aggressive",
      })
      .mockResolvedValueOnce({
        chains: [8453],
        protocols: ["aave-v3"],
      });

    const result = await (
      sdk as unknown as {
        ensureDepositProfileForPrepare: (p: {
          asset: "WETH";
          chainId: 8453;
        }) => Promise<{ applied: boolean }>;
      }
    ).ensureDepositProfileForPrepare({ asset: "WETH", chainId: 8453 });

    expect(result).toEqual({ applied: true });
    expect(sdk.updateUserProtocolsForAsset).toHaveBeenCalledWith(
      "WETH",
      [8453],
      undefined,
      [],
    );
  });

  it("ensureFirstDepositSetup runs when USDC chains exist but protocols are empty", async () => {
    const sdk = agentSdk();
    sdk.authenticateUser = vi.fn().mockResolvedValue(undefined);
    sdk.updateUserProtocols = vi.fn().mockResolvedValue(undefined);
    sdk.getUserDetails = vi
      .fn()
      .mockResolvedValueOnce({
        chains: [8453],
        protocols: [],
      })
      .mockResolvedValueOnce({
        chains: [8453],
        protocols: ["aave-v3"],
      });

    const result = await sdk.ensureFirstDepositSetup("conservative");

    expect(result).toEqual({ applied: true });
    expect(sdk.updateUserProtocols).toHaveBeenCalledWith("conservative", {
      strict: true,
    });
  });
});
