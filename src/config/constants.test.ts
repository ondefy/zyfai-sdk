import { describe, expect, it } from "vitest";
import { MIN_PORTFOLIO_BALANCE, MIN_PORTFOLIO_USD } from "./constants";

describe("minimum portfolio thresholds", () => {
  it("keeps Mainnet USDC at 10,000 units", () => {
    expect(MIN_PORTFOLIO_BALANCE[1]?.USDC).toBe(10_000_000_000n);
    expect(MIN_PORTFOLIO_BALANCE[1]?.EURC).toBe(10_000_000_000n);
    expect(MIN_PORTFOLIO_USD[1]?.WETH).toBe(10000n);
  });

  it("requires 10 USDC and 10 EURC on Base and Arbitrum", () => {
    for (const chainId of [8453, 42161] as const) {
      expect(MIN_PORTFOLIO_BALANCE[chainId]?.USDC).toBe(10_000_000n);
      expect(MIN_PORTFOLIO_BALANCE[chainId]?.EURC).toBe(10_000_000n);
    }
  });

  it("quotes L2 WETH and Base NVDAc minimums at $10", () => {
    expect(MIN_PORTFOLIO_USD[8453]?.WETH).toBe(10n);
    expect(MIN_PORTFOLIO_USD[8453]?.NVDAc).toBe(10n);
    expect(MIN_PORTFOLIO_USD[42161]?.WETH).toBe(10n);
  });
});
