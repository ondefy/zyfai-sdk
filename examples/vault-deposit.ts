/**
 * Example: Vault Deposit
 *
 * Deposit USDC into the Zyfai Vault on Base chain.
 * The vault auto-approves and deposits in one flow.
 *
 * Run: npx tsx examples/vault-deposit.ts
 */

import { config } from "dotenv";
import { ZyfaiSDK, VAULT_ADDRESS } from "../src";

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
  console.log("Vault address:", VAULT_ADDRESS);

  // Check current vault balance
  const balanceBefore = await sdk.getVaultShares();
  console.log("\nVault shares before:", balanceBefore.shares.toString(), balanceBefore.symbol);

  // Deposit 10 USDC into vault
  const amount = "3"; // 10 USDC
  console.log(`\nDepositing ${amount} USDC into vault...`);

  const result = await sdk.vaultDeposit(amount, "USDC");

  console.log("\nDeposit successful!");
  console.log("  Tx hash:", result.txHash);
  console.log("  Amount:", result.amount, result.asset);

}

main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});
