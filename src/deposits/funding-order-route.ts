import type { SwapDepositOrder, SwapDepositParams } from "../types";

const sameText = (left: string | null | undefined, right: string): boolean =>
  typeof left === "string" &&
  left.trim().toLowerCase() === right.trim().toLowerCase();

/** Reject a reused funding order whose stored route differs from this call. */
export const assertStoredFundingOrderRoute = (
  order: Pick<
    SwapDepositOrder,
    | "id"
    | "originChainId"
    | "originCurrency"
    | "destinationChainId"
    | "destinationAsset"
  >,
  requested: Pick<
    SwapDepositParams,
    | "originChainId"
    | "originCurrency"
    | "destinationChainId"
    | "destinationAsset"
  >,
): void => {
  const mismatches: string[] = [];
  if (order.originChainId !== requested.originChainId) {
    mismatches.push(
      `originChainId caller ${requested.originChainId}, stored ${order.originChainId}`,
    );
  }
  if (!sameText(order.originCurrency, requested.originCurrency)) {
    mismatches.push(
      `originCurrency caller ${requested.originCurrency}, stored ${order.originCurrency}`,
    );
  }
  if (order.destinationChainId !== requested.destinationChainId) {
    mismatches.push(
      `destinationChainId caller ${requested.destinationChainId}, stored ${order.destinationChainId}`,
    );
  }
  if (!sameText(order.destinationAsset, requested.destinationAsset)) {
    mismatches.push(
      `destinationAsset caller ${requested.destinationAsset}, stored ${order.destinationAsset}`,
    );
  }
  if (mismatches.length === 0) return;
  throw new Error(
    `Funding order ${order.id} does not match this swap: ${mismatches.join("; ")}`,
  );
};
