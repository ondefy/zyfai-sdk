/**
 * Safe Account Utilities
 * Safe wallet deployment using Permissionless and Rhinestone Module SDK
 */

import {
  RHINESTONE_ATTESTER_ADDRESS,
  getOwnableValidator,
  getAccount,
  getEnableSessionDetails,
  getPermissionId,
  getSessionNonce,
  getSmartSessionsValidator,
  getAccountLockerHook,
  getAccountLockerSourceExecutor,
  getAccountLockerTargetExecutor,
  type Session,
  type Module,
} from "@rhinestone/module-sdk";
import { createSmartAccountClient } from "permissionless";
import { erc7579Actions } from "permissionless/actions/erc7579";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { toSafeSmartAccount } from "permissionless/accounts";
import {
  http,
  getAddress,
  encodeFunctionData,
  type Address,
  type Hash,
  type Hex,
  type PublicClient,
  type WalletClient,
  fromHex,
  toHex,
  encodeAbiParameters,
  pad,
} from "viem";
import type { Chain } from "viem/chains";
import {
  type SmartAccount,
  entryPoint07Address,
} from "viem/account-abstraction";
import { getAccountNonce } from "permissionless/actions";
import { getUserOperationHash } from "viem/account-abstraction";
import type { Environment } from "../types";
import type { SupportedChainId } from "../config/chains";

export interface SafeAccountConfig {
  owner: WalletClient; // The wallet that signs for transactions
  safeOwnerAddress?: Address; // Optional: The address that will own the Safe (if different from owner)
  chain: Chain;
  publicClient: PublicClient;
  bundlerUrl?: string;
  environment?: Environment; // Environment to determine default account salt
}

export interface SafeDeploymentResult {
  safeAddress: Address;
  txHash?: Hash;
  isDeployed: boolean;
}

// Constants
const SAFE_7579_ADDRESS = "0x7579EE8307284F293B1927136486880611F20002";
const ERC7579_LAUNCHPAD_ADDRESS = "0x7579011aB74c46090561ea277Ba79D510c6C00ff";
const ACCOUNT_SALTS: Record<Environment, string> = {
  staging: "zyfai-staging",
  production: "zyfai",
};

// Module type IDs for ERC-7579
const MODULE_TYPE_IDS = {
  validator: 1n,
  executor: 2n,
  fallback: 3n,
  hook: 4n,
} as const;

// Module addresses and configurations
// Note: Module type from @rhinestone/module-sdk may have optional fields
// We match the frontend structure exactly
const SMART_SESSIONS_FALLBACK = {
  module: "0x12cae64c42f362e7d5a847c2d33388373f629177" as Address,
  address: "0x12cae64c42f362e7d5a847c2d33388373f629177" as Address,
  type: "fallback" as const,
  selector: encodeAbiParameters(
    [{ name: "functionSignature", type: "bytes4" }],
    ["0x84b0196e"]
  ),
  initData:
    "0x84b0196e00000000000000000000000000000000000000000000000000000000fe0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000000",
} as unknown as Module;

const INTENT_EXECUTOR = {
  address: "0x00000000005aD9ce1f5035FD62CA96CEf16AdAAF" as Address,
  type: "executor" as const,
  initData: "0x",
} as unknown as Module;

const PROXY_EXECUTOR = {
  address: "0xF659d30D4EB88B06A909F20839D8959Bd77d8790" as Address,
  type: "executor" as const,
  initData: "0x",
} as unknown as Module;

// Get modules to install based on chain ID
const getModulesToInstall = (chainId: SupportedChainId): Module[] => {
  const smartSessions = getSmartSessionsValidator({});
  const accountLockerHook = getAccountLockerHook({ isOmniMode: true });
  const accountLockerSourceExecutor = getAccountLockerSourceExecutor();
  const accountLockerTargetExecutor = getAccountLockerTargetExecutor();

  // Plasma uses V1_MODULES
  if (chainId === 9745) {
    return [
      smartSessions,
      SMART_SESSIONS_FALLBACK,
      INTENT_EXECUTOR,
      PROXY_EXECUTOR,
    ];
  }

  // Base and Arbitrum use DEFAULT_MODULES
  return [
    smartSessions,
    {
      ...accountLockerHook,
      type: "executor" as const,
    },
    accountLockerSourceExecutor,
    accountLockerTargetExecutor,
    SMART_SESSIONS_FALLBACK,
    INTENT_EXECUTOR,
    PROXY_EXECUTOR,
  ];
};

