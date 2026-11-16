import { beforeEach, describe, expect, it, vi } from "vitest";
import { ZyfaiSDK } from "./ZyfaiSDK";

const mockRow = {
  id: "opp-1",
  protocol_id: "aave",
  protocol_name: "Aave",
  pool_name: "USDC",
  chain_id: 8453,
  combined_apy: 5.5,
  tvl: 1_000_000,
  asset: "USDC",
  status: "live",
};

function sdkWithDataGet(data: unknown[]) {
  const sdk = new ZyfaiSDK("test-api-key");
  (sdk as ZyfaiSDK & { httpClient: { dataGet: ReturnType<typeof vi.fn> } })
    .httpClient.dataGet = vi.fn().mockResolvedValue({ data });
  return sdk;
}

describe("deprecated opportunity aliases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getAggressiveOpportunities returns legacy aggressive strategyType labels", async () => {
    const sdk = sdkWithDataGet([mockRow]);

    const result = await sdk.getAggressiveOpportunities(8453, "USDC", "live");

    expect(result.strategyType).toBe("aggressive");
    expect(result.data).toHaveLength(1);
    expect(result.data[0]?.strategyType).toBe("aggressive");
  });

  it("getAsyncOpportunities returns legacy yieldmaxxing strategyType labels", async () => {
    const sdk = sdkWithDataGet([mockRow]);

    const result = await sdk.getAsyncOpportunities(8453, "USDC", "live");

    expect(result.strategyType).toBe("yieldmaxxing");
    expect(result.data).toHaveLength(1);
    expect(result.data[0]?.strategyType).toBe("yieldmaxxing");
  });
});
