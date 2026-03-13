/**
 * Example: Update User Profile with Protocols
 *
 * This example demonstrates how to configure your user profile with:
 * - Asset-based configuration (usdc or eth)
 * - Strategy selection (conservative/aggressive)
 * - Protocol selection and configuration
 * - Advanced features (splitting, cross-chain, etc.)
 * - Custom protocol/pool configuration (per asset type)
 *
 * Note: Smart wallet address and chains are set during backend initialization
 * and cannot be updated via the SDK.
 *
 * Run: npx tsx examples/update-profile-with-protocols.ts
 */

import { ZyfaiSDK } from "../src";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  // Initialize SDK
  const sdk = new ZyfaiSDK({
    apiKey: process.env.ZYFAI_API_KEY!,
  });

  // Connect with your private key
  const privateKey = process.env.PRIVATE_KEY as `0x${string}`;
  const chainId = 8453; // Base

  console.log("Connecting account...");
  await sdk.connectAccount(privateKey, chainId);
  console.log("Connected\n");

  // ===========================================================================
  // Example 1: Get Available Protocols And Update Strategy
  // ===========================================================================
  console.log("Step 1: Get Available Protocols");
  console.log("-".repeat(50));

  const protocolsResponse = await sdk.getAvailableProtocols(chainId);
  console.log(`Found ${protocolsResponse.protocols.length} protocols on chain ${chainId}:`);

  protocolsResponse.protocols.forEach((protocol, index) => {
    console.log(
      `  ${index + 1}. ${protocol.name} (${protocol.type}) ${protocol.id}` +
        ` - ${protocol.strategies?.join(", ") || "N/A"}`
    );
  });

  const updateStrategyResponse = await sdk.updateUserProfile({
    asset: "eth",
    protocols: protocolsResponse.protocols.map((p) => p.id),
  });
  console.log("Strategy updated to 'conservative'", updateStrategyResponse);

  // ===========================================================================
  // Example 2: Update ETH Strategy
  // ===========================================================================
  console.log("Step 2: Update ETH Strategy");
  console.log("-".repeat(50));

  const response = await sdk.updateUserProfile({
    strategy: "aggressive",
    asset: "eth",
  });

  console.log("response:", response);

  // Get ETH-specific user details
  const userDetailsETH = await sdk.getUserDetails("eth");
  console.log("userDetails (eth):", userDetailsETH);

  // Get USDC-specific user details for comparison
  const userDetailsUSDC = await sdk.getUserDetails("usdc");
  console.log("userDetails (usdc):", userDetailsUSDC);

  // ===========================================================================
  // Example 3: Update ETH Strategy (explicit asset)
  // ===========================================================================
  console.log("Step 3: Update ETH Strategy (explicit asset)");
  console.log("-".repeat(50));

  // Explicitly specify asset: "eth" for WETH configuration
  await sdk.updateUserProfile({
    asset: "eth",
    strategy: "conservative",
    autocompounding: true,
    chains: [8453, 42161],
  });
  console.log("ETH strategy updated to 'conservative' with autocompounding\n");

  // ===========================================================================
  // Example 4: Configure Specific Protocols for USDC
  // ===========================================================================
  console.log("Step 4: Configure Specific Protocols for USDC");
  console.log("-".repeat(50));

  // Select specific protocols (e.g., Aave, Compound, Moonwell)
  const targetProtocols = ["Aave V3", "Compound V3", "Morpho"];
  const selectedProtocols = protocolsResponse.protocols
    .filter((p) => targetProtocols.includes(p.name))
    .map((p) => p.id);

  console.log(`Selected protocols: ${targetProtocols.join(", ")}`);
  console.log(`Protocol IDs: ${selectedProtocols.join(", ")}\n`);

  await sdk.updateUserProfile({
    asset: "usdc",
    protocols: selectedProtocols,
    autoSelectProtocols: false, // Use only selected protocols
  });
  console.log("USDC protocols configured\n");

  // ===========================================================================
  // Example 5: Enable Cross-Chain Features
  // ===========================================================================
  console.log("Step 5: Enable Cross-Chain Features");
  console.log("-".repeat(50));

  // Note: Chains are configured during backend initialization
  // Here we enable cross-chain features for your configured chains
  await sdk.updateUserProfile({
    asset: "usdc",
    crosschainStrategy: true,
    omniAccount: true,
  });
  console.log("Cross-chain features enabled:");
  console.log("   - Cross-chain strategy: enabled");
  console.log("   - Omni-account: enabled");
  console.log("   - Operates on your configured chains (set via backend)\n");

  // ===========================================================================
  // Example 6: Enable Advanced Features for USDC
  // ===========================================================================
  console.log("Step 6: Enable Advanced Features for USDC");
  console.log("-".repeat(50));

  await sdk.updateUserProfile({
    asset: "usdc",
    splitting: true,
    minSplits: 3, // Split positions across at least 3 protocols
    autocompounding: true,
    agentName: "DeFi Yield Optimizer",
  });
  console.log("Advanced features configured for USDC:");
  console.log("   - Position splitting: enabled (min 3 splits)");
  console.log("   - Auto-compounding: enabled");
  console.log("   - Agent name: DeFi Yield Optimizer\n");


  // ===========================================================================
  // Example 7: Complete Profile Configuration for Both Assets
  // ===========================================================================
  console.log("Step 7: Complete Profile Configuration for Both Assets");
  console.log("-".repeat(50));

  const allProtocolIds = protocolsResponse.protocols.map((p) => p.id);

  // Configure USDC
  await sdk.updateUserProfile({
    asset: "usdc",
    strategy: "aggressive",
    protocols: allProtocolIds,
    autoSelectProtocols: true,
    splitting: true,
    minSplits: 4,
    crosschainStrategy: true,
    autocompounding: true,
  });
  console.log("USDC profile configured (aggressive)");

  // Configure ETH
  await sdk.updateUserProfile({
    asset: "eth",
    strategy: "conservative",
    protocols: allProtocolIds,
    autoSelectProtocols: true,
    splitting: false,
    crosschainStrategy: false,
    autocompounding: true,
  });
  console.log("ETH profile configured (conservative)");

  // Global settings
  await sdk.updateUserProfile({
    omniAccount: true,
    agentName: "Multi-Asset DeFi Agent",
  });
  console.log("Global settings configured\n");
}

main()
  .then(() => {
    console.log("\nSuccess! Profile configuration examples completed.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\nError:", error.message);
    process.exit(1);
  });