// Generate install module call data
const getInstallModuleCallData = (module: Module): Hex => {
  return encodeFunctionData({
    abi: [
      {
        type: "function",
        name: "installModule",
        inputs: [
          {
            type: "uint256",
            name: "moduleTypeId",
          },
          {
            type: "address",
            name: "module",
          },
          {
            type: "bytes",
            name: "initData",
          },
        ],
        outputs: [],
        stateMutability: "nonpayable",
      },
    ],
    functionName: "installModule",
    args: [
      MODULE_TYPE_IDS[module.type],
      module.address,
      module.initData || "0x",
    ],
  });
};

/**
 * Gets the Safe smart account configuration
 */
export const getSafeAccount = async (
  config: SafeAccountConfig
): Promise<SmartAccount> => {
  const {
    owner,
    safeOwnerAddress,
    publicClient,
    environment = "production",
  } = config;

  const effectiveSalt = ACCOUNT_SALTS[environment];

  if (!owner || !owner.account) {
    throw new Error("Wallet not connected. Please connect your wallet first.");
  }

  // The validator's owners MUST match the Safe's signing owners
  // When safeOwnerAddress is provided, we validate that it matches the connected wallet
  // This ensures the signer can actually authorize transactions
  const signerAddress = owner.account.address;

  if (!signerAddress) {
    throw new Error("Owner account address is required");
  }

  // Determine the effective owner address for the Safe
  // If safeOwnerAddress is provided and different from signer, use it for address calculation
  // (This allows read-only address calculation without requiring the actual wallet)
  // For transaction signing, the addresses must match (validated below)
  const effectiveOwnerAddress = safeOwnerAddress || signerAddress;

  if (!effectiveOwnerAddress) {
    throw new Error("Address is required");
  }

  // Ensure addresses are properly formatted (checksummed)
  const formattedEffectiveAddress = getAddress(effectiveOwnerAddress);

  // If safeOwnerAddress is provided and different from signer, this is likely a read-only operation
  // (e.g., calculating address for API calls). We allow this for address calculation,
  // but the signer won't be able to sign transactions for this Safe.
  const isReadOnly =
    safeOwnerAddress &&
    safeOwnerAddress.toLowerCase() !== signerAddress.toLowerCase();

  // Only validate address matching for non-read-only operations
  // (When we actually need to sign transactions)
  if (
    !isReadOnly &&
    safeOwnerAddress &&
    safeOwnerAddress.toLowerCase() !== signerAddress.toLowerCase()
  ) {
    throw new Error(
      `Connected wallet address (${signerAddress}) must match the Safe owner address (${safeOwnerAddress}). ` +
        `Please connect with the correct wallet.`
    );
  }

  const ownableValidator = getOwnableValidator({
    owners: [formattedEffectiveAddress], // Use formatted effective owner address for validator
    threshold: 1,
  });

  // Convert string salt to hex if needed
  const saltHex = fromHex(toHex(effectiveSalt), "bigint");

  const safeAccount = await toSafeSmartAccount({
    client: publicClient,
    owners: [owner.account], // Pass the owner object with address and signMessage capability
    version: "1.4.1",
    entryPoint: {
      address: entryPoint07Address,
      version: "0.7",
    },
    safe4337ModuleAddress: SAFE_7579_ADDRESS,
    erc7579LaunchpadAddress: ERC7579_LAUNCHPAD_ADDRESS,
    attesters: [RHINESTONE_ATTESTER_ADDRESS],
    attestersThreshold: 1,
    validators: [
      {
        address: ownableValidator.address,
        context: ownableValidator.initData,
      },
    ],
    saltNonce: saltHex,
  });

  return safeAccount;
};

/**
 * Gets the deterministic Safe address for an owner
 */
