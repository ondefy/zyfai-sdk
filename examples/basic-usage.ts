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
  const apiKey = process.env.ZYFAI_API_KEY;
  const privateKey = process.env.PRIVATE_KEY;

  if (!apiKey) {
    throw new Error(
      "ZYFAI_API_KEY environment variable is required. Please add it to your .env file."
    );
  }

  if (!privateKey) {
    throw new Error(
      "PRIVATE_KEY environment variable is required. Please add it to your .env file."
    );
  }

  console.log("Starting Zyfai SDK example...\n");

  console.log("Step 1: Initializing SDK...");
  const sdk = new ZyfaiSDK({
    apiKey,
  });
  console.log("SDK initialized\n");

  // Step 2: Connect account
  console.log("Step 2: Connecting account...");
  const connectedAddress = await sdk.connectAccount(
    privateKey,
    8453 as SupportedChainId
  );
  console.log(`Connected: ${connectedAddress}\n`);

  // Use the connected address as the user address
  const userAddress = connectedAddress;
  const chainId = 8453 as SupportedChainId; // Base mainnet

  try {
    // Step 3: Get smart wallet address
    console.log("Step 3: Getting smart wallet address...");
    const walletInfo = await sdk.getSmartWalletAddress(userAddress, chainId);
    console.log(`Smart Wallet: ${walletInfo.address}`);
    console.log(`Deployed: ${walletInfo.isDeployed}\n`);

    // Step 4: Deploy Safe if not deployed
    if (!walletInfo.isDeployed) {
      console.log("Step 4: Deploying Safe Smart Wallet...");
      const result = await sdk.deploySafe(userAddress, chainId);

      console.log("Safe deployed successfully!");
      console.log(`Safe Address: ${result.safeAddress}`);
      console.log(`Transaction Hash: ${result.txHash}`);
      console.log(`Status: ${result.status}\n`);
    } else {
      console.log("Step 4: Safe is already deployed!\n");
    }

    console.log("Example completed successfully!");
  } catch (error) {
    console.error("\nError:", (error as Error).message);
    process.exit(1);
  }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("\nUnexpected error:", error);
    process.exit(1);
  });
