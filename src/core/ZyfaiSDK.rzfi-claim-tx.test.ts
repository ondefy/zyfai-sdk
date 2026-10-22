import { beforeEach, describe, expect, it, vi } from "vitest";
import { decodeFunctionData, getAddress, slice, type Hex } from "viem";
import {
  MERKL_DISTRIBUTOR_ABI,
  MERKL_DISTRIBUTOR_ADDRESS,
  RZFI_TOKEN_ADDRESS,
  SAFE_ABI,
} from "../config/abis";
import { ENDPOINTS } from "../config/endpoints";

const OWNER = getAddress("0x1111111111111111111111111111111111111111");
const SAFE = getAddress("0x3333333333333333333333333333333333333333");
const ROOT = `0x${"11".repeat(32)}` as Hex;
const PROOF = `0x${"ab".repeat(32)}` as Hex;

const mockHttpClient = {
  setAuthToken: vi.fn(),
  hasAuthToken: vi.fn(() => false),
  get: vi.fn(),
};
const chain = {
  owners: [OWNER] as string[],
  threshold: 1n,
  claimed: 2n * 10n ** 18n,
  root: ROOT,
};

vi.mock("../utils/http-client", () => ({
  HttpClient: vi.fn(function HttpClientMock() {
    return mockHttpClient;
  }),
}));

vi.mock("../config/chains", async () => {
  const actual =
    await vi.importActual<typeof import("../config/chains")>(
      "../config/chains",
    );
  return {
    ...actual,
    getChainConfig: () => ({
      publicClient: {
        readContract: async ({ functionName }: { functionName: string }) =>
          ({
            getOwners: chain.owners,
            getThreshold: chain.threshold,
            claimed: [chain.claimed, 0, ROOT],
            getMerkleRoot: chain.root,
          })[functionName],
      },
    }),
  };
});

import { ZyfaiSDK } from "./ZyfaiSDK";

const merklResponse = (amount: bigint) => [
  {
    rewards: [
      {
        amount: amount.toString(),
        root: ROOT,
        proofs: [PROOF],
        token: { address: RZFI_TOKEN_ADDRESS },
      },
    ],
  },
];

describe("buildRzfiClaimTransaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(chain, {
      owners: [OWNER],
      threshold: 1n,
      claimed: 2n * 10n ** 18n,
      root: ROOT,
    });
    mockHttpClient.get.mockImplementation(async (url: string) => {
      if (url.includes("by-eoa")) return { agent: SAFE, chains: [8453] };
      throw new Error(`unexpected GET ${url}`);
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => merklResponse(5n * 10n ** 18n),
      })),
    );
  });

  const build = () =>
    new ZyfaiSDK("test-api-key").buildRzfiClaimTransaction(OWNER);

  it("returns an unsigned Safe transaction that claims the cumulative rZFI", async () => {
    const tx = await build();

    expect(tx).toMatchObject({
      safeAddress: SAFE,
      chainId: 8453,
      claimableAmount: (3n * 10n ** 18n).toString(),
      to: SAFE,
      value: "0",
    });

    const exec = decodeFunctionData({ abi: SAFE_ABI, data: tx.data });
    expect(exec.functionName).toBe("execTransaction");
    const [to, value, data, operation, , , , , , signature] =
      exec.args as readonly [string, bigint, Hex, number, ...unknown[]];
    expect(to).toBe(MERKL_DISTRIBUTOR_ADDRESS);
    expect(value).toBe(0n);
    expect(operation).toBe(0);
    // Safe "approved by sender" signature: r = owner, s = 0, v = 1.
    const sig = signature as Hex;
    expect(getAddress(slice(sig, 12, 32))).toBe(OWNER);
    expect(slice(sig, 64, 65)).toBe("0x01");

    const claim = decodeFunctionData({ abi: MERKL_DISTRIBUTOR_ABI, data });
    expect(claim.args).toEqual([
      [SAFE],
      [RZFI_TOKEN_ADDRESS],
      [5n * 10n ** 18n],
      [[PROOF]],
    ]);
    expect(mockHttpClient.get).toHaveBeenCalledWith(
      expect.stringContaining(ENDPOINTS.DATA_BY_EOA(OWNER).split("?")[0]),
    );
  });

  it("throws when everything is already claimed", async () => {
    chain.claimed = 5n * 10n ** 18n;
    await expect(build()).rejects.toThrow("No rZFI available to claim");
  });

  it("throws while the Merkl proofs are not live on-chain", async () => {
    chain.root = `0x${"22".repeat(32)}` as Hex;
    await expect(build()).rejects.toThrow(/Retry in a few minutes/);
  });

  it("refuses when userAddress is not the Safe's only owner", async () => {
    chain.owners = ["0x2222222222222222222222222222222222222222"];
    await expect(build()).rejects.toThrow(/not the only owner/);

    chain.owners = [OWNER];
    chain.threshold = 2n;
    await expect(build()).rejects.toThrow(/not the only owner/);
  });
});
