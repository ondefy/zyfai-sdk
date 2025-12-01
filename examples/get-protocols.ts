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
  await sdk.connectAccount(privateKey, chainId);

  console.log(`Fetching protocols for chain ${chainId}…`);
  const response = await sdk.getAvailableProtocols(chainId);

  const protocols = response.protocols || [];
  console.log(`Found ${protocols.length} protocols:\n`);

  if (protocols.length === 0) {
    console.log("No protocols returned from the API.");
  }

  protocols.forEach((protocol, index) => {
    console.log(`${index + 1}. ${protocol.name}`);
    console.log(`   Description: ${protocol.description || "n/a"}`);
    console.log();
  });
}

main().catch((error) => {
  console.error("Protocol script failed:", error);
  process.exit(1);
});
