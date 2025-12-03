/**
 * Example: Get First Topup
 *
 * Demonstrates fetching the first deposit/topup information for a wallet
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
  console.log(`Smart Wallet: ${smartWallet}`);
  console.log(`Is Deployed: ${walletInfo.isDeployed}\n`);

  console.log(`Fetching first topup for smart wallet on chain ${chainId}...`);
  try {
    const response = await sdk.getFirstTopup(smartWallet, chainId);

    console.log("\nFirst Topup Information:");
    console.log("-".repeat(50));
    console.log(`  Wallet Address: ${response.walletAddress}`);
    console.log(`  Date: ${response.date || "n/a"}`);
    console.log(`  Amount: ${response.amount || "n/a"}`);
    console.log(`  Chain ID: ${response.chainId || chainId}`);
  } catch (error) {
    console.log("\nNo first topup found (wallet may not have any deposits yet)");
    console.log(`Error: ${(error as Error).message}`);
  }
}

main().catch((error) => {
  console.error("Script failed:", error);
  process.exit(1);
});

