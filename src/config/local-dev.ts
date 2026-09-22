import { EXECUTION_API_BASE_URLS } from "./endpoints";

/** True when the SDK execution API base URL points at a local zyfai-api stack. */
export function isLocalExecutionApiUrl(executionApiUrl: string): boolean {
  if (executionApiUrl === EXECUTION_API_BASE_URLS.local) {
    return true;
  }
  try {
    const { hostname } = new URL(executionApiUrl);
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

/**
 * Skip client-side `MIN_PORTFOLIO_*` checks (sendDeposit / buildDepositTransfer).
 *
 * Only when targeting a local execution API and `NODE_ENV` is not `production`
 * (Vitest sets `test`; local `pnpm dev` / examples typically use `development`).
 */
export function shouldBypassMinPortfolioCheck(executionApiUrl: string): boolean {
  if (process.env.NODE_ENV === "production") {
    return false;
  }
  return isLocalExecutionApiUrl(executionApiUrl);
}
