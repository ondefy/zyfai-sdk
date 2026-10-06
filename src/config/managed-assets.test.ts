import { describe, expect, it } from "vitest";
import { getManagedAssets } from "./managed-assets";

describe("getManagedAssets", () => {
  it("returns enabled ASSET_CONFIGS keys in stable product order", () => {
    expect(getManagedAssets()).toEqual(["USDC", "WETH", "EURC", "NVDAc"]);
  });
});
