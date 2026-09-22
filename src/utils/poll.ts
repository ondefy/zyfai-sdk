export async function pollUntil<T>(
  fn: () => Promise<T>,
  predicate: (value: T) => boolean,
  options?: { intervalMs?: number; timeoutMs?: number; label?: string },
): Promise<{ value: T; elapsedMs: number }> {
  const intervalMs = options?.intervalMs ?? 5_000;
  const timeoutMs = options?.timeoutMs ?? 120_000;
  const label = options?.label ?? "condition";
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    const value = await fn();
    if (predicate(value)) {
      return { value, elapsedMs: Date.now() - started };
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Timed out waiting for ${label} after ${timeoutMs}ms`);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
