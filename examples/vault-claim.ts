/**
 * Example: Vault Claim
 *
 * Claim a completed withdrawal from the Zyfai Vault.
 *
 * Run: npx tsx examples/vault-claim.ts
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

  // Check withdrawal status
  console.log("\nChecking withdrawal status...");
  const status = await sdk.getVaultWithdrawStatus();

  if (!status.withdrawKey) {
    console.log("No pending withdrawal found.");
    return;
  }

  console.log("Withdraw Key:", status.withdrawKey);
  console.log("Is Claimable:", status.isClaimable);
  console.log("Is Pending:", status.isPending);

  if (!status.isClaimable) {
    console.log("\nWithdrawal is not yet claimable. Please wait for processing.");
    return;
  }

  // Claim the withdrawal
  console.log("\nClaiming withdrawal...");
  const result = await sdk.vaultClaim(status.withdrawKey);

  console.log("\nClaim successful!");
  console.log("  Tx hash:", result.txHash);
  console.log("  Claimed:", result.claimed);
}

main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});
