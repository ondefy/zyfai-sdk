/**
 * Example: Simulate Best Positions
 *
 * Demonstrates simulating the best yield positions for a given amount,
 * split across the top-ranked pools, with ready-to-execute calldata.
 */

import { config } from "dotenv";
import { ZyfaiSDK } from "../dist/index";

config();

async function main() {
  const apiKey = process.env.ZYFAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing env var. Please set ZYFAI_API_KEY.");
  }

  const sdk = new ZyfaiSDK({
    apiKey,
  });

  console.log("Simulating best positions for 3000 USDC on Base...");

  try {
    const result = await sdk.simulateBestPositions({
      amount: 3000,
      token: "USDC",
      networks: 8453,
      strategy: "conservative",
      minSplit: 3,
      protocols: ["aave", "compound", "euler", "fluid", "moonwell", "morpho", "spark"],
    });

    for (const [chainId, positions] of Object.entries(result.data)) {
      console.log(`\nChain ${chainId}:`);
      console.log("=".repeat(70));

      positions.forEach((position) => {
        console.log(
          `  ${position.protocol} - ${position.pool}: $${position.amount} @ ${position.combined_apy.toFixed(2)}% APY`
        );
        console.log(`    TVL: $${(position.tvl / 1e6).toFixed(2)}M`);
        console.log(`    Calldata steps: ${position.calldata.length}`);
      });
    }

    console.log(
      "\nNote: calldata 'deposit' steps contain a <RECEIVER> placeholder " +
        "that must be replaced with the actual receiving address (e.g. the user's Safe) before sending."
    );
  } catch (error) {
    console.log("Failed to simulate best positions:", (error as Error).message);
  }
}

main().catch((error) => {
  console.error("Script failed:", error);
  process.exit(1);
});
