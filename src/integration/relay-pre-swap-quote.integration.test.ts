import { getAddress } from "viem";
import { expect, it } from "vitest";
import {
  describeIntegrationSuite,
  integrationApiUrls,
  integrationEnvironment,
  integrationExecutionClient,
  integrationSdkConfig,
  logIntegrationEvidence,
  selectRelayQuoteSpend,
  type RelayFundingBalanceToken,
} from "./utils";

const CHAIN_ID = 8453;
const NATIVE_CURRENCY = "0x0000000000000000000000000000000000000000";
const QUOTE_TIMEOUT_MS = 60_000;

/** Enabled dashboard assets other than USDC and WETH. cbETH stays off this list. */
const NON_USDC_WETH_DESTINATIONS = [
  { destinationAsset: "EURC", destinationChainId: 8453 },
  { destinationAsset: "CBBTC", destinationChainId: 8453 },
  { destinationAsset: "NVDAC", destinationChainId: 8453 },
  { destinationAsset: "EURC", destinationChainId: 1 },
] as const;

type FundingQuote = {
  orderId: string;
  status: string;
  spend: string;
  expectedOutput: string;
  minimumOutput: string;
  destinationChainId: number;
  destinationCurrency: string;
  fees: { name: string; amount: string }[];
  investEligible: boolean;
  quote: {
    details?: {
      recipient?: string;
      currencyOut?: {
        amount?: string;
        minimumAmount?: string;
        currency?: { address?: string; chainId?: number };
      };
    };
  };
};

describeIntegrationSuite(
  "relay-pre-swap-quote",
  { spendProfile: "readonly", timeout: 180_000 },
  () => {
    it("quotes an enabled non-USDC destination into the signed-in Safe", async () => {
      expect(integrationEnvironment()).toBe("local");
      expect(integrationApiUrls().executionApiUrl).toBe("http://localhost:3000");

      const { ZyfaiSDK } = await import("../core/ZyfaiSDK");
      const sdk = new ZyfaiSDK(integrationSdkConfig());
      const userAddress = await sdk.connectAccount(
        process.env.PRIVATE_KEY!,
        CHAIN_ID,
      );
      const wallet = await sdk.getSmartWalletAddress(userAddress, CHAIN_ID);
      const http = integrationExecutionClient(sdk);

      const acceptStart = Date.now();
      await expect(
        http.post("/users/me/funding-orders", {
          originChainId: CHAIN_ID,
          destinationChainId: CHAIN_ID,
          originCurrency: NATIVE_CURRENCY,
          originAmount: "1",
          destinationAsset: "WETH",
          fundingWallet: userAddress,
        }),
      ).rejects.toThrow(/ETH wrap/);

      await expect(
        http.post("/users/me/funding-orders", {
          originChainId: CHAIN_ID,
          destinationChainId: CHAIN_ID,
          originCurrency: NATIVE_CURRENCY,
          originAmount: "1",
          destinationAsset: "CBETH",
          fundingWallet: userAddress,
        }),
      ).rejects.toThrow(
        /Validation failed|destinationAsset|Unsupported destination asset/,
      );

      const balances = await http.get<{ tokens: RelayFundingBalanceToken[] }>(
        "/users/me/funding-balances",
        { params: { wallet: userAddress } },
      );
      const spend = selectRelayQuoteSpend(
        balances.tokens ?? [],
        NON_USDC_WETH_DESTINATIONS,
      );
      expect(
        spend,
        `No Zerion position can fund a non-USDC/WETH quote (${(balances.tokens ?? [])
          .map((token) => `${token.symbol}:${token.chainId}`)
          .join(",")})`,
      ).not.toBeNull();

      const created = await http.post<FundingQuote>(
        "/users/me/funding-orders",
        {
          originChainId: spend!.originChainId,
          destinationChainId: spend!.destinationChainId,
          originCurrency: spend!.originCurrency,
          originAmount: spend!.originAmount,
          destinationAsset: spend!.destinationAsset,
          fundingWallet: userAddress,
        },
        { timeout: QUOTE_TIMEOUT_MS },
      );
      const acceptanceMs = Date.now() - acceptStart;

      expect(created.status).toBe("quote_ready");
      expect(spend!.destinationAsset).not.toMatch(/^(USDC|WETH)$/);
      expect(created.spend).toBe(spend!.originAmount);
      expect(BigInt(created.expectedOutput)).toBeGreaterThan(0n);
      expect(BigInt(created.minimumOutput)).toBeGreaterThan(0n);
      expect(BigInt(created.minimumOutput)).toBeLessThanOrEqual(
        BigInt(created.expectedOutput),
      );
      expect(Array.isArray(created.fees)).toBe(true);
      expect(typeof created.investEligible).toBe("boolean");
      expect(created.destinationChainId).toBe(spend!.destinationChainId);
      expect(getAddress(created.destinationCurrency)).toMatch(/^0x[0-9a-fA-F]{40}$/);

      const details = created.quote.details;
      expect(details?.recipient).toBeTruthy();
      expect(getAddress(details!.recipient!)).toBe(getAddress(wallet.address));
      expect(getAddress(details!.currencyOut!.currency!.address!)).toBe(
        getAddress(created.destinationCurrency),
      );
      expect(Number(details!.currencyOut!.currency!.chainId)).toBe(
        spend!.destinationChainId,
      );
      expect(getAddress(created.destinationCurrency)).not.toBe(
        getAddress(spend!.originCurrency),
      );

      const refreshStart = Date.now();
      const refreshed = await http.post<{
        orderId: string;
        quote: FundingQuote["quote"];
      }>(
        `/users/me/funding-orders/${created.orderId}/quote`,
        undefined,
        { timeout: QUOTE_TIMEOUT_MS },
      );
      const refreshMs = Date.now() - refreshStart;

      expect(refreshed.orderId).toBe(created.orderId);
      expect(getAddress(refreshed.quote.details!.recipient!)).toBe(
        getAddress(wallet.address),
      );
      expect(
        getAddress(refreshed.quote.details!.currencyOut!.currency!.address!),
      ).toBe(getAddress(created.destinationCurrency));
      expect(Number(refreshed.quote.details!.currencyOut!.currency!.chainId)).toBe(
        spend!.destinationChainId,
      );

      const stored = await http.get<{
        id: string;
        status: string;
        depositId: string | null;
        sourceTxHashes: string[];
        destinationAsset: string;
        destinationCurrency: string;
        destinationChainId: number;
      }>(`/users/me/funding-orders/${created.orderId}`);

      expect(stored.status).toBe("quote_ready");
      expect(stored.depositId).toBeNull();
      expect(stored.sourceTxHashes).toEqual([]);
      expect(stored.destinationAsset).toBe(spend!.destinationAsset);
      expect(getAddress(stored.destinationCurrency)).toBe(
        getAddress(created.destinationCurrency),
      );

      logIntegrationEvidence("relay-pre-swap-quote", {
        chainId: spend!.destinationChainId,
        userAddress,
        smartWallet: wallet.address,
        orderId: created.orderId,
        status: stored.status,
        originSymbol: spend!.symbol,
        originChainId: spend!.originChainId,
        destinationAsset: spend!.destinationAsset,
        expectedOutput: created.expectedOutput,
        minimumOutput: created.minimumOutput,
        investEligible: created.investEligible,
        acceptanceMs,
        refreshMs,
        depositId: stored.depositId,
      });
    });
  },
);
