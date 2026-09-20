import { describe, expect, it } from "vitest";
import { ZYFI_FEE_RATE } from "../config/constants";
import type { PortfolioDetailed } from "../types";
import {
  applyApyFee,
  applyApyFeeToString,
  applyFeeToDecimalWei,
  applyFeeToHexBalance,
  assetTypeToSymbol,
  chainNameToId,
  computePendingFees,
  enrichApyPosition,
  enrichDailyEarningWithoutFee,
  enrichOnchainEarningsTotals,
  enrichPortfolioWithFees,
  enrichRebalanceLog,
  humanAmountToRaw,
  symbolToAssetType,
} from "./zyfi-fees";

describe("symbol / chain normalizers", () => {
  it("maps symbols to assetTypes", () => {
    expect(symbolToAssetType("USDC")).toBe("usdc");
    expect(symbolToAssetType("WETH")).toBe("eth");
    expect(symbolToAssetType("ETH")).toBe("eth");
    expect(symbolToAssetType("EURC")).toBe("eurc");
  });

  it("maps assetTypes to symbols", () => {
    expect(assetTypeToSymbol("usdc")).toBe("USDC");
    expect(assetTypeToSymbol("eth")).toBe("WETH");
  });

  it("maps chain names to ids", () => {
    expect(chainNameToId("Base")).toBe("8453");
    expect(chainNameToId("Arbitrum")).toBe("42161");
    expect(chainNameToId("Ethereum")).toBe("1");
    expect(chainNameToId("8453")).toBe("8453");
  });
});

describe("computePendingFees", () => {
  it("returns zeros when earnings are missing", () => {
    const fees = computePendingFees(undefined);
    expect(fees.total).toBe(0);
    expect(fees.byToken).toEqual({});
  });

  it("applies FEE_RATE only to current earnings", () => {
    const fees = computePendingFees({
      "8453": { USDC: "0.326653" },
      "42161": { USDC: "1" },
    });
    expect(Math.abs(fees.byToken.USDC - (0.326653 + 1) * ZYFI_FEE_RATE)).toBeLessThan(
      1e-9
    );
    expect(Math.abs(fees.byChain["8453"] - 0.326653 * ZYFI_FEE_RATE)).toBeLessThan(
      1e-9
    );
    expect(
      Math.abs(fees.byChainByToken["8453"].USDC - 0.326653 * ZYFI_FEE_RATE)
    ).toBeLessThan(1e-9);
  });
});

describe("applyFee helpers", () => {
  it("subtracts fee from hex balance", () => {
    const net = applyFeeToHexBalance("0x5f5e100", 0.1, 6);
    expect(BigInt(net)).toBe(99900000n);
  });

  it("clamps hex balance at zero", () => {
    const net = applyFeeToHexBalance("0x1", 10, 6);
    expect(net).toBe("0x0");
  });

  it("subtracts fee from decimal wei string", () => {
    const net = applyFeeToDecimalWei("1000000", 0.1, 6);
    expect(net).toBe("900000");
  });

  it("converts human amounts to raw without float blowups", () => {
    expect(humanAmountToRaw(0.0326653, 6)).toBe(32665n);
  });
});

describe("enrichPortfolioWithFees", () => {
  const portfolio: PortfolioDetailed = {
    positions: [
      {
        chain: "Base",
        token_symbol: "USDC",
        assetType: "usdc",
        decimals: 6,
        underlyingAmount: "1000000000",
        pool_apy: 5,
      },
      {
        chain: "Base",
        token_symbol: "USDC",
        assetType: "usdc",
        decimals: 6,
        underlyingAmount: "1000000000",
        pool_apy: 5,
      },
    ],
    portfolioByAssetType: {
      usdc: { balance: "0x5f5e100", decimals: 6 },
    },
    portfolioByChain: {
      "8453": {
        usdc: { balance: "0x5f5e100", decimals: 6 },
      },
    },
  };

  it("sets WithFee equal to gross when no current earnings", () => {
    const enriched = enrichPortfolioWithFees(portfolio, undefined);
    expect(enriched.portfolioByAssetType?.usdc.balanceWithFee).toBe("0x5f5e100");
    expect(enriched.positions?.[0].underlyingAmountWithFee).toBe("1000000000");
  });

  it("subtracts pending fee from aggregate balances", () => {
    const enriched = enrichPortfolioWithFees(portfolio, {
      "8453": { USDC: "1" },
    });
    expect(BigInt(enriched.portfolioByAssetType!.usdc.balanceWithFee!)).toBe(
      99900000n
    );
    expect(BigInt(enriched.portfolioByChain!["8453"].usdc.balanceWithFee!)).toBe(
      99900000n
    );
  });

  it("adds pool_apy_withFee as gross x 0.9", () => {
    const enriched = enrichPortfolioWithFees(portfolio, undefined);
    expect(enriched.positions?.[0].pool_apy_withFee).toBe(4.5);
    expect(enriched.positions?.[1].pool_apy_withFee).toBe(4.5);
  });

  it("splits position fee proportionally by underlyingAmount", () => {
    const enriched = enrichPortfolioWithFees(portfolio, {
      "8453": { USDC: "1" },
    });
    expect(enriched.positions?.[0].underlyingAmountWithFee).toBe("999950000");
    expect(enriched.positions?.[1].underlyingAmountWithFee).toBe("999950000");
  });
});

