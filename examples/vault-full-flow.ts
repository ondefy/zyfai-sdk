/**
 * Example: Vault Full Flow
 *
 * Complete flow: deposit -> check balance -> withdraw -> check status -> claim
 *
 * Run: npx tsx examples/vault-full-flow.ts
 */

import { config } from "dotenv";
import { ZyfaiSDK, VAULT_ADDRESS } from "../src";

config();

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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
  console.log("Vault:", VAULT_ADDRESS);

  // Step 1: Check initial balance
  console.log("\n--- Step 1: Check Initial Balance ---");
  const initialBalance = await sdk.getVaultShares();
  console.log("Initial vault shares:", initialBalance.shares.toString(), initialBalance.symbol);

  // Step 2: Deposit
  console.log("\n--- Step 2: Deposit 1 USDC ---");
  const depositResult = await sdk.vaultDeposit("1", "USDC");
  console.log("Deposit tx:", depositResult.txHash);

  // Step 3: Check new balance
  console.log("\n--- Step 3: Check New Balance ---");
  const afterDepositBalance = await sdk.getVaultShares();
  console.log("Vault shares after deposit:", afterDepositBalance.shares.toString(), afterDepositBalance.symbol);

  // Step 4: Request withdrawal
  console.log("\n--- Step 4: Request Withdrawal ---");
  const withdrawResult = await sdk.vaultWithdraw();
  console.log("Withdraw request tx:", withdrawResult.txHash);
  console.log("Withdraw key:", withdrawResult.withdrawKey);
  console.log("Initial status:", withdrawResult.status);

  // Step 5: Poll for claimable status
  console.log("\n--- Step 5: Waiting for Claimable Status ---");
  let isClaimable = withdrawResult.status === "claimable";
  let attempts = 0;
  const maxAttempts = 30; // 5 minutes max

  while (!isClaimable && attempts < maxAttempts) {
    await sleep(10000); // Wait 10 seconds
    attempts++;
    
    const status = await sdk.getVaultWithdrawStatus(withdrawResult.withdrawKey);
    console.log(`Attempt ${attempts}: isClaimable = ${status.isClaimable}`);
    
    if (status.isClaimable) {
      isClaimable = true;
    }
  }

  if (!isClaimable) {
    console.log("\nWithdrawal still pending after 5 minutes. Try claiming later.");
    console.log("Withdraw key:", withdrawResult.withdrawKey);
    return;
  }

  // Step 6: Claim
  console.log("\n--- Step 6: Claim Withdrawal ---");
  const claimResult = await sdk.vaultClaim(withdrawResult.withdrawKey);
  console.log("Claim tx:", claimResult.txHash);
  console.log("Claimed:", claimResult.claimed);

  // Step 7: Final balance
  console.log("\n--- Step 7: Final Balance ---");
  const finalBalance = await sdk.getVaultShares();
  console.log("Final vault shares:", finalBalance.shares.toString(), finalBalance.symbol);

  console.log("\n--- Flow Complete ---");
}

main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});