export const getDeterministicSafeAddress = async (
  config: SafeAccountConfig
): Promise<Address> => {
  try {
    const safeAccount = await getSafeAccount(config);
    return await safeAccount.getAddress();
  } catch (error) {
    throw new Error(
      `Failed to get deterministic Safe address: ${(error as Error).message}`
    );
  }
};

/**
 * Checks if a Safe account is deployed
 */
export const isSafeDeployed = async (
  address: Address,
  publicClient: PublicClient
): Promise<boolean> => {
  try {
    const code = await publicClient.getCode({ address });
    return !!code && code !== "0x";
  } catch (error) {
    console.error("Error checking if Safe is deployed:", error);
    return false;
  }
};

/**
 * Gets the account type (EOA or Safe)
 */
export const getAccountType = async (
  address: Address,
  publicClient: PublicClient
): Promise<"EOA" | "Safe" | "Unknown"> => {
  try {
    const code = await publicClient.getCode({ address });

    // If no code, it's an EOA
    if (!code || code === "0x" || code.length === 2) {
      return "EOA";
    }

    // Check if it's a Safe by attempting to read the threshold
    try {
      const threshold = await publicClient.readContract({
        address,
        abi: [
          {
            inputs: [],
            name: "getThreshold",
            outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
            stateMutability: "view",
            type: "function",
          },
        ],
        functionName: "getThreshold",
      });

      if (threshold !== undefined) {
        return "Safe";
      }
    } catch {
      // Not a Safe contract
    }

    return "Unknown";
  } catch (error) {
    console.error("Error checking account type:", error);
    return "Unknown";
  }
};

/**
 * Creates a smart account client with bundler and paymaster
 */
export const getSmartAccountClient = async (
  config: SafeAccountConfig & { bundlerUrl: string }
) => {
  const { chain, bundlerUrl } = config;
  const safeAccount = await getSafeAccount(config);

  const bundlerClient = createPimlicoClient({
    transport: http(bundlerUrl),
    entryPoint: {
      address: entryPoint07Address,
      version: "0.7",
    },
  });

  const smartAccountClient = createSmartAccountClient({
    account: safeAccount,
    chain: chain,
    bundlerTransport: http(bundlerUrl),
    paymaster: bundlerClient,
    userOperation: {
      estimateFeesPerGas: async () => {
        return (await bundlerClient.getUserOperationGasPrice()).fast;
      },
    },
  }).extend(erc7579Actions());

  return smartAccountClient as any;
};

/**
 * Deploys a Safe smart account with required modules
 * This matches the frontend behavior by installing modules during deployment
 */
export const deploySafeAccount = async (
  config: SafeAccountConfig & { bundlerUrl: string; chainId: SupportedChainId }
): Promise<SafeDeploymentResult> => {
  try {
    const { owner, publicClient, chainId } = config;

    if (!owner || !owner.account) {
      throw new Error(
        "Wallet not connected. Please connect your wallet first."
      );
    }

    // Get the deterministic Safe address
    const safeAddress = await getDeterministicSafeAddress(config);

    // Check if already deployed
    const isDeployed = await isSafeDeployed(safeAddress, publicClient);
    if (isDeployed) {
      return {
        safeAddress,
        isDeployed: true,
      };
    }

    // Get modules to install (matches frontend logic)
    const modulesToInstall = getModulesToInstall(chainId);

    // Create install calls for each module
    const installCalls = modulesToInstall.map((module) => ({
      to: safeAddress,
      data: getInstallModuleCallData(module),
    }));

    // Create smart account client
    const smartAccountClient = await getSmartAccountClient(config);

    // Get the Safe account for nonce calculation
    const safeAccount = await getSafeAccount(config);
    const ownableValidator = getOwnableValidator({
      owners: [owner.account.address],
      threshold: 1,
    });

    // Get nonce for the transaction (matches frontend logic)
    const nonce = await getAccountNonce(publicClient, {
      address: safeAddress,
      entryPointAddress: entryPoint07Address,
      key: BigInt(
        pad(ownableValidator.address as `0x${string}`, {
          dir: "right",
          size: 24,
        }) || 0
      ),
    });

    // Prepare user operation with module installation calls
    const userOperation = await smartAccountClient.prepareUserOperation({
      account: safeAccount as any,
      calls: installCalls,
      nonce: nonce,
    });

    // Get hash and sign the user operation (matches frontend logic)
    const userOpHashToSign = getUserOperationHash({
      chainId: chainId,
      entryPointAddress: entryPoint07Address,
      entryPointVersion: "0.7",
      userOperation,
    });

    // Sign the user operation hash
    // Note: WalletClient.signMessage requires account parameter
    if (!owner.account) {
      throw new Error("Owner account is required for signing");
    }
    userOperation.signature = await owner.signMessage({
      account: owner.account,
      message: { raw: userOpHashToSign },
    });

    // Send and wait for the user operation
    const userOpHash = await smartAccountClient.sendUserOperation(
      userOperation as any
    );

    try {
      const transaction = await smartAccountClient.waitForUserOperationReceipt({
        hash: userOpHash,
      });
      return {
        safeAddress,
        txHash: transaction.receipt.transactionHash,
        isDeployed: true,
      };
    } catch (error) {
      console.error("Transaction failed:", error);
      throw new Error("Failed to execute transaction");
    }
  } catch (error) {
    throw new Error(
      `Failed to deploy Safe account: ${(error as Error).message}`
    );
  }
};

