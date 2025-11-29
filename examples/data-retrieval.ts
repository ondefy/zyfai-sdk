/**
 * Data Retrieval Example
 *
 * This example demonstrates how to retrieve protocols, positions, and earnings data.
 */

import { config } from "dotenv";
import { SupportedChainId, ZyfaiSDK } from "../dist/index";

// Load environment variables from .env file
config();

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

  console.log("Starting Data Retrieval Example...\n");

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

  // Get available protocols
  console.log("Step 3: Getting available protocols...");
  try {
    const protocols = await sdk.getAvailableProtocols(chainId);

    console.log(`Found ${protocols.protocols.length} protocols on Base:\n`);

    protocols.protocols.forEach((protocol, index) => {
      console.log(`${index + 1}. ${protocol.name}`);
      console.log(`   Description: ${protocol.description}`);
      console.log(`   TVL: $${protocol.tvl}`);
      console.log(
        `   APY Range: ${protocol.minApy}% - ${protocol.maxApy}%`
      );
      console.log(`   Pools: ${protocol.pools.length}`);
      console.log();
    });
  } catch (error) {
    console.error("Failed to get protocols:", (error as Error).message);
  }

  // Get user positions
  console.log("Step 4: Getting user positions...");
  try {
    const positions = await sdk.getPositions(userAddress);

    console.log(`\nTotal Portfolio Value: $${positions.totalValueUsd}`);
    console.log(`Active Positions: ${positions.positions.length}\n`);

    if (positions.positions.length > 0) {
      positions.positions.forEach((position, index) => {
        console.log(`Position ${index + 1}:`);
        console.log(`  Protocol: ${position.protocol}`);
        console.log(`  Pool: ${position.pool}`);
        console.log(`  Asset: ${position.asset.symbol}`);
        console.log(`  Amount: ${position.amount}`);
        console.log(`  Value: $${position.valueUsd}`);
        console.log(`  APY: ${position.apy}%`);
        console.log(
          `  Unrealized Earnings: $${position.unrealizedEarnings}`
        );
        console.log();
      });
    } else {
      console.log("No active positions found.\n");
    }

    // Get positions for specific chain
    console.log("Step 5: Getting positions on Base only...");
    const basePositions = await sdk.getPositions(userAddress, chainId);
    console.log(
      `Positions on Base: ${basePositions.positions.length}`
    );
    console.log(`Total Value on Base: $${basePositions.totalValueUsd}\n`);
  } catch (error) {
    console.error("Failed to get positions:", (error as Error).message);
  }

  // Get user earnings
  console.log("Step 6: Getting user earnings...");
  try {
    const earnings = await sdk.getEarnings(userAddress);

    console.log("\nEarnings Summary:");
    console.log(`  Total Earnings: $${earnings.totalEarningsUsd}`);
    console.log(
      `  Unrealized Earnings: $${earnings.unrealizedEarningsUsd}`
    );
    console.log(
      `  Realized Earnings: $${earnings.realizedEarningsUsd}`
    );
    console.log();

    // Get earnings for specific chain
    const baseEarnings = await sdk.getEarnings(userAddress, chainId);
    console.log("Earnings on Base:");
    console.log(`  Total: $${baseEarnings.totalEarningsUsd}`);
    console.log(
      `  Unrealized: $${baseEarnings.unrealizedEarningsUsd}`
    );
    console.log(`  Realized: $${baseEarnings.realizedEarningsUsd}\n`);
  } catch (error) {
    console.error("Failed to get earnings:", (error as Error).message);
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

