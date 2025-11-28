/**
 * Simple Session Key Example
 *
 * This example shows the simplified session key creation that automatically
 * fetches the session configuration from the ZyFAI API.
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

  if (!apiKey || !bundlerApiKey || !privateKey) {
    throw new Error(
      "Required environment variables: ZYFAI_API_KEY, BUNDLER_API_KEY, PRIVATE_KEY"
    );
  }

  console.log("Starting Simple Session Key Example...\n");

  // Initialize SDK
  console.log("Step 1: Initializing SDK...");
  const sdk = new ZyfaiSDK({
    apiKey,
    environment: "staging",
    bundlerApiKey,
  });
  console.log("SDK initialized\n");

  // Connect account
  console.log("Step 2: Connecting account...");
  const connectedAddress = await sdk.connectAccount(
    privateKey,
    8453 as SupportedChainId
  );
  console.log(`Connected: ${connectedAddress}\n`);

  const userAddress = connectedAddress;
  const chainId = 8453 as SupportedChainId;

  // Get Safe address
  console.log("Step 3: Getting Safe address...");
  const walletInfo = await sdk.getSmartWalletAddress(userAddress, chainId);
  console.log(`Safe Address: ${walletInfo.address}`);
  console.log(`Deployed: ${walletInfo.isDeployed}\n`);

  if (!walletInfo.isDeployed) {
    console.log("WARNING: Safe not deployed. Deploying now...");
    try {
      const deployResult = await sdk.deploySafe(userAddress, chainId);
      console.log(`Safe deployed: ${deployResult.safeAddress}\n`);
    } catch (error) {
      console.error("Failed to deploy Safe:", (error as Error).message);
      return;
    }
  }

  // Create session key - SIMPLIFIED (no manual configuration needed!)
  console.log("Step 4: Creating session key...");
  console.log("Fetching session configuration from ZyFAI API...");

  try {
    const result = await sdk.createSessionKey(userAddress, chainId);

    console.log("\nSession key created successfully!");
    console.log(`Safe Address: ${result.sessionKeyAddress}`);
    console.log(`Signature: ${result.signature.substring(0, 20)}...`);
    console.log(`Success: ${result.success}`);

    console.log("\nWhat just happened:");
    console.log("1. SDK fetched optimal session configuration from ZyFAI API");
    console.log(
      "2. Configuration includes permissions for all supported protocols"
    );
    console.log("3. Your Safe can now execute transactions via session key");
    console.log("4. No manual configuration required!");
  } catch (error) {
    console.error("\nFailed to create session key:", (error as Error).message);
  }

  console.log("\nExample completed!");
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("\nUnexpected error:", error);
    process.exit(1);
  });
