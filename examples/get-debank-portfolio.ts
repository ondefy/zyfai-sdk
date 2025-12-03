/**
 * Example: Get Debank Portfolio
 *
 * Demonstrates fetching multi-chain portfolio data via Debank
 * Note: This is a premium endpoint and may require additional authorization
 */

import { config } from "dotenv";
import { SupportedChainId, ZyfaiSDK } from "../dist/index";

config();

async function main() {
  const apiKey = process.env.ZYFAI_API_KEY;
  const bundlerApiKey = process.env.BUNDLER_API_KEY;
  const privateKey = process.env.PRIVATE_KEY;

  if (!apiKey || !bundlerApiKey || !privateKey) {
    throw new Error(
      "Missing env vars. Please set ZYFAI_API_KEY, BUNDLER_API_KEY, and PRIVATE_KEY."
    );
  }

  const chainId = Number(process.env.CHAIN_ID ?? 8453) as SupportedChainId;

  const sdk = new ZyfaiSDK({
    apiKey,
    bundlerApiKey,
    environment: "staging",
  });

  console.log("SDK initialized. Connecting account...");
  const connectedEOA = await sdk.connectAccount(privateKey, chainId);
  console.log(`Connected EOA: ${connectedEOA}\n`);

  // Get smart wallet address
  const walletInfo = await sdk.getSmartWalletAddress(connectedEOA, chainId);
  const smartWallet = walletInfo.address;
  console.log(`Smart Wallet: ${smartWallet}\n`);

  console.log("Fetching Debank multi-chain portfolio...");
  console.log("(Note: This is a premium endpoint)\n");

  try {
    const portfolio = await sdk.getDebankPortfolio(smartWallet);

    console.log("Debank Portfolio:");
    console.log("=".repeat(60));
    console.log(`  Wallet: ${portfolio.walletAddress}`);
    console.log(`  Total Value: $${portfolio.totalValueUsd?.toLocaleString() || "0"}\n`);

    if (portfolio.chains && typeof portfolio.chains === "object") {
      console.log("  Portfolio by Chain:");
      console.log("  " + "-".repeat(55));

      Object.entries(portfolio.chains).forEach(([chainName, chainData]) => {
        if (chainData && typeof chainData === "object") {
          const data = chainData as any;
          console.log(`\n  ${chainName.toUpperCase()}:`);
          console.log(`    Total Value: $${data.totalValueUsd?.toLocaleString() || "0"}`);

          if (data.tokens && Array.isArray(data.tokens) && data.tokens.length > 0) {
            console.log("    Tokens:");
            data.tokens.slice(0, 5).forEach((token: any) => {
              console.log(
                `      - ${token.symbol}: ${token.amount?.toFixed(4) || "0"} ($${token.valueUsd?.toFixed(2) || "0"})`
              );
            });
            if (data.tokens.length > 5) {
              console.log(`      ... and ${data.tokens.length - 5} more tokens`);
            }
          }
        }
      });
    }
  } catch (error) {
    console.log("Failed to fetch Debank portfolio:", (error as Error).message);
    console.log("\nNote: This endpoint requires wallet authorization in the system.");
  }
}

main().catch((error) => {
  console.error("Script failed:", error);
  process.exit(1);
});

