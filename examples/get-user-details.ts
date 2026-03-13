/**
 * Example: Get User Details
 *
 * Demonstrates fetching authenticated user details via SIWE
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

  console.log("Fetching user details (requires SIWE authentication)...\n");
  const userDetails = await sdk.getUserDetails();
  const ethDetails = await sdk.getUserDetails("eth");

  if (!userDetails.success || !ethDetails.success) {
    console.log("Failed to fetch user details");
    return;
  }

  const user = userDetails;
  const eth = ethDetails;

  console.log("User Details:");
  console.log("-".repeat(50));
  console.log(`  USDC Strategy:             ${user.strategy || "n/a"}`);
  console.log(`  ETH Strategy:             ${eth.strategy || "n/a"}`);
  console.log(`  USDC Protocols:            ${user.protocols?.join(", ") || "n/a"}`);
  console.log(`  ETH Protocols:             ${eth.protocols?.join(", ") || "n/a"}`);
}

main().catch((error) => {
  console.error("Script failed:", error);
  process.exit(1);
});

