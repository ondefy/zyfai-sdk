import { describe, expect, it } from "vitest";
import {
  USER_OP_LIFECYCLE_INTERVAL_MS,
  USER_OP_LIFECYCLE_TIMEOUT_MS,
  getUserOpLifecycleIntervalMs,
  getUserOpLifecycleTimeoutMs,
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
});
