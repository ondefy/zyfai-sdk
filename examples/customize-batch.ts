/**
 * Example: Customize Protocol Pools in Batch
 *
 * This example demonstrates how to configure specific pools for protocols
 * across different chains using the customize-batch endpoint.
 *
 * This provides granular control over which pools to use for each protocol,
 * which is useful for advanced users who want to target specific pools
 * with desired APY/risk profiles.
 *
 * Run: npx tsx examples/customize-batch.ts
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
  // Step 1: Get Available Protocols
  // ===========================================================================
  console.log("📋 Step 1: Get Available Protocols");
  console.log("─".repeat(50));

  const protocolsResponse = await sdk.getProtocols(chainId);
  console.log(`Found ${protocolsResponse.protocols.length} protocols on chain ${chainId}\n`);

  // Select a few protocols for demonstration
  const selectedProtocols = protocolsResponse.protocols.slice(0, 3);
  selectedProtocols.forEach((protocol, index) => {
    console.log(`${index + 1}. ${protocol.name} (ID: ${protocol.id})`);
  });
  console.log();

  // ===========================================================================
  // Step 2: Get Available Pools for a Protocol
  // ===========================================================================
  console.log("🔍 Step 2: Get Available Pools for a Protocol");
  console.log("─".repeat(50));

  const firstProtocol = selectedProtocols[0];
  console.log(`Getting pools for: ${firstProtocol.name}`);

  const poolsResponse = await sdk.getAvailablePools(firstProtocol.id);
  console.log(`Available pools: ${poolsResponse.pools.length} found`);
  poolsResponse.pools.slice(0, 5).forEach((pool, index) => {
    console.log(`  ${index + 1}. ${pool}`);
  });
  if (poolsResponse.pools.length > 5) {
    console.log(`  ...and ${poolsResponse.pools.length - 5} more`);
  }
  console.log();

  // ===========================================================================
  // Step 3: Get Current Selected Pools
  // ===========================================================================
  console.log("📌 Step 3: Get Current Selected Pools");
  console.log("─".repeat(50));

  try {
    const selectedPools = await sdk.getSelectedPools(firstProtocol.id, chainId);
    console.log(`Protocol: ${firstProtocol.name}`);
    console.log(`Chain: ${chainId}`);
    console.log(`Autoselect: ${selectedPools.autoselect}`);
    console.log(`Selected pools: ${selectedPools.pools.length > 0 ? selectedPools.pools.join(", ") : "None (autoselect enabled)"}`);
  } catch (error) {
    console.log("No customization configured yet for this protocol/chain");
  }
  console.log();

  // ===========================================================================
  // Step 4: Configure Customizations in Batch
  // ===========================================================================
  console.log("⚙️  Step 4: Configure Customizations in Batch");
  console.log("─".repeat(50));

  // Example 1: Configure specific pools for first protocol on Base
  const customization1 = {
    protocolId: selectedProtocols[0].id,
    pools: poolsResponse.pools.slice(0, 2), // Select first 2 pools
    chainId: 8453, // Base
    autoselect: false,
  };

  // Example 2: Enable autoselect for second protocol on Base
  const customization2 = {
    protocolId: selectedProtocols[1].id,
    pools: [], // Empty when autoselect is true
    chainId: 8453, // Base
    autoselect: true,
  };

  // Example 3: Configure for third protocol on Arbitrum (if it supports it)
  const customization3 = {
    protocolId: selectedProtocols[2].id,
    pools: [],
    chainId: 42161, // Arbitrum
    autoselect: true,
  };

  const customizations = [customization1, customization2, customization3];

  console.log("Configuring customizations:");
  customizations.forEach((custom, index) => {
    const protocol = selectedProtocols[index];
    console.log(`  ${index + 1}. ${protocol.name}:`);
    console.log(`     Chain: ${custom.chainId}`);
    console.log(`     Autoselect: ${custom.autoselect}`);
    console.log(`     Pools: ${custom.pools.length > 0 ? custom.pools.join(", ") : "(autoselect)"}`);
  });
  console.log();

  const result = await sdk.customizeBatch(customizations);
  console.log(`✅ Customizations saved successfully! (${result.success})\n`);

  // ===========================================================================
  // Step 5: Verify Customizations
  // ===========================================================================
  console.log("🔍 Step 5: Verify Customizations");
  console.log("─".repeat(50));

  for (let i = 0; i < selectedProtocols.length; i++) {
    const protocol = selectedProtocols[i];
    const custom = customizations[i];

    try {
      const selected = await sdk.getSelectedPools(protocol.id, custom.chainId);
      console.log(`${protocol.name} (Chain ${custom.chainId}):`);
      console.log(`  Autoselect: ${selected.autoselect}`);
      console.log(`  Pools: ${selected.pools.length > 0 ? selected.pools.join(", ") : "(autoselect enabled)"}`);
      console.log();
    } catch (error) {
      console.log(`${protocol.name} (Chain ${custom.chainId}): No customization found`);
    }
  }

  // ===========================================================================
  // Step 6: Advanced Example - Multi-Chain Configuration
  // ===========================================================================
  console.log("🌐 Step 6: Advanced - Multi-Chain Configuration");
  console.log("─".repeat(50));

  // Configure the same protocol across multiple chains
  const multiChainProtocol = selectedProtocols[0];
  const chains = [8453, 42161, 9745]; // Base, Arbitrum, Plasma

  const multiChainCustomizations = chains.map((chain) => ({
    protocolId: multiChainProtocol.id,
    pools: chain === 8453 ? poolsResponse.pools.slice(0, 2) : [], // Specific pools on Base, autoselect on others
    chainId: chain,
    autoselect: chain !== 8453, // Autoselect on Arbitrum and Plasma
  }));

  console.log(`Configuring ${multiChainProtocol.name} across ${chains.length} chains:`);
  multiChainCustomizations.forEach((custom) => {
    const chainName =
      custom.chainId === 8453 ? "Base" :
      custom.chainId === 42161 ? "Arbitrum" :
      custom.chainId === 9745 ? "Plasma" : `Chain ${custom.chainId}`;
    console.log(`  ${chainName}: ${custom.autoselect ? "Autoselect" : `${custom.pools.length} specific pools`}`);
  });
  console.log();

  const multiChainResult = await sdk.customizeBatch(multiChainCustomizations);
  console.log(`✅ Multi-chain customizations saved! (${multiChainResult.success})\n`);

  // ===========================================================================
  // Use Cases Summary
  // ===========================================================================
  console.log("💡 Use Cases Summary");
  console.log("─".repeat(50));
  console.log(`
1. Specific Pool Targeting:
   - Use autoselect: false with specific pools array
   - Target pools with desired APY/risk profiles
   - Useful for advanced yield optimization strategies

2. Auto-Selection:
   - Use autoselect: true with empty pools array
   - Let the rebalance engine choose best pools automatically
   - Recommended for most users

3. Multi-Chain Configuration:
   - Configure the same protocol differently on each chain
   - Example: Specific pools on Base, autoselect on Arbitrum
   - Enables chain-specific strategies

4. Batch Updates:
   - Update multiple protocols at once
   - Atomic operation - all succeed or all fail
   - Efficient for managing complex configurations

5. Protocol-Specific Strategies:
   - Mix autoselect and manual selection
   - Some protocols on autoselect, others with specific pools
   - Maximum flexibility for portfolio management
`);

  console.log("✅ All examples completed!");
}

main()
  .then(() => {
    console.log("\n🎉 Success! Customization examples completed.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  });
