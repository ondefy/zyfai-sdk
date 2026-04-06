/**
 * Example: Bankr Integration
 * 
 * Demonstrates using Bankr's Agent API as an EIP-1193 provider with Zyfai SDK.
 * This allows Bankr agents to use Zyfai yield optimization without exposing private keys.
 * 
 * KNOWN LIMITATION:
 * Safe deployment (ERC-4337) fails with "AA24 signature error" because Bankr's
 * personal_sign treats hex hashes as text strings instead of raw bytes.
 * This requires Bankr to add raw hash signing support (isRawHash flag or eth_sign).
 * See docs/BANKR_INTEGRATION.md for details.
 * 
 * What WORKS: SIWE auth, EIP-712 typed data, regular transactions
 * What FAILS: ERC-4337 UserOperation signing (raw hash signatures)
 * 
 * Prerequisites:
 * - BANKR_API_KEY: Your Bankr API key with signing permissions
 * - ZYFAI_API_KEY: Your Zyfai API key
 * 
 * Run: npx tsx examples/bankr-integration.ts
 */

import { config } from "dotenv";
import { ZyfaiSDK, createBankrProvider, SupportedChainId } from "../src";

config();

async function main() {
  const bankrApiKey = process.env.BANKR_API_KEY;
  const zyfaiApiKey = process.env.ZYFAI_API_KEY;

  if (!bankrApiKey) {
    throw new Error("Missing BANKR_API_KEY environment variable");
  }

  if (!zyfaiApiKey) {
    throw new Error("Missing ZYFAI_API_KEY environment variable");
  }

  const chainId: SupportedChainId = 8453; // Base

  console.log("Creating Bankr provider...");
  const bankrProvider = createBankrProvider({
    apiKey: bankrApiKey,
    chainId,
  });
  console.log("Bankr provider created (no private key exposed)\n");

  console.log("Initializing Zyfai SDK...");
  const sdk = new ZyfaiSDK({
    apiKey: zyfaiApiKey,
  });

  // Connect using Bankr provider
  console.log("Connecting to Zyfai via Bankr provider...");
  const address = await sdk.connectAccount(bankrProvider, chainId);
  console.log(`Connected! EOA address: ${address}\n`);

  // Get Smart Wallet address
  console.log("Getting Smart Wallet address...");
  const walletResponse = await sdk.getSmartWalletAddress(address, chainId);
  console.log(`Smart Wallet: ${walletResponse.address}`);
  console.log(`Is deployed: ${walletResponse.isDeployed}\n`);

  // Deploy Safe if not already deployed (with automatic session key creation)
  if (!walletResponse.isDeployed) {
    console.log("Deploying Safe with automatic session key...");
    try {
      const deployResult = await sdk.deploySafe(address, chainId, "conservative", true);
      console.log(`Safe deployed: ${deployResult.safeAddress}`);
      console.log(`Session key created: ${deployResult.sessionKeyCreated}`);
      console.log(`Tx hash: ${deployResult.txHash}\n`);
    } catch (error) {
      const errorMsg = (error as Error).message;
      console.log(`Safe deployment failed: ${errorMsg}`);
      if (errorMsg.includes("AA24")) {
        console.log("\n[KNOWN LIMITATION]");
        console.log("Bankr's personal_sign treats hex hashes as text strings, not raw bytes.");
        console.log("ERC-4337 requires raw hash signatures (32 bytes, not 66-char hex string).");
        console.log("Solution: Bankr needs to add 'isRawHash: true' option or 'eth_sign' method.");
        console.log("See docs/BANKR_INTEGRATION.md for technical details.\n");
      }
    }
  } else {
    console.log("Safe already deployed, checking session key...");
    try {
      const sessionResult = await sdk.createSessionKey(address, chainId);
      console.log(`Session key status: ${sessionResult.sessionActivation?.isActive}\n`);
    } catch (error) {
      console.log(`Session key: ${(error as Error).message}\n`);
    }
  }

  // Get user details
  console.log("Getting user details...");
  const userDetails = await sdk.getUserDetails("USDC");
  console.log("User Details (USDC):");
  console.log(`  Strategy: ${userDetails.strategy}`);
  console.log(`  Chains: ${userDetails.chains?.join(", ")}`);
  console.log(`  Protocols: ${userDetails.protocols?.length || 0} configured`);
  console.log(`  Auto-compounding: ${userDetails.autocompounding}`);
  console.log();

  // Example: Deposit (commented out to avoid actual transactions)
  // console.log("Depositing 1 USDC...");
  // const depositResult = await sdk.depositFunds(address, chainId, "1000000", "usdc");
  // console.log(`Deposit tx: ${depositResult.txHash}`);

  console.log("Bankr integration test completed successfully!");
  console.log("\nThis demonstrates that Bankr agents can use Zyfai SDK without exposing private keys.");
}

main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});
