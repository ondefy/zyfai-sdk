import { describe, expect, it } from "vitest";
import { isMainnetMinPortfolioExempt } from "./min-portfolio-exempt";

const EOA = "0x2db791F63C8b12BDe9A3fe31aFA8ad491F47d60F";
const SAFE = "0xAe72CB0F7d604a8FF742D96031104506186638E3";

describe("isMainnetMinPortfolioExempt", () => {
  it("waives the mainnet minimum for the POC EOA and Safe", () => {
    expect(isMainnetMinPortfolioExempt(1, EOA)).toBe(true);
    expect(isMainnetMinPortfolioExempt(1, SAFE)).toBe(true);
    expect(isMainnetMinPortfolioExempt(1, "0xother", SAFE)).toBe(true);
  });

  it("keeps the minimum on other chains and other addresses", () => {
    expect(isMainnetMinPortfolioExempt(8453, EOA)).toBe(false);
    expect(isMainnetMinPortfolioExempt(42161, SAFE)).toBe(false);
    expect(
      isMainnetMinPortfolioExempt(1, "0x0000000000000000000000000000000000000001"),
    ).toBe(false);
  });
});
