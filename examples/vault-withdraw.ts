/**
 * Example: Vault Withdraw
 *
 * Request withdrawal from the Zyfai Vault.
 * Withdrawals are async - you need to wait for processing then claim.
 *
 * Run: npx tsx examples/vault-withdraw.ts
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

  // Check current vault balance
  const balance = await sdk.getVaultShares();
  console.log("\nVault shares:", balance.shares.toString(), balance.symbol);

  if (balance.shares === 0n) {
    console.log("No shares to withdraw. Deposit first.");
    return;
  }

  // Check if there's already a pending withdrawal
  console.log("\nChecking pending withdrawals...");
  const status = await sdk.getVaultWithdrawStatus();

  if (status.isPending) {
    console.log("You have a pending withdrawal!");
    console.log("  Withdraw key:", status.withdrawKey);
    console.log("  Status: Pending (wait for processing)");
    return;
  }

  if (status.isClaimable && status.withdrawKey) {
    console.log("You have a claimable withdrawal!");
    console.log("  Withdraw key:", status.withdrawKey);
    console.log("\nClaiming...");

    const claim = await sdk.vaultClaim(status.withdrawKey);
    console.log("Claimed successfully!");
    console.log("  Tx hash:", claim.txHash);
    return;
  }

  // Request new withdrawal (all shares)
  console.log("\nRequesting withdrawal of all shares...");
  const result = await sdk.vaultWithdraw();

  console.log("\nWithdraw request submitted!");
  console.log("  Tx hash:", result.txHash);
  console.log("  Withdraw key:", result.withdrawKey);
  console.log("  Status:", result.status);

  if (result.status === "pending") {
    console.log("\nWithdrawal is being processed. Check status later:");
    console.log('  const status = await sdk.getVaultWithdrawStatus();');
    console.log('  if (status.isClaimable) await sdk.vaultClaim(status.withdrawKey);');
  } else if (result.status === "claimable") {
    console.log("\nWithdrawal is ready to claim!");
    const claim = await sdk.vaultClaim(result.withdrawKey);
    console.log("Claimed:", claim.txHash);
  }
}

main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});
