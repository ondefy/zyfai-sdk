import type { Address, Chain, Hex } from "viem";
import { createPublicClient, createWalletClient, http } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { ERC20_ABI } from "../config/abis";
import { LOCAL_EXECUTION_API_BASE_URL } from "../config/endpoints";

const PRIVATE_KEY_RE = /^0x[a-fA-F0-9]{64}$/;

export type FreshFundedUser = {
  privateKey: Hex;
  address: Address;
  apiKey: string;
  funding: { usdcTxHash: Hex; ethTxHash: Hex };
};

export async function createIntegrationSdkApiKey(
  ownerWalletAddress: Address,
  clientName: string,
): Promise<string> {
  const response = await fetch(
    `${LOCAL_EXECUTION_API_BASE_URL}/api/v1/admin/sdk-api-keys`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": process.env.SDK_API_KEYS_ADMIN_API_KEY!,
      },
      body: JSON.stringify({ clientName, walletAddress: ownerWalletAddress }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Failed to create integration SDK API key: ${response.status} ${response.statusText}`,
    );
  }

  const payload = (await response.json()) as { data?: { apiKey?: string } };
  if (!payload.data?.apiKey) {
    throw new Error(
      "Integration SDK API key response did not include an API key",
    );
  }
  return payload.data.apiKey;
}

/**
 * Creates a throwaway EOA, registers an SDK API key, and funds it from `PRIVATE_KEY`.
 *
 * Ephemeral: the generated private key is not persisted. Any ETH or tokens sent to,
 * deposited from, or left on this address are permanently lost when the process exits.
 */
export async function setupFreshFundedUser(options: {
  chain: Chain;
  token: Address;
  depositAmount: bigint;
  fundingEthAmount: bigint;
  clientName: string;
}): Promise<FreshFundedUser> {
  const privateKey = generatePrivateKey();
  const address = privateKeyToAccount(privateKey).address;
  console.warn(
    `[integration] Ephemeral test user ${address}: funds sent to or consumed here are permanently lost.`,
  );
  const apiKey = await createIntegrationSdkApiKey(address, options.clientName);
  const master = privateKeyToAccount(process.env.PRIVATE_KEY as Hex);
  const walletClient = createWalletClient({
    account: master,
    chain: options.chain,
    transport: http(),
  });
  const publicClient = createPublicClient({
    chain: options.chain,
    transport: http(),
  });

  const ethTxHash = await walletClient.sendTransaction({
    to: address,
    value: options.fundingEthAmount,
  });
  const ethReceipt = await publicClient.waitForTransactionReceipt({
    hash: ethTxHash,
  });
  if (ethReceipt.status !== "success") {
    throw new Error("Fresh user ETH funding transaction failed");
  }

  const usdcTxHash = await walletClient.writeContract({
    address: options.token,
    abi: ERC20_ABI,
    functionName: "transfer",
    args: [address, options.depositAmount],
  });
  const usdcReceipt = await publicClient.waitForTransactionReceipt({
    hash: usdcTxHash,
    confirmations: 3,
  });
  if (usdcReceipt.status !== "success") {
    throw new Error("Fresh user token funding transaction failed");
  }

  const fundedTokenBalance = await publicClient.readContract({
    address: options.token,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [address],
  });
  if (fundedTokenBalance < options.depositAmount) {
    throw new Error(
      `Fresh user token funding balance ${fundedTokenBalance} is below expected ${options.depositAmount}`,
    );
  }

  return {
    privateKey,
    address,
    apiKey,
    funding: { ethTxHash, usdcTxHash },
  };
}

export function integrationEnvReady(): boolean {
  return skipIntegrationReason() === undefined;
}

export function skipIntegrationReason(): string | undefined {
  const apiKey = process.env.ZYFAI_API_KEY?.trim();
  const privateKey = process.env.PRIVATE_KEY?.trim();

  if (!apiKey) {
    return "missing ZYFAI_API_KEY — copy env.test.example to .env.test";
  }
  if (!privateKey) {
    return "missing PRIVATE_KEY — copy env.test.example to .env.test";
  }
  if (!PRIVATE_KEY_RE.test(privateKey)) {
    return "PRIVATE_KEY must be a 32-byte hex string (0x...) in .env.test";
  }
  return undefined;
}

export function depositReconciliationEnvReady(): boolean {
  return skipDepositReconciliationReason() === undefined;
}

export function skipDepositReconciliationReason(): string | undefined {
  const privateKey = process.env.PRIVATE_KEY?.trim();
  const adminApiKey = process.env.SDK_API_KEYS_ADMIN_API_KEY?.trim();

  if (!privateKey) {
    return "missing PRIVATE_KEY — copy env.test.example to .env.test";
  }
  if (!PRIVATE_KEY_RE.test(privateKey)) {
    return "PRIVATE_KEY must be a 32-byte hex string (0x...) in .env.test";
  }
  if (!adminApiKey) {
    return "missing SDK_API_KEYS_ADMIN_API_KEY — configure the local API admin key in .env.test";
  }
  return undefined;
}

export async function pollUntil<T>(
  fn: () => Promise<T>,
  predicate: (value: T) => boolean,
  options?: { intervalMs?: number; timeoutMs?: number; label?: string },
): Promise<{ value: T; elapsedMs: number }> {
  const intervalMs = options?.intervalMs ?? 5_000;
  const timeoutMs = options?.timeoutMs ?? 120_000;
  const label = options?.label ?? "condition";
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    const value = await fn();
    if (predicate(value)) {
      return { value, elapsedMs: Date.now() - started };
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Timed out waiting for ${label} after ${timeoutMs}ms`);
}
