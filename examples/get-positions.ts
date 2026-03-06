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

  const chainId = Number(process.env.CHAIN_ID ?? 8453) as SupportedChainId;

  const sdk = new ZyfaiSDK({
    apiKey,
  });

  console.log("SDK initialized. Connecting account…");
  const connected = await sdk.connectAccount(privateKey, chainId);
  console.log(`Connected EOA: ${connected}`);

  console.log(`Fetching positions for ${connected}…`);
  const response = await sdk.getPositions(connected, chainId);
  
  console.log('response:', response);
  console.log('response.portfolio.staleBalances:', response.portfolio?.staleBalances);

  const portfolio = response?.portfolio;
  console.log(`Portfolio found: ${portfolio ? "Yes" : "No"}`);

  if (!portfolio) {
    console.log("No active positions found.");
    return;
  }

  const slots = portfolio.positions ?? [];
  slots.forEach((slot: any, slotIndex: number) => {
    console.log(`  Slot ${slotIndex + 1}:`);
    console.log(`    Chain: ${slot.chain ?? "n/a"}`);
    console.log(`    Protocol: ${slot.protocol_name ?? slot.protocol_id}`);
    console.log(`    Pool: ${slot.pool ?? "n/a"}`);
    console.log(`    Token: ${slot.token_symbol ?? "n/a"}`);
    console.log(
      `    Underlying Amount: ${slot.underlyingAmount ?? slot.amount ?? "0"}`
    );
    console.log(`    Pool APY: ${slot.pool_apy ?? "n/a"}%`);
    console.log(`    Pool TVL: $${slot.pool_tvl ?? "n/a"}`);
  });
}

main().catch((error) => {
  console.error("Positions script failed:", error);
  process.exit(1);
});
