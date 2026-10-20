import { describe, expect, it } from "vitest";
import {
  DEFAULT_RELAY_SLIPPAGE_BPS,
  MAX_RELAY_SLIPPAGE_BPS,
  resolveRelaySlippageBps,
} from "./relay-slippage";

describe("resolveRelaySlippageBps", () => {
  it("uses 200 bps when omitted or not finite", () => {
    expect(resolveRelaySlippageBps()).toBe(DEFAULT_RELAY_SLIPPAGE_BPS);
    expect(resolveRelaySlippageBps(null)).toBe(200);
    expect(resolveRelaySlippageBps(Number.NaN)).toBe(200);
    expect(resolveRelaySlippageBps(Number.POSITIVE_INFINITY)).toBe(200);
  });

  it("clamps below 1 and above 500", () => {
    expect(resolveRelaySlippageBps(0)).toBe(1);
    expect(resolveRelaySlippageBps(-10)).toBe(1);
    expect(resolveRelaySlippageBps(501)).toBe(MAX_RELAY_SLIPPAGE_BPS);
    expect(resolveRelaySlippageBps(10_000)).toBe(500);
  });

  it("truncates fractional basis points", () => {
    expect(resolveRelaySlippageBps(50.9)).toBe(50);
    expect(resolveRelaySlippageBps(200.2)).toBe(200);
  });
});
