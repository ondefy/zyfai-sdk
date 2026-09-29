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

/** True when the SDK execution API base URL points at staging zyfai-api. */
export function isStagingExecutionApiUrl(executionApiUrl: string): boolean {
  if (executionApiUrl === EXECUTION_API_BASE_URLS.staging) {
    return true;
  }
  try {
    const { hostname } = new URL(executionApiUrl);
    return hostname === "staging-api.zyf.ai";
  } catch {
    return false;
  }
}

/**
 * Skip client-side `MIN_PORTFOLIO_*` checks (sendDeposit / buildDepositTransfer).
 *
 * When targeting local or staging execution API and `NODE_ENV` is not `production`
 * (Vitest sets `test`; local `pnpm dev` / examples typically use `development`).
 * Production API URL always enforces client-side minimums.
 */
export function shouldBypassMinPortfolioCheck(executionApiUrl: string): boolean {
  if (process.env.NODE_ENV === "production") {
    return false;
  }
  return (
    isLocalExecutionApiUrl(executionApiUrl) ||
    isStagingExecutionApiUrl(executionApiUrl)
  );
}
