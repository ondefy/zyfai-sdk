/**
 * Example: Get TVL and Volume
 *
 * Demonstrates fetching total value locked and trading volume
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
  await sdk.connectAccount(privateKey, chainId);
  console.log("Connected.\n");

  // Get TVL
  console.log("Fetching Total Value Locked (TVL)...");
  try {
    const tvlResponse = await sdk.getTVL();
    console.log("\nTVL Data:");
    console.log("-".repeat(40));
    console.log(`  Total TVL: $${tvlResponse.totalTvl?.toLocaleString() || "0"}`);

    if (tvlResponse.byChain) {
      console.log("\n  By Chain:");
      Object.entries(tvlResponse.byChain).forEach(([chain, value]) => {
        console.log(`    ${chain}: $${value.toLocaleString()}`);
      });
    }
  } catch (error) {
    console.error("Failed to fetch TVL:", (error as Error).message);
  }

  // Get Volume
  console.log("\nFetching Trading Volume...");
  try {
    const volumeResponse = await sdk.getVolume();
    console.log("\nVolume Data:");
    console.log("-".repeat(40));
    console.log(`  Total Volume: $${volumeResponse.volumeInUSD}`);
  } catch (error) {
    console.error("Failed to fetch volume:", (error as Error).message);
  }
}

main().catch((error) => {
  console.error("Script failed:", error);
  process.exit(1);
});

