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

  // NVDAc is Base-only.
  const chainId = 8453 as SupportedChainId;
  const asset = "NVDAc";
  const amount = "4000000"; // 0.04 NVDAc (8 decimals)

  const sdk = new ZyfaiSDK({ apiKey });

  console.log("SDK initialized. Connecting account…");
  const connected = await sdk.connectAccount(privateKey, chainId);
  console.log(`Connected EOA: ${connected}`);

  const wallet = await sdk.getSmartWalletAddress(connected, chainId);
  console.log(`Safe address: ${wallet.address}`);

  // NVDAc only lives in async protocols, so it needs "yieldmaxxing".
  // Chains default to Base, the only one it exists on.
  const profile = await sdk.setAssetStrategy({
    asset,
    strategy: "yieldmaxxing",
  });
  console.log(
    `NVDAc profile: strategy=${profile.strategy} protocols=${profile.protocols?.length}`
  );

  console.log("Depositing funds...", amount, asset, chainId);
  const response = await sdk.sendDeposit(connected, chainId, amount, asset);
  const credited = await sdk.waitForDepositCredit(response.registration.id, chainId);

  console.log("Deposit credited:");
  console.log(`  Transaction: ${response.txHash}`);
  console.log(`  Smart Wallet: ${response.smartWallet}`);
  console.log(`  Deposit ID: ${credited.id}`);
}

main().catch((error) => {
  console.error("Deposit script failed:", error);
  process.exit(1);
});
