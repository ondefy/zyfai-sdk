/**
 * Zyfai SDK Main Class
 */

import { HttpClient } from "../utils/http-client";
import { ENDPOINTS, DATA_ENDPOINTS, API_ENDPOINT } from "../config/endpoints";
import { ERC20_ABI, IDENTITY_REGISTRY_ABI, IDENTITY_REGISTRY_ADDRESS } from "../config/abis";
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
  InitializeUserResponse,
  LoginResponse,
  AddSessionKeyRequest,
  AddSessionKeyResponse,
  UserDetailsResponse,
  TVLResponse,
  VolumeResponse,
  ActiveWalletsResponse,
  APYPerStrategy,
  APYPerStrategyResponse,
  SmartWalletByEOAResponse,
  FirstTopupResponse,
  HistoryResponse,
  OnchainEarningsResponse,
  DailyEarningsResponse,
  DebankPortfolioResponse,
  OpportunitiesResponse,
  DailyApyHistoryResponse,
  RebalanceFrequencyResponse,
  AddWalletToSdkResponse,
  RpcUrlsConfig,
  Strategy,
  SdkKeyTVLResponse,
  BestOpportunityResponse,
  AgentTokenUriResponse,
  RegisterAgentResponse,
  CustomizationConfig,
  CustomizeBatchResponse,
  GetPoolsResponse,
  GetSelectedPoolsResponse,
  Protocol,
} from "../types";
import { PrivateKeyAccount, privateKeyToAccount } from "viem/accounts";
import {
  createWalletClient,
  custom,
  http,
  getAddress,
  encodeFunctionData,
  type WalletClient,
} from "viem";
import {
  getChainConfig,
  isSupportedChain,
  getDefaultTokenAddress,
  type SupportedChainId,
} from "../config/chains";
import {
  deploySafeAccount,
  getDeterministicSafeAddress,
  getAccountType,
  isSafeDeployed,
  signSessionKey,
  type SigningParams,
} from "../utils/safe-account";
import {
  toInternalStrategy,
  convertStrategyToPublic,
  convertStrategiesToPublic,
  isValidPublicStrategy,
  convertStrategiesToPublicAndNaming,
} from "../utils/strategy";
import { SiweMessage } from "siwe";

export class ZyfaiSDK {
  private httpClient: HttpClient;
  private signer: PrivateKeyAccount | null = null;
  private walletClient: WalletClient | null = null;
  private authenticatedUserId: string | null = null;
  private hasActiveSessionKey: boolean = false;
  private currentProvider: any = null;
  private currentChainId: SupportedChainId | null = null;
  private rpcUrls?: RpcUrlsConfig;
  private referralSource?: string;

  constructor(config: SDKConfig | string) {
    const sdkConfig: SDKConfig =
      typeof config === "string" ? { apiKey: config } : config;

    const { apiKey, rpcUrls, referralSource } = sdkConfig;

    if (!apiKey) {
      throw new Error("API key is required");
    }

    this.httpClient = new HttpClient(apiKey);
    this.rpcUrls = rpcUrls;
    this.referralSource = referralSource;
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
      if (this.authenticatedUserId !== null) {
        return;
      }

      const walletClient = this.getWalletClient();
      // Ensure address is EIP-55 checksummed (required by SIWE)
      const userAddress = getAddress(walletClient.account!.address);
      // Use stored chain ID if available (for private key connections), otherwise use wallet client's chain or default
      const chainId = this.currentChainId || walletClient.chain?.id || 8453; // Default to Base

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
      const isNodeJs = !globalWindow?.location?.origin;
      if (globalWindow?.location?.origin) {
        uri = globalWindow.location.origin;
        domain = globalWindow.location.host;
      } else {
        uri = API_ENDPOINT;
        domain = API_ENDPOINT.split("//")[1];
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
          referralSource: this.referralSource,
        },
        // Set Origin header in Node.js to match message.uri (required by backend validation)
        isNodeJs
          ? {
              headers: {
                Origin: uri,
              },
            }
          : undefined
      );
      const authToken = loginResponse.accessToken;

      if (!authToken) {
        throw new Error("Authentication response missing access token");
      }

