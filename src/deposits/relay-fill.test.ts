import { describe, expect, it } from "vitest";
import {
  collectRelayDestinationTxHashes,
  collectRelaySourceTxHashes,
  selectRelayCreditTxHash,
} from "./relay-fill";

const TOKEN = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const SAFE = "0x00000000000000000000000000000000000000aa";
const TRANSFER =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

describe("relay fill selection", () => {
  it("splits origin and destination hashes by chain", () => {
    const execution = {
      steps: [
        {
          items: [
            {
              txHashes: [
                { txHash: "0xorigin", chainId: 42161 },
                { txHash: "0xdest", chainId: 8453 },
              ],
            },
          ],
        },
      ],
    };
    expect(collectRelaySourceTxHashes(execution, 42161)).toEqual(["0xorigin"]);
    expect(collectRelayDestinationTxHashes(execution, 8453)).toEqual([
      "0xdest",
    ]);
  });

  it("picks the receipt that transfers the collateral to the Safe", () => {
    const paddedSafe = `0x${"0".repeat(24)}00000000000000000000000000000000000000aa`;
    const hash = selectRelayCreditTxHash({
      candidates: ["0xother", "0xcredit"],
      token: TOKEN,
      recipient: SAFE,
      receipts: new Map([
        [
          "0xother",
          {
            status: "success",
            logs: [
              {
                address: TOKEN,
                topics: [TRANSFER, `0x${"1".repeat(64)}`, paddedSafe],
                data: "0x0",
              },
            ],
          },
        ],
        [
          "0xcredit",
          {
            status: "success",
            logs: [
              {
                address: TOKEN,
                topics: [TRANSFER, `0x${"2".repeat(64)}`, paddedSafe],
                data: "0x0a",
              },
            ],
          },
        ],
      ]),
    });
    expect(hash).toBe("0xcredit");
  });
});
