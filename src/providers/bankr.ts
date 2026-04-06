/**
 * Bankr EIP-1193 Provider Adapter
 * 
 * Wraps Bankr's Agent API Sign endpoint to create an EIP-1193 compatible provider.
 * This allows using Bankr wallets with any EIP-1193 compatible SDK without exposing private keys.
 * 
 * @see https://docs.bankr.bot/agent-api/sign-endpoint
 */

import type { Address, Hex } from "../types";

export interface BankrProviderConfig {
  /** Bankr API key with signing permissions */
  apiKey: string;
  /** Base URL for Bankr API (default: https://api.bankr.bot) */
  baseUrl?: string;
  /** Default chain ID (default: 8453 - Base) */
  chainId?: number;
}

interface BankrSignResponse {
  success: boolean;
  signature?: string;
  signer?: string;
  signatureType?: string;
  error?: string;
}

interface BankrWallet {
  chain: string;
  address: string;
}

interface BankrUserResponse {
  success: boolean;
  wallets?: BankrWallet[];
  error?: string;
}

interface BankrSubmitResponse {
  success: boolean;
  transactionHash?: string;
  txHash?: string;
  error?: string;
}

/**
 * Creates an EIP-1193 compatible provider that uses Bankr's Agent API for signing.
 * 
 * @param config - Bankr provider configuration
 * @returns EIP-1193 compatible provider object
 * 
 * @example
 * ```typescript
 * import { createBankrProvider } from '@zyfai/sdk';
 * import { ZyfaiSDK } from '@zyfai/sdk';
 * 
 * const provider = createBankrProvider({ apiKey: process.env.BANKR_API_KEY });
 * const sdk = new ZyfaiSDK({ apiKey: process.env.ZYFAI_API_KEY });
 * 
 * const address = await sdk.connectAccount(provider);
 * await sdk.deploySafe(address, 8453, 'conservative', true);
 * ```
 */
