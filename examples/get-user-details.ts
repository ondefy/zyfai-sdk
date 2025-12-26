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
    
    environment: "staging",
  });

  console.log("SDK initialized. Connecting account...");
  const connected = await sdk.connectAccount(privateKey, chainId);
  console.log(`Connected EOA: ${connected}\n`);

  console.log("Fetching user details (requires SIWE authentication)...\n");
  const response = await sdk.getUserDetails();

  if (!response.success) {
    console.log("Failed to fetch user details");
    return;
  }

  const user = response.user;
  console.log("User Details:");
  console.log("-".repeat(50));
  console.log(`  ID:                   ${user.id}`);
  console.log(`  Address (EOA):        ${user.address}`);
  console.log(`  Smart Wallet:         ${user.smartWallet}`);
  console.log(`  Chains:               ${user.chains?.join(", ") || "none"}`);
  console.log(`  Has Active Session:   ${user.hasActiveSessionKey}`);
  console.log(`  Auto-Select:          ${user.autoSelectProtocols}`);
  console.log(`  Strategy:             ${user.strategy || "n/a"}`);
  console.log(`  Wallet Type:          ${user.walletType || "n/a"}`);
  console.log(`  Omni Account:         ${user.omniAccount ?? "n/a"}`);
  console.log(`  Cross-chain:          ${user.crosschainStrategy ?? "n/a"}`);

  if (user.protocols && user.protocols.length > 0) {
    console.log(`\n  Protocols (${user.protocols.length}):`);
    user.protocols.forEach((p) => {
      console.log(`    - ${p.name}`);
    });
  }
}

main().catch((error) => {
  console.error("Script failed:", error);
  process.exit(1);
});

