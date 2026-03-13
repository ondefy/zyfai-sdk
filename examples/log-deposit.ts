/**
 * Example: Log External Deposit
 *
 * This example demonstrates how to use logDeposit() to register a deposit
 * that was executed client-side with a custom wallet implementation
 * (e.g., Privy, Biconomy, or other sponsored/gasless transaction providers).
 *
 * Use case: When you execute the ERC20 transfer yourself (for sponsored gas,
 * custom wallet logic, etc.) and need to register it with Zyfai's backend
 * for tracking and yield optimization.
 *
 * Usage:
 *   # Option 1: Log an existing transaction (already executed via Privy)
 *   ZYFAI_API_KEY=xxx PRIVATE_KEY=xxx TX_HASH=0x... npx tsx examples/log-deposit.ts
 *
 *   # Option 2: Execute deposit + log (for testing)
 *   ZYFAI_API_KEY=xxx PRIVATE_KEY=xxx DEPOSIT_AMOUNT=1500000 npx tsx examples/log-deposit.ts
 *
 * Optional env vars:
 *   CHAIN_ID: Chain ID (default: 8453 for Base)
 *   DEPOSIT_AMOUNT: Amount in least decimal units (default: 1500000 = 1.5 USDC)
 *   TOKEN_ADDRESS: Custom token address (optional, auto-selected based on chain)
 */

import { config } from "dotenv";
import {
  SupportedChainId,
  ZyfaiSDK,
  getDefaultTokenAddress,
} from "../dist/index";
import {
  createWalletClient,
  createPublicClient,
  http,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, arbitrum } from "viem/chains";

config();

const ERC20_ABI = [
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

function getChain(chainId: number) {
  switch (chainId) {
    case 8453:
      return base;
    case 42161:
      return arbitrum;
    default:
      throw new Error(`Chain ${chainId} not supported in this example`);
  }
}

async function main() {
  const apiKey = process.env.ZYFAI_API_KEY;
  const privateKey = process.env.PRIVATE_KEY;

  if (!apiKey || !privateKey) {
    throw new Error(
      "Missing env vars. Please set ZYFAI_API_KEY and PRIVATE_KEY."
    );
  }

  const chainId = Number(process.env.CHAIN_ID ?? 8453) as SupportedChainId;
  const amount = process.env.DEPOSIT_AMOUNT ?? "3000000"; // 3 USDC/USDT
  const customTokenAddress = process.env.TOKEN_ADDRESS;

  // Option 1: Use a pre-existing transaction hash (if you already executed the deposit)
  const existingTxHash = process.env.TX_HASH;

  const sdk = new ZyfaiSDK({ apiKey });

  console.log("SDK initialized. Connecting account...");
  const connected = await sdk.connectAccount(privateKey, chainId);
  console.log(`Connected EOA: ${connected}`);

  // Get Safe address
  const wallet = await sdk.getSmartWalletAddress(connected, chainId);
  console.log(`Safe address: ${wallet.address}`);

  if (!wallet.isDeployed) {
    console.log("Safe not deployed. Deploying now...");
    const deployment = await sdk.deploySafe(connected, chainId);
    if (!deployment.success) {
      throw new Error("Failed to deploy Safe.");
    }
    console.log(`Deployed Safe at ${deployment.safeAddress}`);
  }

  const sessionResult = await sdk.createSessionKey(connected, chainId);

  console.log(`Session key created: ${sessionResult.signature}`);
  let txHash: string;

  if (existingTxHash) {
    // Use existing transaction hash (already executed via Privy, etc.)
    console.log(`\nUsing existing transaction hash: ${existingTxHash}`);
    txHash = existingTxHash;
  } else {
    // Execute the deposit ourselves (simulating what Privy would do)
    console.log("\nNo TX_HASH provided. Executing deposit transaction...");
    console.log(
      "(In production, this would be done by Privy with sponsored gas)"
    );

    const chain = getChain(chainId);
    const account = privateKeyToAccount(privateKey as Hex);

    const walletClient = createWalletClient({
      account,
      chain,
      transport: http(),
    });

    const publicClient = createPublicClient({
      chain,
      transport: http(),
    });

    const tokenAddress = (customTokenAddress ||
      getDefaultTokenAddress(chainId)) as Address;
    const tokenInfo = chainId === 9745 ? "USDT" : "USDC";

    console.log(`Token: ${tokenInfo} (${tokenAddress})`);
    console.log(`Amount: ${amount} (least decimal units)`);
    console.log(`Destination: ${wallet.address}`);

    // Execute ERC20 transfer (this is what Privy/Biconomy would do with sponsored gas)
    txHash = await walletClient.writeContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "transfer",
      args: [wallet.address as Address, BigInt(amount)],
    });

    console.log(`\nTransaction submitted: ${txHash}`);
    console.log("Waiting for confirmation...");

    // Wait for transaction confirmation
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash as Hex,
    });

    if (receipt.status !== "success") {
      throw new Error("Deposit transaction failed");
    }

    console.log("Transaction confirmed!");
  }

  // Now log the deposit to Zyfai backend
  console.log("\nLogging deposit to Zyfai backend...");

  const result = await sdk.logDeposit(
    chainId,
    txHash,
    amount,
    customTokenAddress // Optional: auto-selected if not provided
  );

  if (result.success) {
    console.log("Deposit logged successfully!");
    console.log(`  Message: ${result.message}`);
    console.log(`  Chain: ${chainId}`);
    console.log(`  Amount: ${amount}`);
    console.log(`  TxHash: ${txHash}`);
  } else {
    console.error("Failed to log deposit");
  }
}

main().catch((error) => {
  console.error("Log deposit script failed:", error);
  process.exit(1);
});
