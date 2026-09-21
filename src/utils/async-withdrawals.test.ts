import { describe, expect, it } from "vitest";
import { findBlockingAsyncRedemption } from "./async-withdrawals";
import type { PortfolioDetailed } from "../types";

/** Live portfolio taken while a 0.02 NVDAc redemption was in flight on Base. */
const nvdacInFlight: PortfolioDetailed = {
  hasBalance: false,
  staleBalances: [],
  positions: [
    {
      chain: "Base",
      protocol_name: "Superform",
      token_symbol: "NVDAc",
      assetType: "nvdac",
      decimals: 8,
      amount: "0x3d0900",
      underlyingAmount: "2000000",
      pool: "NVDAC",
    },
  ],
  pendingAsyncWithdrawals: [
    {
      id: "0daf1900-7c1e-499d-b241-a82747b57524",
      chainId: 8453,
      pool: "NVDAC",
      amount: "0x1e8480",
      status: "REQUESTED",
      estimatedClaimAt: "2026-09-24T13:59:05.543Z",
      token: { symbol: "NVDAc", decimals: 8, chainId: 8453 },
    },
  ],
};

describe("findBlockingAsyncRedemption", () => {
  it("blocks a second withdrawal on a pool that is already redeeming", () => {
    const blocking = findBlockingAsyncRedemption(nvdacInFlight, 8453, "NVDAc");

    expect(blocking?.pool).toBe("NVDAC");
    expect(blocking?.estimatedClaimAt).toBe("2026-09-24T13:59:05.543Z");
  });

  it("blocks an unscoped withdrawal when every position sits in that pool", () => {
    expect(findBlockingAsyncRedemption(nvdacInFlight, 8453)).toBeDefined();
  });

  it("allows another chain", () => {
    expect(
      findBlockingAsyncRedemption(nvdacInFlight, 42161, "NVDAc")
    ).toBeUndefined();
  });

  it("allows another asset", () => {
    expect(
      findBlockingAsyncRedemption(nvdacInFlight, 8453, "USDC")
    ).toBeUndefined();
  });

  it("allows a position held in a pool that is not redeeming", () => {
    const portfolio: PortfolioDetailed = {
      ...nvdacInFlight,
      positions: [
        ...(nvdacInFlight.positions ?? []),
        { chain: "Base", token_symbol: "NVDAc", pool: "IPOR NVDAc" },
      ],
    };

    expect(
      findBlockingAsyncRedemption(portfolio, 8453, "NVDAc")
    ).toBeUndefined();
  });

  it("allows an idle Safe balance to be swept", () => {
    const portfolio: PortfolioDetailed = {
      ...nvdacInFlight,
      staleBalances: [
        {
          chainId: 8453,
          tokenSymbol: "NVDAc",
          balance: "0x1e8480",
          isPending: false,
        },
      ],
    };

    expect(
      findBlockingAsyncRedemption(portfolio, 8453, "NVDAc")
    ).toBeUndefined();
  });

  it("ignores a settled redemption", () => {
    const portfolio: PortfolioDetailed = {
      ...nvdacInFlight,
      pendingAsyncWithdrawals: [
        { ...nvdacInFlight.pendingAsyncWithdrawals![0], status: "CLAIMED" },
      ],
    };

    expect(
      findBlockingAsyncRedemption(portfolio, 8453, "NVDAc")
    ).toBeUndefined();
  });

  it("ignores a portfolio with no async activity", () => {
    expect(findBlockingAsyncRedemption({}, 8453, "USDC")).toBeUndefined();
  });
});
