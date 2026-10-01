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
      mockHttpClient.get.mockResolvedValue({ data: null });

      const sdk = ZyfaiSDK.forUser("test-api-key", {
        accessToken: "jwt-only",
      });

      await sdk.getAgentMandate();

      expect(mockHttpClient.post).not.toHaveBeenCalledWith(
        ENDPOINTS.AUTH_CHALLENGE,
        expect.anything(),
      );
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        ENDPOINTS.USER_AGENT_MANDATE,
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

      expect(mockHttpClient.get).not.toHaveBeenCalled();
      expect(mockHttpClient.post).not.toHaveBeenCalled();
    });

    it("rebinds the session EOA after connectAccount replaces a forUser session", async () => {
      mockHttpClient.post.mockImplementation(async (endpoint: string) => {
        if (endpoint === ENDPOINTS.AUTH_CHALLENGE) {
          return { nonce: "abcd1234" };
        }
        if (endpoint === ENDPOINTS.AUTH_LOGIN) {
          return {
            accessToken: "jwt-connected",
            userId: "user-connected",
          };
        }
        return {};
      });

      const sdk = ZyfaiSDK.forUser("test-api-key", {
        accessToken: "jwt-abc",
        eoa: SESSION_EOA,
      });

      const connected = await sdk.connectAccount(CONNECTED_PRIVATE_KEY, 8453);

      expect(sdk.getSessionEoa()).toBe(getAddress(connected));
      expect(getAddress(connected)).not.toBe(getAddress(SESSION_EOA));

      await expect(
        sdk.prepareEnterPosition({
          userAddress: SESSION_EOA,
          chainId: 8453,
          amount: "1000000",
          asset: "USDC",
        }),
      ).rejects.toThrow(/does not match authenticated session EOA/);
      expect(mockHttpClient.get).not.toHaveBeenCalled();
    });

    it("clears the session EOA on disconnectAccount", async () => {
      const sdk = ZyfaiSDK.forUser("test-api-key", {
        accessToken: "jwt-abc",
        eoa: SESSION_EOA,
      });

      await sdk.disconnectAccount();

      expect(sdk.getSessionEoa()).toBeNull();
    });
  });

  describe("agent mandate", () => {
    beforeEach(() => {
      mockHttpClient.hasAuthToken.mockReturnValue(true);
    });

    it("getAgentMandate calls GET /users/me/agent-mandate", async () => {
      const mandate = {
        id: "m-1",
        allowedChainIds: [8453],
        allowedAssets: ["USDC"],
        allowRebalance: true,
        allowWithdraw: false,
      };
      mockHttpClient.get.mockResolvedValue({ data: mandate });

      const sdk = ZyfaiSDK.forUser("test-api-key", {
        accessToken: "jwt-abc",
      });

      const result = await sdk.getAgentMandate();

      expect(result).toEqual({ data: mandate });
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        ENDPOINTS.USER_AGENT_MANDATE,
      );
      expect(mockHttpClient.post).not.toHaveBeenCalledWith(
        ENDPOINTS.AUTH_CHALLENGE,
        expect.anything(),
      );
    });

    it("setAgentMandate calls PUT with the request body", async () => {
      const request = {
        allowedChainIds: [8453],
        allowedAssets: ["USDC"],
        allowRebalance: true,
      };
      const mandate = { id: "m-1", ...request, allowWithdraw: false };
      mockHttpClient.put.mockResolvedValue({ data: mandate });

      const sdk = ZyfaiSDK.forUser("test-api-key", {
        accessToken: "jwt-abc",
      });

      const result = await sdk.setAgentMandate(request);

      expect(result).toEqual({ data: mandate });
      expect(mockHttpClient.put).toHaveBeenCalledWith(
        ENDPOINTS.USER_AGENT_MANDATE,
        request,
      );
    });

    it("revokeAgentMandate calls DELETE with oauthClientId query", async () => {
      mockHttpClient.delete.mockResolvedValue({ success: true });

      const sdk = ZyfaiSDK.forUser("test-api-key", {
        accessToken: "jwt-abc",
      });

      const result = await sdk.revokeAgentMandate("mcp-client-id");

      expect(result).toEqual({ success: true });
      expect(mockHttpClient.delete).toHaveBeenCalledWith(
        `${ENDPOINTS.USER_AGENT_MANDATE}?oauthClientId=mcp-client-id`,
      );
    });
  });
});
