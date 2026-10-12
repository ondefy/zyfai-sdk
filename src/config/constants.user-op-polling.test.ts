import { describe, expect, it } from "vitest";
import {
  ASYNC_WITHDRAW_CLAIM_GRACE_MS,
  USER_OP_LIFECYCLE_INTERVAL_MS,
  USER_OP_LIFECYCLE_TIMEOUT_MS,
  getUserOpLifecycleIntervalMs,
  getUserOpLifecycleTimeoutMs,
  nextWithdrawCompleteDeadline,
} from "./constants";

describe("user-op lifecycle polling defaults", () => {
  it("uses slower intervals and longer timeouts than deposit credit on L2", () => {
    expect(USER_OP_LIFECYCLE_INTERVAL_MS[1]).toBe(4_000);
    expect(USER_OP_LIFECYCLE_INTERVAL_MS[8453]).toBe(1_000);
    expect(USER_OP_LIFECYCLE_TIMEOUT_MS[1]).toBe(180_000);
    expect(USER_OP_LIFECYCLE_TIMEOUT_MS[8453]).toBe(90_000);
    expect(getUserOpLifecycleIntervalMs(42161)).toBe(1_000);
    expect(getUserOpLifecycleTimeoutMs(42161)).toBe(90_000);
  });

  it("extends the absolute deadline when estimatedClaimAt appears", () => {
    const startedAt = 1_000_000;
    const fallbackMs = 90_000 + ASYNC_WITHDRAW_CLAIM_GRACE_MS;
    const claimAt = new Date("2030-01-02T12:00:00.000Z").getTime();
    const deadline = nextWithdrawCompleteDeadline(
      startedAt,
      startedAt + fallbackMs,
      new Date(claimAt).toISOString(),
      {
        graceMs: ASYNC_WITHDRAW_CLAIM_GRACE_MS,
        fallbackMs,
      },
    );
    expect(deadline).toBe(claimAt + ASYNC_WITHDRAW_CLAIM_GRACE_MS);
  });

  it("does not shrink the deadline when a later estimate arrives", () => {
    const startedAt = 1_000_000;
    const fallbackMs = 90_000 + ASYNC_WITHDRAW_CLAIM_GRACE_MS;
    const later = new Date("2030-06-01T00:00:00.000Z").getTime();
    const earlier = new Date("2030-01-01T00:00:00.000Z").getTime();
    const first = nextWithdrawCompleteDeadline(
      startedAt,
      undefined,
      new Date(later).toISOString(),
      { graceMs: ASYNC_WITHDRAW_CLAIM_GRACE_MS, fallbackMs },
    );
    const second = nextWithdrawCompleteDeadline(
      startedAt,
      first,
      new Date(earlier).toISOString(),
      { graceMs: ASYNC_WITHDRAW_CLAIM_GRACE_MS, fallbackMs },
    );
    expect(second).toBe(first);
  });

  it("pins the deadline when the caller passes explicitTimeoutMs", () => {
    const startedAt = 5_000;
    const pinned = nextWithdrawCompleteDeadline(
      startedAt,
      undefined,
      new Date("2030-01-01T00:00:00.000Z").toISOString(),
      {
        explicitTimeoutMs: 60_000,
        graceMs: ASYNC_WITHDRAW_CLAIM_GRACE_MS,
        fallbackMs: 999,
      },
    );
    expect(pinned).toBe(startedAt + 60_000);
  });
});
