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
    const currentProtocols = userDetails.protocols || [];
    console.log(`Current protocols: ${currentProtocols.length}`);
    if (currentProtocols.length > 0) {
      currentProtocols.forEach((p) => {
        console.log(`  - ${p}`);
      });
    }
  }

  console.log("\nPausing agent (clearing all protocols)...");
  const response = await sdk.pauseAgent();

  if (response.success) {
    console.log("✓ Agent paused successfully");

    // Verify the protocols were cleared
    console.log("\nVerifying agent is paused...");
    const updatedDetails = await sdk.getUserDetails("USDC");
    const ethDetails = await sdk.getUserDetails("WETH");
    if (updatedDetails.success && ethDetails.success) {
      const usdcProtocols = updatedDetails.protocols || [];
      const ethProtocols = ethDetails.protocols || [];
      console.log(`  Active USDC protocols: ${usdcProtocols?.length || 0}`);
      console.log(`  Active ETH protocols: ${ethProtocols?.length || 0}`);
      if (usdcProtocols?.length === 0 && ethProtocols?.length === 0) {
        console.log("✓ Agent is now paused (no active protocols)");
      } else {
        console.log("✗ Agent is not paused (active protocols)");
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
