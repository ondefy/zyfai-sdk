import { describe, expect, it } from "vitest";
import { getManagedAssets } from "../config/managed-assets";
import {
  convertAssetInternally,
  convertStrategyToPublic,
  isValidPublicStrategy,
  toInternalStrategy,
  toPublicStrategy,
  toPublicStrategyOrUndefined,
} from "./strategy";

describe("convertAssetInternally", () => {
  it("maps every managed asset to its backend assetType key", () => {
    expect(convertAssetInternally("USDC")).toBe("usdc");
    expect(convertAssetInternally("WETH")).toBe("eth");
    expect(convertAssetInternally("EURC")).toBe("eurc");
    expect(convertAssetInternally("USDT")).toBe("usdt");
    expect(convertAssetInternally("PYUSD")).toBe("pyusd");
    expect(convertAssetInternally("NVDAc")).toBe("nvdac");
  });

  it("does not throw for any symbol returned by getManagedAssets", () => {
    for (const asset of getManagedAssets()) {
      expect(() => convertAssetInternally(asset)).not.toThrow();
    }
  });
});

describe("toInternalStrategy", () => {
  it("maps every public strategy to its backend value", () => {
    expect(toInternalStrategy("conservative")).toBe("safe_strategy");
    expect(toInternalStrategy("balance")).toBe("degen_strategy");
    expect(toInternalStrategy("grow")).toBe("async_strategy");
  });

  it("rejects the previous public tokens", () => {
    expect(() => toInternalStrategy("aggressive" as never)).toThrow(/grow/);
    expect(() => toInternalStrategy("yieldmaxxing" as never)).toThrow(/grow/);
  });

  it("rejects an unknown strategy", () => {
    expect(() => toInternalStrategy("degen" as never)).toThrow(/grow/);
  });
});

describe("toPublicStrategy", () => {
  it("maps backend values back to public names", () => {
    expect(toPublicStrategy("safe_strategy")).toBe("conservative");
    expect(toPublicStrategy("degen_strategy")).toBe("balance");
    expect(toPublicStrategy("async_strategy")).toBe("grow");
  });

  // rebalance-info returns the short form, e.g. `strategy: "async"`.
  it("accepts the short forms", () => {
    expect(toPublicStrategy("safe")).toBe("conservative");
    expect(toPublicStrategy("degen")).toBe("balance");
    expect(toPublicStrategy("async")).toBe("grow");
  });
});

describe("isValidPublicStrategy", () => {
  it("accepts the three public strategies and nothing else", () => {
    expect(isValidPublicStrategy("conservative")).toBe(true);
    expect(isValidPublicStrategy("balance")).toBe(true);
    expect(isValidPublicStrategy("grow")).toBe(true);
    expect(isValidPublicStrategy("aggressive")).toBe(false);
    expect(isValidPublicStrategy("yieldmaxxing")).toBe(false);
    expect(isValidPublicStrategy("async_strategy")).toBe(false);
  });
});

describe("convertStrategyToPublic", () => {
  it("converts an async strategy instead of leaking the backend value", () => {
    expect(convertStrategyToPublic({ strategy: "async" })).toEqual({
      strategy: "grow",
    });
  });

  it("keeps the original value when the strategy is unknown", () => {
    expect(convertStrategyToPublic({ strategy: "aave_strategy" })).toEqual({
      strategy: "aave_strategy",
    });
  });
});

describe("toPublicStrategyOrUndefined", () => {
  it("converts every backend strategy", () => {
    expect(toPublicStrategyOrUndefined("safe_strategy")).toBe("conservative");
    expect(toPublicStrategyOrUndefined("degen_strategy")).toBe("balance");
    expect(toPublicStrategyOrUndefined("async_strategy")).toBe("grow");
  });

  it("returns undefined rather than leaking an unknown backend value", () => {
    expect(toPublicStrategyOrUndefined("aave_strategy")).toBeUndefined();
    expect(toPublicStrategyOrUndefined(undefined)).toBeUndefined();
    expect(toPublicStrategyOrUndefined("")).toBeUndefined();
  });

  it("round-trips back through toInternalStrategy", () => {
    const publicStrategy = toPublicStrategyOrUndefined("async_strategy");
    expect(isValidPublicStrategy(publicStrategy ?? "")).toBe(true);
    expect(toInternalStrategy(publicStrategy!)).toBe("async_strategy");
  });
});
