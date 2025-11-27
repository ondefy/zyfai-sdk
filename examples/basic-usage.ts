/**
 * Basic Usage Example
 *
 * This example demonstrates how to:
 * 1. Initialize the SDK
 * 2. Connect an account
 * 3. Get smart wallet address
 * 4. Deploy a Safe smart wallet
 */

import { config } from "dotenv";
import { SupportedChainId, ZyfaiSDK } from "../dist/index";

// Load environment variables from .env file
config();

async function main() {
  // Validate environment variables
  const apiKey = process.env.ZYFAI_API_KEY;
  const bundlerApiKey = process.env.BUNDLER_API_KEY;
  const privateKey = process.env.PRIVATE_KEY;

  if (!apiKey) {
    throw new Error(
      "❌ ZYFAI_API_KEY environment variable is required. Please add it to your .env file."
    );
  }

  if (!bundlerApiKey) {
    throw new Error(
      "❌ BUNDLER_API_KEY environment variable is required. Please add it to your .env file."
    );
  }

  if (!privateKey) {
    throw new Error(
      "❌ PRIVATE_KEY environment variable is required. Please add it to your .env file."
    );
  }

  console.log("🚀 Starting ZyFAI SDK example...\n");

  // Step 1: Initialize SDK
  console.log("1️⃣  Initializing SDK...");
  const sdk = new ZyfaiSDK({
    apiKey,
    environment: "staging",
    bundlerApiKey,
  });
  console.log("✅ SDK initialized\n");

  // Step 2: Connect account
  console.log("2️⃣  Connecting account...");
  const connectedAddress = await sdk.connectAccount(
    privateKey,
    8453 as SupportedChainId
  );
  console.log(`✅ Connected: ${connectedAddress}\n`);

  // Use the connected address as the user address
  const userAddress = connectedAddress;
  const chainId = 8453 as SupportedChainId; // Base mainnet

  try {
    // Step 3: Get smart wallet address
    console.log("3️⃣  Getting smart wallet address...");
    const walletInfo = await sdk.getSmartWalletAddress(userAddress, chainId);
    console.log(`📍 Smart Wallet: ${walletInfo.address}`);
    console.log(`📊 Deployed: ${walletInfo.isDeployed}\n`);

    // Step 4: Deploy Safe if not deployed
    if (!walletInfo.isDeployed) {
      console.log("4️⃣  Deploying Safe Smart Wallet...");
      const result = await sdk.deploySafe(userAddress, chainId);

      console.log("✅ Safe deployed successfully!");
      console.log(`📍 Safe Address: ${result.safeAddress}`);
      console.log(`🔗 Transaction Hash: ${result.txHash}`);
      console.log(`📊 Status: ${result.status}\n`);
    } else {
      console.log("4️⃣  Safe is already deployed! ✅\n");
    }

    console.log("🎉 Example completed successfully!");
  } catch (error) {
    console.error("\n❌ Error:", (error as Error).message);
    process.exit(1);
  }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Unexpected error:", error);
    process.exit(1);
  });
