/**
 * Example: Subscribe to Real-Time Events
 *
 * Demonstrates listening to Zyfai risk and liquidity events via WebSocket.
 * Events: depeg, liquidity_trap, liquidity_restored, pool_status_change,
 *         new_collateral_detected, liquidity_drop
 */

import { config } from "dotenv";
import { ZyfaiSDK } from "../dist/index";

config();

async function main() {
  const apiKey = process.env.ZYFAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing env var. Please set ZYFAI_API_KEY.");
  }

  const sdk = new ZyfaiSDK({ apiKey });

  console.log("Connecting to event stream...");

  const unsubscribe = sdk.subscribeToEvents({
    onDepeg: (data) => {
      console.log(`[depeg] ${data.token} — severity: ${data.severity}, deviation: ${data.deviation}`);
      console.log(`  Affected pools: ${data.affectedPools.map((p) => `${p.protocol}/${p.pool}`).join(", ")}`);
    },
    onLiquidityTrap: (data) => {
      console.log(`[liquidity_trap] ${data.protocol}/${data.pool} on ${data.chain} — ratio: ${data.ratio}`);
    },
    onLiquidityRestored: (data) => {
      console.log(`[liquidity_restored] ${data.protocol}/${data.pool} on ${data.chain}`);
    },
    onPoolStatusChange: (data) => {
      console.log(`[pool_status_change] ${data.protocol_name}/${data.pool_name} — status: ${data.status}`);
    },
    onNewCollateralDetected: (data) => {
      console.log(`[new_collateral_detected] ${data.asset} in ${data.protocol}/${data.pool} — ${data.percentOfTvl}% of TVL`);
    },
    onLiquidityDrop: (data) => {
      console.log(`[liquidity_drop] ${data.protocol}/${data.pool} — drop: ${data.dropPercent}% over ${data.windowMinutes}min`);
    },
    onError: (err) => {
      console.error("[ws error]", err);
    },
  });

  console.log("Listening for events. Press Ctrl+C to stop.\n");

  process.on("SIGINT", () => {
    console.log("\nClosing connection...");
    unsubscribe();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error("Script failed:", error);
  process.exit(1);
});
