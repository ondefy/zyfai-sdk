import { describe, expect, it } from "vitest";
import { NATIVE_CURRENCY, resolveDepositRoute } from "./deposit-route";

const BASE_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const BASE_WETH = "0x4200000000000000000000000000000000000006";

describe("resolveDepositRoute", () => {
  it("treats a collateral symbol on its chain as a direct deposit", () => {
    expect(
      resolveDepositRoute({ chainId: 8453, asset: "USDC" }),
    ).toEqual({ kind: "direct", asset: "USDC" });
  });

  it("treats the collateral contract on the same chain as a direct deposit", () => {
    expect(
      resolveDepositRoute({
        chainId: 8453,
        asset: "usdc",
        spendToken: BASE_USDC,
      }),
    ).toEqual({ kind: "direct", asset: "USDC" });
  });

  it("swaps a token that is not the destination collateral", () => {
    expect(
      resolveDepositRoute({
        chainId: 8453,
        asset: "USDC",
        spendToken: "0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed",
      }),
    ).toEqual({
      kind: "swap",
      originChainId: 8453,
      originCurrency: "0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed",
      destinationAsset: "USDC",
    });
  });

  it("swaps the same collateral when it is held on another chain", () => {
    expect(
      resolveDepositRoute({
        chainId: 8453,
        asset: "USDC",
        spendToken: "USDC",
        spendChainId: 42161,
      }).kind,
    ).toBe("swap");
  });

  it("swaps one collateral into another on the same chain", () => {
    const route = resolveDepositRoute({
      chainId: 8453,
      asset: "WETH",
      spendToken: "USDC",
    });
    expect(route).toMatchObject({
      kind: "swap",
      originCurrency: BASE_USDC,
      destinationAsset: "WETH",
    });
  });

  it("wraps same-chain native ETH into WETH", () => {
    expect(
      resolveDepositRoute({
        chainId: 8453,
        asset: "WETH",
        spendToken: "ETH",
      }),
    ).toEqual({ kind: "wrap", asset: "WETH" });
    expect(
      resolveDepositRoute({
        chainId: 1,
        asset: "WETH",
        spendToken: NATIVE_CURRENCY,
      }).kind,
    ).toBe("wrap");
  });

  it("swaps native ETH into a non-WETH collateral", () => {
    expect(
      resolveDepositRoute({
        chainId: 8453,
        asset: "EURC",
        spendToken: "ETH",
        spendChainId: 1,
      }),
    ).toMatchObject({
      kind: "swap",
      originChainId: 1,
      originCurrency: NATIVE_CURRENCY,
      destinationAsset: "EURC",
    });
  });

  it("quotes a Relay destination the SDK cannot transfer directly", () => {
    expect(
      resolveDepositRoute({
        chainId: 8453,
        asset: "cbBTC",
        spendToken: BASE_USDC,
      }),
    ).toMatchObject({ kind: "swap", destinationAsset: "CBBTC" });
  });

  it("rejects a direct transfer of a collateral the SDK has no address for", () => {
    expect(() =>
      resolveDepositRoute({ chainId: 8453, asset: "cbBTC" }),
    ).toThrow(/cannot be transferred directly/);
  });

  it("rejects a spend token that is neither an address nor a collateral symbol", () => {
    expect(() =>
      resolveDepositRoute({
        chainId: 8453,
        asset: "USDC",
        spendToken: "DEGEN",
      }),
    ).toThrow(/contract address/);
  });

  it("uses the WETH contract when resolving a same-chain collateral spend", () => {
    expect(
      resolveDepositRoute({
        chainId: 8453,
        asset: "USDC",
        spendToken: BASE_WETH,
      }),
    ).toMatchObject({ kind: "swap", originCurrency: BASE_WETH });
  });
});
