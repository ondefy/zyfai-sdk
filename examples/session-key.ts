/**
 * Advanced Session Key Example
 *
 * This example demonstrates how to create session keys with CUSTOM configuration.
 * For most use cases, use the simpler createSessionKey() method that auto-fetches config.
 * This is for advanced users who need specific custom permissions.
 */

import { config } from "dotenv";
import { type Session, SupportedChainId, ZyfaiSDK } from "../dist/index";
import { parseAbi, encodeFunctionData } from "viem";

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

  console.log("Starting Session Key Example...\n");

  // Step 1: Initialize SDK
  console.log("Step 1: Initializing SDK...");
  const sdk = new ZyfaiSDK({
    apiKey,
    environment: "staging",
    bundlerApiKey,
  });
  console.log("SDK initialized\n");

  // Step 2: Connect account
  console.log("Step 2: Connecting account...");
  const connectedAddress = await sdk.connectAccount(
    privateKey,
    8453 as SupportedChainId
  );
  console.log(`Connected: ${connectedAddress}\n`);

  // Step 3: Get Safe address
  const userAddress = connectedAddress;
  const chainId = 8453 as SupportedChainId;

  console.log("Step 3: Getting Safe address...");
  const walletInfo = await sdk.getSmartWalletAddress(userAddress, chainId);
  console.log(`Safe Address: ${walletInfo.address}`);
  console.log(`Deployed: ${walletInfo.isDeployed}\n`);

  if (!walletInfo.isDeployed) {
    console.log(
      "WARNING: Safe not deployed. Please deploy first using deploy-safe example."
    );
    return;
  }

  // Step 4: Define session configuration
  console.log("Step 4: Creating session key configuration...");

  // Example: Allow session key to transfer USDC tokens
  const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // USDC on Base

  const sessions: Session[] = [
    {
      // Session validator (the key that will be allowed to act)
      sessionValidator: "0x2483DA3A338895199E5e538530213157e931Bf06", // Ownable Validator
      sessionValidatorInitData: "0x",
      salt: "0x0000000000000000000000000000000000000000000000000000000000000000",

      // User operation policies (empty = allow all)
      userOpPolicies: [],

      // ERC-1271 signature policies
      erc7739Policies: {
        allowedERC7739Content: [],
        erc1271Policies: [],
      },

      // Actions this session key can perform
      actions: [
        {
          actionTarget: USDC_ADDRESS as `0x${string}`,
          actionTargetSelector: "0xa9059cbb", // transfer(address,uint256) selector
          actionPolicies: [],
        },
      ],

      // Allow paymaster usage
      permitERC4337Paymaster: true,

      // Chain ID as BigInt
      chainId: BigInt(8453),
    },
  ];

  console.log("Session configuration created");
  console.log(`   Target: USDC transfers`);
  console.log(`   Token: ${USDC_ADDRESS}`);
  console.log(`   Chain: Base (${chainId})\n`);

  // Step 5: Create and sign session key with custom config
  try {
    console.log("Step 5: Creating session key with custom configuration...");
    const result = await sdk.createSessionKeyWithConfig(
      userAddress,
      chainId,
      sessions
    );

    console.log("\nSession key created successfully!");
    console.log(`Safe Address: ${result.sessionKeyAddress}`);
    console.log(`Signature: ${result.signature.substring(0, 20)}...`);
    console.log(`Success: ${result.success}`);

    console.log("\nNext Steps:");
    console.log("   - Store the signature securely");
    console.log("   - Use this session to delegate USDC transfers");
    console.log("   - Session key can now transfer USDC without main key");
  } catch (error) {
    console.error("\nFailed to create session key:", (error as Error).message);
  }

  console.log("\nExample completed!");
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("\nUnexpected error:", error);
    process.exit(1);
  });
