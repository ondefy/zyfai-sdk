/**
 * Example: Get Daily Earnings
 *
 * Demonstrates fetching daily earnings breakdown for a wallet
 * Note: This uses the Data API which may require a separate API key
 */

import { config } from "dotenv";
import { SupportedChainId, ZyfaiSDK } from "../dist/index";

config();

async function main() {
  const apiKey = process.env.ZYFAI_API_KEY;
  const dataApiKey = process.env.ZYFAI_DATA_API_KEY; // Optional: separate Data API key
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
    dataApiKey, // Uses apiKey if not provided
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

  // Calculate date range (last 30 days)
  const endDate = new Date().toISOString().split("T")[0];
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  console.log(`Fetching daily earnings from ${startDate} to ${endDate}...`);
  try {
    const response = await sdk.getDailyEarnings(smartWallet, startDate, endDate);

    console.log("\nDaily Earnings:");
    console.log("-".repeat(80));
    console.log(`  Wallet: ${response.walletAddress}`);
    console.log(`  Date Range: ${response.filters.startDate} to ${response.filters.endDate}`);
    console.log(`  Total Days: ${response.count}\n`);

    if (response.data.length === 0) {
      console.log("  No daily earnings data found.");
    } else {
      let totalDelta = 0;
      console.log("  Date       | Total Earnings | Daily Delta  | Lifetime     | Unrealized");
      console.log("  " + "-".repeat(72));

      response.data.forEach((day: any) => {
        totalDelta += day.daily_total_delta || 0;
        const date = day.snapshot_date || "n/a";
        const total = (day.total_earnings || 0).toFixed(4).padStart(10);
        const delta = (day.daily_total_delta || 0).toFixed(4).padStart(10);
        const lifetime = (day.total_lifetime_earnings || 0).toFixed(4).padStart(10);
        const unrealized = (day.total_unrealized_earnings || 0).toFixed(4).padStart(10);
        console.log(`  ${date} | $${total} | $${delta} | $${lifetime} | $${unrealized}`);
      });

      console.log("  " + "-".repeat(72));
      console.log(`  Total Daily Delta: $${totalDelta.toFixed(4)}`);
    }
  } catch (error) {
    console.log("\nFailed to fetch daily earnings:", (error as Error).message);
  }
}

main().catch((error) => {
  console.error("Script failed:", error);
  process.exit(1);
});

