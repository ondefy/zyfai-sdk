import { config } from "dotenv";
import { SupportedChainId, ZyfaiSDK } from "../dist/index";

config();

async function main() {
  const apiKey = process.env.ZYFAI_API_KEY;
  const privateKey = process.env.PRIVATE_KEY;

  if (!apiKey || !privateKey) {
    throw new Error(
      "Missing env vars. Please set ZYFAI_API_KEY and PRIVATE_KEY."
    );
  }

  const chainId = Number(process.env.CHAIN_ID ?? 42161) as SupportedChainId;
  
  // Examples of amounts in correct decimal units:
  // USDC / EURC (6 decimals): "1000000" = 1, "100000000" = 100
  // WETH (18 decimals): "1000000000000000000" = 1 WETH, "100000000000000000" = 0.1 WETH
  // EURC is supported on Ethereum Mainnet (1) and Base (8453) only.

  const asset = "USDC"; // Can be "USDC", "WETH", or "EURC"
  const amount = "2000000"; // 2 USDC or EURC (6 decimals)

  const sdk = new ZyfaiSDK({
    apiKey,
  });

  console.log("SDK initialized. Connecting account…");
  const connected = await sdk.connectAccount(privateKey, chainId);
  console.log(`Connected EOA: ${connected}`);

  // Ensure Safe exists
  const wallet = await sdk.getSmartWalletAddress(connected, chainId);
  console.log(`Safe address: ${wallet.address}`);

  console.log("Depositing funds...", amount, asset, chainId);
  // Deposit with specified asset (USDC by default, or WETH / EURC)
  const response = await sdk.depositFunds(connected, chainId, amount, asset);

  console.log("Deposit submitted:");
  console.log(`  Transaction: ${response.txHash}`);
  console.log(`  Smart Wallet: ${response.smartWallet}`);
}

main().catch((error) => {
  console.error("Deposit script failed:", error);
  process.exit(1);
});
