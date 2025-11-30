import { config } from "dotenv";
import { Address, SupportedChainId, ZyfaiSDK } from "../dist/index";

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

  const chainId = 8453 as SupportedChainId;
  const withdrawAmount = "100000"; // 0.1 USDC = 100000 (6 decimals)

  const sdk = new ZyfaiSDK({
    apiKey,
    bundlerApiKey,
    environment: "staging",
  });

  console.log("SDK initialized. Connecting account…");
  const connected = await sdk.connectAccount(privateKey, chainId);
  const receiver = connected as Address;
  console.log(`Connected EOA: ${connected}`);
  console.log(`Receiver: ${receiver}`);

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

  const response = await sdk.withdrawFunds(
    connected,
    chainId,
    withdrawAmount,
    receiver
  );

  console.log("Withdraw submitted:");
  console.log(`  Success: ${response.success}`);
  console.log(`  Type: ${response.type}`);
  console.log(`  Tx Hash / Status: ${response.txHash} (${response.status})`);
  console.log(`  Receiver: ${response.receiver}`);
}

main().catch((error) => {
  console.error("Withdraw script failed:", error);
  process.exit(1);
});
