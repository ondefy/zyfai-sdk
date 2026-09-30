import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AxiosInstance, InternalAxiosRequestConfig } from "axios";

let executionRequestOnFulfilled:
  | ((config: InternalAxiosRequestConfig) => InternalAxiosRequestConfig)
  | undefined;

let axiosCreateCallCount = 0;

const mockExecutionClient = {
  interceptors: {
    request: {
      use: vi.fn(
        (
          onFulfilled: (
            config: InternalAxiosRequestConfig,
          ) => InternalAxiosRequestConfig,
        ) => {
          executionRequestOnFulfilled = onFulfilled;
        },
      ),
    },
    response: { use: vi.fn() },
  },
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
} as unknown as AxiosInstance;

const mockDataClient = {
  interceptors: {
    request: { use: vi.fn() },
    response: { use: vi.fn() },
  },
  get: vi.fn(),
  post: vi.fn(),
} as unknown as AxiosInstance;

vi.mock("axios", () => ({
  default: {
    create: vi.fn(() => {
      axiosCreateCallCount += 1;
      return axiosCreateCallCount % 2 === 1
        ? mockExecutionClient
        : mockDataClient;
    }),
    post: vi.fn(),
  },
}));

import { HttpClient } from "./http-client";

function runExecutionRequestInterceptor(
  config: InternalAxiosRequestConfig,
): InternalAxiosRequestConfig {
  if (!executionRequestOnFulfilled) {
    throw new Error("execution request interceptor not registered");
  }
  return executionRequestOnFulfilled(config);
}

describe("HttpClient execution request headers", () => {
  beforeEach(() => {
    executionRequestOnFulfilled = undefined;
    axiosCreateCallCount = 0;
  });

  it("does not set Authorization when no auth token is configured", () => {
    new HttpClient("partner-key", {
      executionApiUrl: "http://localhost:3000",
      dataApiUrl: "http://localhost:3001",
    });

    const config = runExecutionRequestInterceptor({
      headers: {} as InternalAxiosRequestConfig["headers"],
    });

    expect(config.headers?.Authorization).toBeUndefined();
    expect(config.headers?.["X-API-Key"]).toBe("partner-key");
  });

  it("sets Authorization Bearer when setAuthToken was called", () => {
    const client = new HttpClient("partner-key", {
      executionApiUrl: "http://localhost:3000",
      dataApiUrl: "http://localhost:3001",
    });
    client.setAuthToken("jwt-token-abc");

    const config = runExecutionRequestInterceptor({
      headers: {} as InternalAxiosRequestConfig["headers"],
    });

    expect(config.headers?.Authorization).toBe("Bearer jwt-token-abc");
  });

  it("merges extra execution headers from setExtraExecutionHeaders", () => {
    const client = new HttpClient("partner-key", {
      executionApiUrl: "http://localhost:3000",
      dataApiUrl: "http://localhost:3001",
    });
    client.setAuthToken("jwt-token-abc");
    client.setExtraExecutionHeaders({ "X-Agent-Channel": "mcp-server" });

    const config = runExecutionRequestInterceptor({
      headers: {} as InternalAxiosRequestConfig["headers"],
    });

    expect(config.headers?.Authorization).toBe("Bearer jwt-token-abc");
    expect(config.headers?.["X-Agent-Channel"]).toBe("mcp-server");
  });

  it("reports hasAuthToken after set and clear", () => {
    const client = new HttpClient("partner-key");
    expect(client.hasAuthToken()).toBe(false);
    client.setAuthToken("t");
    expect(client.hasAuthToken()).toBe(true);
    client.clearAuthToken();
    expect(client.hasAuthToken()).toBe(false);
  });
});
