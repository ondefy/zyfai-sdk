/**
 * Example: Get Daily Earnings
 *
 * Demonstrates fetching daily earnings breakdown for a wallet
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

  // Calculate date range (last 30 days)
  const endDate = new Date().toISOString().split("T")[0];
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  console.log(`Fetching daily earnings from ${startDate} to ${endDate}...`);
  try {
    const response = await sdk.getDailyEarnings(smartWallet, startDate, endDate);

    console.log("\nDaily Earnings:");
    console.log("-".repeat(60));
    console.log(`  Wallet: ${response.walletAddress}`);
    console.log(`  Date Range: ${response.filters.startDate} to ${response.filters.endDate}`);
    console.log(`  Total Days: ${response.count}\n`);

    if (response.data.length === 0) {
      console.log("  No daily earnings data found.");
    } else {
      let totalEarnings = 0;
      console.log("  Date           | Earnings     | Balance      | APY");
      console.log("  " + "-".repeat(55));

      response.data.forEach((day) => {
        totalEarnings += day.earnings || 0;
        const earnings = (day.earnings || 0).toFixed(4).padStart(10);
        const balance = day.balance ? day.balance.toFixed(2).padStart(10) : "n/a".padStart(10);
        const apy = day.apy ? `${day.apy.toFixed(2)}%` : "n/a";
        console.log(`  ${day.date} | $${earnings} | $${balance} | ${apy}`);
      });

      console.log("  " + "-".repeat(55));
      console.log(`  Total Earnings: $${totalEarnings.toFixed(4)}`);
    }
  } catch (error) {
    console.log("\nFailed to fetch daily earnings:", (error as Error).message);
  }
}

main().catch((error) => {
  console.error("Script failed:", error);
  process.exit(1);
});

