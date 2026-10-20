/** Matches the execution API and the deposit UI default. */
export const DEFAULT_RELAY_SLIPPAGE_BPS = 200;

/** Hard cap accepted by `POST /users/me/funding-orders`. */
export const MAX_RELAY_SLIPPAGE_BPS = 500;

/**
 * Dashboard presets (basis points). Any integer from 1 to
 * {@link MAX_RELAY_SLIPPAGE_BPS} is valid; these are the usual choices.
 */
export const RELAY_SLIPPAGE_PRESETS_BPS = [50, 200, 500] as const;

/**
 * Clamp a client slippage to the range the execution API stores.
 * Omitted or non-finite values use {@link DEFAULT_RELAY_SLIPPAGE_BPS}.
 */
export const resolveRelaySlippageBps = (clientBps?: number | null): number => {
  if (clientBps == null || !Number.isFinite(clientBps)) {
    return DEFAULT_RELAY_SLIPPAGE_BPS;
  }
  return Math.min(
    Math.max(1, Math.trunc(clientBps)),
    MAX_RELAY_SLIPPAGE_BPS,
  );
};
