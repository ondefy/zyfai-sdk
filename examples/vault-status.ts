/**
 * Example: Vault Withdraw Status
 *
 * Check the status of a pending withdrawal from the Zyfai Vault.
 *
 * Run: npx tsx examples/vault-status.ts
 */

import { config } from "dotenv";
import { ZyfaiSDK } from "../src";

config();

async function main() {
  const apiKey = process.env.ZYFAI_API_KEY;
  const privateKey = process.env.PRIVATE_KEY;

  if (!apiKey) {
    throw new Error("Missing ZYFAI_API_KEY environment variable");
  }

  if (!privateKey) {
    throw new Error("Missing PRIVATE_KEY environment variable");
  }

  const sdk = new ZyfaiSDK({ apiKey });

  // Connect account (vault is on Base)
  const userAddress = await sdk.connectAccount(privateKey as `0x${string}`, 8453);
  console.log("Connected:", userAddress);

  // Get vault shares
  const balance = await sdk.getVaultShares();
  console.log("\nVault shares:", balance.shares.toString(), balance.symbol);

  // Check withdrawal status
  console.log("\nChecking withdrawal status...");
  const status = await sdk.getVaultWithdrawStatus();

  console.log("\nWithdraw Status:");
  console.log("  Nonce:", status.nonce.toString());
  console.log("  Withdraw Key:", status.withdrawKey || "None");
  console.log("  Is Pending:", status.isPending);
  console.log("  Is Claimable:", status.isClaimable);

  if (status.isClaimable && status.withdrawKey) {
    console.log("\nYou have a withdrawal ready to claim!");
    console.log("Run: npx tsx examples/vault-claim.ts");
  } else if (status.isPending) {
    console.log("\nYou have a pending withdrawal. Please wait for processing.");
  } else {
    console.log("\nNo pending withdrawals.");
  }
}

main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});
