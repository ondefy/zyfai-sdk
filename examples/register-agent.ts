/**
 * Example: Register Agent on Identity Registry (ERC-8004)
 *
 * Registers the connected wallet as an agent on the Identity Registry contract.
 * Supported chains: Base (8453), Arbitrum (42161)
 */

import { config } from "dotenv";
import { SupportedChainId, ZyfaiSDK } from "../dist/index";

config();

async function main() {
  const apiKey = process.env.ZYFAI_API_KEY;
  const privateKey = process.env.PRIVATE_KEY;

  if (!apiKey || !privateKey) {
    throw new Error(
      "Missing env vars. Please set ZYFAI_API_KEY and PRIVATE_KEY."
    );
  }

  // Only Base (8453) and Arbitrum (42161) are supported for Identity Registry
  const chainId = Number(process.env.CHAIN_ID ?? 8453) as SupportedChainId;

  const sdk = new ZyfaiSDK({ apiKey });

  console.log("SDK initialized. Connecting account...");
  const connectedEOA = await sdk.connectAccount(privateKey, chainId);
  console.log(`Connected EOA: ${connectedEOA}`);

  // Get smart wallet address
  const walletInfo = await sdk.getSmartWalletAddress(connectedEOA, chainId);
  const smartWallet = walletInfo.address;
  console.log(`Smart Wallet: ${smartWallet}\n`);

  // Register agent on Identity Registry
  console.log(
    `Registering agent on Identity Registry (chain ${chainId})...`
  );

  try {
    const result = await sdk.registerAgentOnIdentityRegistry(
      smartWallet,
      chainId
    );

    console.log("\nRegistration successful:");
    console.log(`  Tx Hash: ${result.txHash}`);
    console.log(`  Chain ID: ${result.chainId}`);
    console.log(`  Smart Wallet: ${result.smartWallet}`);
  } catch (error) {
    console.error(
      "\nRegistration failed:",
      (error as Error).message
    );
  }
}

main().catch((error) => {
  console.error("Script failed:", error);
  process.exit(1);
});
