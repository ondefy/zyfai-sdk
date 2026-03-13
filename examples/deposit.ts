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
  // USDC (6 decimals): "1000000" = 1 USDC, "100000000" = 100 USDC
  // WETH (18 decimals): "1000000000000000000" = 1 WETH, "100000000000000000" = 0.1 WETH
  
  const asset = "WETH"; // Can be "USDC" or "WETH"
  const amount = asset === "WETH" 
    ? "2000000000000000" // 0.002 WETH (18 decimals) -- minimum amount 0.001 on L2s
    : "100000000"; // 100 USDC (6 decimals) -- minimum amount 1.5 on L2s

  const sdk = new ZyfaiSDK({
    apiKey,
  });

  console.log("SDK initialized. Connecting account…");
  const connected = await sdk.connectAccount(privateKey, chainId);
  console.log(`Connected EOA: ${connected}`);

  // Ensure Safe exists
  const wallet = await sdk.getSmartWalletAddress(connected, chainId);
  console.log(`Safe address: ${wallet.address}`);

  // Deposit with specified asset (USDC by default, or WETH)
  const response = await sdk.depositFunds(connected, chainId, amount, asset);

  console.log("Deposit submitted:");
  console.log(`  Transaction: ${response.txHash}`);
  console.log(`  Smart Wallet: ${response.smartWallet}`);
}

main().catch((error) => {
  console.error("Deposit script failed:", error);
  process.exit(1);
});
