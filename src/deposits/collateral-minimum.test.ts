import { describe, expect, it } from "vitest";
import { resolveCollateralMinimum } from "./collateral-minimum";

const WETH_MINIMUM = "2500000000000000";

describe("resolveCollateralMinimum", () => {
  it("keeps a stored destination minimum", () => {
    expect(
      resolveCollateralMinimum("995000", {
        details: { currencyOut: { minimumAmount: WETH_MINIMUM } },
      }),
    ).toBe("995000");
  });

  it("uses the refreshed quote minimum when the stored minimum is missing or zero", () => {
    const quote = {
      details: {
        currencyOut: {
          amount: "2600000000000000",
          minimumAmount: WETH_MINIMUM,
        },
      },
    };
    expect(resolveCollateralMinimum(null, quote)).toBe(WETH_MINIMUM);
    expect(resolveCollateralMinimum("0", quote)).toBe(WETH_MINIMUM);
    expect(resolveCollateralMinimum(undefined, quote)).toBe(WETH_MINIMUM);
  });

  it("uses the quote output amount when minimumAmount is missing or zero", () => {
    const amount = "30454920";
    expect(
      resolveCollateralMinimum("0", {
        details: { currencyOut: { amount, minimumAmount: "0" } },
      }),
    ).toBe(amount);
    expect(
      resolveCollateralMinimum(null, {
        details: { currencyOut: { amount } },
      }),
    ).toBe(amount);
  });

  it("returns zero when the quote has no destination amount", () => {
    expect(resolveCollateralMinimum("0", {})).toBe("0");
    expect(resolveCollateralMinimum(null, { details: {} })).toBe("0");
  });
});
