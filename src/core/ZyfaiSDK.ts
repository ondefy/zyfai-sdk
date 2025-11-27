/**
 * ZyFAI SDK Main Class
 */

import { HttpClient } from "../utils/http-client";
import { ENDPOINTS } from "../config/endpoints";
import type {
  SDKConfig,
  DeploySafeResponse,
  Address,
  SmartWalletResponse,
  Hex,
  Session,
  SessionKeyResponse,
} from "../types";
import { PrivateKeyAccount, privateKeyToAccount } from "viem/accounts";
import {
  createWalletClient,
  custom,
  http,
  type WalletClient,
  type PublicClient,
} from "viem";
import {
  getChainConfig,
  getBundlerUrl,
  isSupportedChain,
  type SupportedChainId,
} from "../config/chains";
import {
  deploySafeAccount,
  getDeterministicSafeAddress,
  getAccountType,
  isSafeDeployed,
  signSessionKey,
} from "../utils/safe-account";

export class ZyfaiSDK {
  private httpClient: HttpClient;
  private signer: PrivateKeyAccount | null = null;
  private walletClient: WalletClient | null = null;
  private bundlerApiKey?: string;

  constructor(config: SDKConfig | string) {
    // Support both object and string initialization
    const sdkConfig: SDKConfig =
      typeof config === "string" ? { apiKey: config } : config;

    const {
      apiKey,
      environment = "production",
      baseURL,
      bundlerApiKey,
    } = sdkConfig;

    if (!apiKey) {
      throw new Error("API key is required");
    }

    this.httpClient = new HttpClient(apiKey, environment, baseURL);
    this.bundlerApiKey = bundlerApiKey;
  }

  /**
   * Connect account for signing transactions
   * Accepts either a private key string or a modern wallet provider
   *
   * @param account - Private key string or wallet provider object
   * @param chainId - Target chain ID (default: 42161 - Arbitrum)
   * @returns The connected EOA address
   *
   * @example
   * // With private key
   * await sdk.connectAccount('0x...');
   *
   * @example
   * // With wallet provider (e.g., from wagmi, web3-react, etc.)
   * const provider = await connector.getProvider();
   * await sdk.connectAccount(provider);
   */
  async connectAccount(
    account: string | any,
    chainId: SupportedChainId = 42161 as SupportedChainId
  ): Promise<Address> {
    if (!isSupportedChain(chainId)) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }

    const chainConfig = getChainConfig(chainId, undefined);

    // Check if account is a private key (string)
    if (typeof account === "string") {
      let privateKey = account;
      if (!privateKey.startsWith("0x")) {
        privateKey = `0x${privateKey}`;
      }

      this.signer = privateKeyToAccount(privateKey as Hex);

      // Create wallet client for the signer
      this.walletClient = createWalletClient({
        account: this.signer,
        chain: chainConfig.chain,
        transport: http(chainConfig.rpcUrl),
      });

      return this.signer.address;
    }

    // Otherwise, treat as a wallet provider
    const provider = account;

    if (!provider) {
      throw new Error(
        "Invalid account parameter. Expected private key string or wallet provider."
      );
    }

    // Handle modern wallet providers (EIP-1193 providers)
    if (provider.request) {
      const accounts = await provider.request({
        method: "eth_requestAccounts",
      });

      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts found in wallet provider");
      }

      this.walletClient = createWalletClient({
        account: accounts[0],
        chain: chainConfig.chain,
        transport: custom(provider),
      });

