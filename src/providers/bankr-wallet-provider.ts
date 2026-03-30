/**
 * EIP-1193 provider that signs via Bankr Wallet API (POST /wallet/sign).
 * Other JSON-RPC methods are forwarded to the chain RPC (read / sendRaw only).
 */

import { getAddress, hexToString, numberToHex } from "viem";
import type { Address, Hex } from "viem";

import { getChainConfig, type SupportedChainId } from "../config/chains";
import type { RpcUrlsConfig } from "../types";

const DEFAULT_SIGN_URL = "https://api.bankr.bot/wallet/sign";

type BankrSignResponseJson = {
  success?: boolean;
  signature?: Hex;
  signer?: Address;
  signatureType?: string;
  error?: string;
  message?: string;
};

export interface BankrWalletProviderConfig {
  /** Bankr API key (Wallet + Agent API enabled, non-read-only). */
  apiKey: string;
  chainId: SupportedChainId;
  /** EOA controlled by Bankr. If omitted, resolved via a one-time personal_sign probe. */
  signerAddress?: Address;
  /** Override Bankr sign endpoint. */
  signUrl?: string;
  /** Optional per-chain RPC overrides (same as ZyfaiSDK). */
  rpcUrls?: RpcUrlsConfig;
}

type Eip1193Request = {
  method: string;
  params?: readonly unknown[] | object;
};

function hexToBigIntString(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "bigint") return value.toString(10);
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value).toString(10);
  }
  if (typeof value === "string") {
    if (value.startsWith("0x")) return BigInt(value).toString(10);
    return value;
  }
  return undefined;
}

function hexToNumber(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.startsWith("0x")) {
    return Number(BigInt(value));
  }
  return undefined;
}

/**
 * Maps a viem / EIP-1474 eth_signTransaction request object to Bankr's JSON body shape.
 */
function toBankrTransactionPayload(
  tx: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  if (typeof tx.from === "string") out.from = tx.from;
  if (typeof tx.to === "string") out.to = tx.to;
  if (typeof tx.data === "string") out.data = tx.data;

  const chainId = hexToNumber(tx.chainId);
  if (chainId !== undefined) out.chainId = chainId;

  const value = hexToBigIntString(tx.value);
  if (value !== undefined) out.value = value;

  const gas = hexToBigIntString(tx.gas);
  if (gas !== undefined) out.gas = gas;

  const gasPrice = hexToBigIntString(tx.gasPrice);
  if (gasPrice !== undefined) out.gasPrice = gasPrice;

  const maxFeePerGas = hexToBigIntString(tx.maxFeePerGas);
  if (maxFeePerGas !== undefined) out.maxFeePerGas = maxFeePerGas;

  const maxPriorityFeePerGas = hexToBigIntString(tx.maxPriorityFeePerGas);
  if (maxPriorityFeePerGas !== undefined) {
    out.maxPriorityFeePerGas = maxPriorityFeePerGas;
  }

  const nonce = hexToBigIntString(tx.nonce);
  if (nonce !== undefined) out.nonce = nonce;

  const type = hexToBigIntString(tx.type);
  if (type !== undefined) out.type = type;

  return out;
}

async function forwardChainRpc(
  rpcUrl: string,
  method: string,
  params: unknown
): Promise<unknown> {
  const body = {
    jsonrpc: "2.0",
    id: Date.now(),
    method,
    params: params === undefined ? [] : params,
  };
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: { error?: { message?: string }; result?: unknown };
  try {
    json = JSON.parse(text) as typeof json;
  } catch {
    throw new Error(`RPC invalid JSON (${res.status}): ${text.slice(0, 200)}`);
  }
  if (json.error?.message) {
    throw new Error(json.error.message);
  }
  return json.result;
}

export type BankrEip1193Provider = {
  request: (args: Eip1193Request) => Promise<unknown>;
  on: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener: (
    event: string,
    listener: (...args: unknown[]) => void
  ) => void;
  removeAllListeners: (event?: string) => void;
};

/**
 * Creates an EIP-1193 provider suitable for {@link ZyfaiSDK.connectAccount}.
 * Signing uses Bankr `POST /wallet/sign` (personal_sign, eth_signTypedData_v4, eth_signTransaction).
 */
