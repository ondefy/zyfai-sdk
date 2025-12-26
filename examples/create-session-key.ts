/**
 * Session Key Creation Example
 *
 * Demonstrates how to:
 * 1. Initialize the SDK and connect an account
 * 2. (Optionally) deploy the Safe smart wallet
 * 3. Create a session key and register it via /session-keys/add
 */

import { config } from "dotenv";
import { SupportedChainId, ZyfaiSDK } from "../dist/index";

config();

async function main() {
  const apiKey = process.env.ZYFAI_API_KEY;
  const privateKey = process.env.PRIVATE_KEY;

  if (!apiKey || !privateKey) {
    throw new Error(
      "Missing environment variables. Please set ZYFAI_API_KEY and PRIVATE_KEY in .env"
    );
  }

  const chainId = 8453 as SupportedChainId;

  const sdk = new ZyfaiSDK({
    apiKey,
    environment: "staging",
  });

  console.log("SDK initialized");

  const connectedAddress = await sdk.connectAccount(privateKey, chainId);
  console.log(`Account connected: ${connectedAddress}`);

  // Ensure the Safe smart wallet exists
  const walletInfo = await sdk.getSmartWalletAddress(connectedAddress, chainId);
  console.log(`Safe Address: ${walletInfo.address}`);
  console.log(`Safe Deployed: ${walletInfo.isDeployed}`);

  if (!walletInfo.isDeployed) {
    console.log("Deploying Safe...");
    const deployment = await sdk.deploySafe(connectedAddress, chainId);
    console.log(`Safe deployed at ${deployment.safeAddress}`);
  }

  console.log("\nCreating session key...");
  const sessionResult = await sdk.createSessionKey(connectedAddress, chainId);

  console.log(`Signature: ${sessionResult.signature}`);
  console.log(`User ID: ${sessionResult.userId}`);

  if (sessionResult.sessionActivation) {
    console.log("\nActivation details:");
    console.log(`  Activation ID: ${sessionResult.sessionActivation.id}`);
    console.log(`  Signer: ${sessionResult.sessionActivation.signer}`);
    console.log(
      `  Nonces: ${sessionResult.sessionActivation.nonces.join(", ")}`
    );
    console.log(`  Expires At: ${sessionResult.sessionActivation.expiresAt}`);
  }
}

main().catch((error) => {
  console.error("Session key example failed:", error);
  process.exit(1);
});
