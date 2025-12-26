/**
 * Example: Get Smart Wallets by EOA
 *
 * Demonstrates fetching smart wallets associated with an EOA address
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
  const connectedEOA = await sdk.connectAccount(privateKey, chainId);
  console.log(`Connected EOA: ${connectedEOA}\n`);

  // Use the connected EOA or specify a different one
  const eoaToQuery = process.env.EOA_ADDRESS || connectedEOA;

  console.log(`Fetching smart wallets for EOA: ${eoaToQuery}...`);
  const response = await sdk.getSmartWalletByEOA(eoaToQuery);

  console.log("\nSmart Wallets by EOA:");
  console.log("-".repeat(60));
  console.log(`  EOA: ${response.eoa}`);
  console.log(`  Smart Wallet: ${response.smartWallet ?? "None"}`);
  console.log(`  Chains: ${response.chains?.join(", ") ?? "None"}`);

  if (!response.smartWallet) {
    console.log("\n  No smart wallets associated with this EOA.");
  } else {
    console.log("\n  Associated Smart Wallet:");
    console.log(`    ${response.smartWallet}`);
  }
}

main().catch((error) => {
  console.error("Script failed:", error);
  process.exit(1);
});
