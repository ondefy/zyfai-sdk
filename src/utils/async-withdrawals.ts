import type { AsyncWithdrawal, PortfolioDetailed } from "../types";

/**
 * Async pools (ERC-7540) expose a single redemption slot per user, so the
 * backend drops a withdrawal aimed at a pool that is already `REQUESTED` or
 * `CLAIMABLE` — and still reports success.
 *
 * Returns the entry that makes a withdrawal a no-op, or `undefined` when
 * anything the call could reach is still withdrawable. Deliberately one-sided:
 * another pool, another asset or an idle Safe balance all let the withdrawal
 * through, since a wrongly blocked withdrawal is worse than the silent no-op
 * it replaces.
 */
export const findBlockingAsyncRedemption = (
  portfolio: PortfolioDetailed,
  chainId: number,
  tokenSymbol?: string
): AsyncWithdrawal | undefined => {
  const matchesToken = (symbol?: string): boolean =>
    !tokenSymbol || symbol?.toLowerCase() === tokenSymbol.toLowerCase();

  const blocked = (portfolio.pendingAsyncWithdrawals ?? []).filter(
    (w) =>
      w.chainId === chainId &&
      (w.status === "REQUESTED" || w.status === "CLAIMABLE") &&
      matchesToken(w.token?.symbol)
  );
  if (blocked.length === 0) return undefined;

  const blockedPools = new Set(
    blocked.map((w) => w.pool?.toLowerCase()).filter(Boolean)
  );

  const hasFreePosition = (portfolio.positions ?? []).some(
    (p) =>
      matchesToken(p.token_symbol) &&
      !blockedPools.has(p.pool?.toLowerCase() ?? "")
  );
  const hasIdleBalance = (portfolio.staleBalances ?? []).some(
    (b) =>
      b.chainId === chainId &&
      matchesToken(b.tokenSymbol) &&
      BigInt(b.balance ?? "0") > 0n
  );

  return hasFreePosition || hasIdleBalance ? undefined : blocked[0];
};
