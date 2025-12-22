import { config } from "dotenv";
import { SupportedChainId, ZyfaiSDK } from "../dist/index";

config();

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
  const amount =
    process.env.DEPOSIT_AMOUNT ?? (chainId === 8453 ? "1500000" : "1500000"); // 1.5 USDC default

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

  const tokenInfo = chainId === 9745 ? "USDT" : "USDC";
  console.log(
    `Depositing ${amount} (least units) of ${tokenInfo} on chain ${chainId}…`
  );
  // Token address is automatically selected based on chain (USDC for Base/Arbitrum, USDT for Plasma)
  const response = await sdk.depositFunds(connected, chainId, amount);

  console.log("Deposit submitted:");
  console.log(`  Transaction: ${response.txHash}`);
  console.log(`  Smart Wallet: ${response.smartWallet}`);
}

main().catch((error) => {
  console.error("Deposit script failed:", error);
  process.exit(1);
});
