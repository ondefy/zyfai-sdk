/**
 * Example: Get Yield Opportunities
 *
 * Demonstrates fetching conservative and aggressive yield opportunities
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

  // Get Conservative Opportunities
  console.log(`Fetching CONSERVATIVE opportunities for chain ${chainId}...`);
  try {
    const conservativeOpps = await sdk.getConservativeOpportunities(chainId);

    console.log("\nConservative Opportunities (Low Risk):");
    console.log("=".repeat(70));
    console.log(`  Chain: ${conservativeOpps.chainId || "all"}`);
    console.log(`  Count: ${conservativeOpps.data.length}\n`);

    if (conservativeOpps.data.length === 0) {
      console.log("  No conservative opportunities found.");
    } else {
      // Sort by APY descending
      const sorted = [...conservativeOpps.data].sort((a, b) => b.apy - a.apy);
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
      "Failed to fetch conservative opportunities:",
      (error as Error).message
    );
  }

  // Get Aggressive Opportunities
  console.log(`\n\nFetching AGGRESSIVE opportunities for chain ${chainId}...`);
  try {
    const aggressiveOpps = await sdk.getAggressiveOpportunities(chainId);

    console.log("\nAggressive Opportunities (High Risk/High Reward):");
    console.log("=".repeat(70));
    console.log(`  Chain: ${aggressiveOpps.chainId || "all"}`);
    console.log(`  Count: ${aggressiveOpps.data.length}\n`);

    if (aggressiveOpps.data.length === 0) {
      console.log("  No aggressive opportunities found.");
    } else {
      // Sort by APY descending
      const sorted = [...aggressiveOpps.data].sort((a, b) => b.apy - a.apy);
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
        console.log(`\n  ... and ${sorted.length - 10} more opportunities`);
      }
    }
  } catch (error) {
    console.log(
      "Failed to fetch aggressive opportunities:",
      (error as Error).message
    );
  }
}

main().catch((error) => {
  console.error("Script failed:", error);
  process.exit(1);
});
