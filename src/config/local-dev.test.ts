import { describe, expect, it, afterEach } from "vitest";
import {
  EXECUTION_API_BASE_URLS,
} from "./endpoints";
import {
  isLocalExecutionApiUrl,
  isStagingExecutionApiUrl,
  shouldBypassMinPortfolioCheck,
} from "./local-dev";

describe("local execution helpers", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });

  it("detects localhost execution API URLs", () => {
    expect(isLocalExecutionApiUrl("http://localhost:3000")).toBe(true);
    expect(isLocalExecutionApiUrl("http://127.0.0.1:3000")).toBe(true);
    expect(isLocalExecutionApiUrl("https://api.zyf.ai")).toBe(false);
  });

  it("detects staging execution API URLs", () => {
    expect(isStagingExecutionApiUrl(EXECUTION_API_BASE_URLS.staging)).toBe(true);
    expect(isStagingExecutionApiUrl("https://staging-api.zyf.ai")).toBe(true);
    expect(isStagingExecutionApiUrl("https://api.zyf.ai")).toBe(false);
  });

  it("bypasses min portfolio checks for local API when NODE_ENV is not production", () => {
    process.env.NODE_ENV = "test";
    expect(shouldBypassMinPortfolioCheck("http://localhost:3000")).toBe(true);
    expect(shouldBypassMinPortfolioCheck("https://api.zyf.ai")).toBe(false);
  });

  it("bypasses min portfolio checks for staging API when NODE_ENV is not production", () => {
    process.env.NODE_ENV = "test";
    expect(
      shouldBypassMinPortfolioCheck(EXECUTION_API_BASE_URLS.staging),
    ).toBe(true);
    expect(shouldBypassMinPortfolioCheck("https://api.zyf.ai")).toBe(false);
  });

  it("never bypasses when NODE_ENV is production", () => {
    process.env.NODE_ENV = "production";
    expect(shouldBypassMinPortfolioCheck("http://localhost:3000")).toBe(false);
    expect(
      shouldBypassMinPortfolioCheck(EXECUTION_API_BASE_URLS.staging),
    ).toBe(false);
    expect(shouldBypassMinPortfolioCheck("https://api.zyf.ai")).toBe(false);
  });
});