export function createBankrWalletProvider(
  config: BankrWalletProviderConfig
): BankrEip1193Provider {
  const signUrl = config.signUrl ?? DEFAULT_SIGN_URL;
  const { rpcUrl } = getChainConfig(config.chainId, config.rpcUrls);
  const chainIdHex = numberToHex(config.chainId);

  let cachedSigner: Address | null = config.signerAddress
    ? getAddress(config.signerAddress)
    : null;
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>();

  async function callBankrSign(body: Record<string, unknown>): Promise<{
    signature: Hex;
    signer: Address;
  }> {
    const res = await fetch(signUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": config.apiKey,
      },
      body: JSON.stringify(body),
    });
    const raw = (await res.json()) as BankrSignResponseJson;
    if (!res.ok || raw.success !== true || !raw.signature) {
      const msg =
        raw.message ||
        raw.error ||
        `Bankr sign failed (HTTP ${res.status})`;
      throw new Error(msg);
    }
    if (!raw.signer) {
      throw new Error("Bankr sign response missing signer");
    }
    return {
      signature: raw.signature,
      signer: getAddress(raw.signer),
    };
  }

  async function resolveSigner(): Promise<Address> {
    if (cachedSigner) return cachedSigner;
    const probe = await callBankrSign({
      signatureType: "personal_sign",
      message:
        "Zyfai SDK: Bankr provider signer discovery (no transaction authorization).",
    });
    cachedSigner = probe.signer;
    return cachedSigner;
  }

  return {
    request: async ({ method, params }) => {
      console.log("method", method);
      console.log("params", params);
      const p = params as unknown[] | undefined;

      if (method === "eth_requestAccounts") {
        const addr = await resolveSigner();
        return [addr];
      }

      if (method === "eth_accounts") {
        if (!cachedSigner) return [];
        return [cachedSigner];
      }

      if (method === "eth_chainId") {
        return chainIdHex;
      }

      if (method === "net_version") {
        return String(config.chainId);
      }

      if (method === "personal_sign") {
        if (!p || p.length < 2) {
          throw new Error("personal_sign: missing params");
        }
        const rawMessage = p[0] as string;
        console.log("rawMessage", rawMessage);
        // viem sends hex-encoded message; Bankr expects plain text
        const message = rawMessage
          ? hexToString(rawMessage as Hex)
          : rawMessage;

        console.log("message", message);
        const data = await callBankrSign({
          signatureType: "personal_sign",
          message,
        });
        if (!cachedSigner) cachedSigner = data.signer;
        return data.signature;
      }

      if (method === "eth_signTypedData_v4") {
        if (!p || p.length < 2) {
          throw new Error("eth_signTypedData_v4: missing params");
        }
        const typedDataRaw = p[1] as string;
        let typedData: Record<string, unknown>;
        try {
          typedData = JSON.parse(typedDataRaw) as Record<string, unknown>;
        } catch {
          throw new Error("eth_signTypedData_v4: invalid typed data JSON");
        }
        const data = await callBankrSign({
          signatureType: "eth_signTypedData_v4",
          typedData,
        });
        if (!cachedSigner) cachedSigner = data.signer;
        return data.signature;
      }

      if (method === "eth_signTransaction") {
        if (!p || !p[0] || typeof p[0] !== "object") {
          throw new Error("eth_signTransaction: missing transaction");
        }
        const txPayload = toBankrTransactionPayload(p[0] as Record<string, unknown>);
        const data = await callBankrSign({
          signatureType: "eth_signTransaction",
          transaction: txPayload,
        });
        if (!cachedSigner) cachedSigner = data.signer;
        return data.signature;
      }

      if (method === "eth_sendTransaction") {
        throw new Error(
          "eth_sendTransaction is not supported on BankrWalletProvider. Sign with eth_signTransaction and broadcast eth_sendRawTransaction yourself."
        );
      }

      return forwardChainRpc(rpcUrl, method, p ?? []);
    },

    on(event: string, listener: (...args: unknown[]) => void) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(listener);
    },

    removeListener(event: string, listener: (...args: unknown[]) => void) {
      listeners.get(event)?.delete(listener);
    },

    removeAllListeners(event?: string) {
      if (event === undefined) {
        listeners.clear();
        return;
      }
      listeners.delete(event);
    },
  };
}
