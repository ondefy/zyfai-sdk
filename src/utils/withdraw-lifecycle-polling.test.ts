import { describe, expect, it } from "vitest";
import { isWithdrawSettlementTerminal } from "./withdraw-lifecycle-polling";

describe("isWithdrawSettlementTerminal", () => {
  it("returns true for completed, async cooldown, and async claiming", () => {
    expect(isWithdrawSettlementTerminal("completed")).toBe(true);
    expect(isWithdrawSettlementTerminal("async_cooldown")).toBe(true);
    expect(isWithdrawSettlementTerminal("async_claiming")).toBe(true);
  });

  it("returns false while sync or async request legs are in flight", () => {
    for (const status of [
      "accepted",
      "redeeming",
      "transferring",
      "async_requesting",
    ] as const) {
      expect(isWithdrawSettlementTerminal(status)).toBe(false);
    }
  });
});
