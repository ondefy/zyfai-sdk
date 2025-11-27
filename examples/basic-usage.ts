/**
 * Basic Usage Example
 */

import { ZyfaiSDK } from "../src";

async function main() {
  // Initialize SDK
  const sdk = new ZyfaiSDK({
    apiKey: "YOUR_API_KEY",
    environment: "staging", // Use test environment
  });

  // Set up wallet with private key
  sdk.connectAccount("0xYourPrivateKey");

  const userAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb";
  const chainId = 8453 as SupportedChainId; // Base

  try {
    // Deploy Safe Smart Wallet
    console.log("Deploying Safe Smart Wallet...");
    const result = await sdk.deploySafe(userAddress, chainId);

    console.log("✅ Safe deployed successfully!");
    console.log("Safe Address:", result.safeAddress);
    console.log("Transaction Hash:", result.txHash);
    console.log("Status:", result.status);

    // Next steps:
    // - Create session key
    // - Deposit funds
    // - Monitor positions
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

main();
