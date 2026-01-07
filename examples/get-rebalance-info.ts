/**
 * Example: Get Rebalance Info
 *
 * Demonstrates fetching rebalance information and frequency tier
 * Note: This uses the Data API which may require a separate API key
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

  const chainId = Number(process.env.CHAIN_ID ?? 8453) as SupportedChainId;

  const sdk = new ZyfaiSDK({
    apiKey,
  });

  console.log("SDK initialized. Connecting account...");
  const connectedEOA = await sdk.connectAccount(privateKey, chainId);
  console.log(`Connected EOA: ${connectedEOA}\n`);

  // Get smart wallet address
  const walletInfo = await sdk.getSmartWalletAddress(connectedEOA, chainId);
  const smartWallet = walletInfo.address;
  console.log(`Smart Wallet: ${smartWallet}\n`);

  // Get rebalance frequency for this wallet
  console.log("Fetching rebalance frequency tier...");
  try {
    const frequency = await sdk.getRebalanceFrequency(smartWallet);

    console.log("\nRebalance Frequency:");
    console.log("-".repeat(50));
    console.log(`  Wallet: ${frequency.walletAddress}`);
    console.log(`  Tier: ${frequency.tier}`);
    console.log(`  Max Rebalances/Day: ${frequency.frequency}`);
    if (frequency.description) {
      console.log(`  Description: ${frequency.description}`);
    }
  } catch (error) {
    console.log("Failed to get rebalance frequency:", (error as Error).message);
  }
}

main().catch((error) => {
  console.error("Script failed:", error);
  process.exit(1);
});
