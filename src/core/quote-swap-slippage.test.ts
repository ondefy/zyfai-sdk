import { describe, expect, it, vi } from "vitest";
import { ENDPOINTS } from "../config/endpoints";
import { ZyfaiSDK } from "./ZyfaiSDK";

const USER = "0x1111111111111111111111111111111111111111";
const ORIGIN = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";

const quoteResponse = {
  orderId: "order-1",
  status: "quote_ready",
  spend: "10000000",
  expectedOutput: "900000000000000",
  minimumOutput: "890000000000000",
  destinationChainId: 8453,
  destinationCurrency: "0x4200000000000000000000000000000000000006",
  fees: [],
  investEligible: true,
  expiresAt: null,
};

const swapParams = {
  userAddress: USER,
  originChainId: 42161,
  originCurrency: ORIGIN,
  originAmount: "10000000",
  destinationChainId: 8453 as const,
  destinationAsset: "WETH",
};

describe("funding order slippage", () => {
  const sdkWithPost = () => {
    const sdk = new ZyfaiSDK("test-key") as any;
    sdk.authenticateUser = vi.fn().mockResolvedValue(undefined);
    const post = vi.fn().mockResolvedValue(quoteResponse);
    sdk.httpClient = { post };
    return { sdk: sdk as ZyfaiSDK, post };
  };

  it("omits slippageBps when the caller does not set it", async () => {
    const { sdk, post } = sdkWithPost();
    await sdk.quoteSwapDeposit(swapParams);
    expect(post).toHaveBeenCalledWith(ENDPOINTS.FUNDING_ORDERS, {
      originChainId: 42161,
      destinationChainId: 8453,
      originCurrency: ORIGIN,
      originAmount: "10000000",
      destinationAsset: "WETH",
      fundingWallet: USER,
    });
  });

  it("sends a clamped integer slippageBps on the funding order", async () => {
    const { sdk, post } = sdkWithPost();
    await sdk.quoteSwapDeposit({ ...swapParams, slippageBps: 50 });
    expect(post).toHaveBeenCalledWith(
      ENDPOINTS.FUNDING_ORDERS,
      expect.objectContaining({ slippageBps: 50 }),
    );
  });

  it("rejects slippage outside 1 to 500 before the request", async () => {
    const { sdk, post } = sdkWithPost();
    await expect(
      sdk.quoteSwapDeposit({ ...swapParams, slippageBps: 0 }),
    ).rejects.toThrow(/slippageBps/);
    await expect(
      sdk.quoteSwapDeposit({ ...swapParams, slippageBps: 501 }),
    ).rejects.toThrow(/slippageBps/);
    await expect(
      sdk.quoteSwapDeposit({ ...swapParams, slippageBps: 50.5 }),
    ).rejects.toThrow(/slippageBps/);
    expect(post).not.toHaveBeenCalled();
  });

  it("forwards slippageBps from quoteDeposit into the funding order", async () => {
    const { sdk, post } = sdkWithPost();
    await sdk.quoteDeposit({
      userAddress: USER,
      chainId: 8453,
      asset: "WETH",
      amount: "10000000",
      spendToken: ORIGIN,
      spendChainId: 42161,
      slippageBps: 100,
    });
    expect(post).toHaveBeenCalledWith(
      ENDPOINTS.FUNDING_ORDERS,
      expect.objectContaining({ slippageBps: 100, destinationAsset: "WETH" }),
    );
  });

  it("forwards slippageBps from sendDeposit into sendSwapDeposit", async () => {
    const sdk = new ZyfaiSDK("test-key") as any;
    const sendSwapDeposit = vi.fn().mockResolvedValue({ success: true });
    sdk.sendSwapDeposit = sendSwapDeposit;
    await sdk.sendDeposit({
      userAddress: USER,
      chainId: 8453,
      asset: "USDC",
      amount: "10000000",
      spendToken: ORIGIN,
      spendChainId: 42161,
      slippageBps: 50,
    });
    expect(sendSwapDeposit).toHaveBeenCalledWith(
      expect.objectContaining({
        slippageBps: 50,
        originChainId: 42161,
        originCurrency: ORIGIN,
        destinationAsset: "USDC",
      }),
    );
  });
});