      // Step 6: Store auth token, userId, and session key status
      this.httpClient.setAuthToken(authToken);
      this.authenticatedUserId = loginResponse.userId || null;
      this.hasActiveSessionKey = loginResponse.hasActiveSessionKey || false;
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
   *   chains: [8453],
   * });
   * ```
   */
  async updateUserProfile(
    request: UpdateUserProfileRequest
  ): Promise<UpdateUserProfileResponse> {
    try {
      // Authenticate user first to get JWT token
      await this.authenticateUser();

      // Map public strategy keywords to internal backend values if provided
      const payload: UpdateUserProfileRequest = { ...request };
      if (payload.strategy) {
        if (!isValidPublicStrategy(payload.strategy)) {
          throw new Error(
            `Invalid strategy: ${payload.strategy}. Must be "conservative" or "aggressive".`
          );
        }
        payload.strategy = toInternalStrategy(
          payload.strategy as "conservative" | "aggressive"
        );
      }

      // Update user profile via API
      const response = await this.httpClient.patch<any>(
        ENDPOINTS.USER_ME,
        payload
      );

      return {
        success: true,
        userId: response.userId || response.id,
        smartWallet: response.smartWallet,
        chains: response.chains,
        strategy: response.strategy,
        protocols: response.protocols,
        autoSelectProtocols: response.autoSelectProtocols,
        omniAccount: response.omniAccount,
        autocompounding: response.autocompounding,
        agentName: response.agentName,
        crosschainStrategy: response.crosschainStrategy,
        executorProxy: response.executorProxy,
        splitting: response.splitting,
        minSplits: response.minSplits,
        customization: response.customization,
      };
    } catch (error) {
      throw new Error(
        `Failed to update user profile: ${(error as Error).message}`
      );
    }
  }

  /**
   * Pause the agent by clearing all protocols
   * Sets the user's protocols to an empty array, effectively pausing automated operations
   *
   * @returns Response indicating success and updated user details
   *
   * @example
   * ```typescript
   * const sdk = new ZyfaiSDK({ apiKey: 'your-api-key' });
   *
   * // Connect account first
   * await sdk.connectAccount();
   *
   * // Pause the agent
   * const result = await sdk.pauseAgent();
   * console.log('Agent paused:', result.success);
   * ```
   */
  async pauseAgent(): Promise<UpdateUserProfileResponse> {
    try {
      // Update user profile with empty protocols array
      const response = await this.updateUserProfile({
        protocols: [],
      });

      return response;
    } catch (error) {
      throw new Error(`Failed to pause agent: ${(error as Error).message}`);
    }
  }


    /**
   * Pause the agent by clearing all protocols
   * Sets the user's protocols to an empty array, effectively pausing automated operations
   *
   * @returns Response indicating success and updated user details
   *
   * @example
   * ```typescript
   * const sdk = new ZyfaiSDK({ apiKey: 'your-api-key' });
   *
   * // Connect account first
   * await sdk.connectAccount();
   *
   * // Pause the agent
   * const result = await sdk.pauseAgent();
   * console.log('Agent paused:', result.success);
   * ```
   */
  async resumeAgent(): Promise<UpdateUserProfileResponse> {
    try {
      const userDetails = await this.getUserDetails();

      const userChains = userDetails.user.chains;
      const strategy = userDetails.user.strategy || "safe_strategy";

      const convertedStrategy = toInternalStrategy(strategy as "conservative" | "aggressive");


      // If user has no chains configured, use all supported chains
      const chains: number[] =
        userChains && userChains.length > 0 ? userChains : [8453, 42161];

      // Fetch all protocols (API returns array directly, not { protocols: [...] })
      const allProtocols = await this.httpClient.get<Protocol[]>(
        ENDPOINTS.PROTOCOLS()
      );

      // Filter protocols by user's chains and strategy
      // - safe_strategy: only protocols that support safe_strategy
      // - degen_strategy: all protocols (safe + degen)
      const filteredProtocolIds = allProtocols
        .filter((protocol: Protocol) => {
          const hasMatchingChain = protocol.chains.some((chain: number) =>
            chains.includes(chain)
          );
          if (!hasMatchingChain) {
            return false;
          }
          // Degen users get access to ALL protocols (safe + degen)
          if (convertedStrategy === "degen_strategy") {
            return (
              protocol.strategies?.includes("safe_strategy") ||
              protocol.strategies?.includes("degen_strategy")
            );
          }
          // Safe users only get safe_strategy protocols
          return protocol.strategies?.includes("safe_strategy");
        })
        .map((protocol: Protocol) => protocol.id);

      // Update user profile with filtered protocols
      const response = await this.updateUserProfile({
        protocols: filteredProtocolIds,
      });

      return response;
    } catch (error) {
      throw new Error(`Failed to resume agent: ${(error as Error).message}`);
    }
  }

  /**
   * Enable splitting for the user's account
   * When enabled, deposits are split across multiple protocols based on minSplits setting
   *
   * @param minSplits - Optional minimum number of protocols to split across (default: 3)
   * @returns Response indicating success and updated user details
   *
   * @example
   * ```typescript
   * const sdk = new ZyfaiSDK({ apiKey: 'your-api-key' });
   *
   * // Connect account first
   * await sdk.connectAccount(privateKey, chainId);
   *
   * // Enable splitting with minimum 3 protocols
   * const result = await sdk.enableSplitting(3);
   * console.log('Splitting enabled:', result.success);
   * ```
   */
  async enableSplitting(minSplits: number = 1): Promise<UpdateUserProfileResponse> {
    if (minSplits > 4) {
      throw new Error("minSplits cannot exceed 4");
    }

    try {
      const response = await this.updateUserProfile({
        splitting: true,
        minSplits,
      });

      return response;
    } catch (error) {
      throw new Error(`Failed to enable splitting: ${(error as Error).message}`);
    }
  }

  /**
   * Disable splitting for the user's account
   * When disabled, deposits will not be split across multiple protocols
   *
   * @returns Response indicating success and updated user details
   *
   * @example
   * ```typescript
   * const sdk = new ZyfaiSDK({ apiKey: 'your-api-key' });
   *
   * // Connect account first
   * await sdk.connectAccount(privateKey, chainId);
   *
   * // Disable splitting
   * const result = await sdk.disableSplitting();
   * console.log('Splitting disabled:', result.success);
   * ```
   */
  async disableSplitting(): Promise<UpdateUserProfileResponse> {
    try {
      const response = await this.updateUserProfile({
        splitting: false,
      });

      return response;
    } catch (error) {
      throw new Error(`Failed to disable splitting: ${(error as Error).message}`);
    }
  }

  /**
   * Update the minimum number of splits for the user's account
   * This controls across how many protocols deposits should be distributed
   *
   * @param minSplits - Minimum number of protocols to split across
   * @returns Response indicating success and updated user details
   *
   * @example
   * ```typescript
   * const sdk = new ZyfaiSDK({ apiKey: 'your-api-key' });
   *
   * // Connect account first
   * await sdk.connectAccount(privateKey, chainId);
   *
   * // Update minimum splits to 5
   * const result = await sdk.updateMinSplits(5);
   * console.log('Min splits updated:', result.success);
   * ```
   */
  async updateMinSplits(minSplits: number): Promise<UpdateUserProfileResponse> {
    try {
      if (minSplits < 1) {
        throw new Error('minSplits must be at least 1');
      }

      const response = await this.updateUserProfile({
        minSplits,
      });

      return response;
    } catch (error) {
      throw new Error(`Failed to update min splits: ${(error as Error).message}`);
    }
  }

  /**
   * Initialize user after Safe deployment
   * This method is automatically called after deploySafe to initialize user state
   *
   * @param smartWallet - Safe smart wallet address
   * @param chainId - Target chain ID
   * @returns Initialization response
   *
   * @example
   * ```typescript
   * await sdk.initializeUser("0x1396730...", 8453);
   * ```
   * @internal
   */
  private async initializeUser(
    smartWallet: string,
    chainId: number
  ): Promise<InitializeUserResponse> {
    try {
      // Ensure authentication is present
      await this.authenticateUser();

      // Initialize user via Data API
      // Note: This endpoint uses /api/earnings/initialize (without /v2)
      // Use dataPostCustom to bypass the /v2 prefix
      const responseData = await this.httpClient.dataPostCustom<any>(
        DATA_ENDPOINTS.USER_INITIALIZE,
        {
          walletAddress: smartWallet,
        }
      );

      return {
        success: responseData.status === "success" || true,
        userId: responseData.userId || responseData.id,
        smartWallet: responseData.smartWallet || smartWallet,
        chainId: responseData.chainId || chainId,
        message:
          responseData.message ||
          responseData.status ||
          "User initialized successfully",
      };
    } catch (error) {
      throw new Error(`Failed to initialize user: ${(error as Error).message}`);
    }
  }

  /**
   * Handle account changes from wallet provider
   * Resets authentication state when wallet is switched
   * @private
   */
  private async handleAccountsChanged(accounts: string[]): Promise<void> {
    if (!accounts || accounts.length === 0) {
      // No accounts available - disconnect
      await this.disconnectAccount();
      return;
    }

    const newAddress = accounts[0];
    const currentAddress = this.walletClient?.account?.address;

    // Check if the account actually changed
    if (
      currentAddress &&
      newAddress.toLowerCase() === currentAddress.toLowerCase()
    ) {
      return; // Same account, no action needed
    }

    // Account changed - reset authentication
    this.authenticatedUserId = null;
    this.hasActiveSessionKey = false;
    this.httpClient.clearAuthToken();

    // Update wallet client with new account
    if (this.walletClient && this.currentProvider) {
      const chainConfig = getChainConfig(
        (this.walletClient.chain?.id as SupportedChainId) || 8453,
        this.rpcUrls
      );

      this.walletClient = createWalletClient({
        account: newAddress as Address,
        chain: chainConfig.chain,
        transport: custom(this.currentProvider),
      });

      // Update stored chain ID
      this.currentChainId =
        (this.walletClient.chain?.id as SupportedChainId) || null;

      // Re-authenticate with new account
      try {
        await this.authenticateUser();
      } catch (error) {
        console.warn(
          "Failed to authenticate after wallet switch:",
          (error as Error).message
        );
      }
    }
  }

  /**
   * Connect account for signing transactions
   * Accepts either a private key string or a modern wallet provider
   *
   * @param account - Private key string or wallet provider object
   * @param chainId - Target chain ID (default: 8453 - Base)
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
    chainId: SupportedChainId = 8453 as SupportedChainId
  ): Promise<Address> {
    if (!isSupportedChain(chainId)) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }

    // Reset authentication when connecting a new account
    this.authenticatedUserId = null;
    this.currentChainId = null;
    this.httpClient.clearAuthToken();

    // Remove existing event listeners if any
    if (this.currentProvider?.removeAllListeners) {
      try {
        this.currentProvider.removeAllListeners("accountsChanged");
      } catch (error) {
        // Ignore errors during cleanup
      }
    }

    const chainConfig = getChainConfig(chainId, this.rpcUrls);

    let connectedAddress: Address;

    // Check if account is a private key (string)
    if (typeof account === "string") {
      let privateKey = account;
      if (!privateKey.startsWith("0x")) {
        privateKey = `0x${privateKey}`;
      }

      this.signer = privateKeyToAccount(privateKey as Hex);

      // Store chain ID for private key connections (needed for authentication)
      this.currentChainId = chainId;

      // Create wallet client for the signer
      this.walletClient = createWalletClient({
        account: this.signer,
        chain: chainConfig.chain,
        transport: http(chainConfig.rpcUrl),
      });

      connectedAddress = this.signer.address;
      this.currentProvider = null; // No provider for private key
    } else {
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

        connectedAddress = accounts[0];
        this.currentProvider = provider;
        this.currentChainId = chainId; // Store chain ID for consistency

        // Set up event listener for account changes
        if (provider.on) {
          provider.on("accountsChanged", this.handleAccountsChanged.bind(this));
        }
      } else if (provider.account && provider.transport) {
        // Handle viem WalletClient or similar objects
        this.walletClient = createWalletClient({
          account: provider.account,
          chain: chainConfig.chain,
          transport: provider.transport,
        });

        connectedAddress = provider.account.address;
        this.currentProvider = null; // No event support for viem clients
        this.currentChainId = chainId; // Store chain ID for consistency
      } else {
        throw new Error(
          "Invalid wallet provider. Expected EIP-1193 provider or viem WalletClient."
        );
      }
    }

    // Authenticate user after successful connection
    await this.authenticateUser();

    return connectedAddress;
  }

  /**
   * Disconnect account and clear authentication state
   * Resets wallet connection, JWT token, and all authentication-related state
   *
   * @example
   * ```typescript
   * await sdk.disconnectAccount();
   * console.log("Account disconnected");
   * ```
   */
  async disconnectAccount(): Promise<void> {
    // Remove event listeners if any
    if (this.currentProvider?.removeAllListeners) {
      try {
        this.currentProvider.removeAllListeners("accountsChanged");
      } catch (error) {
        // Ignore errors during cleanup
      }
    }

    // Clear wallet connection
    this.signer = null;
    this.walletClient = null;
    this.currentProvider = null;
    this.currentChainId = null;

    // Clear authentication state
    this.authenticatedUserId = null;
    this.hasActiveSessionKey = false;

    // Clear JWT token
    this.httpClient.clearAuthToken();
  }

  /**
   * Get wallet client (throws if not connected)
   * @private
   */
  private getWalletClient(chainId?: SupportedChainId): WalletClient {
    if (this.signer) {
      // Use provided chainId, stored chainId, or default to Base
      const targetChainId = chainId || this.currentChainId || 8453;
      const targetChainConfig = getChainConfig(
        targetChainId as SupportedChainId,
        this.rpcUrls
      );
      return createWalletClient({
        account: this.signer,
        chain: targetChainConfig.chain,
        transport: http(targetChainConfig.rpcUrl),
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

    const chainConfig = getChainConfig(chainId, this.rpcUrls);

    // Try to get smart wallet address from API first (if already registered)
    try {
      const smartWalletInfo = await this.getSmartWalletByEOA(userAddress);
      if (smartWalletInfo.smartWallet) {
        // Check if Safe is deployed
        const isDeployed = await isSafeDeployed(
          smartWalletInfo.smartWallet,
          chainConfig.publicClient
        );
        return {
          address: smartWalletInfo.smartWallet,
          isDeployed,
        };
      }
    } catch {
      // API call failed or no smart wallet found - fall through to deterministic calculation
    }

    // If not found in API, calculate deterministic Safe address
    const safeAddress = await getDeterministicSafeAddress({
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
   * @param strategy - Optional strategy selection: "conservative" (default) or "aggressive"
   * @returns Deployment response with Safe address and transaction hash
   *
   * @example
   * ```typescript
   * // Deploy with default conservative strategy
   * await sdk.deploySafe(userAddress, 8453);
   *
   * // Deploy with aggressive strategy
   * await sdk.deploySafe(userAddress, 8453, "aggressive");
   * ```
   */
  async deploySafe(
    userAddress: string,
    chainId: SupportedChainId,
    strategy?: Strategy
  ): Promise<DeploySafeResponse> {
    try {
      // Validate inputs
      if (!userAddress) {
        throw new Error("User address is required");
      }

      if (!isSupportedChain(chainId)) {
        throw new Error(`Unsupported chain ID: ${chainId}`);
      }

      // Ensure user is authenticated (required for safe-deploy endpoint)
      await this.authenticateUser();

      const walletClient = this.getWalletClient(chainId);
      const chainConfig = getChainConfig(chainId, this.rpcUrls);

      // Check if Safe is already deployed before attempting deployment
      const safeAddress = await getDeterministicSafeAddress({
        safeOwnerAddress: userAddress as Address,
        chain: chainConfig.chain,
        publicClient: chainConfig.publicClient,
      });

      const alreadyDeployed = await isSafeDeployed(
        safeAddress,
        chainConfig.publicClient
      );

      // Verify that userAddress is an EOA (only if not already deployed to save RPC calls)
      if (!alreadyDeployed) {
        const accountType = await getAccountType(
          userAddress as Address,
          chainConfig.publicClient
        );

        if (accountType !== "EOA") {
          throw new Error(
            `Address ${userAddress} is not an EOA. Only EOA addresses can deploy Safe smart wallets.`
          );
        }
      }

      // If already deployed, return early without attempting deployment
      if (alreadyDeployed) {
        return {
          success: true,
          safeAddress,
          txHash: "0x0",
          status: "deployed",
        };
      }

      const internalStrategy = strategy
        ? toInternalStrategy(strategy)
        : "safe_strategy";

      const deploymentResult = await deploySafeAccount({
        owner: walletClient,
        safeOwnerAddress: userAddress as Address,
        chain: chainConfig.chain,
        publicClient: chainConfig.publicClient,
        chainId,
        httpClient: this.httpClient,
        strategy: internalStrategy,
      });

      // Reset session key status since deploying a new Safe invalidates
      // any previously active session key on the backend
      this.hasActiveSessionKey = false;

      // Initialize user after Safe deployment
      try {
        await this.initializeUser(deploymentResult.safeAddress, chainId);
      } catch (initError) {
        // Log the error but don't fail deployment
        console.warn(
          "Failed to initialize user after Safe deployment:",
          (initError as Error).message
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
   * Create session key with auto-fetched configuration from Zyfai API
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
      const sessionConfigResponse = await this.httpClient.get<any>(
        ENDPOINTS.SESSION_KEYS_CONFIG
      );

      // Handle both array format and wrapped object format
      const sessionConfig = Array.isArray(sessionConfigResponse)
        ? sessionConfigResponse
        : sessionConfigResponse.sessions;

      if (!sessionConfig || sessionConfig.length === 0) {
        throw new Error("No session configuration available from API");
      }

      // Parse the session config (convert chainId to BigInt)
      const sessions: Session[] = sessionConfig.map((session: any) => ({
        ...session,
        chainId: BigInt(session.chainId),
      }));

      // Detect permitGenericPolicy by checking for DEFAULT action target
      // This matches the frontend logic exactly (rhinestone.utils.ts lines 468-474)
      const DEFAULT_ACTION_TARGET =
        "0x0000000000000000000000000000000000000001";
      const DEFAULT_ACTION_SELECTOR = "0x00000001";

      const permitGenericPolicy = sessionConfig.some((session: any) =>
        session.actions?.some(
          (action: any) =>
            action.actionTarget === DEFAULT_ACTION_TARGET &&
            action.actionTargetSelector === DEFAULT_ACTION_SELECTOR
        )
      );

      // Determine account type for ignoreSecurityAttestations
      const chainConfig = getChainConfig(chainId, this.rpcUrls);
      const accountType = await getAccountType(
        userAddress as Address,
        chainConfig.publicClient
      );

      const signingParams: SigningParams = {
        permitGenericPolicy,
        ignoreSecurityAttestations: accountType === "Safe",
      };

      // Sign the session key with derived signing params
      const signatureResult = await this.signSessionKey(
        userAddress,
        chainId,
        sessions,
        signingParams
      );

      // Ensure signature is available (should always be from signSessionKey)
      if (!signatureResult.signature) {
        throw new Error("Failed to obtain session key signature");
      }

      // Update user protocols before activating session key
      await this.updateUserProtocols(chainId);

      const signer = sessions[0].sessionValidator as Address;
      console.log("Session validator:", signer);
      // Register the session key on the backend so it becomes active immediately
      const activation = await this.activateSessionKey(
        signer as Address,
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
    sessions: Session[],
    signingParams?: SigningParams
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
      const chainConfig = getChainConfig(chainId, this.rpcUrls);

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
        .map((id) => getChainConfig(id, this.rpcUrls).publicClient);

      // Sign the session key
      const { signature, sessionNonces } = await signSessionKey(
        {
          owner: walletClient,
          safeOwnerAddress: userAddress as Address,
          chain: chainConfig.chain,
          publicClient: chainConfig.publicClient,
        },
        sessions,
        allPublicClients,
        signingParams
      );

      return {
        success: true,
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
   * Update user protocols with available protocols from the chain
   * This method is automatically called before activating session key
   *
   * @param chainId - Target chain ID
   * @internal
   */
  private async updateUserProtocols(chainId: SupportedChainId): Promise<void> {
    try {
      // Fetch available protocols for the chain
      const protocolsResponse = await this.getAvailableProtocols(chainId);

      if (
        !protocolsResponse.protocols ||
        protocolsResponse.protocols.length === 0
      ) {
        console.warn(`No protocols available for chain ${chainId}`);
        return;
      }

      // Extract protocol IDs
      const protocolIds = protocolsResponse.protocols.map((p) => p.id);

      // Update user profile with protocols
      await this.updateUserProfile({
        protocols: protocolIds,
      });
    } catch (error) {
      // Log error but don't fail session key creation
      console.warn(
        `Failed to update user protocols: ${(error as Error).message}`
      );
    }
  }

  /**
   * Activate session key via Zyfai API
   */
  private async activateSessionKey(
    signer: Address,
    signature: Hex,
    sessionNonces?: bigint[]
  ): Promise<AddSessionKeyResponse> {
    const nonces = this.normalizeSessionNonces(sessionNonces);

    const payload: AddSessionKeyRequest = {
      signer,
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
   * Token is automatically selected based on chain:
   * - Base (8453) and Arbitrum (42161): USDC
   * - Plasma (9745): USDT
   *
   * @param userAddress - User's address (owner of the Safe)
   * @param chainId - Target chain ID
   * @param amount - Amount in least decimal units (e.g., "100000000" for 100 USDC with 6 decimals)
   * @returns Deposit response with transaction hash
   *
   * @example
   * ```typescript
   * // Deposit 100 USDC (6 decimals) to Safe on Base
   * const result = await sdk.depositFunds(
   *   "0xUser...",
   *   8453,
   *   "100000000" // 100 USDC = 100 * 10^6
   * );
   * ```
   */
  async depositFunds(
    userAddress: string,
    chainId: SupportedChainId,
    amount: string
  ): Promise<DepositResponse> {
    try {
      if (!userAddress) {
        throw new Error("User address is required");
      }

      if (!isSupportedChain(chainId)) {
        throw new Error(`Unsupported chain ID: ${chainId}`);
      }

      if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
        throw new Error("Valid amount is required");
      }

      // Get default token address for the chain
      const token = getDefaultTokenAddress(chainId);

      const walletClient = this.getWalletClient();
      const chainConfig = getChainConfig(chainId, this.rpcUrls);

      // Get Safe address
      const safeAddress = await getDeterministicSafeAddress({
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
        address: token as Address,
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

      // Log deposit to backend
      try {
        await this.httpClient.post(ENDPOINTS.LOG_DEPOSIT, {
          chainId,
          transaction: txHash,
          token,
          amount,
        });
      } catch (logError) {
        console.warn("Failed to log deposit:", (logError as Error).message);
      }

      if (receipt.status !== "success") {
        throw new Error("Deposit transaction failed");
      }

      return {
        success: true,
        txHash,
        smartWallet: safeAddress,
        amount: amountBigInt.toString(),
      };
    } catch (error) {
      throw new Error(`Deposit failed: ${(error as Error).message}`);
    }
  }

  /**
   * Withdraw funds from Safe smart wallet
   * Initiates a withdrawal request to the Zyfai API
   * Note: The withdrawal is processed asynchronously, so txHash may not be immediately available
   * Funds are always withdrawn to the Safe owner's address (userAddress)
   *
   * @param userAddress - User's address (owner of the Safe)
   * @param chainId - Target chain ID
   * @param amount - Optional: Amount in least decimal units to withdraw (partial withdrawal). If not specified, withdraws all funds
   * @returns Withdraw response with message and optional transaction hash (available once processed)
   *
   * @example
   * ```typescript
   * // Full withdrawal
   * const result = await sdk.withdrawFunds("0xUser...", 8453);
   * console.log(result.message); // "Withdrawal request sent"
   *
   * // Partial withdrawal of 50 USDC (6 decimals)
   * const result = await sdk.withdrawFunds(
   *   "0xUser...",
   *   8453,
   *   "50000000" // 50 USDC = 50 * 10^6
   * );
   * ```
   */
  async withdrawFunds(
    userAddress: string,
    chainId: SupportedChainId,
    amount?: string
  ): Promise<WithdrawResponse> {
    try {
      if (!userAddress) {
        throw new Error("User address is required");
      }

      if (!isSupportedChain(chainId)) {
        throw new Error(`Unsupported chain ID: ${chainId}`);
      }

      const chainConfig = getChainConfig(chainId, this.rpcUrls);

      // Try to get smart wallet address from API first
      let safeAddress: Address;
      try {
        const smartWalletInfo = await this.getSmartWalletByEOA(userAddress);
        if (smartWalletInfo.smartWallet) {
          safeAddress = smartWalletInfo.smartWallet;
        } else {
          // No smart wallet found in API, calculate deterministically
          safeAddress = await getDeterministicSafeAddress({
            safeOwnerAddress: userAddress as Address,
            chain: chainConfig.chain,
            publicClient: chainConfig.publicClient,
          });
        }
      } catch {
        safeAddress = await getDeterministicSafeAddress({
          safeOwnerAddress: userAddress as Address,
          chain: chainConfig.chain,
          publicClient: chainConfig.publicClient,
        });
      }

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
        });
      } else {
        // Full withdrawal - ask backend to trigger automatic withdrawal flow
        response = await this.httpClient.get(ENDPOINTS.USER_WITHDRAW, {
          params: { chainId },
        });
      }

      const success = response?.success ?? true;
      const message = response?.message || "Withdrawal request sent";
      const txHash = response?.txHash || response?.transactionHash;

      return {
        success,
        message,
        txHash,
        type: amount ? "partial" : "full",
        amount: amount || "all",
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
   * const protocols = await sdk.getAvailableProtocols(8453);
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
   * const basePositions = await sdk.getPositions(userAddress, 8453);
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

      const smartWalletInfo = await this.getSmartWalletByEOA(userAddress);

      // If no smart wallet exists, return empty positions
      if (!smartWalletInfo.smartWallet) {
        return {
          success: true,
          userAddress,
          positions: [],
        };
      }

      // Use the /data/position endpoint with smart wallet address
      const response = await this.httpClient.get<any>(
        ENDPOINTS.DATA_POSITION(smartWalletInfo.smartWallet)
      );

      // Convert strategy field in position data from backend format to public format
      const convertedPositions = response
        ? [convertStrategyToPublic(response)]
        : [];

      return {
        success: true,
        userAddress,
        positions: convertedPositions,
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

      // Convert strategy from backend format to public format
      const convertedResponse = convertStrategyToPublic(response);

      return {
        success: true,
        user: {
          id: convertedResponse.id,
          address: convertedResponse.address,
          smartWallet: convertedResponse.smartWallet,
          chains: convertedResponse.chains || [],
          protocols: convertedResponse.protocols || [],
          hasActiveSessionKey: convertedResponse.hasActiveSessionKey || false,
          email: convertedResponse.email,
          strategy: convertedResponse.strategy,
          telegramId: convertedResponse.telegramId,
          walletType: convertedResponse.walletType,
          autoSelectProtocols: convertedResponse.autoSelectProtocols || false,
          autocompounding: convertedResponse.autocompounding,
          omniAccount: convertedResponse.omniAccount,
          crosschainStrategy: convertedResponse.crosschainStrategy,
          agentName: convertedResponse.agentName,
          customization: convertedResponse.customization,
          executorProxy: convertedResponse.executorProxy,
          splitting: convertedResponse.splitting,
          minSplits: convertedResponse.minSplits,
          registered: convertedResponse.registered,
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
   * Get total value locked (TVL) across all Zyfai accounts
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

  // ============================================================================
  // APY Per Strategy Methods
  // ============================================================================

  /**
   * Get APY per strategy for a specific chain
   *
   * @param crossChain - Whether to get cross-chain APY (true = omni account, false = simple account)
   * @param days - Time period: 7, 14, or 30
   * @param strategy - Strategy type: "conservative" (default) or "aggressive"
   * @returns APY per strategy for a specific chain
   *
   * @example
   * ```typescript
   * const apyPerStrategy = await sdk.getAPYPerStrategy(false, 7, "conservative");
   * console.log("APY per strategy per chain:", apyPerStrategy.data);
   * ```
   */
  async getAPYPerStrategy(
    crossChain: boolean = false,
    days: number = 7,
    strategy: Strategy = "conservative"
  ): Promise<APYPerStrategyResponse> {
    try {
      const internalStrategy = toInternalStrategy(strategy);
      const internalStrategyShort =
        internalStrategy === "safe_strategy" ? "safe" : "degen";

      const response = await this.httpClient.dataGet<any>(
        DATA_ENDPOINTS.APY_PER_STRATEGY(crossChain, days, internalStrategyShort)
      );

      // Convert strategy field in each data item from backend format to public format
      const convertedData = convertStrategiesToPublicAndNaming(
        response.data || []
      ) as any;

      return {
        success: true,
        count: response.count || 0,
        data: convertedData,
      };
    } catch (error) {
      throw new Error(
        `Failed to get APY per strategy: ${(error as Error).message}`
      );
    }
  }

  /**
   * Get total volume across all Zyfai accounts
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

      // Convert strategy field in each history entry from backend format to public format
      const convertedData = convertStrategiesToPublic(response.data || []);

      return {
        success: true,
        walletAddress,
        data: convertedData,
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
   * Get conservative (low-risk) yield opportunities
   *
   * @param chainId - Optional chain ID filter
   * @returns List of conservative yield opportunities
   *
   * @example
   * ```typescript
   * const opportunities = await sdk.getConservativeOpportunities(8453);
   * opportunities.data.forEach(o => console.log(o.protocolName, o.apy));
   * ```
   */
  async getConservativeOpportunities(
    chainId?: number
  ): Promise<OpportunitiesResponse> {
    try {
      const response = await this.httpClient.dataGet<any>(
        DATA_ENDPOINTS.OPPORTUNITIES_SAFE(chainId)
      );

      const data = response.data || response || [];

      return {
        success: true,
        chainId,
        strategyType: "conservative",
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
              strategyType: "conservative",
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
   * Get aggressive (high-risk, high-reward) yield opportunities
   *
   * @param chainId - Optional chain ID filter
   * @returns List of aggressive opportunities
   *
   * @example
   * ```typescript
   * const opportunities = await sdk.getAggressiveOpportunities(8453);
   * opportunities.data.forEach(o => console.log(o.protocolName, o.apy));
   * ```
   */
  async getAggressiveOpportunities(
    chainId?: number
  ): Promise<OpportunitiesResponse> {
    try {
      const response = await this.httpClient.dataGet<any>(
        DATA_ENDPOINTS.OPPORTUNITIES_DEGEN(chainId)
      );

      const data = response.data || response || [];

      return {
        success: true,
        chainId,
        strategyType: "aggressive",
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
              strategyType: "aggressive",
              status: o.status,
            }))
          : [],
      };
    } catch (error) {
      throw new Error(
        `Failed to get aggressive opportunities: ${(error as Error).message}`
      );
    }
  }

  /**
   * Get active conservative opportunities (status = "live") with risk and utilization data
   * Returns pool info, liquidity depth (true if > 1M), utilization rate, stability metrics, avg APY, and collateral
   *
   * @param chainId - Optional chain ID filter
   * @returns Active conservative opportunities with risk data
   *
   * @example
   * ```typescript
   * const opps = await sdk.getActiveConservativeOppsRisk(8453);
   * console.log(JSON.stringify(opps, null, 2));
   * ```
   */
  async getActiveConservativeOppsRisk(chainId?: number): Promise<any> {
    try {
      const response = await this.httpClient.dataGet<any>(
        DATA_ENDPOINTS.OPPORTUNITIES_SAFE(chainId)
      );

      const data = response.data || response || [];
      const active = Array.isArray(data)
        ? data
            .filter((o: any) => o.status === "live")
            .map((o: any) => {
              const tvl = o.tvl || 0;
              const liquidity = o.liquidity || 0;
              const utilizationRate =
                tvl > 0 ? (tvl - liquidity) / tvl : 0;

              return {
                poolName: o.pool_name,
                protocolName: o.protocol_name,
                chainId: o.chain_id,
                liquidityDepth: liquidity > 10_000_000 ? "deep" : liquidity > 1_000_000 ? "moderate" : "shallow",
                utilizationRate: Math.round(utilizationRate * 10000) / 100,
                tvlStability: o.isTvlStable ?? null,
                apyStability: o.isApyStable30Days ?? null,
                tvlApyCombinedRisk: o.isApyTvlStable ?? null,
                avgCombinedApy7d: o.averageCombinedApy7Days ?? null,
                avgCombinedApy15d: o.averageCombinedApy15Days ?? null,
                avgCombinedApy30d: o.averageCombinedApy30Days ?? null,
                collateralSymbols: o.collateral_symbols || [],
              };
            })
        : [];

      return active;
    } catch (error) {
      throw new Error(
        `Failed to get active conservative opportunities risk: ${(error as Error).message}`
      );
    }
  }

  /**
   * Get active aggressive opportunities (status = "live") with risk and utilization data
   * Returns pool info, liquidity depth (true if > 1M), utilization rate, stability metrics, avg APY, and collateral
   *
   * @param chainId - Optional chain ID filter
   * @returns Active aggressive opportunities with risk data
   *
   * @example
   * ```typescript
   * const opps = await sdk.getActiveAggressiveOppsRisk(8453);
   * console.log(JSON.stringify(opps, null, 2));
   * ```
   */
  async getActiveAggressiveOppsRisk(chainId?: number): Promise<any> {
    try {
      const response = await this.httpClient.dataGet<any>(
        DATA_ENDPOINTS.OPPORTUNITIES_DEGEN(chainId)
      );

      const data = response.data || response || [];
      const active = Array.isArray(data)
        ? data
            .filter((o: any) => o.status === "live")
            .map((o: any) => {
              const tvl = o.tvl || 0;
              const liquidity = o.liquidity || 0;
              const utilizationRate =
                tvl > 0 ? (tvl - liquidity) / tvl : 0;

              return {
                poolName: o.pool_name,
                protocolName: o.protocol_name,
                chainId: o.chain_id,
                liquidityDepth: liquidity > 10_000_000 ? "deep" : liquidity > 1_000_000 ? "moderate" : "shallow",
                utilizationRate: Math.round(utilizationRate * 10000) / 100,
                tvlStability: o.isTvlStable ?? null,
                apyStability: o.isApyStable30Days ?? null,
                tvlApyCombinedRisk: o.isApyTvlStable ?? null,
                avgCombinedApy7d: o.averageCombinedApy7Days ?? null,
                avgCombinedApy15d: o.averageCombinedApy15Days ?? null,
                avgCombinedApy30d: o.averageCombinedApy30Days ?? null,
                collateralSymbols: o.collateral_symbols || [],
              };
            })
        : [];

      return active;
    } catch (error) {
      throw new Error(
        `Failed to get active aggressive opportunities risk: ${(error as Error).message}`
      );
    }
  }

  /**
   * Get conservative pool status with derived health, risk, APY trend, and yield consistency
   * Builds on getActiveConservativeOppsRisk and computes higher-level status indicators
   *
   * @param chainId - Optional chain ID filter
   * @returns Conservative pools with status data
   */
  async getConservativePoolStatus(chainId?: number): Promise<any> {
    const pools = await this.getActiveConservativeOppsRisk(chainId);
    return pools.map((p: any) => this.derivePoolStatus(p));
  }

  /**
   * Get aggressive pool status with derived health, risk, APY trend, and yield consistency
   * Builds on getActiveAggressiveOppsRisk and computes higher-level status indicators
   *
   * @param chainId - Optional chain ID filter
   * @returns Aggressive pools with status data
   */
  async getAggressivePoolStatus(chainId?: number): Promise<any> {
    const pools = await this.getActiveAggressiveOppsRisk(chainId);
    return pools.map((p: any) => this.derivePoolStatus(p));
  }

  private derivePoolStatus(p: any) {
    // Risk level: count negative signals
    let riskSignals = 0;
    if (p.tvlStability === false) riskSignals++;
    if (p.apyStability === false) riskSignals++;
    if (p.tvlApyCombinedRisk === false) riskSignals++;
    if (p.liquidityDepth === "shallow") riskSignals++;
    if (p.utilizationRate > 90) riskSignals++;

    const riskLevel =
      riskSignals >= 3 ? "high" : riskSignals >= 1 ? "medium" : "low";

    // Health score: combine stability flags + liquidity
    const stabilityScore =
      (p.tvlStability === true ? 1 : 0) +
      (p.apyStability === true ? 1 : 0) +
      (p.tvlApyCombinedRisk === true ? 1 : 0);
    const liquidityBonus = p.liquidityDepth === "deep" ? 1 : p.liquidityDepth === "moderate" ? 0.5 : 0;
    const healthTotal = stabilityScore + liquidityBonus;

    const healthScore =
      healthTotal >= 3 ? "healthy" : healthTotal >= 1.5 ? "moderate" : "risky";

    // APY trend: compare 7d vs 30d
    const apy7d = p.avgCombinedApy7d;
    const apy30d = p.avgCombinedApy30d;
    let apyTrend: string = "stable";
    if (apy7d != null && apy30d != null && apy30d !== 0) {
      const change = (apy7d - apy30d) / apy30d;
      if (change > 0.1) apyTrend = "rising";
      else if (change < -0.1) apyTrend = "falling";
    }

    // Yield consistency: spread between 7d and 30d
    let yieldConsistency: string = "consistent";
    if (apy7d != null && apy30d != null && apy30d !== 0) {
      const spread = Math.abs(apy7d - apy30d) / apy30d;
      if (spread > 0.3) yieldConsistency = "volatile";
      else if (spread > 0.1) yieldConsistency = "mixed";
    }

    return {
      poolName: p.poolName,
      protocolName: p.protocolName,
      chainId: p.chainId,
      healthScore,
      riskLevel,
      apyTrend,
      yieldConsistency,
      liquidityDepth: p.liquidityDepth,
      avgCombinedApy7d: p.avgCombinedApy7d,
    };
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
        weightedApyWithRzfiAfterFee: data.average_final_weighted_apy_after_fee_with_rzfi,
        weightedApyAfterFee: data.average_final_weighted_apy_after_fee
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

  // ============================================================================
  // SDK Key Methods
  // ============================================================================

  /**
   * Get allowed wallets for the current SDK API key
   * Returns the list of smart wallet addresses created via this SDK key
   *
   * @returns List of allowed wallet addresses with metadata
   *
   * @example
   * ```typescript
   * const result = await sdk.getSdkAllowedWallets();
   * console.log("Allowed wallets:", result.allowedWallets);
   * console.log("Total count:", result.metadata.walletsCount);
   * ```
   */
  async getSdkAllowedWallets(): Promise<{
    success: boolean;
    allowedWallets: Address[];
    metadata: {
      sdkKeyId: string;
      clientName: string;
      walletsCount: number;
    };
  }> {
    try {
      const response = await this.httpClient.get<any>(
        ENDPOINTS.SDK_ALLOWED_WALLETS
      );

      return {
        success: response.success || true,
        allowedWallets: response.allowedWallets || [],
        metadata: response.metadata || {
          sdkKeyId: "",
          clientName: "",
          walletsCount: 0,
        },
      };
    } catch (error) {
      throw new Error(
        `Failed to get SDK allowed wallets: ${(error as Error).message}`
      );
    }
  }

  /**
   * Get total TVL for all wallets under the current SDK API key
   * This method calculates the total value locked across all wallets created via this SDK key
   *
   * @returns SDK key TVL information including allowed wallets and their individual/total TVL
   *
   * @example
   * ```typescript
   * const sdkTvl = await sdk.getSdkKeyTVL();
   * console.log("Total TVL across all SDK wallets:", sdkTvl.totalTvl);
   * console.log("Number of wallets:", sdkTvl.allowedWallets.length);
   * console.log("TVL by wallet:", sdkTvl.tvlByWallet);
   * ```
   */
  async getSdkKeyTVL(): Promise<SdkKeyTVLResponse> {
    try {
      const response = await this.httpClient.get<any>(ENDPOINTS.SDK_TVL);

      return {
        success: response.success || true,
        allowedWallets: response.allowedWallets || [],
        totalTvl: response.totalTvl || 0,
        tvlByWallet: response.tvlByWallet || [],
        metadata: response.metadata || {
          sdkKeyId: "",
          clientName: "",
          walletsCount: 0,
        },
      };
    } catch (error) {
      throw new Error(
        `Failed to get SDK key TVL: ${(error as Error).message}`
      );
    }
  }

  // ============================================================================
  // Protocol/Pool Customization
  // ============================================================================

  /**
   * Configure protocol and pool customizations in batch.
   *
   * Allows granular control over which pools to use for each protocol on each chain.
   * This is useful for advanced users who want to target specific pools with desired APY/risk profiles.
   *
   * @param customizations - Array of customization configurations
   * @returns Response indicating success
   *
   * @example
   * ```typescript
   * // Configure multiple protocols across different chains
   * await sdk.customizeBatch([
   *   {
   *     protocolId: "protocol-uuid-1",
   *     pools: ["USDC Pool", "WETH Pool"],
   *     chainId: 8453,  // Base
   *     autoselect: false
   *   },
   *   {
   *     protocolId: "protocol-uuid-1",
   *     pools: ["USDC Vault"],
   *     chainId: 42161,  // Arbitrum
   *     autoselect: false
   *   },
   *   {
   *     protocolId: "protocol-uuid-2",
   *     pools: [],  // Empty array when autoselect is true
   *     chainId: 8453,
   *     autoselect: true  // Let engine auto-select best pools
   *   }
   * ]);
   * ```
   */
  async customizeBatch(
    customizations: CustomizationConfig[]
  ): Promise<CustomizeBatchResponse> {
    try {
      // Authenticate user first to get JWT token
      await this.authenticateUser();

      const response = await this.httpClient.post<CustomizeBatchResponse>(
        ENDPOINTS.CUSTOMIZE_BATCH,
        customizations
      );

      return response;
    } catch (error) {
      throw new Error(
        `Failed to save customizations: ${(error as Error).message}`
      );
    }
  }

  /**
   * Get available pools for a protocol.
   *
   * Returns the list of pools available for a given protocol, optionally filtered by strategy.
   *
   * @param protocolId - The protocol UUID
   * @param strategy - Optional strategy filter ("conservative" or "aggressive")
   * @returns List of available pool names
   *
   * @example
   * ```typescript
   * // Get all available pools for a protocol
   * const pools = await sdk.getAvailablePools("protocol-uuid");
   * console.log("Available pools:", pools.pools);
   *
   * // Get pools for conservative strategy only
   * const conservativePools = await sdk.getAvailablePools(
   *   "protocol-uuid",
   *   "conservative"
   * );
   * ```
   */
  async getAvailablePools(
    protocolId: string,
    strategy?: "conservative" | "aggressive"
  ): Promise<GetPoolsResponse> {
    try {
      // Map public strategy to internal if provided
      let internalStrategy: string | undefined;
      if (strategy) {
        if (!isValidPublicStrategy(strategy)) {
          throw new Error(
            `Invalid strategy: ${strategy}. Must be "conservative" or "aggressive".`
          );
        }
        internalStrategy = toInternalStrategy(strategy);
      }

      const response = await this.httpClient.get<GetPoolsResponse>(
        ENDPOINTS.CUSTOMIZATION_POOLS(protocolId, internalStrategy)
      );

      return response;
    } catch (error) {
      throw new Error(
        `Failed to get available pools: ${(error as Error).message}`
      );
    }
  }

  /**
   * Get currently selected pools for a protocol on a specific chain.
   *
   * Returns the pools that are currently configured for the authenticated user
   * for a given protocol and chain combination.
   *
   * @param protocolId - The protocol UUID
   * @param chainId - The chain ID
   * @returns Currently selected pools and autoselect status
   *
   * @example
   * ```typescript
   * const selected = await sdk.getSelectedPools(
   *   "protocol-uuid",
   *   8453  // Base
   * );
   *
   * console.log("Selected pools:", selected.pools);
   * console.log("Autoselect enabled:", selected.autoselect);
   * ```
   */
  async getSelectedPools(
    protocolId: string,
    chainId: number
  ): Promise<GetSelectedPoolsResponse> {
    try {
      // Authenticate user first to get JWT token
      await this.authenticateUser();

      const response = await this.httpClient.get<GetSelectedPoolsResponse>(
        ENDPOINTS.CUSTOMIZATION_SELECTED_POOLS(protocolId, chainId)
      );

      return response;
    } catch (error) {
      throw new Error(
        `Failed to get selected pools: ${(error as Error).message}`
      );
    }
  }

  // ============================================================================
  // Agent Identity Registry
  // ============================================================================

  /**
   * Supported chain IDs for the Identity Registry (ERC-8004)
   */
  private static readonly IDENTITY_REGISTRY_CHAIN_IDS = [8453, 42161] as const;

  /**
   * Check if a chain ID supports the Identity Registry
   */
  private isSupportedIdentityRegistryChain(
    chainId: number
  ): chainId is 8453 | 42161 {
    return (
      ZyfaiSDK.IDENTITY_REGISTRY_CHAIN_IDS as readonly number[]
    ).includes(chainId);
  }

  /**
   * Register an agent on the Identity Registry (ERC-8004)
   *
   * Fetches a tokenUri from the Zyfai API for the given smart wallet,
   * then calls `register(tokenUri)` on the Identity Registry contract.
   *
   * @param smartWallet - The smart wallet address to register as an agent
   * @param chainId - Chain ID to register on (only Base 8453 and Arbitrum 42161 supported)
   * @returns Response with transaction hash and registration details
   *
   * @example
   * ```typescript
   * const sdk = new ZyfaiSDK({ apiKey: "your-api-key" });
   * await sdk.connectAccount(privateKey, 8453);
   *
   * const result = await sdk.registerAgentOnIdentityRegistry("0xSmartWallet", 8453);
   * console.log("Tx hash:", result.txHash);
   * ```
   */
  async registerAgentOnIdentityRegistry(
    smartWallet: string,
    chainId: SupportedChainId
  ): Promise<RegisterAgentResponse> {
    if (!smartWallet) {
      throw new Error("Smart wallet address is required");
    }

    if (!this.isSupportedIdentityRegistryChain(chainId)) {
      throw new Error(
        `Chain ${chainId} is not supported for Identity Registry. Supported chains: Base (8453), Arbitrum (42161)`
      );
    }

    try {
      // Step 1: Get tokenUri from the API
      const tokenUriResponse =
        await this.httpClient.post<AgentTokenUriResponse>(
          ENDPOINTS.AGENT_TOKEN_URI,
          { smartWallet }
        );

      if (!tokenUriResponse.tokenUri) {
        throw new Error("API did not return a tokenUri");
      }

      // Step 2: Encode the register(tokenUri) call
      const callData = encodeFunctionData({
        abi: IDENTITY_REGISTRY_ABI,
        functionName: "register",
        args: [tokenUriResponse.tokenUri],
      });

      // Step 3: Send the transaction from the connected wallet
      const walletClient = this.getWalletClient(chainId);
      const chainConfig = getChainConfig(chainId, this.rpcUrls);

      const txHash = await walletClient.sendTransaction({
        to: IDENTITY_REGISTRY_ADDRESS,
        data: callData,
        chain: chainConfig.chain,
        account: walletClient.account!,
      });

      // Step 4: Wait for confirmation
      const receipt = await chainConfig.publicClient.waitForTransactionReceipt({
        hash: txHash,
      });

      if (receipt.status !== "success") {
        throw new Error("Identity Registry registration transaction failed");
      }

      return {
        success: true,
        txHash,
        chainId,
        smartWallet,
      };
    } catch (error) {
      throw new Error(
        `Failed to register agent on Identity Registry: ${(error as Error).message}`
      );
    }
  }
}
