/**
 * Unit tests for Zyfi fee helpers.
 * Run: npx --yes tsx --test src/utils/zyfi-fees.test.ts
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ZYFI_FEE_RATE } from "../config/constants";
import type { PortfolioDetailed } from "../types";
import {
  applyFeeToDecimalWei,
  applyFeeToHexBalance,
  assetTypeToSymbol,
  chainNameToId,
  computePendingFees,
  enrichOnchainEarningsTotals,
  enrichPortfolioWithFees,
  humanAmountToRaw,
  symbolToAssetType,
} from "./zyfi-fees";

describe("symbol / chain normalizers", () => {
  it("maps symbols to assetTypes", () => {
    assert.equal(symbolToAssetType("USDC"), "usdc");
    assert.equal(symbolToAssetType("WETH"), "eth");
    assert.equal(symbolToAssetType("ETH"), "eth");
    assert.equal(symbolToAssetType("EURC"), "eurc");
  });

  it("maps assetTypes to symbols", () => {
    assert.equal(assetTypeToSymbol("usdc"), "USDC");
    assert.equal(assetTypeToSymbol("eth"), "WETH");
  });

  it("maps chain names to ids", () => {
    assert.equal(chainNameToId("Base"), "8453");
    assert.equal(chainNameToId("Arbitrum"), "42161");
    assert.equal(chainNameToId("Ethereum"), "1");
    assert.equal(chainNameToId("8453"), "8453");
  });
});

describe("computePendingFees", () => {
  it("returns zeros when earnings are missing", () => {
    const fees = computePendingFees(undefined);
    assert.equal(fees.total, 0);
    assert.deepEqual(fees.byToken, {});
  });

  it("applies FEE_RATE only to current earnings", () => {
    const fees = computePendingFees({
      "8453": { USDC: "0.326653" },
      "42161": { USDC: "1" },
    });
    assert.ok(Math.abs(fees.byToken.USDC - (0.326653 + 1) * ZYFI_FEE_RATE) < 1e-9);
    assert.ok(Math.abs(fees.byChain["8453"] - 0.326653 * ZYFI_FEE_RATE) < 1e-9);
    assert.ok(
      Math.abs(fees.byChainByToken["8453"].USDC - 0.326653 * ZYFI_FEE_RATE) < 1e-9
    );
  });
});

describe("applyFee helpers", () => {
  it("subtracts fee from hex balance", () => {
    // 100 USDC (6 decimals) = 100_000_000 = 0x5f5e100
    const net = applyFeeToHexBalance("0x5f5e100", 0.1, 6);
    // 0.1 USDC = 100_000 raw → 99_900_000
    assert.equal(BigInt(net), 99900000n);
  });

  it("clamps hex balance at zero", () => {
    const net = applyFeeToHexBalance("0x1", 10, 6);
    assert.equal(net, "0x0");
  });

  it("subtracts fee from decimal wei string", () => {
    const net = applyFeeToDecimalWei("1000000", 0.1, 6);
    assert.equal(net, "900000");
  });

  it("converts human amounts to raw without float blowups", () => {
    assert.equal(humanAmountToRaw(0.0326653, 6), 32665n);
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
      },
      {
        chain: "Base",
        token_symbol: "USDC",
        assetType: "usdc",
        decimals: 6,
        underlyingAmount: "1000000000",
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
    assert.equal(
      enriched.portfolioByAssetType?.usdc.balanceWithFee,
      "0x5f5e100"
    );
    assert.equal(
      enriched.positions?.[0].underlyingAmountWithFee,
      "1000000000"
    );
  });

  it("subtracts pending fee from aggregate balances", () => {
    // current 1 USDC → fee 0.1 USDC
    const enriched = enrichPortfolioWithFees(portfolio, {
      "8453": { USDC: "1" },
    });
    assert.equal(
      BigInt(enriched.portfolioByAssetType!.usdc.balanceWithFee!),
      99900000n
    );
    assert.equal(
      BigInt(enriched.portfolioByChain!["8453"].usdc.balanceWithFee!),
      99900000n
    );
  });

  it("splits position fee proportionally by underlyingAmount", () => {
    const enriched = enrichPortfolioWithFees(portfolio, {
      "8453": { USDC: "1" },
    });
    // Total fee 0.1 USDC = 100_000 raw, split 50/50 → 50_000 each
    assert.equal(enriched.positions?.[0].underlyingAmountWithFee, "999950000");
    assert.equal(enriched.positions?.[1].underlyingAmountWithFee, "999950000");
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

    const expected =
      0.920602 + 3.02482 + 0.326653 * (1 - ZYFI_FEE_RATE);
    assert.ok(
      Math.abs(Number(result.totalEarningsByTokenWithFee.USDC) - expected) < 1e-9
    );
    assert.ok(
      Math.abs(
        Number(result.totalEarningsByChainWithFee["8453"].USDC) - expected
      ) < 1e-9
    );

    // Must NOT equal total_gross × 0.9
    const totalGross = 0.920602 + 3.02482 + 0.326653;
    assert.ok(
      Math.abs(Number(result.totalEarningsByTokenWithFee.USDC) - totalGross * 0.9) >
        1e-6
    );
  });

  it("does not apply 0.9 to lifetime or unrealized when current is zero", () => {
    const result = enrichOnchainEarningsTotals({
      lifetime_earnings_by_token: { USDC: "10" },
      unrealized_earnings: { "8453": { USDC: "3" } },
      current_earnings_by_chain: { "8453": {} },
    });
    assert.equal(result.totalEarningsByTokenWithFee.USDC, "13");
  });
});
