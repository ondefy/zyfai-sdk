/**
 * Connect Zyfai via Bankr Wallet sign API and deploy a Safe on Base.
 *
 * Env:
 * - ZYFAI_API_KEY
 * - BANKR_API_KEY (non-read-only Bankr key with Wallet + Agent API)
 * - BANKR_SIGNER_ADDRESS (optional; if omitted, one personal_sign probe runs to discover signer)
 *
 * Run: npx tsx examples/bankr-wrapper.ts
 */

import { config } from "dotenv";
import {
  ZyfaiSDK,
  createBankrWalletProvider,
  type SupportedChainId,
} from "../dist/index";

config();

async function main() {
  const zyfaiApiKey = process.env.ZYFAI_API_KEY;
  const bankrApiKey = process.env.BANKR_API_KEY;
  if (!zyfaiApiKey) {
    throw new Error("ZYFAI_API_KEY is required");
  }
  if (!bankrApiKey) {
    throw new Error("BANKR_API_KEY is required");
  }

  const chainId = 8453 as SupportedChainId;
  const signerAddress = process.env.BANKR_SIGNER_ADDRESS as `0x${string}` | undefined;

  const bankrProvider = createBankrWalletProvider({
    apiKey: bankrApiKey,
    chainId,
    signerAddress,
  });

  const sdk = new ZyfaiSDK({ apiKey: zyfaiApiKey });

  const connected = await sdk.connectAccount(bankrProvider, chainId);
  console.log("Connected EOA:", connected);

  const wallet = await sdk.getSmartWalletAddress(connected, chainId);
  console.log("Smart wallet (deterministic):", wallet.address);
  console.log("Already deployed:", wallet.isDeployed);

  if (!wallet.isDeployed) {
    const result = await sdk.deploySafe(connected, chainId, "conservative");
    console.log("deploySafe:", result);
  } else {
    console.log("Safe already deployed, skipping deploySafe.");
  }

  await sdk.disconnectAccount();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
