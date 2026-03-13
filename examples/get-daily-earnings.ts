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

  // Calculate date range (last 30 days)
  const endDate = new Date().toISOString().split("T")[0];
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  console.log(`Fetching daily earnings from ${startDate} to ${endDate}...`);
  try {
    const response = await sdk.getDailyEarnings(
      smartWallet,
      startDate,
      endDate
    );

    console.log("\nDaily Earnings:");
    console.log("-".repeat(80));
    console.log(`  Wallet: ${response.walletAddress}`);
    console.log(
      `  Date Range: ${response.filters.startDate} to ${response.filters.endDate}`
    );
    console.log(`  Total Days: ${response.count}\n`);

    if (response.data.length === 0) {
      console.log("  No daily earnings data found.");
    } else {
      response.data.forEach((day: any) => {
        const date = day.snapshot_date || "n/a";
        console.log(`\n  ${date}:`);
        console.log("    Total Earnings by Token:", JSON.stringify(day.total_earnings_by_token));
        console.log("    Daily Total Delta by Token:", JSON.stringify(day.daily_total_delta_by_token));
        console.log("    Lifetime by Token:", JSON.stringify(day.lifetime_earnings_by_token));
        console.log("    Unrealized by Token:", JSON.stringify(day.unrealized_earnings_by_token));
      });
    }
  } catch (error) {
    console.log("\nFailed to fetch daily earnings:", (error as Error).message);
  }
}

main().catch((error) => {
  console.error("Script failed:", error);
  process.exit(1);
});
