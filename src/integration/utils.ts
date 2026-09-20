import { arbitrum, base, mainnet, type Chain } from "viem/chains";

/** Local zyfai-api from workspace `pnpm dev` (zyfai-api docker + start:dev). */
export const LOCAL_EXECUTION_API_URL = "http://localhost:3000";

export const ACCEPTANCE_SLO_MS = 5_000;
export const TERMINAL_SLO_MS = 120_000;
export const POLL_INTERVAL_MS = 2_000;

const PRIVATE_KEY_RE = /^0x[a-fA-F0-9]{64}$/;

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

export function getChain(chainId: number): Chain {
  switch (chainId) {
    case 1:
      return mainnet;
    case 8453:
      return base;
    case 42161:
      return arbitrum;
    default:
      throw new Error(`Unsupported chain ID: ${chainId}`);
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
