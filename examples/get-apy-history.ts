/**
 * Example: Get Daily APY History
 *
 * Demonstrates fetching daily APY history with weighted averages
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

  // Test different periods
  const periods: Array<"7D" | "14D" | "30D"> = ["7D", "14D", "30D"];

  for (const period of periods) {
    console.log(`\nFetching ${period} APY History...`);
    console.log("-".repeat(60));

    try {
      const response = await sdk.getDailyApyHistory(smartWallet, period);

      console.log(`  Wallet: ${response.walletAddress}`);
      console.log(`  Requested Days: ${response.requestedDays || period}`);
      console.log(`  Actual Days: ${response.totalDays}`);
      console.log(
        `  Average Weighted APY: ${response.averageWeightedApy?.toFixed(4) || "n/a"}%`
      );

      const historyEntries = Object.entries(response.history || {});
      if (historyEntries.length > 0) {
        console.log(`\n  Daily Breakdown (last 5 days):`);
        historyEntries.slice(-5).forEach(([date, entry]) => {
          const apy = typeof entry === "object" && entry.apy ? entry.apy.toFixed(2) : "n/a";
          const weighted =
            typeof entry === "object" && entry.weightedApy
              ? entry.weightedApy.toFixed(2)
              : "n/a";
          console.log(`    ${date}: APY ${apy}%, Weighted ${weighted}%`);
        });
      } else {
        console.log("  No APY history data available.");
      }
    } catch (error) {
      console.log(`  Failed: ${(error as Error).message}`);
    }
  }
}

main().catch((error) => {
  console.error("Script failed:", error);
  process.exit(1);
});

