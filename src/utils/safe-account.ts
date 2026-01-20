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
  type Session,
} from "@rhinestone/module-sdk";
import { toSafeSmartAccount } from "permissionless/accounts";
import {
  getAddress,
  type Address,
  type Hash,
  type Hex,
  type PublicClient,
  type WalletClient,
  fromHex,
  toHex,
} from "viem";
import type { Chain } from "viem/chains";
import {
  type SmartAccount,
  entryPoint07Address,
} from "viem/account-abstraction";
import type { SupportedChainId } from "../config/chains";
import { ENDPOINTS } from "../config/endpoints";

export interface SafeAccountReadConfig {
  safeOwnerAddress: Address;
  chain: Chain;
  publicClient: PublicClient;
}

export interface SafeAccountWriteConfig extends SafeAccountReadConfig {
  owner: WalletClient;
}

export interface SafeDeploymentResult {
  safeAddress: Address;
  txHash?: Hash;
  isDeployed: boolean;
}

// Constants
const SAFE_7579_ADDRESS = "0x7579EE8307284F293B1927136486880611F20002";
const ERC7579_LAUNCHPAD_ADDRESS = "0x7579011aB74c46090561ea277Ba79D510c6C00ff";
const ACCOUNT_SALT = "zyfai";

/**
 * Gets the Safe smart account configuration
 */
export const getSafeAccount = async (
  config: SafeAccountReadConfig
): Promise<SmartAccount> => {
  const { safeOwnerAddress, publicClient } = config;

  if (!safeOwnerAddress) {
    throw new Error("Safe owner address is required");
  }

  // Ensure address is properly formatted (checksummed)
  const formattedOwnerAddress = getAddress(safeOwnerAddress);

  const ownableValidator = getOwnableValidator({
    owners: [formattedOwnerAddress],
    threshold: 1,
  });

  // Convert string salt to hex if needed
  const saltHex = fromHex(toHex(ACCOUNT_SALT), "bigint");

  const tempOwner = {
    address: formattedOwnerAddress,
    type: "json-rpc" as const,
  };

  const safeAccount = await toSafeSmartAccount({
    client: publicClient,
    owners: [tempOwner],
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
  config: SafeAccountReadConfig
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

export interface DeploySafeAccountConfig extends SafeAccountWriteConfig {
  httpClient: any; // HttpClient instance from SDK
  chainId: SupportedChainId;
  strategy?: "safe_strategy" | "degen_strategy";
}

export const deploySafeAccount = async (
  config: DeploySafeAccountConfig
): Promise<SafeDeploymentResult> => {
  try {
    const { owner, httpClient, chainId, strategy = "safe_strategy" } = config;

    if (!owner || !owner.account) {
      throw new Error(
        "Wallet not connected. Please connect your wallet first."
      );
    }

    // Step 1: Call backend to get userOpHashToSign
    const prepareResponse = (await httpClient.post(
      `${ENDPOINTS.SAFE_DEPLOY}?chainId=${chainId}`,
      { strategy }
    )) as {
      success: boolean;
      userOpHashToSign?: Hex;
      status: string;
    };

    if (!prepareResponse.userOpHashToSign) {
      throw new Error(
        "Backend did not return userOpHashToSign. Response: " +
          JSON.stringify(prepareResponse)
      );
    }

    const userOpHashToSign = prepareResponse.userOpHashToSign;

    // Step 2: Sign the userOpHashToSign with the user's wallet
    const userOpSignature = await owner.signMessage({
      account: owner.account,
      message: { raw: userOpHashToSign },
    });

    // Step 3: Call backend again with the signature to complete deployment
    const deployResponse = (await httpClient.post(
      `${ENDPOINTS.SAFE_DEPLOY}?chainId=${chainId}`,
      { userOpSignature, strategy }
    )) as {
      success: boolean;
      safeAddress?: Address;
      txHash?: string;
      status: string;
    };

    if (!deployResponse.success) {
      throw new Error(
        `Safe deployment failed: ${JSON.stringify(deployResponse)}`
      );
    }

    return {
      safeAddress: deployResponse.safeAddress || "0x",
      txHash: deployResponse.txHash as Hash | undefined,
      isDeployed: true,
    };
  } catch (error) {
    throw new Error(
      `Failed to deploy Safe account: ${(error as Error).message}`
    );
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
  config: SafeAccountWriteConfig,
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
