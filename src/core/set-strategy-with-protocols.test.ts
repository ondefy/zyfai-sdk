import { describe, expect, it, vi } from "vitest";
import { ZyfaiSDK } from "./ZyfaiSDK";

describe("setStrategyWithProtocols", () => {
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
});
