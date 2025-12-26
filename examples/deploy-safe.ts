/**
 * Deploy Safe Smart Account Example
 *
 * Demonstrates how to:
 * 1. Initialize the SDK and connect an account
 * 2. Get the Safe smart wallet address
 * 3. Deploy the Safe smart wallet if not already deployed
 */

import { config } from "dotenv";
import { SupportedChainId, ZyfaiSDK } from "../dist/index";

config();

async function main() {
  const apiKey = process.env.ZYFAI_API_KEY;
  const privateKey = process.env.PRIVATE_KEY;

  if (!apiKey || !privateKey) {
    throw new Error(
      "Missing environment variables. Please set ZYFAI_API_KEY and PRIVATE_KEY in .env"
    );
  }

  const chainId = Number(process.env.CHAIN_ID ?? 8453) as SupportedChainId;

  const rpcUrls = {
    8453: "https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY",
    42161: "https://arb-mainnet.g.alchemy.com/v2/YOUR_API_KEY",
    9745: "https://your-plasma-rpc-provider.com",
  };
  const sdk = new ZyfaiSDK({
    apiKey,
    environment: "staging",
    // rpcUrls,
  });

  console.log("SDK initialized");
  console.log(
    `Target chain: ${chainId} (${
      chainId === 8453 ? "Base" : chainId === 42161 ? "Arbitrum" : "Plasma"
    })\n`
  );

  const connectedAddress = await sdk.connectAccount(privateKey, chainId);
  console.log(`Account connected: ${connectedAddress}\n`);

  // Get the Safe smart wallet address
  console.log("Getting Safe smart wallet address...");
  const walletInfo = await sdk.getSmartWalletAddress(connectedAddress, chainId);
  console.log(`Safe Address: ${walletInfo.address}`);
  console.log(`Safe Deployed: ${walletInfo.isDeployed}\n`);

  if (walletInfo.isDeployed) {
    console.log("Safe is already deployed. No action needed.");
    console.log(`Safe Address: ${walletInfo.address}`);
  } else {
    console.log("Safe not deployed. Deploying now (one-time cost)...");
    const deployment = await sdk.deploySafe(connectedAddress, chainId);

    if (deployment.success) {
      console.log("\n✅ Safe deployed successfully!");
      console.log(`  Safe Address: ${deployment.safeAddress}`);
      console.log(`  Transaction Hash: ${deployment.txHash}`);
      console.log(`  Status: ${deployment.status}`);
    } else {
      console.error("\n❌ Safe deployment failed");
      throw new Error("Failed to deploy Safe");
    }
  }
}

main().catch((error) => {
  console.error("Deploy Safe script failed:", error);
  process.exit(1);
});
