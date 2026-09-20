import { describe, expect, it } from "vitest";
import { minWethWeiForUsd, parseEthUsdPrice, usdToWethWei } from "./eth-price";

describe("parseEthUsdPrice", () => {
  it("reads price_usd from the Data API payload", () => {
    expect(
      parseEthUsdPrice({
        success: true,
        data: { token_id: "weth", price_usd: 2452.54 },
      })
    ).toBe(2452.54);
  });

  it("throws when price_usd is missing", () => {
    expect(() => parseEthUsdPrice({ success: true, data: {} })).toThrow(
      /positive/
    );
  });
});

describe("usdToWethWei", () => {
  it("converts $100 at $2500/ETH to 0.04 WETH", () => {
    expect(usdToWethWei(100n, 2500)).toBe((10n ** 18n * 4n) / 100n);
  });

  it("throws on non-positive price", () => {
    expect(() => usdToWethWei(100n, 0)).toThrow(/positive/);
  });
});

describe("minWethWeiForUsd", () => {
  it("uses $100 of WETH", () => {
    expect(minWethWeiForUsd(2000, 100n)).toBe(10n ** 18n / 20n);
  });

  it("uses $10,000 of WETH", () => {
    expect(minWethWeiForUsd(2500, 10000n)).toBe(4n * 10n ** 18n);
  });
});
