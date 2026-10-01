import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAddress } from "viem";
import { ENDPOINTS } from "../config/endpoints";

const CONNECTED_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

const mockHttpClient = {
  setAuthToken: vi.fn(),
  clearAuthToken: vi.fn(),
  setExtraExecutionHeaders: vi.fn(),
  hasAuthToken: vi.fn(() => false),
  get: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
};

vi.mock("../utils/http-client", () => ({
  HttpClient: vi.fn(function HttpClientMock() {
    return mockHttpClient;
  }),
}));

import { ZyfaiSDK } from "./ZyfaiSDK";

const SESSION_EOA = "0x1111111111111111111111111111111111111111";
const OTHER_EOA = "0x2222222222222222222222222222222222222222";

describe("ZyfaiSDK user session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHttpClient.hasAuthToken.mockReturnValue(false);
  });

  describe("applyUserSession / forUser", () => {
    it("throws when accessToken is missing", () => {
      const sdk = new ZyfaiSDK("test-api-key");
      expect(() => sdk.applyUserSession({ accessToken: "" })).toThrow(
        /accessToken is required/,
      );
    });

    it("stores the bearer token and session EOA", () => {
      const sdk = ZyfaiSDK.forUser("test-api-key", {
        accessToken: "jwt-abc",
        eoa: SESSION_EOA,
        userId: "user-1",
      });

      expect(mockHttpClient.setAuthToken).toHaveBeenCalledWith("jwt-abc");
      expect(sdk.getSessionEoa()).toBe(getAddress(SESSION_EOA));
    });

    it("defaults userId when omitted so authenticated endpoints skip SIWE", async () => {
      mockHttpClient.hasAuthToken.mockReturnValue(true);
      mockHttpClient.get.mockResolvedValue([]);

      const sdk = ZyfaiSDK.forUser("test-api-key", {
        accessToken: "jwt-only",
      });

      await sdk.getAssetTypeSettings();

      expect(mockHttpClient.post).not.toHaveBeenCalledWith(
        ENDPOINTS.AUTH_CHALLENGE,
        expect.anything(),
      );
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        ENDPOINTS.USER_ASSET_TYPE_SETTINGS,
      );
    });
  });

  describe("prepareEnterPosition", () => {
    it("rejects a userAddress that does not match the session EOA", async () => {
      const sdk = ZyfaiSDK.forUser("test-api-key", {
        accessToken: "jwt-abc",
        eoa: SESSION_EOA,
      });

      await expect(
        sdk.prepareEnterPosition({
          userAddress: OTHER_EOA,
          chainId: 8453,
          amount: "1000000",
          asset: "USDC",
        }),
      ).rejects.toThrow(/does not match authenticated session EOA/);
    });
  });

  describe("disconnectAccount", () => {
    it("clears session state", async () => {
      const sdk = ZyfaiSDK.forUser("test-api-key", {
        accessToken: "jwt-abc",
        eoa: SESSION_EOA,
      });

      await sdk.disconnectAccount();

      expect(sdk.getSessionEoa()).toBeNull();
    });
  });

  describe("getAssetTypeSettings", () => {
    beforeEach(() => {
      mockHttpClient.hasAuthToken.mockReturnValue(true);
    });

    it("calls GET /users/asset-type-settings", async () => {
      const settings = [{ assetType: "usdc", chains: [8453] }];
      mockHttpClient.get.mockReset();
      mockHttpClient.get.mockResolvedValue(settings);

      const sdk = ZyfaiSDK.forUser("test-api-key", {
        accessToken: "jwt-abc",
        userId: "user-1",
      });

      const result = await sdk.getAssetTypeSettings();

      expect(result).toEqual(settings);
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        ENDPOINTS.USER_ASSET_TYPE_SETTINGS,
      );
    });
  });
});
