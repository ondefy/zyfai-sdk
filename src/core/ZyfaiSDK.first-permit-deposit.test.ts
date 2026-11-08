import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDefaultTokenAddress } from "../config/chains";
import { ENDPOINTS } from "../config/endpoints";
import { ZyfaiSDK } from "./ZyfaiSDK";

const chainId = 8453;
const owner = "0x1111111111111111111111111111111111111111";
const safe = "0x2222222222222222222222222222222222222222";
const token = getDefaultTokenAddress(chainId);
const amount = "10000000";
const txHash = `0x${"12".repeat(32)}`;
const deposit = { id: "deposit", status: "handover_pending", balanceCredited: false };
const registered = {
  id: "permit", status: "registered", chainId, token, amount, txHash, depositId: deposit.id,
};
const prepare = () => ({
  id: "permit",
  domain: { name: "USD Coin", version: "2", chainId, verifyingContract: token },
  message: { owner, spender: safe, value: amount, nonce: "0", deadline: Math.floor(Date.now() / 1000) + 300 },
});

vi.mock("../utils/safe-account", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../utils/safe-account")>()),
  isSafeDeployed: vi.fn(async () => false),
}));

const waitForTransactionReceipt = vi.hoisted(() => vi.fn(async () => ({ status: "success" })));
vi.mock("../config/chains", async (importOriginal) => {
  const config = await importOriginal<typeof import("../config/chains")>();
  return {
    ...config,
    getChainConfig: (...args: Parameters<typeof config.getChainConfig>) => ({
      ...config.getChainConfig(...args),
      publicClient: { waitForTransactionReceipt },
    }),
  };
});

describe("SDK first permit deposit", () => {
  const get = vi.fn();
  const post = vi.fn();
  const signTypedData = vi.fn();
  const writeContract = vi.fn();

  const makeSdk = () => {
    const sdk = ZyfaiSDK.forUser(
      { apiKey: "test-key", bypassMinPortfolio: true },
      { accessToken: "test-jwt", eoa: owner, userId: "user" },
    );
    Object.assign(sdk, {
      httpClient: { get, post, hasAuthToken: () => true },
      walletClient: { account: { address: owner }, chain: { id: chainId }, signTypedData, writeContract },
    });
    vi.spyOn(sdk, "ensureFirstDepositSetup").mockResolvedValue({ applied: false });
    return sdk;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    signTypedData.mockReset().mockResolvedValue("0xsigned");
    writeContract.mockResolvedValue(txHash);
    get.mockImplementation(async (path: string) => {
      if (path === ENDPOINTS.USER_ME) return { predeployed: true, smartWallet: safe };
      if (path === ENDPOINTS.FIRST_PERMIT_DEPOSIT) {
        return { enabledTokens: [`${chainId}:${token.toLowerCase()}`], intent: null };
      }
      if (path === ENDPOINTS.DEPOSIT_STATUS(deposit.id)) return deposit;
      throw new Error(`Unexpected GET ${path}`);
    });
    post.mockImplementation(async (path: string) => {
      if (path === ENDPOINTS.FIRST_PERMIT_DEPOSIT_PREPARE) return prepare();
      if (path === ENDPOINTS.FIRST_PERMIT_DEPOSIT_SUBMIT("permit")) return registered;
      if (path === ENDPOINTS.LOG_DEPOSIT) return deposit;
      throw new Error(`Unexpected POST ${path}`);
    });
  });

  it("signs an exact permit by default and returns the existing registration", async () => {
    const sdk = makeSdk();
    const result = await sdk.sendDeposit({ userAddress: owner, chainId, amount, asset: "USDC" });

    expect(post).toHaveBeenCalledWith(ENDPOINTS.FIRST_PERMIT_DEPOSIT_PREPARE, { owner, chainId, token, amount });
    expect(signTypedData).toHaveBeenCalledWith(expect.objectContaining({
      primaryType: "Permit",
      message: expect.objectContaining({ owner, spender: safe, value: 10000000n }),
    }));
    expect(signTypedData).toHaveBeenCalledTimes(1);
    expect(writeContract).not.toHaveBeenCalled();
    expect(post).not.toHaveBeenCalledWith(ENDPOINTS.LOG_DEPOSIT, expect.anything());
    expect(result).toMatchObject({ txHash, smartWallet: safe, amount, route: "direct", registration: deposit });
  });

  it("uses the transfer path when the chain and token are outside the allowlist", async () => {
    const defaultGet = get.getMockImplementation()!;
    get.mockImplementation(async (path: string) => path === ENDPOINTS.FIRST_PERMIT_DEPOSIT
      ? { enabledTokens: [], intent: null }
      : defaultGet(path));
    await makeSdk().sendDeposit(owner, chainId, amount, "USDC");

    expect(signTypedData).not.toHaveBeenCalled();
    expect(writeContract).toHaveBeenCalledWith(expect.objectContaining({ functionName: "transfer" }));
    expect(post).toHaveBeenCalledWith(ENDPOINTS.LOG_DEPOSIT, expect.objectContaining({ transaction: txHash }));
  });

  it("uses the transfer path with an older API that has no permit status route", async () => {
    const defaultGet = get.getMockImplementation()!;
    get.mockImplementation(async (path: string) => {
      if (path === ENDPOINTS.FIRST_PERMIT_DEPOSIT) {
        throw Object.assign(new Error(`Not found: Cannot GET /api/v1${path}`), { status: 404 });
      }
      return defaultGet(path);
    });
    await makeSdk().sendDeposit(owner, chainId, amount, "USDC");

    expect(signTypedData).not.toHaveBeenCalled();
    expect(writeContract).toHaveBeenCalledTimes(1);
  });

  it("keeps the permit path after a wallet rejection", async () => {
    signTypedData.mockRejectedValueOnce(new Error("User rejected signature"));
    await expect(makeSdk().sendDirectDeposit(owner, chainId, amount, "USDC")).rejects.toThrow("User rejected signature");
    expect(writeContract).not.toHaveBeenCalled();
    expect(post).not.toHaveBeenCalledWith(ENDPOINTS.FIRST_PERMIT_DEPOSIT_SUBMIT("permit"), expect.anything());
  });

  it("checks the prepared recipient before prompting for a signature", async () => {
    const invalid = prepare();
    invalid.message = { ...invalid.message, spender: owner };
    post.mockResolvedValueOnce(invalid);
    await expect(makeSdk().sendDeposit(owner, chainId, amount, "USDC")).rejects.toThrow("Prepared permit does not match");
    expect(signTypedData).not.toHaveBeenCalled();
    expect(writeContract).not.toHaveBeenCalled();
  });

  it("recovers a submitted intent after a lost response without sending a transfer", async () => {
    const defaultPost = post.getMockImplementation()!;
    post.mockImplementation(async (path: string) => {
      if (path === ENDPOINTS.FIRST_PERMIT_DEPOSIT_SUBMIT("permit")) {
        const defaultGet = get.getMockImplementation()!;
        get.mockImplementation(async (nextPath: string) => nextPath === ENDPOINTS.FIRST_PERMIT_DEPOSIT
          ? { enabledTokens: [], intent: registered }
          : defaultGet(nextPath));
        throw new Error("Network error");
      }
      return defaultPost(path);
    });

    const sdk = makeSdk();
    await expect(sdk.sendDeposit(owner, chainId, amount, "USDC")).resolves.toMatchObject({ registration: deposit });
    await expect(sdk.getFirstPermitDepositStatus(owner)).resolves.toEqual(registered);
    expect(signTypedData).toHaveBeenCalledTimes(1);
    expect(writeContract).not.toHaveBeenCalled();
  });
});
