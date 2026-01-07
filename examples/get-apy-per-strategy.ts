/**
 * Example: Get APY Per Strategy
 *
 * Demonstrates fetching APY per strategy
 * Note: This uses the Data API which may require a separate API key
 */

import { config } from "dotenv";
import { SupportedChainId, ZyfaiSDK } from "../dist/index";

config();

async function main() {
  const apiKey = process.env.ZYFAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Missing env vars. Please set ZYFAI_API_KEY, BUNDLER_API_KEY, and PRIVATE_KEY."
    );
  }

  const chainId = Number(process.env.CHAIN_ID ?? 8453) as SupportedChainId;

  const sdk = new ZyfaiSDK({
    apiKey,
  });

  console.log("SDK initialized. Connecting account...");
  const connectedEOA = await sdk.connectAccount(process.env.PRIVATE_KEY, chainId);
  console.log(`Connected EOA: ${connectedEOA}\n`);

  // Get smart wallet address
  const walletInfo = await sdk.getSmartWalletAddress(connectedEOA, chainId);
  const smartWallet = walletInfo.address;
  console.log(`Smart Wallet: ${smartWallet}\n`);

  // Test different periods
  const periods: Array<"7D" | "14D" | "30D"> = ["7D", "14D", "30D"];

  for (const period of periods) {
    console.log(`\nFetching ${period} APY Per Strategy...`);
    console.log("-".repeat(60));

    try {
      const response = await sdk.getAPYPerStrategy(false, period, "safe");

      console.log(response);
    } catch (error) {
      console.log(`  Failed: ${(error as Error).message}`);
    }
  }
}

main().catch((error) => {
  console.error("Script failed:", error);
  process.exit(1);
});
