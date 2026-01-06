/**
 * Example: Get Yield Opportunities
 *
 * Demonstrates fetching safe and degen yield opportunities
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
  await sdk.connectAccount(privateKey, chainId);
  console.log("Connected.\n");

  // Get Safe Opportunities
  console.log(`Fetching SAFE opportunities for chain ${chainId}...`);
  try {
    const safeOpps = await sdk.getSafeOpportunities(chainId);

    console.log("\nSafe Opportunities (Low Risk):");
    console.log("=".repeat(70));
    console.log(`  Chain: ${safeOpps.chainId || "all"}`);
    console.log(`  Count: ${safeOpps.data.length}\n`);

    if (safeOpps.data.length === 0) {
      console.log("  No safe opportunities found.");
    } else {
      // Sort by APY descending
      const sorted = [...safeOpps.data].sort((a, b) => b.apy - a.apy);
      console.log("  Protocol          | Pool                | APY      | TVL");
      console.log("  " + "-".repeat(65));

      sorted.slice(0, 10).forEach((opp) => {
        const protocol = (opp.protocolName || "").substring(0, 16).padEnd(16);
        const pool = (opp.poolName || "").substring(0, 18).padEnd(18);
        const apy = `${opp.apy.toFixed(2)}%`.padStart(8);
        const tvl = opp.tvl ? `$${(opp.tvl / 1e6).toFixed(2)}M` : "n/a";
        console.log(`  ${protocol} | ${pool} | ${apy} | ${tvl}`);
      });

      if (sorted.length > 10) {
        console.log(`\n  ... and ${sorted.length - 10} more opportunities`);
      }
    }
  } catch (error) {
    console.log(
      "Failed to fetch safe opportunities:",
      (error as Error).message
    );
  }

  // Get Degen Strategies
  console.log(`\n\nFetching DEGEN strategies for chain ${chainId}...`);
  try {
    const degenStrats = await sdk.getDegenStrategies(chainId);

    console.log("\nDegen Strategies (High Risk/High Reward):");
    console.log("=".repeat(70));
    console.log(`  Chain: ${degenStrats.chainId || "all"}`);
    console.log(`  Count: ${degenStrats.data.length}\n`);

    if (degenStrats.data.length === 0) {
      console.log("  No degen strategies found.");
    } else {
      // Sort by APY descending
      const sorted = [...degenStrats.data].sort((a, b) => b.apy - a.apy);
      console.log(
        "  Protocol          | Pool                | APY      | Status"
      );
      console.log("  " + "-".repeat(65));

      sorted.slice(0, 10).forEach((strat) => {
        const protocol = (strat.protocolName || "").substring(0, 16).padEnd(16);
        const pool = (strat.poolName || "").substring(0, 18).padEnd(18);
        const apy = `${strat.apy.toFixed(2)}%`.padStart(8);
        const status = strat.status || "n/a";
        console.log(`  ${protocol} | ${pool} | ${apy} | ${status}`);
      });

      if (sorted.length > 10) {
        console.log(`\n  ... and ${sorted.length - 10} more strategies`);
      }
    }
  } catch (error) {
    console.log("Failed to fetch degen strategies:", (error as Error).message);
  }
}

main().catch((error) => {
  console.error("Script failed:", error);
  process.exit(1);
});
