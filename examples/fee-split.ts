/**
 * Example: Fee Split Configuration
 *
 * Demonstrates how to configure fee splitting for SDK developers.
 * Fee splits allow sharing performance fees between the Zyfai vault
 * and a secondary wallet (e.g., SDK developer's wallet).
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
  const connected = await sdk.connectAccount(privateKey, chainId);
  console.log(`Connected EOA: ${connected}\n`);

  // Get smart wallet address
  console.log("Resolving smart wallet address...");
  const walletInfo = await sdk.getSmartWalletAddress(connected, chainId);
  console.log(`Smart Wallet: ${walletInfo.address}\n`);

  console.log("=".repeat(60));
  console.log("STEP 1: Get Current Fee Split Configuration");
  console.log("=".repeat(60));

  try {
    const currentConfig = await sdk.getFeeSplit(walletInfo.address);
    console.log("Current Fee Split Configuration:");
    console.log(`  Wallet Address: ${currentConfig.data.walletAddress}`);
    console.log(`  Fee Split Wallet: ${currentConfig.data.feeSplitWallet || "None (all fees go to Zyfai vault)"}`);
    console.log(`  Fee Split Ratio: ${currentConfig.data.feeSplitRatio} basis points`);
    console.log(`  Split Percentage: ${currentConfig.data.splitPercentage}\n`);
  } catch (error) {
    console.log(`No existing fee split configuration found.\n`);
  }

  console.log("=".repeat(60));
  console.log("STEP 2: Configure Fee Split (40% to SDK Developer)");
  console.log("=".repeat(60));

  // Example: Set up a fee split where SDK developer gets 40% of fees
  const sdkDeveloperWallet = process.env.SDK_DEVELOPER_WALLET || "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"; // Example wallet
  const feeSplitRatio = 4000; // 4000 basis points = 40%

  console.log(`Setting fee split:`);
  console.log(`  Secondary Wallet: ${sdkDeveloperWallet}`);
  console.log(`  Split Ratio: ${feeSplitRatio} basis points (${feeSplitRatio / 100}%)\n`);

  const setResult = await sdk.setFeeSplit(
    walletInfo.address,
    sdkDeveloperWallet,
    feeSplitRatio
  );

  if (setResult.success) {
    console.log("✓ Fee split configured successfully!");
    console.log(`  Message: ${setResult.message || "Configuration updated"}`);
    console.log("\nNew Configuration:");
    console.log(`  Wallet Address: ${setResult.data.walletAddress}`);
    console.log(`  Fee Split Wallet: ${setResult.data.feeSplitWallet}`);
    console.log(`  Fee Split Ratio: ${setResult.data.feeSplitRatio} basis points`);
    console.log(`  Split Percentage: ${setResult.data.splitPercentage}`);
    console.log("\nFee Distribution:");
    console.log(`  - ${setResult.data.splitPercentage} goes to: ${setResult.data.feeSplitWallet}`);
    console.log(`  - ${100 - parseFloat(setResult.data.splitPercentage)}% goes to: Zyfai vault\n`);
  }

  console.log("=".repeat(60));
  console.log("STEP 3: Verify Fee Split Configuration");
  console.log("=".repeat(60));

  const verifyConfig = await sdk.getFeeSplit(walletInfo.address);
  console.log("Verified Fee Split Configuration:");
  console.log(`  Wallet Address: ${verifyConfig.data.walletAddress}`);
  console.log(`  Fee Split Wallet: ${verifyConfig.data.feeSplitWallet}`);
  console.log(`  Fee Split Ratio: ${verifyConfig.data.feeSplitRatio} basis points`);
  console.log(`  Split Percentage: ${verifyConfig.data.splitPercentage}\n`);

  console.log("=".repeat(60));
  console.log("STEP 4 (Optional): Disable Fee Split");
  console.log("=".repeat(60));

  // Uncomment to disable fee split (send all fees to Zyfai vault)
  /*
  console.log("Disabling fee split (all fees go to Zyfai vault)...\n");

  const disableResult = await sdk.setFeeSplit(
    walletInfo.address,
    null,
    0
  );

  if (disableResult.success) {
    console.log("✓ Fee split disabled successfully!");
    console.log(`  Message: ${disableResult.message || "Configuration updated"}`);
    console.log("\nAll fees will now go to the Zyfai vault.\n");
  }
  */

  console.log("=".repeat(60));
  console.log("Example completed successfully!");
  console.log("=".repeat(60));
  console.log("\nKey Points:");
  console.log("• Fee split ratio is in basis points (100 bp = 1%)");
  console.log("• Valid range: 0-10000 (0% - 100%)");
  console.log("• Set feeSplitWallet to null and ratio to 0 to disable");
  console.log("• Fees are only charged on earnings, not principal");
  console.log("• Performance fee split happens automatically on withdrawals");
}

main().catch((error) => {
  console.error("Script failed:", error);
  process.exit(1);
});
