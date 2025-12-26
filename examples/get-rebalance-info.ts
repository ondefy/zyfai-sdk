/**
 * Example: Get Rebalance Info
 *
 * Demonstrates fetching rebalance information and frequency tier
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
    
    environment: "staging",
  });

  console.log("SDK initialized. Connecting account...");
  const connectedEOA = await sdk.connectAccount(privateKey, chainId);
  console.log(`Connected EOA: ${connectedEOA}\n`);

  // Get smart wallet address
  const walletInfo = await sdk.getSmartWalletAddress(connectedEOA, chainId);
  const smartWallet = walletInfo.address;
  console.log(`Smart Wallet: ${smartWallet}\n`);

  // Get rebalance frequency for this wallet
  console.log("Fetching rebalance frequency tier...");
  try {
    const frequency = await sdk.getRebalanceFrequency(smartWallet);

    console.log("\nRebalance Frequency:");
    console.log("-".repeat(50));
    console.log(`  Wallet: ${frequency.walletAddress}`);
    console.log(`  Tier: ${frequency.tier}`);
    console.log(`  Max Rebalances/Day: ${frequency.frequency}`);
    if (frequency.description) {
      console.log(`  Description: ${frequency.description}`);
    }
  } catch (error) {
    console.log("Failed to get rebalance frequency:", (error as Error).message);
  }

  // Get same-chain rebalance info
  console.log("\n\nFetching SAME-CHAIN rebalance info...");
  try {
    const sameChain = await sdk.getRebalanceInfo(false);

    console.log("\nSame-Chain Rebalances:");
    console.log("-".repeat(70));
    console.log(`  Total Count: ${sameChain.count}\n`);

    if (sameChain.data.length === 0) {
      console.log("  No same-chain rebalances found.");
    } else {
      console.log("  Recent rebalances (last 5):");
      sameChain.data.slice(0, 5).forEach((r, index) => {
        console.log(`\n  ${index + 1}. ${r.timestamp}`);
        console.log(
          `     From: ${r.fromProtocol || "n/a"} / ${r.fromPool || "n/a"}`
        );
        console.log(`     To: ${r.toProtocol || "n/a"} / ${r.toPool || "n/a"}`);
        if (r.amount) console.log(`     Amount: ${r.amount}`);
      });
    }
  } catch (error) {
    console.log(
      "Failed to get same-chain rebalances:",
      (error as Error).message
    );
  }

  // Get cross-chain rebalance info
  console.log("\n\nFetching CROSS-CHAIN rebalance info...");
  try {
    const crossChain = await sdk.getRebalanceInfo(true);

    console.log("\nCross-Chain Rebalances:");
    console.log("-".repeat(70));
    console.log(`  Total Count: ${crossChain.count}\n`);

    if (crossChain.data.length === 0) {
      console.log("  No cross-chain rebalances found.");
    } else {
      console.log("  Recent rebalances (last 5):");
      crossChain.data.slice(0, 5).forEach((r, index) => {
        console.log(`\n  ${index + 1}. ${r.timestamp}`);
        console.log(`     From Chain: ${r.fromChainId || "n/a"}`);
        console.log(`     To Chain: ${r.toChainId || "n/a"}`);
        console.log(
          `     From: ${r.fromProtocol || "n/a"} / ${r.fromPool || "n/a"}`
        );
        console.log(`     To: ${r.toProtocol || "n/a"} / ${r.toPool || "n/a"}`);
      });
    }
  } catch (error) {
    console.log(
      "Failed to get cross-chain rebalances:",
      (error as Error).message
    );
  }
}

main().catch((error) => {
  console.error("Script failed:", error);
  process.exit(1);
});
