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
  const usdcDetails = await sdk.getUserDetails("USDC");
  const ethDetails = await sdk.getUserDetails("WETH");
  const eurcDetails = await sdk.getUserDetails("EURC");

  if (!usdcDetails.success || !ethDetails.success || !eurcDetails.success) {
    console.log("Failed to fetch user details");
    return;
  }

  console.log("User Details:");
  console.log("-".repeat(50));
  console.log(`  USDC Strategy:  ${usdcDetails.strategy || "n/a"}`);
  console.log(`  WETH Strategy:  ${ethDetails.strategy || "n/a"}`);
  console.log(`  EURC Strategy:  ${eurcDetails.strategy || "n/a"}`);
  console.log(
    `  USDC Protocols: ${usdcDetails.protocols?.join(", ") || "n/a"}`
  );
  console.log(
    `  WETH Protocols: ${ethDetails.protocols?.join(", ") || "n/a"}`
  );
  console.log(
    `  EURC Protocols: ${eurcDetails.protocols?.join(", ") || "n/a"}`
  );
}

main().catch((error) => {
  console.error("Script failed:", error);
  process.exit(1);
});
