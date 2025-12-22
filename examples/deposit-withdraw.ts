/**
 * Deposit and Withdraw Funds Example
 *
 * This example demonstrates how to deposit tokens to your Safe
 * and withdraw funds from your Safe.
 */

import { config } from "dotenv";
import { SupportedChainId, ZyfaiSDK } from "../dist/index";

// Load environment variables from .env file
config();

// Token addresses are now automatically selected based on chain:
// - Base (8453) and Arbitrum (42161): USDC
// - Plasma (9745): USDT
// You can still provide a custom token address if needed

async function main() {
  // Validate environment variables
  const apiKey = process.env.ZYFAI_API_KEY;
  const bundlerApiKey = process.env.BUNDLER_API_KEY;
  const privateKey = process.env.PRIVATE_KEY;

  if (!apiKey || !bundlerApiKey || !privateKey) {
    throw new Error(
      "Required environment variables: ZYFAI_API_KEY, BUNDLER_API_KEY, PRIVATE_KEY"
    );
  }

  console.log("Starting Deposit and Withdraw Example...\n");

  // Initialize SDK
  console.log("Step 1: Initializing SDK...");
  const sdk = new ZyfaiSDK({
    apiKey,
    environment: "staging",
    bundlerApiKey,
  });
  console.log("SDK initialized\n");

  // Connect account
  console.log("Step 2: Connecting account...");
  const connectedAddress = await sdk.connectAccount(
    privateKey,
    8453 as SupportedChainId
  );
  console.log(`Connected: ${connectedAddress}\n`);

  const userAddress = connectedAddress;
  const chainId = 8453 as SupportedChainId; // Base

  // Get Safe address
  console.log("Step 3: Getting Safe address...");
  const walletInfo = await sdk.getSmartWalletAddress(userAddress, chainId);
  console.log(`Safe Address: ${walletInfo.address}`);
  console.log(`Deployed: ${walletInfo.isDeployed}\n`);

  if (!walletInfo.isDeployed) {
    console.log("WARNING: Safe not deployed. Deploying now...");
    try {
      const deployResult = await sdk.deploySafe(userAddress, chainId);
      console.log(`Safe deployed: ${deployResult.safeAddress}\n`);
    } catch (error) {
      console.error("Failed to deploy Safe:", (error as Error).message);
      return;
    }
  }

  // Deposit funds
  console.log("Step 4: Depositing funds to Safe...");
  console.log("Depositing 0.1 USDC (100000 units with 6 decimals) to Safe...");
  console.log(
    "Note: Token address is automatically selected (USDC for Base/Arbitrum, USDT for Plasma)"
  );

  try {
    // Token address is automatically selected based on chain (USDC for Base/Arbitrum, USDT for Plasma)
    const depositResult = await sdk.depositFunds(
      userAddress,
      chainId,
      "100000" // 0.1 USDC = 100000 (6 decimals)
    );

    console.log("\nDeposit successful!");
    console.log(`Transaction Hash: ${depositResult.txHash}`);
    console.log(`Amount: ${depositResult.amount}`);
    console.log(`Success: ${depositResult.success}\n`);
  } catch (error) {
    console.error("\nDeposit failed:", (error as Error).message);
    console.log("\nNote: Make sure you have:");
    console.log("1. Sufficient USDC balance in your wallet");
    console.log("2. Sufficient native token for gas fees");
    console.log("3. Approved the USDC contract (if required)\n");
  }

  // Withdraw funds (partial)
  console.log("Step 5: Withdrawing funds from Safe...");
  console.log(
    "Requesting partial withdrawal of 0.1 USDC (100000 units with 6 decimals)..."
  );

  try {
    // Funds are always withdrawn to the Safe owner's address (userAddress)
    const withdrawResult = await sdk.withdrawFunds(
      userAddress,
      chainId,
      "100000" // Withdraw 0.1 USDC = 100000 (6 decimals)
    );

    console.log("\nWithdrawal requested!");
    console.log(`Transaction Hash: ${withdrawResult.txHash}`);
    console.log(`Amount: ${withdrawResult.amount}`);
    console.log(`Success: ${withdrawResult.success}\n`);

    console.log("Note: Withdrawals may take some time to process");
  } catch (error) {
    console.error("\nWithdrawal failed:", (error as Error).message);
    console.log("\nNote: Make sure:");
    console.log("1. You have sufficient balance in your Safe");
    console.log("2. The Safe is properly configured\n");
  }

  console.log("Example completed!");
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("\nUnexpected error:", error);
    process.exit(1);
  });