      return accounts[0];
    }

    // Handle viem WalletClient or similar objects
    if (provider.account && provider.transport) {
      this.walletClient = createWalletClient({
        account: provider.account,
        chain: chainConfig.chain,
        transport: provider.transport,
      });

      return provider.account.address;
    }

    throw new Error(
      "Invalid wallet provider. Expected EIP-1193 provider or viem WalletClient."
    );
  }

  /**
   * Get wallet client (throws if not connected)
   * @private
   */
  private getWalletClient(): WalletClient {
    if (!this.walletClient) {
      throw new Error("No account connected. Call connectAccount() first");
    }
    return this.walletClient;
  }

  /**
   * Get smart wallet address for a user
   * Returns the deterministic Safe address for an EOA, or the address itself if already a Safe
   *
   * @param userAddress - User's EOA address
   * @param chainId - Target chain ID
   * @returns Smart wallet information including address and deployment status
   */
  async getSmartWalletAddress(
    userAddress: string,
    chainId: SupportedChainId
  ): Promise<SmartWalletResponse> {
    // Validate inputs
    if (!userAddress) {
      throw new Error("User address is required");
    }

    if (!isSupportedChain(chainId)) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }

    const walletClient = this.getWalletClient();
    const chainConfig = getChainConfig(chainId, undefined);

    // Check account type
    const accountType = await getAccountType(
      userAddress as Address,
      chainConfig.publicClient
    );

    if (accountType === "Safe") {
      // If already a Safe, return the user address
      const isDeployed = await isSafeDeployed(
        userAddress as Address,
        chainConfig.publicClient
      );
      return {
        address: userAddress as Address,
        isDeployed,
      };
    }

    // For EOA, get the deterministic Safe address
    // Note: Safe will be owned by userAddress, not the connected wallet
    const safeAddress = await getDeterministicSafeAddress({
      owner: walletClient,
      safeOwnerAddress: userAddress as Address,
      chain: chainConfig.chain,
      publicClient: chainConfig.publicClient,
    });

    const isDeployed = await isSafeDeployed(
      safeAddress,
      chainConfig.publicClient
    );

    return {
      address: safeAddress,
      isDeployed,
    };
  }

  /**
   * Deploy Safe Smart Wallet for a user
   *
   * @param userAddress - User's EOA address (the connected EOA, not the smart wallet address)
   * @param chainId - Target chain ID
   * @returns Deployment response with Safe address and transaction hash
   */
  async deploySafe(
    userAddress: string,
    chainId: SupportedChainId
  ): Promise<DeploySafeResponse> {
    try {
      // Validate inputs
      if (!userAddress) {
        throw new Error("User address is required");
      }

      if (!isSupportedChain(chainId)) {
        throw new Error(`Unsupported chain ID: ${chainId}`);
      }

      if (!this.bundlerApiKey) {
        throw new Error(
          "Bundler API key is required for Safe deployment. Please provide bundlerApiKey in SDK configuration."
        );
      }

      const walletClient = this.getWalletClient();
      const chainConfig = getChainConfig(chainId, undefined);

      // Verify that userAddress is an EOA
      const accountType = await getAccountType(
        userAddress as Address,
        chainConfig.publicClient
      );

      if (accountType !== "EOA") {
        throw new Error(
          `Address ${userAddress} is not an EOA. Only EOA addresses can deploy Safe smart wallets.`
        );
      }

      // Get bundler URL
      const bundlerUrl = getBundlerUrl(chainId, this.bundlerApiKey);

      // Deploy the Safe account
      const deploymentResult = await deploySafeAccount({
        owner: walletClient,
        safeOwnerAddress: userAddress as Address,
        chain: chainConfig.chain,
        publicClient: chainConfig.publicClient,
        bundlerUrl,
      });

      return {
        success: true,
        safeAddress: deploymentResult.safeAddress,
        txHash: deploymentResult.txHash || "0x0",
        status: "deployed",
      };
    } catch (error) {
      console.error("Safe deployment failed:", error);
      throw new Error(`Safe deployment failed: ${(error as Error).message}`);
    }
  }

  /**
   * Create session key for delegated transactions
   * This allows a session key to execute transactions on behalf of the Safe
   *
   * @param userAddress - User's EOA or Safe address
   * @param chainId - Target chain ID
   * @param sessions - Session configurations (permissions, targets, policies)
   * @returns Session key response with signature and nonces
   *
   * @example
   * ```typescript
   * import { type Session } from "@zyfai/sdk";
   *
   * // Define session permissions
   * const sessions: Session[] = [{
   *   sessionValidator: "0x...", // Session key validator address
   *   sessionValidatorInitData: "0x...",
   *   salt: "0x...",
   *   userOpPolicies: [],
   *   erc7739Policies: {
   *     allowedERC7739Content: [],
   *     erc1271Policies: []
   *   },
   *   actions: [{
   *     actionTarget: "0xTokenAddress",
   *     actionTargetSelector: "0xa9059cbb", // transfer(address,uint256)
   *     actionPolicies: []
   *   }],
   *   permitERC4337Paymaster: true,
   *   chainId: BigInt(8453)
   * }];
   *
   * const result = await sdk.createSessionKey(userAddress, 8453, sessions);
   * ```
   */
  async createSessionKey(
    userAddress: string,
    chainId: SupportedChainId,
    sessions: Session[]
  ): Promise<SessionKeyResponse> {
    try {
      // Validate inputs
      if (!userAddress) {
        throw new Error("User address is required");
      }

      if (!isSupportedChain(chainId)) {
        throw new Error(`Unsupported chain ID: ${chainId}`);
      }

      if (!sessions || sessions.length === 0) {
        throw new Error("At least one session configuration is required");
      }

      const walletClient = this.getWalletClient();
      const chainConfig = getChainConfig(chainId, undefined);

      // Check if the user address is a Safe
      const accountType = await getAccountType(
        userAddress as Address,
        chainConfig.publicClient
      );

      if (accountType !== "Safe" && accountType !== "EOA") {
        throw new Error(
          `Invalid account type for ${userAddress}. Must be a Safe or EOA.`
        );
      }

      // Sign the session key
      const { signature, sessionNonces } = await signSessionKey(
        {
          owner: walletClient,
          safeOwnerAddress: userAddress as Address,
          chain: chainConfig.chain,
          publicClient: chainConfig.publicClient,
        },
        sessions
      );

      // Get the Safe address
      const safeAddress =
        accountType === "Safe"
          ? (userAddress as Address)
          : await getDeterministicSafeAddress({
              owner: walletClient,
              safeOwnerAddress: userAddress as Address,
              chain: chainConfig.chain,
              publicClient: chainConfig.publicClient,
            });

      return {
        success: true,
        sessionKeyAddress: safeAddress,
        signature,
        sessionNonces,
      };
    } catch (error) {
      throw new Error(
        `Failed to create session key: ${(error as Error).message}`
      );
    }
  }
}
