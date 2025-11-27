/**
 * Safe Account Utilities
 * Safe wallet deployment using Permissionless and Rhinestone Module SDK
 */

import {
  RHINESTONE_ATTESTER_ADDRESS,
  getOwnableValidator,
} from "@rhinestone/module-sdk";
import { createSmartAccountClient } from "permissionless";
import { getAccountNonce } from "permissionless/actions";
import { erc7579Actions } from "permissionless/actions/erc7579";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { toSafeSmartAccount } from "permissionless/accounts";
import {
  http,
  type Address,
  type Hash,
  type Hex,
  type PublicClient,
  type WalletClient,
  encodeFunctionData,
  fromHex,
  pad,
  toHex,
} from "viem";
import type { Chain } from "viem/chains";
import {
  type SmartAccount,
  entryPoint07Address,
  getUserOperationHash,
} from "viem/account-abstraction";

export interface SafeAccountConfig {
  owner: WalletClient;
  chain: Chain;
  publicClient: PublicClient;
  bundlerUrl?: string;
  accountSalt?: string;
}

export interface SafeDeploymentResult {
  safeAddress: Address;
  txHash?: Hash;
  isDeployed: boolean;
}

// Constants
const SAFE_7579_ADDRESS = "0x7579EE8307284F293B1927136486880611F20002";
const ERC7579_LAUNCHPAD_ADDRESS = "0x7579011aB74c46090561ea277Ba79D510c6C00ff";
const DEFAULT_ACCOUNT_SALT = "zyfai-staging";

/**
 * Gets the Safe smart account configuration
 */
export const getSafeAccount = async (
  config: SafeAccountConfig
): Promise<SmartAccount> => {
  const { owner, publicClient, accountSalt = DEFAULT_ACCOUNT_SALT } = config;

  if (!owner || !owner.account) {
    throw new Error("Wallet not connected. Please connect your wallet first.");
  }

  const ownableValidator = getOwnableValidator({
    owners: [owner.account.address],
    threshold: 1,
  });

  const safeAccount = await toSafeSmartAccount({
    client: publicClient,
    owners: [owner],
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
    saltNonce: fromHex(toHex(accountSalt), "bigint"),
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
  const { publicClient, chain, bundlerUrl } = config;
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
 */
export const deploySafeAccount = async (
  config: SafeAccountConfig & { bundlerUrl: string }
): Promise<SafeDeploymentResult> => {
  try {
    const { owner, publicClient } = config;

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

    // Create smart account client
    const smartAccountClient = await getSmartAccountClient(config);

    // Deploy by sending a simple user operation
    // The Safe will be deployed automatically when the first transaction is sent
    const userOpHash = await smartAccountClient.sendUserOperation({
      calls: [
        {
          to: safeAddress,
          value: BigInt(0),
          data: "0x",
        },
      ],
    });

    // Wait for the transaction to be mined
    const receipt = await smartAccountClient.waitForUserOperationReceipt({
      hash: userOpHash,
    });

    return {
      safeAddress,
      txHash: receipt.receipt.transactionHash,
      isDeployed: true,
    };
  } catch (error) {
    throw new Error(
      `Failed to deploy Safe account: ${(error as Error).message}`
    );
  }
};

/**
 * Execute transactions via the Safe smart account
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
  const safeAccount = await getSafeAccount(config);

  const ownableValidator = getOwnableValidator({
    owners: [owner.account.address],
    threshold: 1,
  });

  // Get nonce for the transaction
  const nonce = await getAccountNonce(config.publicClient, {
    address: safeAccount.address,
    entryPointAddress: entryPoint07Address,
    key: BigInt(
      pad(ownableValidator.address, {
        dir: "right",
        size: 24,
      }) || 0
    ),
  });

  // Prepare user operation with provided calls
  const userOperation = await smartAccountClient.prepareUserOperation({
    account: safeAccount as any,
    calls: calls.map((call) => ({
      ...call,
      value: typeof call.value === "string" ? BigInt(call.value) : call.value,
    })),
    nonce: nonce,
  });

  // Get hash and sign the user operation
  const userOpHashToSign = getUserOperationHash({
    chainId: config.chain.id,
    entryPointAddress: entryPoint07Address,
    entryPointVersion: "0.7",
    userOperation,
  });

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
    return transaction.receipt.transactionHash;
  } catch (error) {
    console.error("Transaction failed:", error);
    throw new Error("Failed to execute transaction");
  }
};
