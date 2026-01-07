/**
 * Example: Get Transaction History
 *
 * Demonstrates fetching transaction history for a wallet
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

  console.log(`Fetching transaction history for chain ${chainId}...`);
  const response = await sdk.getHistory(smartWallet, chainId, {
    limit: 20,
    offset: 0,
  });

  console.log("\nTransaction History:");
  console.log("-".repeat(70));
  console.log(`  Wallet: ${response.walletAddress}`);
  console.log(`  Total Transactions: ${response.total}`);
  console.log(`  Showing: ${response.data.length}\n`);

  if (response.data.length === 0) {
    console.log("  No transaction history found.");
  } else {
    response.data.forEach((tx: any, index: number) => {
      console.log(`  ${index + 1}. ${tx.action || "unknown"}`);
      console.log(`     Date: ${tx.date || "n/a"}`);
      console.log(`     Chain: ${tx.chainId || "n/a"}`);
      console.log(`     Strategy: ${tx.strategy || "n/a"}`);
      console.log(`     Crosschain: ${tx.crosschain ? "Yes" : "No"}`);
      console.log(`     Rebalance: ${tx.rebalance ? "Yes" : "No"}`);
      if (tx.transactionHash) {
        console.log(`     Tx Hash: ${tx.transactionHash.slice(0, 20)}...`);
      }
      if (tx.positions && tx.positions.length > 0) {
        console.log(`     Positions:`);
        tx.positions.forEach((pos: any, posIndex: number) => {
          console.log(`       ${posIndex + 1}. ${pos.protocol_name || "Unknown"} - ${pos.pool || "n/a"}`);
          console.log(`          Token: ${pos.token_symbol || "n/a"}`);
          console.log(`          Amount: ${pos.amount || "n/a"}`);
        });
      }
      console.log();
    });
  }
}

main().catch((error) => {
  console.error("Script failed:", error);
  process.exit(1);
});

