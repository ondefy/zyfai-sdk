/**
 * HTTP Client for API requests
 *
 * Supports two backends:
 * - Execution API (v1): Main Zyfai API for transactions
 * - Data API (v2): DeFi data API for analytics
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from "axios";
import {
  API_ENDPOINTS,
  API_VERSION,
  DATA_API_ENDPOINTS,
  DATA_API_VERSION,
} from "../config/endpoints";
import type { Environment } from "../types";

export class HttpClient {
  private client: AxiosInstance;
  private dataClient: AxiosInstance;
  private apiKey: string;
  private authToken: string | null = null;
  private origin: string;
  private host: string;
  private environment: Environment;

  /**
   * Create HTTP client for both Execution API and Data API
   *
   * @param apiKey - API key for both Execution API and Data API
   * @param environment - 'staging' or 'production'
   */
  constructor(apiKey: string, environment: Environment = "production") {
    this.apiKey = apiKey;
    this.environment = environment;

    // Execution API (v1)
    const endpoint = API_ENDPOINTS[environment];
    const parsedUrl = new URL(endpoint);
    this.origin = parsedUrl.origin;
    this.host = parsedUrl.host;

    this.client = axios.create({
      baseURL: `${endpoint}${API_VERSION}`,
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": this.apiKey,
      },
      timeout: 30000,
    });

    // Data API (v2)
    const dataEndpoint = DATA_API_ENDPOINTS[environment];
    this.dataClient = axios.create({
      baseURL: `${dataEndpoint}${DATA_API_VERSION}`,
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": this.apiKey,
      },
      timeout: 30000,
    });

    this.setupInterceptors();
    this.setupDataInterceptors();
  }

  setAuthToken(token: string) {
    this.authToken = token;
  }

  clearAuthToken() {
    this.authToken = null;
  }

  getOrigin(): string {
    return this.origin;
  }

  getHost(): string {
    return this.host;
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Ensure API key is always present
        config.headers["X-API-Key"] = this.apiKey;
        // Note: Do NOT set Origin header - browsers set it automatically and block manual setting

        // Add auth token if available
        if (this.authToken) {
          config.headers["Authorization"] = `Bearer ${this.authToken}`;
        }

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        // Handle common errors
        if (error.response) {
          const status = error.response.status;
          const data = error.response.data as any;

          switch (status) {
            case 401:
              throw new Error("Unauthorized: Invalid API key");
            case 403:
              throw new Error("Forbidden: Access denied");
            case 404:
              throw new Error(
                `Not found: ${data.message || "Resource not found"}`
              );
            case 429:
              throw new Error("Rate limit exceeded. Please try again later.");
            case 500:
              throw new Error("Internal server error. Please try again later.");
            default:
              throw new Error(data.message || "An error occurred");
          }
        } else if (error.request) {
          throw new Error("Network error: Unable to reach the server");
        } else {
          throw new Error(`Request error: ${error.message}`);
        }
      }
    );
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  async patch<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.client.patch<T>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }

  // Data API methods (v2)
  async dataGet<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.dataClient.get<T>(url, config);
    return response.data;
  }

  async dataPost<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.dataClient.post<T>(url, data, config);
    return response.data;
  }

  /**
   * Make a POST request to Data API with a custom path (bypasses /api/v2 baseURL)
   * Useful for endpoints that don't follow the /api/v2 pattern
   *
   * @param path - API path (e.g., "/api/earnings/initialize")
   * @param data - Request body
   * @param config - Additional axios config
   */
  async dataPostCustom<T>(
    path: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    // Construct full URL using data API endpoint base URL
    const fullUrl = `${DATA_API_ENDPOINTS[this.environment]}${path}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-API-Key": this.apiKey,
      ...(config?.headers as Record<string, string>),
    };

    if (this.authToken) {
      headers["Authorization"] = `Bearer ${this.authToken}`;
    }

    const response = await axios.post<T>(fullUrl, data, {
      ...config,
      headers,
      timeout: config?.timeout || 30000,
    });

    return response.data;
  }

  private setupDataInterceptors() {
    // Request interceptor for data API
    this.dataClient.interceptors.request.use(
      (config) => {
        config.headers["X-API-Key"] = this.apiKey;

        // Forward JWT token if available (required for protected data API endpoints)
        if (this.authToken) {
          config.headers["Authorization"] = `Bearer ${this.authToken}`;
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for data API
    this.dataClient.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response) {
          const status = error.response.status;
          const data = error.response.data as any;

          switch (status) {
            case 401:
              throw new Error("Unauthorized: Invalid API key");
            case 403:
              throw new Error("Forbidden: Access denied to data API");
            case 404:
              throw new Error(
                `Not found: ${
                  data.message || data.error || "Resource not found"
                }`
              );
            case 429:
              throw new Error("Rate limit exceeded. Please try again later.");
            case 500:
              throw new Error(
                data.error || "Internal server error. Please try again later."
              );
            default:
              throw new Error(
                data.message || data.error || "An error occurred"
              );
          }
        } else if (error.request) {
          throw new Error("Network error: Unable to reach the data server");
        } else {
          throw new Error(`Request error: ${error.message}`);
        }
      }
    );
  }
}