describe("applyApyFee", () => {
  it("multiplies gross APY by 0.9", () => {
    expect(applyApyFee(10)).toBe(9);
    expect(applyApyFeeToString("1.8865050828133896")).toBe(
      String(1.8865050828133896 * 0.9)
    );
  });
});

describe("enrichApyPosition / enrichRebalanceLog", () => {
  it("adds apy_withFee on daily APY positions", () => {
    const enriched = enrichApyPosition({
      apy: 3.8174328990443924,
      balance: 1,
      chainId: 8453,
      protocol: "Euler",
      pool: "Clearstar ETH Fusion",
      strategy: "aggressive",
    });
    expect(enriched.apy_withFee).toBe(3.8174328990443924 * 0.9);
  });

  it("adds oldApy_withFee and newApy_withFee on rebalance logs", () => {
    const enriched = enrichRebalanceLog({
      oldApy: "1.8865050828133896",
      newApy: "3.8174328990443924",
      oldOpportunity: "Aave V3 (WETH)",
      newOpportunity: "Euler (Clearstar ETH Fusion)",
    });
    expect(enriched.oldApy_withFee).toBe(String(1.8865050828133896 * 0.9));
    expect(enriched.newApy_withFee).toBe(String(3.8174328990443924 * 0.9));
  });
});

describe("enrichOnchainEarningsTotals", () => {
  it("computes lifetime + unrealized + current × (1 - FEE_RATE), not total × 0.9", () => {
    const result = enrichOnchainEarningsTotals({
      lifetime_earnings_by_token: { USDC: "0.920602" },
      lifetime_earnings_by_chain: {
        "8453": { USDC: "0.920602" },
      },
      unrealized_earnings: {
        "8453": { USDC: "3.024820" },
      },
      current_earnings_by_chain: {
        "8453": { USDC: "0.326653" },
      },
    });

    const expected = 0.920602 + 3.02482 + 0.326653 * (1 - ZYFI_FEE_RATE);
    expect(
      Math.abs(Number(result.totalEarningsByTokenWithFee.USDC) - expected)
    ).toBeLessThan(1e-9);
    expect(
      Math.abs(Number(result.totalEarningsByChainWithFee["8453"].USDC) - expected)
    ).toBeLessThan(1e-9);

    const totalGross = 0.920602 + 3.02482 + 0.326653;
    expect(
      Math.abs(Number(result.totalEarningsByTokenWithFee.USDC) - totalGross * 0.9)
    ).toBeGreaterThan(1e-6);
  });

  it("does not apply 0.9 to lifetime or unrealized when current is zero", () => {
    const result = enrichOnchainEarningsTotals({
      lifetime_earnings_by_token: { USDC: "10" },
      unrealized_earnings: { "8453": { USDC: "3" } },
      current_earnings_by_chain: { "8453": {} },
    });
    expect(result.totalEarningsByTokenWithFee.USDC).toBe("13");
  });
});

describe("enrichDailyEarningWithoutFee", () => {
  it("multiplies daily_total_delta_by_token by (1 - FEE_RATE) per chain/token", () => {
    const entry = enrichDailyEarningWithoutFee({
      snapshot_date: "2026-01-01",
      current_earnings_by_token: {},
      lifetime_earnings_by_token: {},
      unrealized_earnings_by_token: {},
      total_earnings_by_token: {},
      daily_total_delta_by_token: {
        "8453": { USDC: "1", WETH: "0.5" },
        "42161": { USDC: "2" },
      },
      daily_total_delta_by_token_withoutFee: {},
    });

    expect(
      Math.abs(
        Number(entry.daily_total_delta_by_token_withoutFee["8453"].USDC) -
          1 * (1 - ZYFI_FEE_RATE)
      )
    ).toBeLessThan(1e-9);
    expect(
      Math.abs(
        Number(entry.daily_total_delta_by_token_withoutFee["8453"].WETH) -
          0.5 * (1 - ZYFI_FEE_RATE)
      )
    ).toBeLessThan(1e-9);
    expect(
      Math.abs(
        Number(entry.daily_total_delta_by_token_withoutFee["42161"].USDC) -
          2 * (1 - ZYFI_FEE_RATE)
      )
    ).toBeLessThan(1e-9);
  });

  it("handles negative deltas without dropping the sign", () => {
    const entry = enrichDailyEarningWithoutFee({
      snapshot_date: "2026-01-02",
      current_earnings_by_token: {},
      lifetime_earnings_by_token: {},
      unrealized_earnings_by_token: {},
      total_earnings_by_token: {},
      daily_total_delta_by_token: {
        "8453": { USDC: "-2" },
      },
      daily_total_delta_by_token_withoutFee: {},
    });

    expect(
      Math.abs(
        Number(entry.daily_total_delta_by_token_withoutFee["8453"].USDC) -
          -2 * (1 - ZYFI_FEE_RATE)
      )
    ).toBeLessThan(1e-9);
  });
});
