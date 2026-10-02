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

vi.mock("../utils/safe-account", async () => {
  const actual = await vi.importActual<typeof import("../utils/safe-account")>(
    "../utils/safe-account",
  );
  return {
    ...actual,
    isSafeDeployed: vi.fn(async () => false),
  };
});

import { ZyfaiSDK } from "./ZyfaiSDK";

const SESSION_EOA = "0x1111111111111111111111111111111111111111";
const OTHER_EOA = "0x2222222222222222222222222222222222222222";
const POOL_SAFE = "0x3333333333333333333333333333333333333333";

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

  describe("buildDepositTransfer", () => {
    const sessionSdk = () =>
      ZyfaiSDK.forUser(
        { apiKey: "test-api-key", bypassMinPortfolio: true },
        { accessToken: "jwt-abc", eoa: SESSION_EOA, userId: "user-1" },
      );

    it("builds a transfer to an undeployed pool Safe for an agent session", async () => {
      mockHttpClient.get.mockImplementation(async (url: string) => {
        if (url === ENDPOINTS.USER_ME) {
          return { predeployed: true, smartWallet: POOL_SAFE };
        }
        throw new Error(`unexpected GET ${url}`);
      });

      const transfer = await sessionSdk().buildDepositTransfer({
        userAddress: SESSION_EOA,
        chainId: 8453,
        amount: "1000000",
        asset: "USDC",
      });

      expect(transfer.safeAddress).toBe(getAddress(POOL_SAFE));
      expect(transfer.value).toBe("0");
      expect(transfer.data.startsWith("0x")).toBe(true);
    });

    it("rejects an undeployed Safe when the session user is not predeployed", async () => {
      mockHttpClient.get.mockImplementation(async (url: string) => {
        if (url === ENDPOINTS.USER_ME) {
          return { predeployed: false, smartWallet: POOL_SAFE };
        }
        if (url.includes("/data/by-eoa")) {
          return { agent: POOL_SAFE, chains: [8453] };
        }
        throw new Error(`unexpected GET ${url}`);
      });

      await expect(
        sessionSdk().buildDepositTransfer({
          userAddress: SESSION_EOA,
          chainId: 8453,
          amount: "1000000",
          asset: "USDC",
        }),
      ).rejects.toThrow(/Safe not available/);
    });
  });

  describe("prepareDeposit", () => {
    it("rejects a userAddress that does not match the session EOA", async () => {
      const sdk = ZyfaiSDK.forUser("test-api-key", {
        accessToken: "jwt-abc",
        eoa: SESSION_EOA,
      });

      await expect(
        sdk.prepareDeposit({
          userAddress: OTHER_EOA,
          chainId: 8453,
          amount: "1000000",
          asset: "USDC",
        }),
      ).rejects.toThrow(/does not match authenticated session EOA/);
    });
  });

  describe("agent channel vs SIWE", () => {
    it("uses PATCH /users/me for first-chain setup after SIWE replaces agent session", async () => {
      const sdk = ZyfaiSDK.forUser(
        { apiKey: "test-api-key", bypassMinPortfolio: true },
        {
          accessToken: "jwt-agent",
          channel: "agent",
          eoa: SESSION_EOA,
          userId: "user-1",
        },
      );
      mockHttpClient.hasAuthToken.mockReturnValue(true);
      mockHttpClient.post.mockResolvedValueOnce({
        accessToken: "jwt-siwe",
        userId: "user-1",
        hasActiveSessionKey: true,
        predeployed: true,
        smartWallet: POOL_SAFE,
      });

      await sdk.authenticateWithSignature({
        message: {
          address: SESSION_EOA,
          chainId: 8453,
          domain: "zyf.ai",
          nonce: "nonce-1",
          uri: "https://zyf.ai",
          version: "1",
          issuedAt: new Date().toISOString(),
        },
        signature: `0x${"ab".repeat(32)}`,
      });

      let chains: number[] = [];
      mockHttpClient.patch.mockImplementation(async () => {
        chains = [8453];
      });
      mockHttpClient.get.mockImplementation(async (url: string) => {
        if (url === ENDPOINTS.USER_ME) {
          return {
            strategy: "conservative",
            smartWallet: POOL_SAFE,
            predeployed: true,
            assetTypeSettings: {
              usdc: { chains },
            },
          };
        }
        if (url === ENDPOINTS.PROTOCOLS()) {
          return [
            {
              id: "protocol-1",
              strategies: ["safe_strategy"],
              chains: [8453],
            },
          ];
        }
        if (url.includes("/data/by-eoa")) {
          return { agent: POOL_SAFE, chains: [8453] };
        }
        throw new Error(`unexpected GET ${url}`);
      });

      await sdk.prepareDeposit({
        userAddress: SESSION_EOA,
        chainId: 8453,
        amount: "1000000",
        asset: "USDC",
      });

      expect(mockHttpClient.patch).toHaveBeenCalled();
      expect(mockHttpClient.post).not.toHaveBeenCalledWith(
        ENDPOINTS.AGENT_DEPOSIT_SETUP,
        expect.anything(),
      );
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
