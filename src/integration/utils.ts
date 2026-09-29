import { describe } from "vitest";
import type { Address, Chain, Hex } from "viem";
import { createPublicClient, createWalletClient, http } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { ERC20_ABI } from "../config/abis";
import {
  type BackendEnvironment,
  getDataApiBaseUrl,
  getExecutionApiBaseUrl,
} from "../config/endpoints";
import type { SupportedChainId } from "../config/chains";
import type { SDKConfig } from "../types";

const PRIVATE_KEY_RE = /^0x[a-fA-F0-9]{64}$/;

const INTEGRATION_ENV_PREFIX: Record<BackendEnvironment, string> = {
  local: "LOCAL",
  staging: "STAGING",
  production: "PRODUCTION",
};

function parseIntegrationEnvironment(raw: string | undefined): BackendEnvironment {
  const value = (raw ?? "local").trim().toLowerCase();
  switch (value) {
    case "local":
      return "local";
    case "staging":
    case "stage":
      return "staging";
    case "production":
    case "prod":
      return "production";
    default:
      throw new Error(
        `Invalid ZYFAI_ENV="${raw}" — use local, staging, or production`,
      );
  }
}

/** Backend stack for integration tests (`ZYFAI_ENV`, default `local`). */
export function integrationEnvironment(): BackendEnvironment {
  return parseIntegrationEnvironment(process.env.ZYFAI_ENV);
}

/** Env var prefix for the active `ZYFAI_ENV` (`LOCAL`, `STAGING`, `PRODUCTION`). */
export function integrationEnvPrefix(): string {
  return INTEGRATION_ENV_PREFIX[integrationEnvironment()];
}

/**
 * Partner API key for the active environment.
 * Set `LOCAL_ZYFAI_API_KEY`, `STAGING_ZYFAI_API_KEY`, or `PRODUCTION_ZYFAI_API_KEY`
 * in `.env.test` (same `PRIVATE_KEY` across environments).
 */
export function integrationApiKeyVarName(env?: BackendEnvironment): string {
  const target = env ?? integrationEnvironment();
  return `${INTEGRATION_ENV_PREFIX[target]}_ZYFAI_API_KEY`;
}

export function readIntegrationApiKey(env?: BackendEnvironment): string | undefined {
  const target = env ?? integrationEnvironment();
  return process.env[integrationApiKeyVarName(target)]?.trim();
}

export function integrationApiUrls(): {
  executionApiUrl: string;
  dataApiUrl: string;
} {
  const env = integrationEnvironment();
  return {
    executionApiUrl: getExecutionApiBaseUrl(env),
    dataApiUrl: getDataApiBaseUrl(env),
  };
}

/** SDK constructor overrides for the current `ZYFAI_ENV`. */
export function integrationSdkConfig(): SDKConfig {
  const apiKey = readIntegrationApiKey();
  if (!apiKey) {
    throw new Error(
      `${integrationApiKeyVarName()} is required for integration tests (ZYFAI_ENV=${integrationEnvironment()})`,
    );
  }
  const { executionApiUrl, dataApiUrl } = integrationApiUrls();
  return { apiKey, executionApiUrl, dataApiUrl };
}

/**
 * SDK config for a throwaway partner key from `createIntegrationSdkApiKey`.
 * Sets `bypassMinPortfolio` so 0.1 USDC smokes work on staging/prod (harness only).
 */
export function integrationFreshUserSdkConfig(partnerApiKey: string): SDKConfig {
  const { executionApiUrl, dataApiUrl } = integrationApiUrls();
  return {
    apiKey: partnerApiKey,
    executionApiUrl,
    dataApiUrl,
    bypassMinPortfolio: true,
  };
}

export function integrationSdkApiKeysAdminKeyVarName(
  env?: BackendEnvironment,
): string {
  const target = env ?? integrationEnvironment();
  return `${INTEGRATION_ENV_PREFIX[target]}_SDK_API_KEYS_ADMIN_API_KEY`;
}

/**
 * `x-api-key` for `POST /admin/sdk-api-keys`.
 * Must match `SDK_API_KEYS_ADMIN_API_KEY` on the target api host.
 */
export function readIntegrationSdkApiKeysAdminKey(
  env?: BackendEnvironment,
): string | undefined {
  const target = env ?? integrationEnvironment();
  return process.env[integrationSdkApiKeysAdminKeyVarName(target)]?.trim();
}

