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

  console.log(`Fetching positions for ${connected}…`);
  const response = await sdk.getPositions(connected, chainId);

  const positions = response.positions || [];
  console.log(`Positions count: ${positions.length}`);

  if (positions.length === 0) {
    console.log("No active positions found.");
  }

  positions.forEach((position, index) => {
    console.log(
      `${index + 1}. Protocol: ${position.protocol ?? "n/a"} | Pool: ${
        position.pool ?? "n/a"
      }`
    );
    console.log(`   Chain: ${position.chainId ?? "unknown"}`);
    console.log(`   Asset: ${position.asset?.symbol ?? "n/a"}`);
    console.log(`   Amount: ${position.amount ?? "0"}`);
    console.log(`   Value (USD): ${position.valueUsd ?? 0}`);
    console.log();
  });
}

main().catch((error) => {
  console.error("Positions script failed:", error);
  process.exit(1);
});
