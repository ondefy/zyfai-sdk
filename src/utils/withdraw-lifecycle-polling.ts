import type { WithdrawLifecycleStatus } from "../types";

/** Terminal statuses for {@link ZyfaiSDK.waitForWithdrawSettlement} (short poll / resume). */
export function isWithdrawSettlementTerminal(
  status: WithdrawLifecycleStatus,
): boolean {
  return (
    status === "completed" ||
    status === "async_cooldown" ||
    status === "async_claiming"
  );
}
