/**
 * ZyFAI SDK Main Class
 */

import { HttpClient } from "../utils/http-client";
import { ENDPOINTS } from "../config/endpoints";
import { ERC20_ABI } from "../config/abis";
import type {
  SDKConfig,
  DeploySafeResponse,
  Address,
  SmartWalletResponse,
  Hex,
  Session,
  SessionKeyResponse,
  DepositResponse,
  WithdrawResponse,
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
   * Create session key with auto-fetched configuration from ZyFAI API
   * This is the simplified method that automatically fetches session configuration
   *
   * @param userAddress - User's EOA or Safe address
   * @param chainId - Target chain ID
   * @returns Session key response with signature and nonces
   *
   * @example
   * ```typescript
   * // Simple usage - no need to configure sessions manually
   * const result = await sdk.createSessionKey(userAddress, 8453);
   * console.log("Session created:", result.signature);
   * ```
   */
  async createSessionKey(
    userAddress: string,
    chainId: SupportedChainId
  ): Promise<SessionKeyResponse> {
    try {
      // Fetch session configuration from API
      const sessionConfig = await this.httpClient.get<any[]>(
        ENDPOINTS.SESSION_KEYS_CONFIG
      );

      if (!sessionConfig || sessionConfig.length === 0) {
        throw new Error("No session configuration available from API");
      }

      // Parse the session config (convert chainId to BigInt)
      const sessions: Session[] = sessionConfig.map((session: any) => ({
        ...session,
        chainId: BigInt(session.chainId),
      }));

      // Sign the session key
      return await this.signSessionKey(userAddress, chainId, sessions);
    } catch (error) {
      throw new Error(
        `Failed to create session key: ${(error as Error).message}`
      );
    }
  }

  /**
   * Create session key with manual session configuration
   * Use this method if you need custom session permissions
   *
   * @param userAddress - User's EOA or Safe address
   * @param chainId - Target chain ID
   * @param sessions - Custom session configurations (permissions, targets, policies)
   * @returns Session key response with signature and nonces
   *
   * @example
   * ```typescript
   * import { type Session } from "@zyfai/sdk";
   *
   * // Define custom session permissions
   * const sessions: Session[] = [{
   *   sessionValidator: "0x...",
   *   sessionValidatorInitData: "0x...",
   *   salt: "0x...",
   *   userOpPolicies: [],
   *   erc7739Policies: {
   *     allowedERC7739Content: [],
   *     erc1271Policies: []
   *   },
   *   actions: [{
   *     actionTarget: "0xTokenAddress",
   *     actionTargetSelector: "0xa9059cbb",
   *     actionPolicies: []
   *   }],
   *   permitERC4337Paymaster: true,
   *   chainId: BigInt(8453)
   * }];
   *
   * const result = await sdk.createSessionKeyWithConfig(userAddress, 8453, sessions);
   * ```
   */
  async createSessionKeyWithConfig(
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

      return await this.signSessionKey(userAddress, chainId, sessions);
    } catch (error) {
      throw new Error(
        `Failed to create session key with config: ${(error as Error).message}`
      );
    }
  }

  /**
   * Internal method to sign session key
   * @private
   */
  private async signSessionKey(
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
        `Failed to sign session key: ${(error as Error).message}`
      );
    }
  }

  /**
   * Deposit funds from EOA to Safe smart wallet
   * Transfers tokens from the connected wallet to the user's Safe and logs the deposit
   *
   * @param userAddress - User's address (owner of the Safe)
   * @param chainId - Target chain ID
   * @param tokenAddress - Token contract address to deposit
   * @param amount - Amount in least decimal units (e.g., "100000000" for 100 USDC with 6 decimals)
   * @returns Deposit response with transaction hash
   *
   * @example
   * ```typescript
   * // Deposit 100 USDC (6 decimals) to Safe on Arbitrum
   * const result = await sdk.depositFunds(
   *   "0xUser...",
   *   42161,
   *   "0xaf88d065e77c8cc2239327c5edb3a432268e5831", // USDC
   *   "100000000" // 100 USDC = 100 * 10^6
   * );
   * ```
   */
  async depositFunds(
    userAddress: string,
    chainId: SupportedChainId,
    tokenAddress: string,
    amount: string
  ): Promise<DepositResponse> {
    try {
      if (!userAddress) {
        throw new Error("User address is required");
      }

      if (!isSupportedChain(chainId)) {
        throw new Error(`Unsupported chain ID: ${chainId}`);
      }

      if (!tokenAddress) {
        throw new Error("Token address is required");
      }

      if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
        throw new Error("Valid amount is required");
      }

      const walletClient = this.getWalletClient();
      const chainConfig = getChainConfig(chainId, undefined);

      // Get Safe address
      const safeAddress = await getDeterministicSafeAddress({
        owner: walletClient,
        safeOwnerAddress: userAddress as Address,
        chain: chainConfig.chain,
        publicClient: chainConfig.publicClient,
      });

      // Check if Safe is deployed
      const isDeployed = await isSafeDeployed(
        safeAddress,
        chainConfig.publicClient
      );

      if (!isDeployed) {
        throw new Error(
          `Safe not deployed for ${userAddress}. Please deploy the Safe first using deploySafe().`
        );
      }

      // Convert amount string to BigInt (amount is already in least decimal units)
      const amountBigInt = BigInt(amount);

      // Transfer tokens from connected wallet to Safe
      const txHash = await walletClient.writeContract({
        address: tokenAddress as Address,
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [safeAddress, amountBigInt],
        chain: chainConfig.chain,
        account: walletClient.account!,
      });

      // Wait for transaction confirmation
      const receipt = await chainConfig.publicClient.waitForTransactionReceipt({
        hash: txHash,
      });

      if (receipt.status !== "success") {
        throw new Error("Deposit transaction failed");
      }

      // Log deposit to ZyFAI API
      await this.httpClient.post(ENDPOINTS.LOG_DEPOSIT, {
        amount: amountBigInt.toString(),
        chainId,
        transaction: txHash,
        token: tokenAddress,
      });

      return {
        success: true,
        txHash,
        smartWallet: safeAddress,
        amount: amountBigInt.toString(),
        status: "confirmed",
      };
    } catch (error) {
      throw new Error(`Deposit failed: ${(error as Error).message}`);
    }
  }

  /**
   * Withdraw funds from Safe smart wallet
   * Triggers a withdrawal request to the ZyFAI API
   *
   * @param userAddress - User's address (owner of the Safe)
   * @param chainId - Target chain ID
   * @param amount - Optional: Amount in least decimal units to withdraw (partial withdrawal). If not specified, withdraws all funds
   * @param receiver - Optional: Receiver address. If not specified, sends to Safe owner
   * @returns Withdraw response with transaction hash
   *
   * @example
   * ```typescript
   * // Full withdrawal
   * const result = await sdk.withdrawFunds("0xUser...", 42161);
   *
   * // Partial withdrawal of 50 USDC (6 decimals)
   * const result = await sdk.withdrawFunds(
   *   "0xUser...",
   *   42161,
   *   "50000000", // 50 USDC = 50 * 10^6
   *   "0xReceiver..."
   * );
   * ```
   */
  async withdrawFunds(
    userAddress: string,
    chainId: SupportedChainId,
    amount?: string,
    receiver?: string
  ): Promise<WithdrawResponse> {
    try {
      if (!userAddress) {
        throw new Error("User address is required");
      }

      if (!isSupportedChain(chainId)) {
        throw new Error(`Unsupported chain ID: ${chainId}`);
      }

      const walletClient = this.getWalletClient();
      const chainConfig = getChainConfig(chainId, undefined);

      // Get Safe address
      const safeAddress = await getDeterministicSafeAddress({
        owner: walletClient,
        safeOwnerAddress: userAddress as Address,
        chain: chainConfig.chain,
        publicClient: chainConfig.publicClient,
      });

      // Check if Safe is deployed
      const isDeployed = await isSafeDeployed(
        safeAddress,
        chainConfig.publicClient
      );

      if (!isDeployed) {
        throw new Error(
          `Safe not deployed for ${userAddress}. Please deploy the Safe first using deploySafe().`
        );
      }

      let response: any;

      if (amount) {
        // Partial withdrawal
        response = await this.httpClient.post(ENDPOINTS.PARTIAL_WITHDRAW, {
          chainId,
          amount,
          receiver: receiver || userAddress,
        });
      } else {
        // Full withdrawal
        response = await this.httpClient.get(ENDPOINTS.MANUAL_WITHDRAW);
      }

      return {
        success: true,
        txHash: (response?.txHash ||
          response?.transactionHash ||
          "pending") as string,
        type: amount ? "partial" : "full",
        amount: amount || "all",
        receiver: receiver || userAddress,
        status: "pending",
      };
    } catch (error) {
      throw new Error(`Withdrawal failed: ${(error as Error).message}`);
    }
  }
}
