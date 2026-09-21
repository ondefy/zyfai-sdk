import { describe, expect, it } from "vitest";
import { parseTokenUsdPrice, usdToTokenUnits } from "./token-price";

describe("parseTokenUsdPrice", () => {
  it("reads the price from the Data API envelope", () => {
    expect(
      parseTokenUsdPrice({
        success: true,
        data: { token_id: "nvdac", price_usd: 224.88995 },
      })
    ).toBe(224.88995);
  });

  it("rejects a missing or non-positive price", () => {
    expect(() => parseTokenUsdPrice({ success: true, data: {} })).toThrow(
      /positive number/
    );
    expect(() =>
      parseTokenUsdPrice({ data: { price_usd: 0 } })
    ).toThrow(/positive number/);
  });
});

describe("usdToTokenUnits", () => {
  it("converts to 18-decimal WETH wei", () => {
    // $100 at $2500/ETH = 0.04 WETH
    expect(usdToTokenUnits(100n, 2500, 18)).toBe((10n ** 18n * 4n) / 100n);
  });

  it("converts to 8-decimal NVDAc units", () => {
    // $100 at $200/NVDAc = 0.5 NVDAc = 50_000_000 units
    expect(usdToTokenUnits(100n, 200, 8)).toBe(50_000_000n);
  });

  it("keeps sub-unit precision at a realistic price", () => {
    // $100 at $224.88995/NVDAc = 0.44466193 NVDAc, truncated to whole units
    expect(usdToTokenUnits(100n, 224.88995, 8)).toBe(44_466_193n);
  });

  it("rejects a non-positive price", () => {
    expect(() => usdToTokenUnits(100n, 0, 18)).toThrow(/positive/);
    expect(() => usdToTokenUnits(100n, -1, 8)).toThrow(/positive/);
  });
});
