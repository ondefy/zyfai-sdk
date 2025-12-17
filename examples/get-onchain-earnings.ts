/**
 * Example: Get Onchain Earnings
 *
 * Demonstrates fetching and calculating onchain earnings for a wallet
 * Note: This uses the Data API which may require a separate API key
 */

import { config } from "dotenv";
import { SupportedChainId, ZyfaiSDK } from "../dist/index";

config();

async function main() {
  const apiKey = process.env.ZYFAI_API_KEY;
  const bundlerApiKey = process.env.BUNDLER_API_KEY;
  const privateKey = process.env.PRIVATE_KEY;

  if (!apiKey || !bundlerApiKey || !privateKey) {
    throw new Error(
      "Missing env vars. Please set ZYFAI_API_KEY, BUNDLER_API_KEY, and PRIVATE_KEY."
    );
  }

  const chainId = Number(process.env.CHAIN_ID ?? 8453) as SupportedChainId;

  const sdk = new ZyfaiSDK({
    apiKey,
    bundlerApiKey,
    environment: "staging",
  });

  console.log("SDK initialized. Connecting account...");
  const connectedEOA = await sdk.connectAccount(privateKey, chainId);
  console.log(`Connected EOA: ${connectedEOA}\n`);

  // Get smart wallet address
  const walletInfo = await sdk.getSmartWalletAddress(connectedEOA, chainId);
  const smartWallet = walletInfo.address;
  console.log(`Smart Wallet: ${smartWallet}\n`);

  // Get onchain earnings
  console.log("Fetching onchain earnings...");
  try {
    const earnings = await sdk.getOnchainEarnings(smartWallet);

    console.log("\nOnchain Earnings:");
    console.log("-".repeat(50));
    console.log(`  Wallet: ${earnings.data.walletAddress}`);
    console.log(`  Total Earnings: $${earnings.data.totalEarnings.toFixed(6)}`);
    console.log(
      `  Current Earnings: $${earnings.data.currentEarnings.toFixed(6)}`
    );
    console.log(
      `  Lifetime Earnings: $${earnings.data.lifetimeEarnings.toFixed(6)}`
    );

    if (
      earnings.data.unrealizedEarnings !== undefined &&
      typeof earnings.data.unrealizedEarnings === "number"
    ) {
      console.log(
        `  Unrealized Earnings: $${earnings.data.unrealizedEarnings.toFixed(6)}`
      );
    }

    if (earnings.data.currentEarningsByChain) {
      console.log("\n  Earnings by Chain:");
      Object.entries(earnings.data.currentEarningsByChain).forEach(
        ([chain, value]) => {
          const numValue = typeof value === "number" ? value : 0;
          console.log(`    Chain ${chain}: $${numValue.toFixed(6)}`);
        }
      );
    }

    if (earnings.data.lastCheckTimestamp) {
      console.log(`\n  Last Updated: ${earnings.data.lastCheckTimestamp}`);
    }
  } catch (error) {
    console.log(
      "\nFailed to fetch onchain earnings:",
      (error as Error).message
    );
  }

  // Option: Calculate/refresh earnings
  const shouldCalculate = process.env.CALCULATE_EARNINGS === "true";
  if (shouldCalculate) {
    console.log("\n\nCalculating/refreshing onchain earnings...");
    try {
      const updated = await sdk.calculateOnchainEarnings(smartWallet);
      console.log("Earnings recalculated:");
      console.log(`  Total: $${updated.data.totalEarnings.toFixed(6)}`);
    } catch (error) {
      console.log("Failed to calculate earnings:", (error as Error).message);
    }
  }
}

main().catch((error) => {
  console.error("Script failed:", error);
  process.exit(1);
});
