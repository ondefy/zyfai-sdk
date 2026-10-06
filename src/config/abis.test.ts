import { describe, expect, it } from "vitest";
import {
  ERC20_TRANSFER_LEGACY_ABI,
  ERC20_TRANSFER_WITH_BOOL_ABI,
  erc20TransferWriteAbi,
} from "./abis";

describe("erc20TransferWriteAbi", () => {
  it("uses legacy transfer ABI for USDT (no return data)", () => {
    expect(erc20TransferWriteAbi("USDT")).toBe(ERC20_TRANSFER_LEGACY_ABI);
    expect(ERC20_TRANSFER_LEGACY_ABI[0].outputs).toEqual([]);
  });

  it("uses bool-return transfer ABI for other deposit assets", () => {
    expect(erc20TransferWriteAbi("USDC")).toBe(ERC20_TRANSFER_WITH_BOOL_ABI);
    expect(erc20TransferWriteAbi("PYUSD")).toBe(ERC20_TRANSFER_WITH_BOOL_ABI);
    expect(ERC20_TRANSFER_WITH_BOOL_ABI[0].outputs).toEqual([
      { name: "", type: "bool" },
    ]);
  });
});
