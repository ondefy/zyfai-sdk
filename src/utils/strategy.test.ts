import { describe, expect, it } from "vitest";
import {
  convertStrategyToPublic,
  isValidPublicStrategy,
  toInternalStrategy,
  toPublicStrategy,
} from "./strategy";

describe("toInternalStrategy", () => {
  it("maps every public strategy to its backend value", () => {
    expect(toInternalStrategy("conservative")).toBe("safe_strategy");
    expect(toInternalStrategy("aggressive")).toBe("degen_strategy");
    expect(toInternalStrategy("yieldmaxxing")).toBe("async_strategy");
  });

  it("rejects an unknown strategy", () => {
    expect(() => toInternalStrategy("degen" as never)).toThrow(/yieldmaxxing/);
  });
});

describe("toPublicStrategy", () => {
  it("maps backend values back to public names", () => {
    expect(toPublicStrategy("safe_strategy")).toBe("conservative");
    expect(toPublicStrategy("degen_strategy")).toBe("aggressive");
    expect(toPublicStrategy("async_strategy")).toBe("yieldmaxxing");
  });

  // rebalance-info returns the short form, e.g. `strategy: "async"`.
  it("accepts the short forms", () => {
    expect(toPublicStrategy("safe")).toBe("conservative");
    expect(toPublicStrategy("degen")).toBe("aggressive");
    expect(toPublicStrategy("async")).toBe("yieldmaxxing");
  });
});

describe("isValidPublicStrategy", () => {
  it("accepts the three public strategies and nothing else", () => {
    expect(isValidPublicStrategy("conservative")).toBe(true);
    expect(isValidPublicStrategy("aggressive")).toBe(true);
    expect(isValidPublicStrategy("yieldmaxxing")).toBe(true);
    expect(isValidPublicStrategy("async_strategy")).toBe(false);
  });
});

describe("convertStrategyToPublic", () => {
  it("converts an async strategy instead of leaking the backend value", () => {
    expect(convertStrategyToPublic({ strategy: "async" })).toEqual({
      strategy: "yieldmaxxing",
    });
  });

  it("keeps the original value when the strategy is unknown", () => {
    expect(convertStrategyToPublic({ strategy: "aave_strategy" })).toEqual({
      strategy: "aave_strategy",
    });
  });
});
