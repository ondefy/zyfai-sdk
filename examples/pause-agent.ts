/**
 * Example: Pause Agent
 *
 * Demonstrates pausing the agent by clearing all protocols
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
  const connected = await sdk.connectAccount(privateKey, chainId);
  console.log(`Connected EOA: ${connected}\n`);

  console.log("Fetching current user details...");
  const userDetails = await sdk.getUserDetails();
  if (userDetails.success) {
    const currentProtocols = userDetails.user.protocols || [];
    console.log(`Current protocols: ${currentProtocols.length}`);
    if (currentProtocols.length > 0) {
      currentProtocols.forEach((p) => {
        console.log(`  - ${p.name}`);
      });
    }
  }

  console.log("\nPausing agent (clearing all protocols)...");
  const response = await sdk.pauseAgent();

  if (response.success) {
    console.log("✓ Agent paused successfully");
    console.log(`  User ID: ${response.userId}`);

    // Verify the protocols were cleared
    console.log("\nVerifying agent is paused...");
    const updatedDetails = await sdk.getUserDetails();
    if (updatedDetails.success) {
      const protocols = updatedDetails.user.protocols || [];
      console.log(`  Active protocols: ${protocols.length}`);
      if (protocols.length === 0) {
        console.log("✓ Agent is now paused (no active protocols)");
      }
    }
  } else {
    console.log("✗ Failed to pause agent");
  }
}

main().catch((error) => {
  console.error("Script failed:", error);
  process.exit(1);
});
