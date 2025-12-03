/**
 * Example: Get Active Wallets
 *
 * Demonstrates fetching active smart wallets for a specific chain
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
  await sdk.connectAccount(privateKey, chainId);
  console.log("Connected.\n");

  console.log(`Fetching active wallets for chain ${chainId}...`);
  const response = await sdk.getActiveWallets(chainId);

  console.log("\nActive Wallets:");
  console.log("-".repeat(60));
  console.log(`  Chain ID: ${response.chainId}`);
  console.log(`  Total Count: ${response.count}`);

  if (response.wallets.length === 0) {
    console.log("\n  No active wallets found on this chain.");
  } else {
    console.log(`\n  Wallets (showing first 10):`);
    response.wallets.slice(0, 10).forEach((wallet, index) => {
      console.log(`    ${index + 1}. ${wallet.smartWallet}`);
      if (wallet.chains && wallet.chains.length > 0) {
        console.log(`       Chains: ${wallet.chains.join(", ")}`);
      }
    });

    if (response.wallets.length > 10) {
      console.log(`    ... and ${response.wallets.length - 10} more`);
    }
  }
}

main().catch((error) => {
  console.error("Script failed:", error);
  process.exit(1);
});

