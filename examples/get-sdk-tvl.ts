/**
 * Example: Get SDK Key TVL
 *
 * Demonstrates fetching TVL information for all wallets associated with the SDK API key
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
  await sdk.connectAccount(privateKey, chainId);
  console.log("Connected.\n");

  console.log("Fetching SDK Key TVL...");
  console.log("-".repeat(50));

  try {
    const sdkTvl = await sdk.getSdkKeyTVL();

    console.log("\nSDK Key Metadata:");
    console.log(`  SDK Key ID: ${sdkTvl.metadata.sdkKeyId}`);
    console.log(`  Client Name: ${sdkTvl.metadata.clientName}`);
    console.log(`  Wallets Count: ${sdkTvl.metadata.walletsCount}`);

    console.log("\nTVL & Volume Summary:");
    console.log(`  Total TVL: $${sdkTvl.totalTvl.toLocaleString()}`);
    console.log(`  Total Volume: $${sdkTvl.totalVolume.toLocaleString()}`);
    console.log(`  Allowed Wallets: ${sdkTvl.allowedWallets.length}`);

    if (sdkTvl.tvlByWallet.length > 0) {
      console.log("\nTVL by Wallet:");
      console.log("-".repeat(50));
      for (const wallet of sdkTvl.tvlByWallet) {
        console.log(
          `  ${wallet.walletAddress}: $${wallet.tvl.toLocaleString()}`
        );
      }
    }

    console.log("\nAllowed Wallets:");
    console.log("-".repeat(50));
    for (const wallet of sdkTvl.allowedWallets) {
      console.log(`  ${wallet}`);
    }

    console.log("\nFull Response:");
    console.log(JSON.stringify(sdkTvl, null, 2));
  } catch (error) {
    console.error("Failed to fetch SDK TVL:", (error as Error).message);
  }
}

main().catch((error) => {
  console.error("Script failed:", error);
  process.exit(1);
});
