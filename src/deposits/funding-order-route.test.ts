import { describe, expect, it } from "vitest";
import { assertStoredFundingOrderRoute } from "./funding-order-route";

const USDC = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";

const stored = {
  id: "order-1",
  originChainId: 42161,
  originCurrency: USDC,
  destinationChainId: 8453,
  destinationAsset: "WETH",
};

const requested = {
  originChainId: 42161,
  originCurrency: USDC,
  destinationChainId: 8453,
  destinationAsset: "WETH",
};

describe("assertStoredFundingOrderRoute", () => {
  it("accepts the stored route, including checksum and asset case", () => {
    expect(() =>
      assertStoredFundingOrderRoute(stored, {
        ...requested,
        originCurrency: USDC.toLowerCase(),
        destinationAsset: "weth",
      }),
    ).not.toThrow();
  });

  it("rejects a reused order whose destination chain differs", () => {
    expect(() =>
      assertStoredFundingOrderRoute(stored, {
        ...requested,
        destinationChainId: 1,
      }),
    ).toThrow(
      "Funding order order-1 does not match this swap: destinationChainId caller 1, stored 8453",
    );
  });

  it("rejects a reused order whose origin chain, token, or destination asset differs", () => {
    expect(() =>
      assertStoredFundingOrderRoute(stored, {
        ...requested,
        originChainId: 8453,
        originCurrency: "0x0000000000000000000000000000000000000000",
        destinationAsset: "USDC",
      }),
    ).toThrow(/originChainId caller 8453, stored 42161/);
    expect(() =>
      assertStoredFundingOrderRoute(stored, {
        ...requested,
        originCurrency: "0x0000000000000000000000000000000000000000",
      }),
    ).toThrow(/originCurrency/);
    expect(() =>
      assertStoredFundingOrderRoute(stored, {
        ...requested,
        destinationAsset: "USDC",
      }),
    ).toThrow(/destinationAsset caller USDC, stored WETH/);
  });
});
