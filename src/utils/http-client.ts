/**
 * HTTP Client for API requests
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import { API_ENDPOINTS, API_VERSION } from '../config/endpoints';
import type { Environment } from '../types';

export class HttpClient {
  private client: AxiosInstance;
  private apiKey: string;

  constructor(apiKey: string, environment: Environment = 'production', baseURL?: string) {
    this.apiKey = apiKey;

    const url = baseURL || API_ENDPOINTS[environment];

    this.client = axios.create({
      baseURL: `${url}${API_VERSION}`,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      timeout: 30000,
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Ensure API key is always present
        config.headers['X-API-Key'] = this.apiKey;
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
              throw new Error('Unauthorized: Invalid API key');
            case 403:
              throw new Error('Forbidden: Access denied');
            case 404:
              throw new Error(`Not found: ${data.message || 'Resource not found'}`);
            case 429:
              throw new Error('Rate limit exceeded. Please try again later.');
            case 500:
              throw new Error('Internal server error. Please try again later.');
            default:
              throw new Error(data.message || 'An error occurred');
          }
        } else if (error.request) {
          throw new Error('Network error: Unable to reach the server');
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

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch<T>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }
}

