import { describe, expect, it, vi } from "vitest";
import { DATA_ENDPOINTS } from "../config/endpoints";

const mockHttpClient = {
  setAuthToken: vi.fn(),
  hasAuthToken: vi.fn(() => false),
  dataGet: vi.fn(),
};

vi.mock("../utils/http-client", () => ({
  HttpClient: vi.fn(function HttpClientMock() {
    return mockHttpClient;
  }),
}));

import { ZyfaiSDK } from "./ZyfaiSDK";

const campaignInfo = (name: string, endDate: string) => ({
  campaign: {
    name,
    startDate: "2020-01-01T00:00:00.000Z",
    endDate,
    totalRewards: 5000,
    rewardToken: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    dailyRewardAmount: 166.67,
  },
  currentStats: { totalTVL: 1000, currentAPR: "0.0192", activeWallets: 3 },
});

describe("getBaseMerklCampaigns", () => {
  it("maps each Base campaign slot to its APR and active window", async () => {
    mockHttpClient.dataGet.mockImplementation(async (url: string) =>
      url === DATA_ENDPOINTS.MERKL_CAMPAIGN_INFO("base")
        ? campaignInfo("ended", "2020-02-01T00:00:00.000Z")
        : campaignInfo("live", "2999-01-01T00:00:00.000Z"),
    );

    const campaigns = await new ZyfaiSDK("test-api-key").getBaseMerklCampaigns();

    expect(campaigns.map((c) => c.id)).toEqual([
      "base/rzfi",
      "base-new-tvl",
      "base",
    ]);
    expect(campaigns[0]).toMatchObject({
      name: "live",
      apr: 0.0192,
      tvlUsd: 1000,
      activeWallets: 3,
      isActive: true,
    });
    expect(campaigns[2].isActive).toBe(false);
  });
});