export function createBankrProvider(config: BankrProviderConfig) {
  const { 
    apiKey, 
    baseUrl = "https://api.bankr.bot",
    chainId = 8453 
  } = config;

  if (!apiKey) {
    throw new Error("Bankr API key is required");
  }

  let cachedWalletAddress: string | null = null;

  const fetchBankr = async <T>(endpoint: string, body?: object): Promise<T> => {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: body ? "POST" : "GET",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as { message?: string; error?: string };
      throw new Error(errorData.message || errorData.error || `Bankr API error: ${response.status}`);
    }

    return response.json() as Promise<T>;
  };

  const getWalletAddress = async (): Promise<string> => {
    if (cachedWalletAddress) {
      return cachedWalletAddress;
    }

    const data = await fetchBankr<BankrUserResponse>("/agent/me");
    
    // Find EVM wallet from the wallets array
    const evmWallet = data.wallets?.find(w => w.chain === "evm");
    
    if (!evmWallet?.address) {
      throw new Error("No EVM wallet found in Bankr account");
    }

    cachedWalletAddress = evmWallet.address;
    return evmWallet.address;
  };

  const provider = {
    /**
     * EIP-1193 request method
     * Routes RPC calls to appropriate Bankr API endpoints
     */
    async request({ method, params }: { method: string; params?: any[] }): Promise<any> {
      switch (method) {
        case "eth_requestAccounts":
        case "eth_accounts": {
          const address = await getWalletAddress();
          return [address];
        }

        case "eth_chainId": {
          return `0x${chainId.toString(16)}`;
        }

        case "net_version": {
          return chainId.toString();
        }

        case "personal_sign": {
          const [messageHex, address] = params || [];
          
          // viem sends messages as hex-encoded data
          // We need to determine if it's:
          // 1. A text message (hex-encoded UTF-8) → decode to string
          // 2. A raw hash (32 bytes = 66 chars with 0x) → keep as hex
          let message = messageHex;
          
          if (typeof messageHex === "string" && messageHex.startsWith("0x")) {
            // 32-byte hashes are 66 chars (0x + 64 hex chars)
            // These should be sent as-is (raw hash signing)
            const isRawHash = messageHex.length === 66;
            
            if (!isRawHash) {
              // Text message - decode hex to UTF-8
              try {
                message = Buffer.from(messageHex.slice(2), "hex").toString("utf8");
              } catch {
                // If decoding fails, use original
                message = messageHex;
              }
            }
            // For raw hashes, keep messageHex as-is
          }

          const data = await fetchBankr<BankrSignResponse>("/agent/sign", {
            signatureType: "personal_sign",
            message,
          });

          if (!data.success || !data.signature) {
            throw new Error(data.error || "Bankr signing failed");
          }

          return data.signature;
        }

        case "eth_signTypedData":
        case "eth_signTypedData_v4": {
          const [address, typedDataString] = params || [];
          
          const typedData = typeof typedDataString === "string"
            ? JSON.parse(typedDataString)
            : typedDataString;

          const data = await fetchBankr<BankrSignResponse>("/agent/sign", {
            signatureType: "eth_signTypedData_v4",
            typedData,
          });

          if (!data.success || !data.signature) {
            throw new Error(data.error || "Bankr typed data signing failed");
          }

          return data.signature;
        }

        case "eth_sendTransaction": {
          const [tx] = params || [];
          
          // First sign the transaction
          const signData = await fetchBankr<BankrSignResponse>("/agent/sign", {
            signatureType: "eth_signTransaction",
            transaction: {
              to: tx.to,
              chainId: tx.chainId ? parseInt(tx.chainId, 16) : chainId,
              value: tx.value || "0",
              data: tx.data || "0x",
              gas: tx.gas,
              gasLimit: tx.gasLimit,
              maxFeePerGas: tx.maxFeePerGas,
              maxPriorityFeePerGas: tx.maxPriorityFeePerGas,
              nonce: tx.nonce,
            },
          });

          if (!signData.success || !signData.signature) {
            throw new Error(signData.error || "Bankr transaction signing failed");
          }

          // Then submit the signed transaction
          const submitData = await fetchBankr<BankrSubmitResponse>("/agent/submit", {
            signedTransaction: signData.signature,
            chainId: tx.chainId ? parseInt(tx.chainId, 16) : chainId,
          });

          if (!submitData.success) {
            throw new Error(submitData.error || "Bankr transaction submission failed");
          }

          return submitData.transactionHash || submitData.txHash;
        }

        case "eth_signTransaction": {
          const [tx] = params || [];

          const data = await fetchBankr<BankrSignResponse>("/agent/sign", {
            signatureType: "eth_signTransaction",
            transaction: {
              to: tx.to,
              chainId: tx.chainId ? parseInt(tx.chainId, 16) : chainId,
              value: tx.value || "0",
              data: tx.data || "0x",
              gas: tx.gas,
              gasLimit: tx.gasLimit,
              maxFeePerGas: tx.maxFeePerGas,
              maxPriorityFeePerGas: tx.maxPriorityFeePerGas,
              nonce: tx.nonce,
            },
          });

          if (!data.success || !data.signature) {
            throw new Error(data.error || "Bankr transaction signing failed");
          }

          return data.signature;
        }

        case "wallet_switchEthereumChain": {
          // Bankr handles this server-side, just acknowledge
          return null;
        }

        default:
          throw new Error(`Unsupported method: ${method}. Bankr provider supports: eth_requestAccounts, eth_accounts, eth_chainId, personal_sign, eth_signTypedData_v4, eth_sendTransaction, eth_signTransaction`);
      }
    },

    /**
     * Event listener stub (required by EIP-1193)
     * Bankr API doesn't support real-time events
     */
    on: (event: string, callback: (...args: any[]) => void) => {
      // No-op: Bankr doesn't support real-time events
      // Could implement polling for account changes if needed
    },

    /**
     * Remove event listener stub (required by EIP-1193)
     */
    removeListener: (event: string, callback: (...args: any[]) => void) => {
      // No-op
    },

    /**
     * Check if this is a Bankr provider
     */
    isBankr: true,
  };

  return provider;
}

export type BankrProvider = ReturnType<typeof createBankrProvider>;
