/**
 * Example: Get Portfolio
 *
 * Retrieves detailed portfolio information for a user's smart wallet,
 * including fee-adjusted balances (`balanceWithFee`).
 *
 * Run: npx tsx examples/get-portfolio.ts
 */

import { config } from "dotenv";
import { formatUnits } from "viem";
import { ZyfaiSDK, type PortfolioAssetBalance } from "../src";

config();

function formatBalance(entry: PortfolioAssetBalance): {
  balance: string;
  balanceWithFee: string;
  feeDelta: string;
} {
  const decimals = entry.decimals;
  const gross = BigInt(entry.balance || "0x0");
  const net = BigInt(entry.balanceWithFee ?? entry.balance ?? "0x0");
  const fee = gross > net ? gross - net : 0n;

  return {
    balance: formatUnits(gross, decimals),
    balanceWithFee: formatUnits(net, decimals),
    feeDelta: formatUnits(fee, decimals),
  };
}

async function main() {
  const apiKey = process.env.ZYFAI_API_KEY;
  const privateKey = process.env.PRIVATE_KEY;

  if (!apiKey) {
    throw new Error("Missing ZYFAI_API_KEY environment variable");
  }

  if (!privateKey) {
    throw new Error("Missing PRIVATE_KEY environment variable");
  }

  const sdk = new ZyfaiSDK({ apiKey });

  // Connect account (signer). Portfolio target can be any EOA with a smart wallet.
  const connected = await sdk.connectAccount(privateKey as `0x${string}`, 8453);
  console.log("Connected:", connected);

  const targetEoa =
    process.env.PORTFOLIO_EOA ?? "0x233678715ab644073512C513d00a0f0b922C2074";

  console.log("\nFetching portfolio for:", targetEoa, "\n");
  const portfolio = await sdk.getPortfolio(targetEoa);

  if (!portfolio.success) {
    console.log("Failed to get portfolio");
    return;
  }

  const data = portfolio.portfolio;

  if (!data || Object.keys(data).length === 0) {
    console.log("No positions found. Deploy a Safe and deposit funds first.");
    return;
  }

  console.log("hasBalance:", data.hasBalance);
  console.log("hasActiveSessionKey:", data.hasActiveSessionKey);
  console.log("positions:", data.positions?.length ?? 0);

  // Readable portfolioByAssetType (hex -> human)
  console.log("\nportfolioByAssetType (human-readable):");
  console.log("-".repeat(60));

  const byAsset = data.portfolioByAssetType || {};
  for (const [asset, entry] of Object.entries(byAsset)) {
    const { balance, balanceWithFee, feeDelta } = formatBalance(entry);
    console.log(
      `  ${asset.toUpperCase().padEnd(6)}  balance=${balance.padStart(18)}  ` +
        `withFee=${balanceWithFee.padStart(18)}  fee=${feeDelta}`
    );
  }

  // Readable portfolioByChain
  console.log("\nportfolioByChain (human-readable):");
  console.log("-".repeat(60));

  const byChain = data.portfolioByChain || {};
  for (const [chainId, assets] of Object.entries(byChain)) {
    console.log(`  chain ${chainId}:`);
    for (const [asset, entry] of Object.entries(assets)) {
      const { balance, balanceWithFee, feeDelta } = formatBalance(entry);
      const gross = BigInt(entry.balance || "0x0");
      if (gross === 0n) continue;
      console.log(
        `    ${asset.toUpperCase().padEnd(6)}  balance=${balance.padStart(18)}  ` +
          `withFee=${balanceWithFee.padStart(18)}  fee=${feeDelta}`
      );
    }
  }

  // Positions summary
  if (data.positions?.length) {
    console.log("\npositions:");
    console.log("-".repeat(60));
    for (const pos of data.positions) {
      const decimals = pos.decimals ?? 6;
      const underlying = pos.underlyingAmount
        ? formatUnits(BigInt(pos.underlyingAmount), decimals)
        : "n/a";
      const withFee = pos.underlyingAmountWithFee
        ? formatUnits(BigInt(pos.underlyingAmountWithFee), decimals)
        : "n/a";
      console.log(
        `  [${pos.chain}] ${pos.token_symbol} @ ${pos.pool ?? pos.protocol_name}`
      );
      console.log(`    underlying=${underlying}  withFee=${withFee}`);
    }
  }
}

main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});
