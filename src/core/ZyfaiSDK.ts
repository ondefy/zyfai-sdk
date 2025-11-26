/**
 * ZyFAI SDK Main Class
 */

import { HttpClient } from '../utils/http-client';
import { ENDPOINTS } from '../config/endpoints';
import type {
  SDKConfig,
  DeploySafeResponse,
  Address,
} from '../types';
import { Account, PrivateKeyAccount, privateKeyToAccount } from 'viem/accounts';
import { createWalletClient, custom, http } from 'viem';
import { mainnet } from 'viem/chains';

export class ZyfaiSDK {
  private httpClient: HttpClient;
  private signer: PrivateKeyAccount | null = null;
  private browserWallet: any = null;

  constructor(config: SDKConfig | string) {
    // Support both object and string initialization
    const sdkConfig: SDKConfig = typeof config === 'string'
      ? { apiKey: config }
      : config;

    const { apiKey, environment = 'production', baseURL } = sdkConfig;

    if (!apiKey) {
      throw new Error('API key is required');
    }

    this.httpClient = new HttpClient(apiKey, environment, baseURL);
  }

  /**
   * Set up wallet with private key
   */
  setPrivateKey(privateKey: string): void {
    if (!privateKey.startsWith('0x')) {
      privateKey = `0x${privateKey}`;
    }
    this.signer = privateKeyToAccount(privateKey as Address);
  }

  /**
   * Connect to browser wallet (MetaMask, Rabby, etc.)
   */
  async connectBrowserWallet(): Promise<void> {
    if (typeof window === 'undefined') {
      throw new Error('Browser wallet can only be used in browser environment');
    }

    if (!(window as any).ethereum) {
      throw new Error('No browser wallet detected');
    }

    const accounts = await (window as any).ethereum.request({
      method: 'eth_requestAccounts',
    });

    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts found');
    }

    this.browserWallet = createWalletClient({
      account: accounts[0],
      chain: mainnet,
      transport: custom((window as any).ethereum),
    });
  }

  /**
   * Get connected address
   */
  getConnectedAddress(): string {
    if (this.signer) {
      return this.signer.address;
    }
    if (this.browserWallet) {
      return this.browserWallet.account.address;
    }
    throw new Error('No wallet connected. Call setPrivateKey() or connectBrowserWallet() first');
  }

  /**
   * Deploy Safe Smart Wallet
   * 
   * @param userAddress - User's EOA address
   * @param chainId - Target chain ID
   * @returns Deployment response with Safe address and transaction hash
   */
  async deploySafe(
    userAddress: string,
    chainId: number
  ): Promise<DeploySafeResponse> {
    try {
      // First, authenticate the user if needed
      await this.ensureAuthenticated(userAddress);

      // Get user ID from authentication
      const userId = await this.getUserId(userAddress);

      // Update user with smart wallet configuration
      // Note: In the actual implementation, this would:
      // 1. Generate deterministic Safe address
      // 2. Deploy the Safe (counterfactual or actual deployment)
      // 3. Return the deployment details

      const response = await this.httpClient.patch<any>(
        ENDPOINTS.USERS_BY_ID(userId),
        {
          smartWallet: userAddress, // This should be the calculated Safe address
          chains: [chainId],
          strategy: 'safe_strategy',
        }
      );

      // For now, returning mock response structure
      // In full implementation, this would include actual Safe deployment
      return {
        success: true,
        safeAddress: response.smartWallet || userAddress,
        txHash: '0x' + '0'.repeat(64), // Mock tx hash
        status: 'deployed',
      };
    } catch (error) {
      throw new Error(`Failed to deploy Safe: ${(error as Error).message}`);
    }
  }

  /**
   * Ensure user is authenticated with the API
   * @private
   */
  private async ensureAuthenticated(userAddress: string): Promise<void> {
    try {
      await this.httpClient.post('/auth/signin', {
        address: userAddress,
      });
    } catch (error) {
      throw new Error(`Authentication failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get user ID from address
   * @private
   */
  private async getUserId(userAddress: string): Promise<string> {
    // This would be stored from the signin response
    // For now, returning a placeholder
    // In full implementation, store this after signin
    return 'user-id-placeholder';
  }

  // Additional methods will be implemented here
  // - createSessionKey()
  // - getSmartWalletAddress()
  // - depositFunds()
  // - getAvailableProtocols()
  // - getPositions()
  // - getEarnings()
  // - withdrawFunds()
}

