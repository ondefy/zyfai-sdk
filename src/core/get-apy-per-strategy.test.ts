import { describe, expect, it, vi } from "vitest";
import { ZyfaiSDK } from "./ZyfaiSDK";

function sdkWithDataGet() {
  const sdk = new ZyfaiSDK("test-api-key");
  const dataGet = vi.fn().mockResolvedValue({ data: [], count: 0 });
  (sdk as ZyfaiSDK & { httpClient: { dataGet: typeof dataGet } }).httpClient
    .dataGet = dataGet;
  return { sdk, dataGet };
}

describe("getAPYPerStrategy", () => {
  it("requests the async series for yieldmaxxing", async () => {
    const { sdk, dataGet } = sdkWithDataGet();

    await sdk.getAPYPerStrategy(false, 7, "yieldmaxxing", 1, "WBTC");

    expect(dataGet).toHaveBeenCalledWith(
      expect.stringContaining("strategy=async"),
    );
    expect(dataGet.mock.calls[0]?.[0]).not.toContain("strategy=degen");
  });

  it("still requests degen for aggressive", async () => {
    const { sdk, dataGet } = sdkWithDataGet();

    await sdk.getAPYPerStrategy(false, 7, "aggressive", 1, "WBTC");

    expect(dataGet).toHaveBeenCalledWith(
      expect.stringContaining("strategy=degen"),
    );
  });
});
