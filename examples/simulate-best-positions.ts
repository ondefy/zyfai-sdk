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

  const printPositions = (label: string, data: Record<string, any[]>) => {
    console.log(`\n${label}`);
    for (const [chainId, positions] of Object.entries(data)) {
      console.log(`Chain ${chainId}:`);
      console.log("=".repeat(70));
      positions.forEach((position) => {
        console.log(
          `  ${position.protocol} - ${position.pool}: $${position.amount.toFixed(2)} @ ${position.combined_apy.toFixed(2)}% APY`
        );
        console.log(`    TVL: $${(position.tvl / 1e6).toFixed(2)}M`);
        console.log(`    Calldata steps: ${position.calldata.length}`);
      });
    }
  };

  // Test 1: without userPositions
  console.log("Test 1: Simulating 500000 USDC on Base (no existing positions)...");
  try {
    const result = await sdk.simulateBestPositions({
      amount: 500000,
      token: "USDC",
      networks: 8453,
      strategy: "conservative",
      minSplit: 1,
      protocols: ["aave", "compound", "euler", "fluid", "moonwell", "morpho", "spark"],
    });
    printPositions("Without userPositions:", result.data);
  } catch (error) {
    console.log("Failed:", (error as Error).message);
  }

  // Test 2: with userPositions — existing Morpho position should influence the split
  console.log("\nTest 2: Same amount but with existing Morpho position...");
  try {
    const result = await sdk.simulateBestPositions({
      amount: 500000,
      token: "USDC",
      networks: 8453,
      strategy: "conservative",
      minSplit: 1,
      protocols: ["aave", "compound", "euler", "fluid", "moonwell", "morpho", "spark"],
      userPositions: [{ protocol: "Morpho", pool: "Gauntlet USDC Core", tvl: 1200000 }],
    });
    printPositions("With userPositions:", result.data);
  } catch (error) {
    console.log("Failed:", (error as Error).message);
  }

  console.log(
    "\nNote: calldata 'deposit' steps contain a <RECEIVER> placeholder " +
      "that must be replaced with the actual receiving address (e.g. the user's Safe) before sending."
  );
}

main().catch((error) => {
  console.error("Script failed:", error);
  process.exit(1);
});
