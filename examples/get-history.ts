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
    response.data.forEach((tx, index) => {
      console.log(`  ${index + 1}. ${tx.type || "unknown"}`);
      console.log(`     Timestamp: ${tx.timestamp}`);
      console.log(`     Amount: ${tx.amount || "n/a"}`);
      if (tx.token) console.log(`     Token: ${tx.token}`);
      if (tx.protocol) console.log(`     Protocol: ${tx.protocol}`);
      if (tx.pool) console.log(`     Pool: ${tx.pool}`);
      if (tx.txHash) console.log(`     Tx Hash: ${tx.txHash}`);
      console.log();
    });
  }
}

main().catch((error) => {
  console.error("Script failed:", error);
  process.exit(1);
});

