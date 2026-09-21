import { describe, expect, it } from "vitest";
import {
  DEPOSIT_CREDIT_INTERVAL_MS,
  DEPOSIT_CREDIT_TIMEOUT_MS,
  getDepositCreditIntervalMs,
  getDepositCreditTimeoutMs,
} from "./constants";

describe("deposit credit polling defaults", () => {
  it("uses short user-facing timeouts and tighter L2 polling", () => {
    expect(DEPOSIT_CREDIT_TIMEOUT_MS[1]).toBe(60_000);
    expect(DEPOSIT_CREDIT_TIMEOUT_MS[8453]).toBe(20_000);
    expect(DEPOSIT_CREDIT_TIMEOUT_MS[42161]).toBe(20_000);

    expect(DEPOSIT_CREDIT_INTERVAL_MS[1]).toBe(2_000);
    expect(DEPOSIT_CREDIT_INTERVAL_MS[8453]).toBe(500);
    expect(DEPOSIT_CREDIT_INTERVAL_MS[42161]).toBe(250);
    expect(DEPOSIT_CREDIT_INTERVAL_MS[1]).toBeGreaterThan(
      DEPOSIT_CREDIT_INTERVAL_MS[8453],
    );
    expect(DEPOSIT_CREDIT_INTERVAL_MS[8453]).toBeGreaterThan(
      DEPOSIT_CREDIT_INTERVAL_MS[42161],
    );
  });

  it("resolves per-chain defaults via helpers", () => {
    expect(getDepositCreditIntervalMs(8453)).toBe(500);
    expect(getDepositCreditTimeoutMs(8453)).toBe(20_000);
    expect(getDepositCreditIntervalMs(1)).toBe(2_000);
    expect(getDepositCreditTimeoutMs(1)).toBe(60_000);
  });
});
