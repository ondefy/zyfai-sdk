/**
 * End-to-End Zyfai SDK Example
 *
 * This example demonstrates the complete workflow of using the Zyfai SDK:
 * 1. Initialize SDK and connect account
 * 2. Deploy Safe smart wallet
 * 3. Create session key for delegated transactions
 * 4. Check available protocols
 * 5. Deposit funds to Safe
 * 6. Monitor positions
 * 7. Withdraw funds
 */

import { config } from "dotenv";
import { SupportedChainId, ZyfaiSDK } from "../dist/index";

// Load environment variables from .env file
config();

// Token addresses are automatically selected based on chain:
// - Base (8453) and Arbitrum (42161): USDC
// - Plasma (9745): USDT

async function main() {
  console.log("=".repeat(60));
  console.log("Zyfai SDK - End-to-End Workflow Example");
  console.log("=".repeat(60));
  console.log();

  // Validate environment variables
  const apiKey = process.env.ZYFAI_API_KEY;

  const privateKey = process.env.PRIVATE_KEY;

  if (!apiKey || !privateKey) {
    throw new Error(
      "Missing required environment variables:\n" +
        "- ZYFAI_API_KEY\n" +
        "- \n" +
        "- PRIVATE_KEY"
    );
  }

  // =================================================================
  // STEP 1: Initialize SDK
  // =================================================================
  console.log("STEP 1: Initializing Zyfai SDK");
  console.log("-".repeat(60));

  const sdk = new ZyfaiSDK({
    apiKey,
  });

  console.log("SDK initialized successfully");
  console.log();

  // =================================================================
  // STEP 2: Connect Account
  // =================================================================
  console.log("STEP 2: Connecting Account");
  console.log("-".repeat(60));

  const chainId = 8453 as SupportedChainId; // Base
  const connectedAddress = await sdk.connectAccount(privateKey, chainId);

  console.log("Account connected successfully");
  console.log(`  Address: ${connectedAddress}`);
  console.log(`  Chain: Base (${chainId})`);
  console.log();

  const userAddress = connectedAddress;

  // =================================================================
  // STEP 3: Deploy Safe Smart Wallet
  // =================================================================
  console.log("STEP 3: Deploying Safe Smart Wallet");
  console.log("-".repeat(60));

  // Check if Safe is already deployed
  const walletInfo = await sdk.getSmartWalletAddress(userAddress, chainId);
  console.log(`  Safe Address: ${walletInfo.address}`);
  console.log(`  Deployed: ${walletInfo.isDeployed}`);

  if (!walletInfo.isDeployed) {
    console.log("\n  Deploying Safe...");
    try {
      const deployResult = await sdk.deploySafe(userAddress, chainId);
      console.log("Safe deployed successfully");
      console.log(`  Safe Address: ${deployResult.safeAddress}`);
      console.log(`  Transaction: ${deployResult.txHash}`);
      console.log(`  Status: ${deployResult.status}`);
    } catch (error) {
      console.log("✗ Safe deployment failed:", (error as Error).message);
      console.log("  Note: Make sure you have gas fees on Base network");
    }
  } else {
    console.log("Safe already deployed");
  }
  console.log();

  // =================================================================
  // STEP 4: Create Session Key
  // =================================================================
  console.log("STEP 4: Creating Session Key");
  console.log("-".repeat(60));
  console.log("  Session keys enable delegated transactions without");
  console.log("  exposing your main private key");

  try {
    const sessionResult = await sdk.createSessionKey(userAddress, chainId);
    console.log("\nSession key created successfully");
    console.log("  Configuration: Auto-fetched from Zyfai API");
  } catch (error) {
    console.log("\n✗ Session key creation failed:", (error as Error).message);
    console.log("  Note: Ensure Safe is deployed first");
  }
  console.log();

  // =================================================================
  // STEP 5: Check Available Protocols
  // =================================================================
  console.log("STEP 5: Checking Available Protocols");
  console.log("-".repeat(60));

  try {
    const protocols = await sdk.getAvailableProtocols(chainId);
    console.log(`Found ${protocols.protocols.length} protocols on Base\n`);

    if (protocols.protocols.length > 0) {
      console.log("  Top Protocols:");
      protocols.protocols.slice(0, 3).forEach((protocol, index) => {
        console.log(`\n  ${index + 1}. ${protocol.name} (${protocol.type})`);
        console.log(
          `     Chains: ${protocol.chains?.join(", ") ?? "not specified"}`
        );
        console.log(
          `     Strategies: ${protocol.strategies?.join(", ") ?? "n/a"}`
        );
        console.log(`     Website: ${protocol.website ?? "n/a"}`);
        console.log(
          `     Pools: ${protocol.pools?.length ?? 0} | Image: ${
            protocol.imageUrl ?? "n/a"
          }`
        );
      });
    }
  } catch (error) {
    console.log("✗ Failed to fetch protocols:", (error as Error).message);
  }
  console.log();

  // =================================================================
  // STEP 6: Deposit Funds (Optional - Commented Out)
  // =================================================================
  console.log("STEP 6: Deposit Funds (Optional)");
  console.log("-".repeat(60));
  const tokenName = chainId === 9745 ? "USDT" : "USDC";
  console.log(`  To deposit funds, uncomment the code below and ensure:`);
  console.log(`  1. You have ${tokenName} in your connected wallet`);
  console.log("  2. You have gas fees for the transaction");
  console.log(
    `  3. Amount is in least decimal units (e.g., 10 ${tokenName} = 10000000)`
  );
  console.log();

  /* UNCOMMENT TO ENABLE DEPOSITS
  try {
    console.log(`  Depositing 10 ${tokenName} to Safe...`);
    // Token address is automatically selected (USDC for Base/Arbitrum, USDT for Plasma)
    const depositResult = await sdk.depositFunds(
      userAddress,
      chainId,
      "10000000" // 10 USDC/USDT = 10 * 10^6 (6 decimals)
    );

    console.log("\nDeposit successful");
    console.log(`  Transaction: ${depositResult.txHash}`);
    console.log(`  Amount: ${depositResult.amount}`);
    console.log(`  Smart Wallet: ${depositResult.smartWallet}`);
  } catch (error) {
    console.log("\n✗ Deposit failed:", (error as Error).message);
  }
  console.log();
  */

  console.log("  Skipping deposit (see code comments to enable)");
  console.log();

  // =================================================================
  // STEP 7: Monitor Positions
  // =================================================================
  console.log("STEP 7: Monitoring Positions");
  console.log("-".repeat(60));

  try {
    // Get all positions
    const positions = await sdk.getPositions(userAddress);
    console.log(`Portfolio retrieved successfully`);
    console.log(`  Total Value: $${positions.totalValueUsd.toFixed(2)}`);
    console.log(`  Active Positions: ${positions.positions.length}`);

    if (positions.positions.length === 0) {
      console.log("\n  No active positions found.");
      console.log("  Deposit funds to start earning yield!");
    } else {
      console.log("\n  Position Details:");
      positions.positions.forEach((bundle, index) => {
        console.log(
          `\n  ${index + 1}. Chain: ${bundle.chain ?? "unknown"} | Strategy: ${
            bundle.strategy ?? "n/a"
          }`
        );
        console.log(`     Smart Wallet: ${bundle.smartWallet ?? "n/a"}`);
        bundle.positions.forEach((slot, slotIndex) => {
          console.log(`       Slot ${slotIndex + 1}:`);
          console.log(
            `         Protocol: ${slot.protocol_name ?? slot.protocol_id}`
          );
          console.log(`         Pool: ${slot.pool ?? "n/a"}`);
          console.log(`         Token: ${slot.token_symbol ?? "n/a"}`);
          console.log(
            `         Underlying: ${
              slot.underlyingAmount ?? slot.amount ?? "0"
            }`
          );
          console.log(`         Pool APY: ${slot.pool_apy ?? "n/a"}`);
          console.log(`         Pool TVL: ${slot.pool_tvl ?? "n/a"}`);
        });
      });
    }

    // Get positions on specific chain
    console.log(`\n  Positions on Base only:`);
    const basePositions = await sdk.getPositions(userAddress, chainId);
    console.log(`  Positions: ${basePositions.positions.length}`);
    console.log(`  Total Value: $${basePositions.totalValueUsd.toFixed(2)}`);
  } catch (error) {
    console.log("✗ Failed to fetch positions:", (error as Error).message);
  }
  console.log();

  // =================================================================
  // STEP 8: Withdraw Funds (Optional - Commented Out)
  // =================================================================
  console.log("STEP 8: Withdraw Funds (Optional)");
  console.log("-".repeat(60));
  console.log("  To withdraw funds, uncomment the code below.");
  console.log("  You can perform full or partial withdrawals.");
  console.log(
    "  Amount must be in least decimal units (e.g., 5 USDC = 5000000)"
  );
  console.log();

  /* UNCOMMENT TO ENABLE WITHDRAWALS
  try {
    console.log("  Requesting partial withdrawal of 5 USDC...");
    // Funds are always withdrawn to the Safe owner's address (userAddress)
    const withdrawResult = await sdk.withdrawFunds(
      userAddress,
      chainId,
      "5000000" // 5 USDC = 5 * 10^6 (6 decimals)
    );

    console.log("\nWithdrawal requested successfully");
    console.log(`  Transaction: ${withdrawResult.txHash}`);
    console.log(`  Type: ${withdrawResult.type}`);
    console.log(`  Amount: ${withdrawResult.amount}`);
    console.log("\n  Note: Withdrawals may take some time to process");
  } catch (error) {
    console.log("\n✗ Withdrawal failed:", (error as Error).message);
  }
  console.log();
  */

  console.log("  Skipping withdrawal (see code comments to enable)");
  console.log();

  // =================================================================
  // SUMMARY
  // =================================================================
  console.log("=".repeat(60));
  console.log("End-to-End Workflow Completed!");
  console.log("=".repeat(60));
  console.log();
  console.log("Summary of what we did:");
  console.log("  Initialized SDK with API credentials");
  console.log("  Connected account (EOA wallet)");
  console.log("  Deployed/Verified Safe smart wallet");
  console.log("  Created session key for delegated transactions");
  console.log("  Checked available DeFi protocols");
  console.log("  Monitored active positions");
  console.log();
  console.log("Next Steps:");
  console.log("  1. Uncomment deposit code to add funds");
  console.log("  2. Wait for yield to accumulate");
  console.log("  3. Monitor positions regularly");
  console.log("  4. Withdraw funds when ready");
  console.log();
  console.log("For more examples, check:");
  console.log("  - basic-usage.ts");
  console.log("  - deposit-withdraw.ts");
  console.log("  - session-key-simple.ts");
  console.log("  - data-retrieval.ts");
  console.log();
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("\nFatal Error:", error);
    process.exit(1);
  });
