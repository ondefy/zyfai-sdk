import { config } from "dotenv";
import { Address, SupportedChainId, ZyfaiSDK } from "../dist/index";

config();

async function main() {
  const apiKey = process.env.ZYFAI_API_KEY;
  const privateKey = process.env.PRIVATE_KEY;

  if (!apiKey || !privateKey) {
    throw new Error(
      "Missing env vars. Please set ZYFAI_API_KEY and PRIVATE_KEY."
    );
  }

  const chainId = 42161 as SupportedChainId;
  const asset = "WETH"; // Can be "USDC" or "WETH"
  const withdrawAmount = asset === "WETH" 
    ? "600000000000000000" // 0.6 WETH (18 decimals)
    : "100000000"; // 100 USDC (6 decimals)

  const sdk = new ZyfaiSDK({
    apiKey,
  });

  console.log("SDK initialized. Connecting account…");
  const connected = await sdk.connectAccount(privateKey, chainId);
  console.log(`Connected EOA: ${connected}`);

  const wallet = await sdk.getSmartWalletAddress(connected, chainId);
  console.log(`Safe address: ${wallet.address}`);

  if (!wallet.isDeployed) {
    throw new Error(
      "Safe is not deployed on this chain. Please deploy it before withdrawing."
    );
  }

  if (withdrawAmount) {
    console.log(
      `Requesting partial withdrawal of ${withdrawAmount} (least units) on chain ${chainId}…`
    );
  } else {
    console.log(`Requesting full withdrawal on chain ${chainId}…`);
  }

  // Funds are always withdrawn to the Safe owner's address (connected)
  const response = await sdk.withdrawFunds(connected, chainId, withdrawAmount, "WETH");

  console.log("Withdraw submitted:");
  console.log(`  Success: ${response.success}`);
  console.log(`  Type: ${response.type}`);
  console.log(`  Amount: ${response.amount}`);
  console.log(`  Tx Hash: ${response.txHash}`);
  console.log(`  Message: ${response.message}`);
}

main().catch((error) => {
  console.error("Withdraw script failed:", error);
  process.exit(1);
});