/** 0.1 USDC (6 decimals) — keep fresh-user smokes small on every stack. */
export const FRESH_FUNDED_USER_USDC_AMOUNT = 100_000n;

/**
 * USDC amount for persistent-wallet release smokes (`deposit-withdraw`).
 * Local/staging only — production skips suites with {@link IntegrationSpendProfile}
 * `spends_funds`.
 */
export function integrationSmokeUsdcAmount(
  _chainId: SupportedChainId,
  _assetSymbol: string,
  _safeUsdcBalance: bigint,
): bigint {
  return FRESH_FUNDED_USER_USDC_AMOUNT;
}

/** Whether an integration suite may spend on-chain funds (declare at top of each test file). */
export type IntegrationSpendProfile = "readonly" | "spends_funds";

const PRODUCTION_SPEND_SKIP_REASON =
  "production integration tests must be readonly — this suite spends real funds (use ZYFAI_ENV=staging)";

/**
 * Combined skip reason: credentials/env gate first, then production block for fund spend.
 */
export function skipIntegrationSuiteReason(
  profile: IntegrationSpendProfile,
  credentialsReason: string | undefined,
): string | undefined {
  if (credentialsReason) {
    return credentialsReason;
  }
  if (profile === "spends_funds" && integrationEnvironment() === "production") {
    return PRODUCTION_SPEND_SKIP_REASON;
  }
  return undefined;
}

/** Minimal native token for one deposit tx from the ephemeral EOA. */
export const FRESH_FUNDED_USER_ETH_WEI = 20_000_000_000_000n;

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
  const { executionApiUrl } = integrationApiUrls();
  const adminApiKey = readIntegrationSdkApiKeysAdminKey();
  if (!adminApiKey) {
    throw new Error(
      `Set ${integrationSdkApiKeysAdminKeyVarName()} in .env.test ` +
        `(value must match SDK_API_KEYS_ADMIN_API_KEY on the api server — see README § Fresh-user tests)`,
    );
  }
  const response = await fetch(
    `${executionApiUrl}/api/v1/admin/sdk-api-keys`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": adminApiKey,
      },
      body: JSON.stringify({ clientName, walletAddress: ownerWalletAddress }),
    },
  );

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    throw new Error(
      `Failed to create integration SDK API key: ${response.status} ${response.statusText}` +
        (detail ? ` — ${detail}` : "") +
        (response.status === 401 && detail.includes("not configured")
          ? ". Add SDK_API_KEYS_ADMIN_API_KEY to the api server .env and reload PM2."
          : ""),
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
  const apiKey = readIntegrationApiKey();
  const privateKey = process.env.PRIVATE_KEY?.trim();

  if (!apiKey) {
    return `missing ${integrationApiKeyVarName()} — copy env.test.example to .env.test`;
  }
  if (!privateKey) {
    return "missing PRIVATE_KEY — copy env.test.example to .env.test";
  }
  if (!PRIVATE_KEY_RE.test(privateKey)) {
    return "PRIVATE_KEY must be a 32-byte hex string (0x...) in .env.test";
  }
  return undefined;
}

export function freshFundedUserEnvReady(): boolean {
  return skipFreshFundedUserReason() === undefined;
}

export function skipFreshFundedUserReason(): string | undefined {
  const privateKey = process.env.PRIVATE_KEY?.trim();
  const adminApiKey = readIntegrationSdkApiKeysAdminKey();

  if (!privateKey) {
    return "missing PRIVATE_KEY — copy env.test.example to .env.test";
  }
  if (!PRIVATE_KEY_RE.test(privateKey)) {
    return "PRIVATE_KEY must be a 32-byte hex string (0x...) in .env.test";
  }
  if (!adminApiKey) {
    return (
      `missing ${integrationSdkApiKeysAdminKeyVarName()} ` +
      "(must match server SDK_API_KEYS_ADMIN_API_KEY)"
    );
  }
  return undefined;
}

/** Log why a suite was skipped (Vitest skipIf is silent otherwise). */
export function warnIfIntegrationSkipped(
  reason: string | undefined,
  suiteId: string,
): void {
  if (reason) {
    console.warn(`[integration] skip ${suiteId}: ${reason}`);
  }
}

/** Credential gate paired with {@link IntegrationSpendProfile} in integration suites. */
export type IntegrationCredentialGate = "persistent_wallet" | "fresh_user";

