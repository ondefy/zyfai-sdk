import { afterEach, describe, expect, it, vi } from "vitest";
import { pollUntil } from "./poll";

describe("pollUntil", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns immediately when predicate matches on first call", async () => {
    const fn = vi.fn().mockResolvedValue("ready");

    const result = await pollUntil(fn, (value) => value === "ready", {
      intervalMs: 100,
      timeoutMs: 1_000,
    });

    expect(result.value).toBe("ready");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("polls until predicate matches", async () => {
    vi.useFakeTimers();
    const fn = vi
      .fn()
      .mockResolvedValueOnce("pending")
      .mockResolvedValueOnce("pending")
      .mockResolvedValue("ready");

    const promise = pollUntil(fn, (value) => value === "ready", {
      intervalMs: 100,
      timeoutMs: 1_000,
      label: "ready state",
    });

    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.value).toBe("ready");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("throws when timeout elapses", async () => {
    vi.useFakeTimers();
    const fn = vi.fn().mockResolvedValue("pending");

    const promise = pollUntil(fn, () => false, {
      intervalMs: 100,
      timeoutMs: 300,
      label: "ready state",
    });
    const assertion = expect(promise).rejects.toThrow(
      "Timed out waiting for ready state after 300ms",
    );

    await vi.runAllTimersAsync();
    await assertion;
  });
});
