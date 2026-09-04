/**
 * Unit tests for ETH/USD → WETH wei conversion.
 * Run: npx --yes tsx --test src/utils/eth-price.test.ts
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { minWethWeiForUsd, parseEthUsdPrice, usdToWethWei } from "./eth-price";

describe("parseEthUsdPrice", () => {
  it("reads price_usd from the Data API payload", () => {
    assert.equal(
      parseEthUsdPrice({
        success: true,
        data: { token_id: "weth", price_usd: 2452.54 },
      }),
      2452.54
    );
  });

  it("throws when price_usd is missing", () => {
    assert.throws(() => parseEthUsdPrice({ success: true, data: {} }), /positive/);
  });
});

describe("usdToWethWei", () => {
  it("converts $100 at $2500/ETH to 0.04 WETH", () => {
    assert.equal(usdToWethWei(100n, 2500), (10n ** 18n * 4n) / 100n);
  });

  it("throws on non-positive price", () => {
    assert.throws(() => usdToWethWei(100n, 0), /positive/);
  });
});

describe("minWethWeiForUsd", () => {
  it("uses $100 of WETH", () => {
    assert.equal(minWethWeiForUsd(2000, 100n), 10n ** 18n / 20n);
  });

  it("uses $10,000 of WETH", () => {
    assert.equal(minWethWeiForUsd(2500, 10000n), 4n * 10n ** 18n);
  });
});