export type IntegrationSuiteOptions = {
  spendProfile: IntegrationSpendProfile;
  /**
   * `persistent_wallet` — `PRIVATE_KEY` + env-prefixed partner API key (default).
   * `fresh_user` — master `PRIVATE_KEY` funds an ephemeral EOA + admin SDK key mint.
   */
  credentialGate?: IntegrationCredentialGate;
  timeout?: number;
};

function integrationCredentialSkipReason(
  gate: IntegrationCredentialGate,
): string | undefined {
  return gate === "fresh_user"
    ? skipFreshFundedUserReason()
    : skipIntegrationReason();
}

/**
 * Registers a Vitest suite with env/credential gates, production spend guard, and skip logging.
 * `suiteId` should match the file stem (e.g. `deposit-withdraw`).
 */
export function describeIntegrationSuite(
  suiteId: string,
  options: IntegrationSuiteOptions,
  defineTests: () => void,
): void {
  const gate = options.credentialGate ?? "persistent_wallet";
  const skipReason = skipIntegrationSuiteReason(
    options.spendProfile,
    integrationCredentialSkipReason(gate),
  );
  warnIfIntegrationSkipped(skipReason, suiteId);

  const runner = describe.skipIf(skipReason !== undefined);
  if (options.timeout !== undefined) {
    runner(suiteId, { timeout: options.timeout }, defineTests);
  } else {
    runner(suiteId, defineTests);
  }
}

const BLOCK_EXPLORER_BASE: Record<SupportedChainId, string> = {
  1: "https://etherscan.io",
  8453: "https://basescan.org",
  42161: "https://arbiscan.io",
};

function isSupportedChainId(value: number): value is SupportedChainId {
  return value === 1 || value === 8453 || value === 42161;
}

function isIntegrationTxHash(value: unknown): value is string {
  return typeof value === "string" && /^0x[0-9a-fA-F]{64}$/.test(value);
}

function isIntegrationAddress(value: unknown): value is string {
  return typeof value === "string" && /^0x[0-9a-fA-F]{40}$/.test(value);
}

/** Block explorer origin for SDK execution chains. */
export function integrationBlockExplorerBaseUrl(
  chainId: SupportedChainId,
): string {
  return BLOCK_EXPLORER_BASE[chainId];
}

export function integrationExplorerTxUrl(
  chainId: SupportedChainId,
  txHash: string,
): string {
  return `${integrationBlockExplorerBaseUrl(chainId)}/tx/${txHash}`;
}

export function integrationExplorerAddressUrl(
  chainId: SupportedChainId,
  address: string,
): string {
  return `${integrationBlockExplorerBaseUrl(chainId)}/address/${address}`;
}

/**
 * End-of-test evidence log for integration suites.
 * Emits one JSON line (fields + `links`) and a short `[integration]` link block for humans.
 */
export function logIntegrationEvidence(
  suiteId: string,
  payload: Record<string, unknown>,
): void {
  const chainIdRaw = payload.chainId;
  const chainId =
    typeof chainIdRaw === "number" && isSupportedChainId(chainIdRaw)
      ? chainIdRaw
      : undefined;

  const links: Record<string, string> = {
    executionApi: integrationApiUrls().executionApiUrl,
  };

  if (chainId !== undefined) {
    const setTx = (label: string, hash: unknown) => {
      if (isIntegrationTxHash(hash)) {
        links[label] = integrationExplorerTxUrl(chainId, hash);
      }
    };
    const setAddr = (label: string, addr: unknown) => {
      if (isIntegrationAddress(addr)) {
        links[label] = integrationExplorerAddressUrl(chainId, addr);
      }
    };

    setTx("depositTx", payload.depositTxHash);
    setTx("withdrawTx", payload.withdrawTxHash);
    setTx("tx", payload.txHash);

    setAddr("user", payload.userAddress);
    setAddr("smartWallet", payload.smartWallet);

    const funding = payload.funding;
    if (funding && typeof funding === "object" && !Array.isArray(funding)) {
      const f = funding as Record<string, unknown>;
      setTx("fundingEthTx", f.ethTxHash);
      setTx("fundingUsdcTx", f.usdcTxHash);
    }
  }

  console.log(
    JSON.stringify({
      evidence: suiteId,
      environment: integrationEnvironment(),
      ...payload,
      links,
    }),
  );

  const linkLines = Object.entries(links)
    .map(([label, url]) => `${label}: ${url}`)
    .join("\n");
  console.log(`[integration] ${suiteId} links\n${linkLines}`);
}

export { pollUntil } from "../utils/poll";
