import { describe, expect, it } from "vitest";
import { getMatchingProtocolIds } from "./protocol-selection";

const BASE = 8453;

const protocols = [
  {
    id: "safe-only",
    chains: [BASE],
    strategies: ["safe_strategy"],
    assets: [{ chainId: BASE, symbol: "USDC" }],
  },
  {
    id: "degen-only",
    chains: [BASE],
    strategies: ["degen_strategy"],
    assets: [{ chainId: BASE, symbol: "USDC" }],
  },
  {
    id: "async-only",
    chains: [BASE],
    strategies: ["async_strategy"],
    assets: [{ chainId: BASE, symbol: "USDC" }],
  },
];

describe("getMatchingProtocolIds", () => {
  it("keeps only safe protocols for a conservative user", () => {
    expect(
      getMatchingProtocolIds(protocols, "safe_strategy", [BASE], "USDC")
    ).toEqual(["safe-only"]);
  });

  it("adds degen protocols for an aggressive user", () => {
    expect(
      getMatchingProtocolIds(protocols, "degen_strategy", [BASE], "USDC")
    ).toEqual(["safe-only", "degen-only"]);
  });

  it("adds async protocols for a yieldmaxxing user", () => {
    expect(
      getMatchingProtocolIds(protocols, "async_strategy", [BASE], "USDC")
    ).toEqual(["safe-only", "degen-only", "async-only"]);
  });

  it("drops protocols that do not serve the asset on the selected chains", () => {
    expect(
      getMatchingProtocolIds(protocols, "async_strategy", [1], "USDC")
    ).toEqual([]);
  });
});

describe("getMatchingProtocolIds — NVDAc", () => {
  const protocols = [
    {
      id: "superform",
      chains: [1, 8453],
      strategies: ["async_strategy"],
      assets: [{ chainId: 8453, symbol: "NVDAc" }],
    },
    {
      id: "morpho",
      chains: [8453],
      strategies: ["safe_strategy"],
      assets: [{ chainId: 8453, symbol: "USDC" }],
    },
  ];

  it("selects the async protocol for a yieldmaxxing user", () => {
    expect(
      getMatchingProtocolIds(protocols, "async_strategy", [8453], "NVDAc")
    ).toEqual(["superform"]);
  });

  it("selects nothing for conservative or aggressive users", () => {
    expect(
      getMatchingProtocolIds(protocols, "safe_strategy", [8453], "NVDAc")
    ).toEqual([]);
    expect(
      getMatchingProtocolIds(protocols, "degen_strategy", [8453], "NVDAc")
    ).toEqual([]);
  });

  it("selects nothing on a chain where NVDAc does not exist", () => {
    expect(
      getMatchingProtocolIds(protocols, "async_strategy", [1], "NVDAc")
    ).toEqual([]);
  });
});
