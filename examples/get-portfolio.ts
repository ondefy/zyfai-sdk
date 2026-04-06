/**
 * Example: Get Portfolio
 *
 * Retrieves detailed portfolio information for a user's smart wallet,
 * including all positions across chains and protocols.
 *
 * Run: npx tsx examples/get-portfolio.ts
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

  // Connect account
  const userAddress = await sdk.connectAccount(privateKey as `0x${string}`, 8453);
  console.log("Connected:", userAddress);

  // Get portfolio
  console.log("\nFetching portfolio...\n");
  const portfolio = await sdk.getPortfolio("0xb1eF96dab739AaF9E247a8C11c8A205D8dD051Bc");

  if (!portfolio.success) {
    console.log("Failed to get portfolio");
    return;
  }

  console.log("Portfolio for:", portfolio.userAddress);
  console.log("---");

  // Display portfolio data
  const data = portfolio.portfolio;

  if (!data || Object.keys(data).length === 0) {
    console.log("No positions found. Deploy a Safe and deposit funds first.");
    return;
  }

  // Iterate through portfolio by chain/protocol
  for (const [key, value] of Object.entries(data)) {
    console.log(`\n${key}:`);
    console.log(JSON.stringify(value, null, 2));
  }
}

main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});
