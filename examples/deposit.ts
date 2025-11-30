import { config } from "dotenv";
import { SupportedChainId, ZyfaiSDK } from "../dist/index";

config();

const DEFAULT_USDC: Record<number, string> = {
  42161: "0xaf88d065e77c8cc2239327c5edb3a432268e5831", // Arbitrum
  8453: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Base
  9745: "0xb8ce59fc3717ada4c02eadf9682a9e934f625ebb", // Plasma
};

async function main() {
  const apiKey = process.env.ZYFAI_API_KEY;
  const bundlerApiKey = process.env.BUNDLER_API_KEY;
  const privateKey = process.env.PRIVATE_KEY;

  if (!apiKey || !bundlerApiKey || !privateKey) {
    throw new Error(
      "Missing env vars. Please set ZYFAI_API_KEY, BUNDLER_API_KEY, and PRIVATE_KEY."
    );
  }

  const chainId = Number(process.env.CHAIN_ID ?? 8453) as SupportedChainId;
  const tokenAddress =
    process.env.TOKEN_ADDRESS ?? DEFAULT_USDC[chainId] ?? undefined;
  const amount =
    process.env.DEPOSIT_AMOUNT ?? (chainId === 8453 ? "100000" : "100000"); // 0.1 USDC default

  if (!tokenAddress) {
    throw new Error(
      "TOKEN_ADDRESS is required for the selected chain (no default found)."
    );
  }

  const sdk = new ZyfaiSDK({
    apiKey,
    bundlerApiKey,
    environment: "staging",
  });

  console.log("SDK initialized. Connecting account…");
  const connected = await sdk.connectAccount(privateKey, chainId);
  console.log(`Connected EOA: ${connected}`);

  // Ensure Safe exists
  const wallet = await sdk.getSmartWalletAddress(connected, chainId);
  console.log(`Safe address: ${wallet.address}`);

  if (!wallet.isDeployed) {
    console.log("Safe not deployed. Deploying now (one-time cost)...");
    const deployment = await sdk.deploySafe(connected, chainId);
    if (!deployment.success) {
      throw new Error("Failed to deploy Safe.");
    }
    console.log(`Deployed Safe at ${deployment.safeAddress}`);
  }

  console.log(
    `Depositing ${amount} (least units) of token ${tokenAddress} on chain ${chainId}…`
  );
  const response = await sdk.depositFunds(
    connected,
    chainId,
    tokenAddress,
    amount
  );

  console.log("Deposit submitted:");
  console.log(`  Transaction: ${response.txHash}`);
  console.log(`  Smart Wallet: ${response.smartWallet}`);
  console.log(`  Status: ${response.status}`);
}

main().catch((error) => {
  console.error("Deposit script failed:", error);
  process.exit(1);
});
