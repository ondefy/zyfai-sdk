/**
 * Example: Update User Profile with Protocols and Customization
 *
 * This example demonstrates how to configure your user profile with:
 * - Strategy selection (conservative/aggressive)
 * - Protocol selection and configuration
 * - Chain configuration
 * - Advanced features (splitting, cross-chain, etc.)
 * - Custom protocol/pool configuration
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

  console.log("🔐 Connecting account...");
  await sdk.connectAccount(privateKey, chainId);
  console.log("✅ Connected\n");

  // ===========================================================================
  // Example 1: Get Available Protocols
  // ===========================================================================
  console.log("📋 Step 1: Get Available Protocols");
  console.log("─".repeat(50));

  const protocolsResponse = await sdk.getProtocols(chainId);
  console.log(`Found ${protocolsResponse.protocols.length} protocols on chain ${chainId}:`);

  protocolsResponse.protocols.forEach((protocol, index) => {
    console.log(
      `  ${index + 1}. ${protocol.name} (${protocol.type})` +
        ` - ${protocol.strategies?.join(", ") || "N/A"}`
    );
  });
  console.log();

  // ===========================================================================
  // Example 2: Basic Strategy Update
  // ===========================================================================
  console.log("🎯 Step 2: Update Strategy");
  console.log("─".repeat(50));

  await sdk.updateUserProfile({
    strategy: "aggressive",
  });
  console.log("✅ Strategy updated to 'aggressive'\n");

  // ===========================================================================
  // Example 3: Configure Specific Protocols
  // ===========================================================================
  console.log("🔧 Step 3: Configure Specific Protocols");
  console.log("─".repeat(50));

  // Select specific protocols (e.g., Aave, Compound, Moonwell)
  const targetProtocols = ["Aave", "Moonwell", "Seamless"];
  const selectedProtocols = protocolsResponse.protocols
    .filter((p) => targetProtocols.includes(p.name))
    .map((p) => p.id);

  console.log(`Selected protocols: ${targetProtocols.join(", ")}`);
  console.log(`Protocol IDs: ${selectedProtocols.join(", ")}\n`);

  await sdk.updateUserProfile({
    protocols: selectedProtocols,
    autoSelectProtocols: false, // Use only selected protocols
  });
  console.log("✅ Protocols configured\n");

  // ===========================================================================
  // Example 4: Multi-Chain Configuration
  // ===========================================================================
  console.log("🌐 Step 4: Configure Multiple Chains");
  console.log("─".repeat(50));

  await sdk.updateUserProfile({
    chains: [8453, 42161], // Base and Arbitrum
    crosschainStrategy: true,
    omniAccount: true,
  });
  console.log("✅ Multi-chain configuration enabled:");
  console.log("   - Base (8453)");
  console.log("   - Arbitrum (42161)");
  console.log("   - Cross-chain strategy: enabled");
  console.log("   - Omni-account: enabled\n");

  // ===========================================================================
  // Example 5: Enable Advanced Features
  // ===========================================================================
  console.log("⚙️  Step 5: Enable Advanced Features");
  console.log("─".repeat(50));

  await sdk.updateUserProfile({
    splitting: true,
    minSplits: 3, // Split positions across at least 3 protocols
    autocompounding: true,
    executorProxy: true,
    agentName: "DeFi Yield Optimizer",
  });
  console.log("✅ Advanced features configured:");
  console.log("   - Position splitting: enabled (min 3 splits)");
  console.log("   - Auto-compounding: enabled");
  console.log("   - Executor proxy: enabled");
  console.log("   - Agent name: DeFi Yield Optimizer\n");

  // ===========================================================================
  // Example 6: Custom Protocol/Pool Configuration
  // ===========================================================================
  console.log("🎨 Step 6: Custom Protocol/Pool Configuration");
  console.log("─".repeat(50));

  // Note: You would typically get these from the customization API
  // This is just an example structure
  const customization = {
    // For each protocol, specify pools per chain
    [selectedProtocols[0]]: {
      "8453": ["USDC Pool", "WETH Pool"], // Base chain pools
      "42161": ["USDC Vault"], // Arbitrum pools
    },
  };

  await sdk.updateUserProfile({
    customization,
  });
  console.log("✅ Custom pool configuration saved");
  console.log(`   Protocol: ${targetProtocols[0]}`);
  console.log(`   Base pools: USDC Pool, WETH Pool`);
  console.log(`   Arbitrum pools: USDC Vault\n`);

  // ===========================================================================
  // Example 7: Complete Profile Configuration (All-in-One)
  // ===========================================================================
  console.log("🚀 Step 7: Complete Profile Configuration");
  console.log("─".repeat(50));

  const allProtocolIds = protocolsResponse.protocols.map((p) => p.id);

  await sdk.updateUserProfile({
    strategy: "aggressive",
    chains: [8453, 42161, 9745], // Base, Arbitrum, Plasma
    protocols: allProtocolIds,
    autoSelectProtocols: true, // Let engine choose best protocols
    splitting: true,
    minSplits: 2,
    crosschainStrategy: true,
    omniAccount: true,
    autocompounding: true,
    executorProxy: true,
    agentName: "Complete DeFi Agent",
  });

  console.log("✅ Complete profile configured:");
  console.log(`   - Strategy: aggressive`);
  console.log(`   - Chains: Base, Arbitrum, Plasma`);
  console.log(`   - Protocols: ${allProtocolIds.length} protocols`);
  console.log(`   - Auto-select: enabled`);
  console.log(`   - All advanced features: enabled\n`);

  // ===========================================================================
  // Verify Configuration
  // ===========================================================================
  console.log("🔍 Verification: Get Updated User Details");
  console.log("─".repeat(50));

  const userDetails = await sdk.getUserDetails();
  const user = userDetails.user;

  console.log("Current Profile:");
  console.log(`   - ID: ${user.id}`);
  console.log(`   - Strategy: ${user.strategy}`);
  console.log(`   - Smart Wallet: ${user.smartWallet}`);
  console.log(`   - Chains: ${user.chains.join(", ")}`);
  console.log(`   - Protocols: ${user.protocols.length} configured`);
  console.log(`   - Auto-select protocols: ${user.autoSelectProtocols}`);
  console.log(`   - Splitting: ${user.splitting || false}`);
  console.log(`   - Min splits: ${user.minSplits || "N/A"}`);
  console.log(`   - Cross-chain: ${user.crosschainStrategy || false}`);
  console.log(`   - Omni-account: ${user.omniAccount || false}`);
  console.log(`   - Auto-compounding: ${user.autocompounding !== false}`);
  console.log(`   - Executor proxy: ${user.executorProxy || false}`);
  console.log(`   - Agent name: ${user.agentName || "N/A"}`);
  console.log(`   - Has active session: ${user.hasActiveSessionKey}`);
  console.log();

  // ===========================================================================
  // Use Cases Summary
  // ===========================================================================
  console.log("💡 Use Cases Summary");
  console.log("─".repeat(50));
  console.log(`
1. Risk Management:
   - Start with 'conservative' strategy
   - Monitor performance
   - Switch to 'aggressive' when comfortable

2. Protocol Selection:
   - Use autoSelectProtocols: true for automatic best selection
   - Use autoSelectProtocols: false with specific protocols array for manual control

3. Multi-Chain:
   - Configure multiple chains for broader opportunities
   - Enable crosschainStrategy to allow rebalancing across chains
   - Enable omniAccount for unified account management

4. Position Splitting:
   - Enable splitting to distribute funds across multiple protocols
   - Set minSplits (1-4) based on risk tolerance
   - Higher splits = more diversification but more gas costs

5. Custom Configuration:
   - Use customization field for granular pool selection
   - Useful for targeting specific pools with best APY/risk profile
   - Structure: { protocolId: { chainId: [pools] } }
`);

  console.log("✅ All examples completed!");
}

main()
  .then(() => {
    console.log("\n🎉 Success! Profile configuration examples completed.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  });
