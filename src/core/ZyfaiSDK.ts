/**
 * ZyFAI SDK Main Class
 */

import { HttpClient } from "../utils/http-client";
import { ENDPOINTS, DATA_ENDPOINTS } from "../config/endpoints";
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
  ProtocolsResponse,
  PositionsResponse,
  UpdateUserProfileRequest,
  UpdateUserProfileResponse,
  LoginResponse,
  AddSessionKeyRequest,
  AddSessionKeyResponse,
  Environment,
  UserDetailsResponse,
  TVLResponse,
  VolumeResponse,
  ActiveWalletsResponse,
  SmartWalletByEOAResponse,
  FirstTopupResponse,
  HistoryResponse,
  OnchainEarningsResponse,
  DailyEarningsResponse,
  DebankPortfolioResponse,
  OpportunitiesResponse,
  DailyApyHistoryResponse,
  RebalanceInfoResponse,
  RebalanceFrequencyResponse,
} from "../types";
import { PrivateKeyAccount, privateKeyToAccount } from "viem/accounts";
import {
  createWalletClient,
  custom,
  http,
  getAddress,
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
import { SiweMessage } from "siwe";
import { API_ENDPOINTS } from "../config/endpoints";

export class ZyfaiSDK {
  private httpClient: HttpClient;
  private signer: PrivateKeyAccount | null = null;
  private walletClient: WalletClient | null = null;
  private bundlerApiKey?: string;
  private isAuthenticated: boolean = false;
  private authenticatedUserId: string | null = null; // Stored from login response
  private hasActiveSessionKey: boolean = false; // Stored from login response
  private environment: Environment; // TODO: The environment should be removed. Having the same key for staging and production is not ideal, but for now it's fine.

  constructor(config: SDKConfig | string) {
    // Support both object and string initialization
    const sdkConfig: SDKConfig =
      typeof config === "string" ? { apiKey: config } : config;

    const { apiKey, dataApiKey, environment, bundlerApiKey } = sdkConfig;

    if (!apiKey) {
      throw new Error("API key is required");
    }

    this.environment = environment || "production";
    this.httpClient = new HttpClient(apiKey, this.environment, dataApiKey);
    this.bundlerApiKey = bundlerApiKey;
  }

  /**
   * Authenticate user with SIWE (Sign-In with Ethereum) & JWT token
   * This is required for accessing user-specific endpoints like session-keys/config
   * Uses the connected wallet address for authentication
   *
   * @returns Promise that resolves when authentication is complete
   */
  private async authenticateUser(): Promise<void> {
    try {
      // Skip if already authenticated
      if (this.isAuthenticated) {
        return;
      }

      const walletClient = this.getWalletClient();
      // Ensure address is EIP-55 checksummed (required by SIWE)
      const userAddress = getAddress(walletClient.account!.address);
      const chainId = walletClient.chain?.id || 8453; // Default to Base

      // Step 1: Get challenge/nonce
      const challengeResponse = await this.httpClient.post<{
        nonce: string;
      }>(ENDPOINTS.AUTH_CHALLENGE, {});

      // Step 2: Create SIWE message object
      // IMPORTANT: In browser contexts, use the frontend's origin (window.location.origin)
      // because the browser automatically sets the Origin header to the frontend's origin,
      // and the API validates that message.uri matches the Origin header.
      // In Node.js contexts (no window), fall back to API endpoint.
      let uri: string;
      let domain: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const globalWindow =
        typeof globalThis !== "undefined"
          ? (globalThis as any).window
          : undefined;
      if (globalWindow?.location?.origin) {
        uri = globalWindow.location.origin;
        domain = globalWindow.location.host;
      } else {
        uri = API_ENDPOINTS[this.environment];
        domain = API_ENDPOINTS[this.environment].split("//")[1];
      }

      const messageObj = new SiweMessage({
        address: userAddress,
        chainId: chainId,
        domain: domain,
        nonce: challengeResponse.nonce,
        statement: "Sign in with Ethereum",
        uri: uri,
        version: "1",
        issuedAt: new Date().toISOString(),
      });

      // Step 3: Create the message string for signing
      const messageString = messageObj.prepareMessage();

      // Step 4: Sign the message
      const signature = await walletClient.signMessage({
        account: walletClient.account!,
        message: messageString,
      });

      // Step 5: Login with message object (not string) and signature
      const loginResponse = await this.httpClient.post<LoginResponse>(
        ENDPOINTS.AUTH_LOGIN,
        {
          message: messageObj,
          signature,
        }
      );
      const authToken = loginResponse.accessToken || loginResponse.token;

      if (!authToken) {
        throw new Error("Authentication response missing access token");
      }

      // Step 6: Store auth token, userId, and session key status
      this.httpClient.setAuthToken(authToken);
      this.authenticatedUserId = loginResponse.userId || null;
      this.hasActiveSessionKey = loginResponse.hasActiveSessionKey || false;
      this.isAuthenticated = true;
    } catch (error) {
      throw new Error(
        `Failed to authenticate user: ${(error as Error).message}`
      );
    }
  }

  /**
   * Update user profile with Smart Wallet address and chain configuration
   * This method requires SIWE authentication and is automatically called after deploySafe
   *
   * @param request - User profile update data
   * @returns Updated user profile information
   *
   * @example
   * ```typescript
   * await sdk.updateUserProfile({
   *   smartWallet: "0x1396730...",
   *   chains: [8453, 42161],
   * });
   * ```
   */
  async updateUserProfile(
    request: UpdateUserProfileRequest
  ): Promise<UpdateUserProfileResponse> {
    try {
      // Authenticate user first to get JWT token
      await this.authenticateUser();

      // Update user profile via API
      const response = await this.httpClient.patch<any>(
        ENDPOINTS.USER_ME,
        request
      );

      return {
        success: true,
        userId: response.userId || response.id,
        smartWallet: response.smartWallet,
        chains: response.chains,
      };
    } catch (error) {
      throw new Error(
        `Failed to update user profile: ${(error as Error).message}`
      );
    }
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

    // Reset authentication when connecting a new account
    this.isAuthenticated = false;
    this.httpClient.clearAuthToken();

    const chainConfig = getChainConfig(chainId);

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
  private getWalletClient(chainId?: SupportedChainId): WalletClient {
    if (this.signer) {
      return createWalletClient({
        account: this.signer,
        chain: getChainConfig(chainId || 8453).chain,
        transport: http(getChainConfig(chainId || 8453).rpcUrl),
      });
    } else {
      if (!this.walletClient) {
        throw new Error("No account connected. Call connectAccount() first");
      }
      return this.walletClient;
    }
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
    const chainConfig = getChainConfig(chainId);

    // For EOA, get the deterministic Safe address
    // Note: Safe will be owned by userAddress, not the connected wallet
    const safeAddress = await getDeterministicSafeAddress({
      owner: walletClient,
      safeOwnerAddress: userAddress as Address,
      chain: chainConfig.chain,
      publicClient: chainConfig.publicClient,
      environment: this.environment,
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

      const walletClient = this.getWalletClient(chainId);
      const chainConfig = getChainConfig(chainId);

      // Check if Safe is already deployed before attempting deployment
      const safeAddress = await getDeterministicSafeAddress({
        owner: walletClient,
        safeOwnerAddress: userAddress as Address,
        chain: chainConfig.chain,
        publicClient: chainConfig.publicClient,
        environment: this.environment,
      });

      const alreadyDeployed = await isSafeDeployed(
        safeAddress,
        chainConfig.publicClient
      );

      if (alreadyDeployed) {
        // Safe already exists - return success without redeploying
        return {
          success: true,
          safeAddress,
          txHash: "0x0",
          status: "deployed",
          alreadyDeployed: true,
        };
      }

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
        environment: this.environment,
      });

      // IMPORTANT: After deploying Safe, update user profile with Safe address and chainId
      // This is required before calling createSessionKey or other authenticated endpoints
      try {
        await this.updateUserProfile({
          smartWallet: deploymentResult.safeAddress,
          chains: [chainId],
        });
      } catch (updateError) {
        // Log the error but don't fail deployment
        console.warn(
          "Failed to update user profile after Safe deployment:",
          (updateError as Error).message
        );
      }

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
      // Authenticate to ensure user exists and JWT token is available
      // This also stores the userId and hasActiveSessionKey from the login response
      await this.authenticateUser();

      // Get userId from authentication (stored during login)
      if (!this.authenticatedUserId) {
        throw new Error(
          "User ID not available. Please ensure authentication completed successfully."
        );
      }

      // Check if user already has an active session key (from login response)
      // This avoids unnecessary signing and API calls
      if (this.hasActiveSessionKey) {
        return {
          success: true,
          userId: this.authenticatedUserId,
          message: "Session key already exists and is active",
          alreadyActive: true,
        };
      }

      // Fetch personalized session configuration (requires SIWE auth)
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
      const signatureResult = await this.signSessionKey(
        userAddress,
        chainId,
        sessions
      );

      // Ensure signature is available (should always be from signSessionKey)
      if (!signatureResult.signature) {
        throw new Error("Failed to obtain session key signature");
      }

      // Register the session key on the backend so it becomes active immediately
      const activation = await this.activateSessionKey(
        signatureResult.signature,
        signatureResult.sessionNonces
      );

      // Update local state to reflect the new session key
      this.hasActiveSessionKey = true;

      return {
        ...signatureResult,
        userId: this.authenticatedUserId,
        sessionActivation: activation,
      };
    } catch (error) {
      throw new Error(
        `Failed to create session key: ${(error as Error).message}`
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
      const chainConfig = getChainConfig(chainId);

      // Check if the user address is a Safe
      const accountType = await getAccountType(
        userAddress as Address,
        chainConfig.publicClient
      );

      if (accountType !== "EOA") {
        throw new Error(
          `Invalid account type for ${userAddress}. Must be an EOA.`
        );
      }

      // Get unique chain IDs from sessions and create public clients for each
      const sessionChainIds = [
        ...new Set(sessions.map((s) => Number(s.chainId))),
      ] as SupportedChainId[];
      const allPublicClients = sessionChainIds
        .filter(isSupportedChain)
        .map((id) => getChainConfig(id).publicClient);

      // Sign the session key
      const { signature, sessionNonces } = await signSessionKey(
        {
          owner: walletClient,
          safeOwnerAddress: userAddress as Address,
          chain: chainConfig.chain,
          publicClient: chainConfig.publicClient,
          environment: this.environment,
        },
        sessions,
        allPublicClients
      );

      // Get the Safe address
      const safeAddress = await getDeterministicSafeAddress({
        owner: walletClient,
        safeOwnerAddress: userAddress as Address,
        chain: chainConfig.chain,
        publicClient: chainConfig.publicClient,
        environment: this.environment,
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
   * Activate session key via ZyFAI API
   */
  private async activateSessionKey(
    signature: Hex,
    sessionNonces?: bigint[]
  ): Promise<AddSessionKeyResponse> {
    const nonces = this.normalizeSessionNonces(sessionNonces);

    const payload: AddSessionKeyRequest = {
      hash: signature,
      nonces,
    };

    return await this.httpClient.post<AddSessionKeyResponse>(
      ENDPOINTS.SESSION_KEYS_ADD,
      payload
    );
  }

  /**
   * Convert session nonces from bigint[] to number[]
   */
  private normalizeSessionNonces(sessionNonces?: bigint[]): number[] {
    if (!sessionNonces || sessionNonces.length === 0) {
      throw new Error(
        "Session nonces missing from signature result. Cannot register session key."
      );
    }

    return sessionNonces.map((nonce) => {
      const value = Number(nonce);

      if (!Number.isFinite(value) || value < 0) {
        throw new Error(`Invalid session nonce value: ${nonce.toString()}`);
      }

      return value;
    });
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
      const chainConfig = getChainConfig(chainId);

      // Get Safe address
      const safeAddress = await getDeterministicSafeAddress({
        owner: walletClient,
        safeOwnerAddress: userAddress as Address,
        chain: chainConfig.chain,
        publicClient: chainConfig.publicClient,
        environment: this.environment,
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
      const chainConfig = getChainConfig(chainId);

      // Get Safe address
      const safeAddress = await getDeterministicSafeAddress({
        owner: walletClient,
        safeOwnerAddress: userAddress as Address,
        chain: chainConfig.chain,
        publicClient: chainConfig.publicClient,
        environment: this.environment,
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

      // Ensure SIWE auth token is present
      await this.authenticateUser();

      type WithdrawApiResponse = {
        success?: boolean;
        message?: string;
        txHash?: string;
        transactionHash?: string;
      };

      let response: WithdrawApiResponse = {};

      if (amount) {
        // Partial withdrawal
        response = await this.httpClient.post(ENDPOINTS.PARTIAL_WITHDRAW, {
          chainId,
          amount,
          receiver: receiver || userAddress,
        });
      } else {
        // Full withdrawal - ask backend to trigger automatic withdrawal flow
        response = await this.httpClient.get(ENDPOINTS.USER_WITHDRAW, {
          params: { chainId },
        });
      }

      const success = response?.success ?? true;

      return {
        success,
        txHash: (response?.txHash ||
          response?.transactionHash ||
          "pending") as string,
        type: amount ? "partial" : "full",
        amount: amount || "all",
        receiver: receiver || userAddress,
        status: success ? "pending" : "failed",
      };
    } catch (error) {
      throw new Error(`Withdrawal failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get available DeFi protocols and pools for a specific chain
   *
   * @param chainId - Target chain ID
   * @returns List of available protocols with their pools and APY data
   *
   * @example
   * ```typescript
   * const protocols = await sdk.getAvailableProtocols(42161);
   * protocols.forEach(protocol => {
   *   console.log(`${protocol.name}: ${protocol.minApy}% - ${protocol.maxApy}% APY`);
   * });
   * ```
   */
  async getAvailableProtocols(
    chainId: SupportedChainId
  ): Promise<ProtocolsResponse> {
    try {
      if (!isSupportedChain(chainId)) {
        throw new Error(`Unsupported chain ID: ${chainId}`);
      }

      const response = await this.httpClient.get<any[]>(
        ENDPOINTS.PROTOCOLS(chainId)
      );

      return {
        success: true,
        chainId,
        protocols: response,
      };
    } catch (error) {
      throw new Error(
        `Failed to get available protocols: ${(error as Error).message}`
      );
    }
  }

  /**
   * Get all active DeFi positions for a user
   *
   * @param userAddress - User's EOA address
   * @param chainId - Optional: Filter by specific chain ID
   * @returns User's positions across all protocols
   *
   * @example
   * ```typescript
   * // Get all positions across all chains
   * const positions = await sdk.getPositions(userAddress);
   *
   * // Get positions on a specific chain
   * const arbPositions = await sdk.getPositions(userAddress, 42161);
   * ```
   */
  async getPositions(
    userAddress: string,
    chainId?: SupportedChainId
  ): Promise<PositionsResponse> {
    try {
      if (!userAddress) {
        throw new Error("User address is required");
      }

      if (chainId && !isSupportedChain(chainId)) {
        throw new Error(`Unsupported chain ID: ${chainId}`);
      }

      const walletClient = this.getWalletClient(chainId);
      const chainConfig = getChainConfig(chainId ?? 8453);
      // Translate EOA into deterministic Safe address
      const safeAddress = await getDeterministicSafeAddress({
        owner: walletClient,
        safeOwnerAddress: userAddress as Address,
        chain: chainConfig.chain,
        publicClient: chainConfig.publicClient,
        environment: this.environment,
      });

      // Use the /data/position endpoint with smart wallet address
      const response = await this.httpClient.get<any>(
        ENDPOINTS.DATA_POSITION(safeAddress)
      );

      return {
        success: true,
        userAddress,
        positions: response ? [response] : [],
      };
    } catch (error) {
      throw new Error(`Failed to get positions: ${(error as Error).message}`);
    }
  }

  // ============================================================================
  // User Details Methods
  // ============================================================================

  /**
   * Get current authenticated user details
   * Requires SIWE authentication
   *
   * @returns User details including smart wallet, chains, protocols, etc.
   *
   * @example
   * ```typescript
   * await sdk.connectAccount(privateKey, chainId);
   * const user = await sdk.getUserDetails();
   * console.log("Smart Wallet:", user.user.smartWallet);
   * console.log("Chains:", user.user.chains);
   * ```
   */
  async getUserDetails(): Promise<UserDetailsResponse> {
    try {
      await this.authenticateUser();

      const response = await this.httpClient.get<any>(ENDPOINTS.USER_ME);

      return {
        success: true,
        user: {
          id: response.id,
          address: response.address,
          smartWallet: response.smartWallet,
          chains: response.chains || [],
          protocols: response.protocols || [],
          hasActiveSessionKey: response.hasActiveSessionKey || false,
          email: response.email,
          strategy: response.strategy,
          telegramId: response.telegramId,
          walletType: response.walletType,
          autoSelectProtocols: response.autoSelectProtocols || false,
          autocompounding: response.autocompounding,
          omniAccount: response.omniAccount,
          crosschainStrategy: response.crosschainStrategy,
          agentName: response.agentName,
          customization: response.customization,
        },
      };
    } catch (error) {
      throw new Error(
        `Failed to get user details: ${(error as Error).message}`
      );
    }
  }

  // ============================================================================
  // TVL & Volume Methods
  // ============================================================================

  /**
   * Get total value locked (TVL) across all ZyFAI accounts
   *
   * @returns Total TVL in USD and breakdown by chain
   *
   * @example
   * ```typescript
   * const tvl = await sdk.getTVL();
   * console.log("Total TVL:", tvl.totalTvl);
   * ```
   */
  async getTVL(): Promise<TVLResponse> {
    try {
      const response = await this.httpClient.get<any>(ENDPOINTS.DATA_TVL);

      // API returns: { "146": 15, "8453": 874, "9745": 8, "42161": 62, "total": 959, "breakdown": [...] }
      const byChain: Record<number, number> = {};
      for (const key of Object.keys(response)) {
        const numKey = parseInt(key, 10);
        if (!isNaN(numKey) && typeof response[key] === "number") {
          byChain[numKey] = response[key];
        }
      }

      return {
        success: true,
        totalTvl: response.total || response.totalTvl || response.tvl || 0,
        byChain,
        breakdown: response.breakdown,
      };
    } catch (error) {
      throw new Error(`Failed to get TVL: ${(error as Error).message}`);
    }
  }

  /**
   * Get total volume across all ZyFAI accounts
   *
   * @returns Total volume in USD
   *
   * @example
   * ```typescript
   * const volume = await sdk.getVolume();
   * console.log("Total Volume:", volume.volumeInUSD);
   * ```
   */
  async getVolume(): Promise<VolumeResponse> {
    try {
      const response = await this.httpClient.get<any>(ENDPOINTS.DATA_VOLUME);

      return {
        success: true,
        volumeInUSD: response.volumeInUSD || "0",
      };
    } catch (error) {
      throw new Error(`Failed to get volume: ${(error as Error).message}`);
    }
  }

  // ============================================================================
  // Active Wallets Methods
  // ============================================================================

  /**
   * Get active wallets for a specific chain
   *
   * @param chainId - Chain ID to filter wallets
   * @returns List of active wallets on the specified chain
   *
   * @example
   * ```typescript
   * const wallets = await sdk.getActiveWallets(8453); // Base
   * console.log("Active wallets:", wallets.count);
   * ```
   */
  async getActiveWallets(chainId: number): Promise<ActiveWalletsResponse> {
    try {
      if (!chainId) {
        throw new Error("Chain ID is required");
      }

      const response = await this.httpClient.get<any>(
        ENDPOINTS.DATA_ACTIVE_WALLETS(chainId)
      );

      const wallets = Array.isArray(response)
        ? response
        : response.wallets || [];

      return {
        success: true,
        chainId,
        wallets: wallets.map((w: any) => ({
          smartWallet: w.smartWallet || w,
          chains: w.chains || [chainId],
          hasBalance: w.hasBalance ?? true,
        })),
        count: wallets.length,
      };
    } catch (error) {
      throw new Error(
        `Failed to get active wallets: ${(error as Error).message}`
      );
    }
  }

  /**
   * Get smart wallets associated with an EOA address
   *
   * @param eoaAddress - EOA (externally owned account) address
   * @returns List of smart wallets owned by the EOA
   *
   * @example
   * ```typescript
   * const result = await sdk.getSmartWalletByEOA("0x...");
   * console.log("Smart wallets:", result.smartWallets);
   * ```
   */
  async getSmartWalletByEOA(
    eoaAddress: string
  ): Promise<SmartWalletByEOAResponse> {
    try {
      if (!eoaAddress) {
        throw new Error("EOA address is required");
      }

      const response = await this.httpClient.get<any>(
        ENDPOINTS.DATA_BY_EOA(eoaAddress)
      );

      // API returns: { agent: "0x...", chains: [...] }
      // Parse smartWallet from different possible field names
      const smartWallet: Address | null = (response.agent as Address) || null;
      const chains: number[] = response.chains || [];

      return {
        success: true,
        eoa: eoaAddress,
        smartWallet,
        chains,
      };
    } catch (error) {
      throw new Error(
        `Failed to get smart wallets by EOA: ${(error as Error).message}`
      );
    }
  }

  // ============================================================================
  // First Topup & History Methods
  // ============================================================================

  /**
   * Get the first topup (deposit) information for a wallet
   *
   * @param walletAddress - Smart wallet address
   * @param chainId - Chain ID
   * @returns First topup date and details
   *
   * @example
   * ```typescript
   * const firstTopup = await sdk.getFirstTopup("0x...", 8453);
   * console.log("First deposit date:", firstTopup.date);
   * ```
   */
  async getFirstTopup(
    walletAddress: string,
    chainId: number
  ): Promise<FirstTopupResponse> {
    try {
      if (!walletAddress) {
        throw new Error("Wallet address is required");
      }
      if (!chainId) {
        throw new Error("Chain ID is required");
      }

      const response = await this.httpClient.get<any>(
        ENDPOINTS.DATA_FIRST_TOPUP(walletAddress, chainId)
      );

      return {
        success: true,
        walletAddress,
        date: response.date || response.firstTopup?.date || "",
        amount: response.amount,
        chainId: response.chainId || chainId,
      };
    } catch (error) {
      throw new Error(`Failed to get first topup: ${(error as Error).message}`);
    }
  }

  /**
   * Get transaction history for a wallet
   *
   * @param walletAddress - Smart wallet address
   * @param chainId - Chain ID
   * @param options - Optional pagination and date filters
   * @returns Transaction history
   *
   * @example
   * ```typescript
   * const history = await sdk.getHistory("0x...", 8453, { limit: 50 });
   * history.data.forEach(tx => console.log(tx.type, tx.amount));
   * ```
   */
  async getHistory(
    walletAddress: string,
    chainId: SupportedChainId,
    options?: {
      limit?: number;
      offset?: number;
      fromDate?: string;
      toDate?: string;
    }
  ): Promise<HistoryResponse> {
    try {
      if (!walletAddress) {
        throw new Error("Wallet address is required");
      }
      if (!chainId) {
        throw new Error("Chain ID is required");
      }

      let endpoint = ENDPOINTS.DATA_HISTORY(walletAddress, chainId);
      if (options?.limit) endpoint += `&limit=${options.limit}`;
      if (options?.offset) endpoint += `&offset=${options.offset}`;
      if (options?.fromDate) endpoint += `&fromDate=${options.fromDate}`;
      if (options?.toDate) endpoint += `&toDate=${options.toDate}`;

      const response = await this.httpClient.get<any>(endpoint);

      return {
        success: true,
        walletAddress,
        data: response.data || [],
        total: response.total || 0,
      };
    } catch (error) {
      throw new Error(`Failed to get history: ${(error as Error).message}`);
    }
  }

  // ============================================================================
  // Onchain Earnings Methods (Data API v2)
  // ============================================================================

  /**
   * Get onchain earnings for a wallet
   *
   * @param walletAddress - Smart wallet address
   * @returns Onchain earnings data including total, current, and lifetime
   *
   * @example
   * ```typescript
   * const earnings = await sdk.getOnchainEarnings("0x...");
   * console.log("Total earnings:", earnings.data.totalEarnings);
   * ```
   */
  async getOnchainEarnings(
    walletAddress: string
  ): Promise<OnchainEarningsResponse> {
    try {
      if (!walletAddress) {
        throw new Error("Wallet address is required");
      }

      const response = await this.httpClient.dataGet<any>(
        DATA_ENDPOINTS.ONCHAIN_EARNINGS(walletAddress)
      );

      return {
        success: true,
        data: {
          walletAddress,
          totalEarnings: response.total_earnings || response.totalEarnings || 0,
          currentEarnings:
            response.current_earnings || response.currentEarnings || 0,
          lifetimeEarnings:
            response.lifetime_earnings || response.lifetimeEarnings || 0,
          unrealizedEarnings: response.unrealized_earnings,
          currentEarningsByChain: response.current_earnings_by_chain,
          unrealizedEarningsByChain: response.unrealized_earnings_by_chain,
          lastCheckTimestamp: response.last_check_timestamp,
        },
      };
    } catch (error) {
      throw new Error(
        `Failed to get onchain earnings: ${(error as Error).message}`
      );
    }
  }

  /**
   * Calculate/refresh onchain earnings for a wallet
   * This triggers a recalculation of earnings on the backend
   *
   * @param walletAddress - Smart wallet address
   * @returns Updated onchain earnings data
   *
   * @example
   * ```typescript
   * const earnings = await sdk.calculateOnchainEarnings("0x...");
   * console.log("Calculated earnings:", earnings.data.totalEarnings);
   * ```
   */
  async calculateOnchainEarnings(
    walletAddress: string
  ): Promise<OnchainEarningsResponse> {
    try {
      if (!walletAddress) {
        throw new Error("Wallet address is required");
      }

      const response = await this.httpClient.dataPost<any>(
        DATA_ENDPOINTS.CALCULATE_ONCHAIN_EARNINGS,
        { walletAddress }
      );

      const data = response.data || response;

      return {
        success: true,
        data: {
          walletAddress,
          totalEarnings: data.total_earnings || data.totalEarnings || 0,
          currentEarnings: data.current_earnings || data.currentEarnings || 0,
          lifetimeEarnings:
            data.lifetime_earnings || data.lifetimeEarnings || 0,
          unrealizedEarnings: data.unrealized_earnings,
          lastCheckTimestamp: data.last_check_timestamp,
        },
      };
    } catch (error) {
      throw new Error(
        `Failed to calculate onchain earnings: ${(error as Error).message}`
      );
    }
  }

  /**
   * Get daily earnings for a wallet within a date range
   *
   * @param walletAddress - Smart wallet address
   * @param startDate - Start date (YYYY-MM-DD format)
   * @param endDate - End date (YYYY-MM-DD format)
   * @returns Daily earnings breakdown
   *
   * @example
   * ```typescript
   * const daily = await sdk.getDailyEarnings("0x...", "2024-01-01", "2024-01-31");
   * daily.data.forEach(d => console.log(d.date, d.earnings));
   * ```
   */
  async getDailyEarnings(
    walletAddress: string,
    startDate?: string,
    endDate?: string
  ): Promise<DailyEarningsResponse> {
    try {
      if (!walletAddress) {
        throw new Error("Wallet address is required");
      }

      const response = await this.httpClient.dataGet<any>(
        DATA_ENDPOINTS.DAILY_EARNINGS(walletAddress, startDate, endDate)
      );

      return {
        success: true,
        walletAddress,
        data: response.data || [],
        count: response.count || 0,
        filters: {
          startDate: startDate || null,
          endDate: endDate || null,
        },
      };
    } catch (error) {
      throw new Error(
        `Failed to get daily earnings: ${(error as Error).message}`
      );
    }
  }

  // ============================================================================
  // Portfolio Methods (Data API v2)
  // ============================================================================

  /**
   * Get Debank portfolio for a wallet across multiple chains
   * Note: This is a paid endpoint and may require authorization
   *
   * @param walletAddress - Smart wallet address
   * @returns Multi-chain portfolio data
   *
   * @example
   * ```typescript
   * const portfolio = await sdk.getDebankPortfolio("0x...");
   * console.log("Total value:", portfolio.totalValueUsd);
   * ```
   */
  async getDebankPortfolio(
    walletAddress: string
  ): Promise<DebankPortfolioResponse> {
    try {
      if (!walletAddress) {
        throw new Error("Wallet address is required");
      }

      const response = await this.httpClient.dataGet<any>(
        DATA_ENDPOINTS.DEBANK_PORTFOLIO_MULTICHAIN(walletAddress)
      );

      const data = response.data || response;

      return {
        success: true,
        walletAddress,
        totalValueUsd: data.totalValueUsd || 0,
        chains: data.chains || data,
      };
    } catch (error) {
      throw new Error(
        `Failed to get Debank portfolio: ${(error as Error).message}`
      );
    }
  }

  // ============================================================================
  // Opportunities Methods (Data API v2)
  // ============================================================================

  /**
   * Get safe (low-risk) yield opportunities
   *
   * @param chainId - Optional chain ID filter
   * @returns List of safe yield opportunities
   *
   * @example
   * ```typescript
   * const opportunities = await sdk.getSafeOpportunities(8453);
   * opportunities.data.forEach(o => console.log(o.protocolName, o.apy));
   * ```
   */
  async getSafeOpportunities(chainId?: number): Promise<OpportunitiesResponse> {
    try {
      const response = await this.httpClient.dataGet<any>(
        DATA_ENDPOINTS.OPPORTUNITIES_SAFE(chainId)
      );

      const data = response.data || response || [];

      return {
        success: true,
        chainId,
        strategyType: "safe",
        data: Array.isArray(data)
          ? data.map((o: any) => ({
              id: o.id,
              protocolId: o.protocol_id || o.protocolId,
              protocolName: o.protocol_name || o.protocolName,
              poolName: o.pool_name || o.poolName,
              chainId: o.chain_id || o.chainId,
              apy: o.apy || o.pool_apy || 0,
              tvl: o.tvl || o.zyfiTvl,
              asset: o.asset || o.underlying_token,
              risk: o.risk,
              strategyType: "safe",
              status: o.status,
            }))
          : [],
      };
    } catch (error) {
      throw new Error(
        `Failed to get safe opportunities: ${(error as Error).message}`
      );
    }
  }

  /**
   * Get degen (high-risk, high-reward) yield strategies
   *
   * @param chainId - Optional chain ID filter
   * @returns List of degen strategies
   *
   * @example
   * ```typescript
   * const strategies = await sdk.getDegenStrategies(8453);
   * strategies.data.forEach(s => console.log(s.protocolName, s.apy));
   * ```
   */
  async getDegenStrategies(chainId?: number): Promise<OpportunitiesResponse> {
    try {
      const response = await this.httpClient.dataGet<any>(
        DATA_ENDPOINTS.OPPORTUNITIES_DEGEN(chainId)
      );

      const data = response.data || response || [];

      return {
        success: true,
        chainId,
        strategyType: "degen",
        data: Array.isArray(data)
          ? data.map((o: any) => ({
              id: o.id,
              protocolId: o.protocol_id || o.protocolId,
              protocolName: o.protocol_name || o.protocolName,
              poolName: o.pool_name || o.poolName,
              chainId: o.chain_id || o.chainId,
              apy: o.apy || o.pool_apy || 0,
              tvl: o.tvl || o.zyfiTvl,
              asset: o.asset || o.underlying_token,
              risk: o.risk,
              strategyType: "degen",
              status: o.status,
            }))
          : [],
      };
    } catch (error) {
      throw new Error(
        `Failed to get degen strategies: ${(error as Error).message}`
      );
    }
  }

  // ============================================================================
  // APY History Methods (Data API v2)
  // ============================================================================

  /**
   * Get daily APY history with weighted average for a wallet
   *
   * @param walletAddress - Smart wallet address
   * @param days - Period: "7D", "14D", or "30D" (default: "7D")
   * @returns Daily APY history with weighted averages
   *
   * @example
   * ```typescript
   * const apyHistory = await sdk.getDailyApyHistory("0x...", "30D");
   * console.log("Average APY:", apyHistory.averageWeightedApy);
   * ```
   */
  async getDailyApyHistory(
    walletAddress: string,
    days: "7D" | "14D" | "30D" = "7D"
  ): Promise<DailyApyHistoryResponse> {
    try {
      if (!walletAddress) {
        throw new Error("Wallet address is required");
      }

      const response = await this.httpClient.dataGet<any>(
        DATA_ENDPOINTS.DAILY_APY_HISTORY_WEIGHTED(walletAddress, days)
      );

      const data = response.data || response;

      return {
        success: true,
        walletAddress,
        history: data.history || {},
        totalDays: data.total_days || data.totalDays || 0,
        requestedDays: data.requested_days || data.requestedDays,
        averageWeightedApy:
          data.average_final_weighted_apy_after_fee ||
          data.averageWeightedApy ||
          0,
      };
    } catch (error) {
      throw new Error(
        `Failed to get daily APY history: ${(error as Error).message}`
      );
    }
  }

  // ============================================================================
  // Rebalance Methods
  // ============================================================================

  /**
   * Get rebalance information
   * Shows yield generated by rebalancing strategies
   *
   * @param isCrossChain - Filter by cross-chain or same-chain rebalances
   * @returns List of rebalance events
   *
   * @example
   * ```typescript
   * // Get same-chain rebalance info
   * const rebalances = await sdk.getRebalanceInfo(false);
   * console.log("Rebalance count:", rebalances.count);
   * ```
   */
  async getRebalanceInfo(
    isCrossChain?: boolean
  ): Promise<RebalanceInfoResponse> {
    try {
      const response = await this.httpClient.dataGet<any>(
        DATA_ENDPOINTS.REBALANCE_INFO(isCrossChain)
      );

      const data = response.data || response || [];

      return {
        success: true,
        data: Array.isArray(data)
          ? data.map((r: any) => ({
              id: r.id,
              timestamp: r.timestamp || r.created_at,
              fromProtocol: r.from_protocol || r.fromProtocol,
              toProtocol: r.to_protocol || r.toProtocol,
              fromPool: r.from_pool || r.fromPool,
              toPool: r.to_pool || r.toPool,
              amount: r.amount,
              isCrossChain: r.is_cross_chain ?? r.isCrossChain ?? false,
              fromChainId: r.from_chain_id || r.fromChainId,
              toChainId: r.to_chain_id || r.toChainId,
            }))
          : [],
        count: data.length,
      };
    } catch (error) {
      throw new Error(
        `Failed to get rebalance info: ${(error as Error).message}`
      );
    }
  }

  /**
   * Get rebalance frequency/tier for a wallet
   * Determines how often the wallet can be rebalanced based on tier
   *
   * @param walletAddress - Smart wallet address
   * @returns Rebalance frequency tier and details
   *
   * @example
   * ```typescript
   * const frequency = await sdk.getRebalanceFrequency("0x...");
   * console.log("Tier:", frequency.tier);
   * console.log("Max rebalances/day:", frequency.frequency);
   * ```
   */
  async getRebalanceFrequency(
    walletAddress: string
  ): Promise<RebalanceFrequencyResponse> {
    try {
      if (!walletAddress) {
        throw new Error("Wallet address is required");
      }

      const response = await this.httpClient.get<any>(
        ENDPOINTS.DATA_REBALANCE_FREQUENCY(walletAddress)
      );

      return {
        success: true,
        walletAddress,
        tier: response.tier || "standard",
        frequency: response.frequency || response.rebalanceFrequency || 1,
        description: response.description,
      };
    } catch (error) {
      throw new Error(
        `Failed to get rebalance frequency: ${(error as Error).message}`
      );
    }
  }
}