/**
 * Execute transactions via the Safe smart account
 * Let the smart account client handle signing automatically
 */
export const executeTransactions = async (
  config: SafeAccountConfig & { bundlerUrl: string },
  calls: Array<{ to: Address; value: string | bigint; data: Hex }>
): Promise<Hash> => {
  const { owner } = config;

  if (!owner || !owner.account) {
    throw new Error("Wallet not connected. Please connect your wallet first.");
  }

  const smartAccountClient = await getSmartAccountClient(config);

  // Send user operation - the smart account client handles signing automatically
  // This uses the Safe's signUserOperation method internally
  const userOpHash = await smartAccountClient.sendUserOperation({
    calls: calls.map((call) => ({
      ...call,
      value: typeof call.value === "string" ? BigInt(call.value) : call.value,
    })),
  });

  try {
    const transaction = await smartAccountClient.waitForUserOperationReceipt({
      hash: userOpHash,
    });
    return transaction.receipt.transactionHash;
  } catch (error) {
    console.error("Transaction failed:", error);
    throw new Error("Failed to execute transaction");
  }
};

export interface SigningParams {
  permitGenericPolicy: boolean;
  ignoreSecurityAttestations: boolean;
}

/**
 * Sign session key for delegated transactions
 * Creates a signature that allows the session key to execute transactions on behalf of the Safe
 */
export const signSessionKey = async (
  config: SafeAccountConfig,
  sessions: Session[],
  allPublicClients?: PublicClient[],
  signingParams?: SigningParams
): Promise<{ signature: Hex; sessionNonces: bigint[] }> => {
  const { owner, publicClient } = config;

  if (!owner || !owner.account) {
    throw new Error("Wallet not connected. Please connect your wallet first.");
  }

  // Get the Safe account
  const safeAccount = await getSafeAccount(config);

  // Create account object for Rhinestone
  const account = getAccount({
    address: safeAccount.address,
    type: "safe",
  });

  // Use provided public clients or default to the config's public client
  // Sessions may target multiple chains, so we need clients for all of them
  const clients = allPublicClients || [publicClient];

  // Get session nonces for each session using the appropriate client
  const sessionNonces = await Promise.all(
    sessions.map((session) => {
      // Find the client for this session's chain
      const sessionChainId = Number(session.chainId);
      const client =
        clients.find((c) => c.chain?.id === sessionChainId) || publicClient;

      return getSessionNonce({
        client,
        account,
        permissionId: getPermissionId({
          session,
        }),
      });
    })
  );

  // Get session details to sign
  const sessionDetails = await getEnableSessionDetails({
    sessions,
    account,
    clients,
    permitGenericPolicy: signingParams?.permitGenericPolicy ?? true,
    sessionNonces,
    ignoreSecurityAttestations:
      signingParams?.ignoreSecurityAttestations ?? false,
  });

  // Sign the permission enable hash with the owner
  const signature = await owner.signMessage({
    account: owner.account,
    message: {
      raw: sessionDetails.permissionEnableHash,
    },
  });

  return {
    signature,
    sessionNonces,
  };
};
