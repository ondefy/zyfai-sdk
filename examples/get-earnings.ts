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

  const sdk = new ZyfaiSDK({
    apiKey,
    bundlerApiKey,
    environment: "staging",
  });

  console.log("SDK initialized. Connecting account…");
  const connected = await sdk.connectAccount(privateKey, chainId);
  console.log(`Connected EOA: ${connected}`);

  console.log(`Fetching earnings for ${connected}…`);
  const response = await sdk.getEarnings(connected, chainId);

  console.log("Earnings summary:");
  console.log(`  Total: $${response.totalEarningsUsd.toFixed(2)}`);
  console.log(`  Unrealized: $${response.unrealizedEarningsUsd.toFixed(2)}`);
  console.log(`  Realized: $${response.realizedEarningsUsd.toFixed(2)}`);
}

main().catch((error) => {
  console.error("Earnings script failed:", error);
  process.exit(1);
});

