import { describe, expect, it } from "vitest";
import { DATA_ENDPOINTS } from "./endpoints";

describe("opportunity endpoints", () => {
  it("requests live pools when status is omitted", () => {
    expect(DATA_ENDPOINTS.OPPORTUNITIES_SAFE()).toBe(
      "/opportunities/safe?status=live",
    );
    expect(DATA_ENDPOINTS.OPPORTUNITIES_DEGEN(8453, "USDC")).toBe(
      "/opportunities/degen-strategies?chainId=8453&asset=USDC&status=live",
    );
    expect(DATA_ENDPOINTS.OPPORTUNITIES_ASYNC(8453)).toBe(
      "/opportunities/async?chainId=8453&status=live",
    );
  });

  it("keeps an explicit not_live filter", () => {
    expect(DATA_ENDPOINTS.OPPORTUNITIES_SAFE(1, "WETH", "not_live")).toBe(
      "/opportunities/safe?chainId=1&asset=WETH&status=not_live",
    );
  });
});
