import { describe, expect, it } from "vitest";
import type { Address } from "viem";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { ERC20_ABI } from "../config/abis";
import { getDefaultTokenAddress } from "../config/chains";
import { LOCAL_EXECUTION_API_BASE_URL } from "../config/endpoints";
import { ZyfaiSDK } from "../core/ZyfaiSDK";
import { freshFundedUserEnvReady, setupFreshFundedUser } from "./utils";

/** Base USDC — above reconciliation floor (0.1 USDC) but below rebalance minimum (1.5 USDC). Min portfolio checks are bypassed against local API. */
const CHAIN_ID = 8453;
const DEPOSIT_AMOUNT = 100_000n;
const FUNDING_ETH_AMOUNT = 20_000_000_000_000n;

describe.skipIf(!freshFundedUserEnvReady())(
  "send-deposit-wait-credit",
  { timeout: 480_000 },
  () => {
    it("sendDeposit registers handover_pending then waitForDepositCredit credits", async () => {
      const token = getDefaultTokenAddress(CHAIN_ID) as Address;
      const user = await setupFreshFundedUser({
        chain: base,
        token,
        depositAmount: DEPOSIT_AMOUNT,
        fundingEthAmount: FUNDING_ETH_AMOUNT,
        clientName: "send-deposit-wait-credit-integration",
      });

      const sdk = new ZyfaiSDK({
        apiKey: user.apiKey,
        executionApiUrl: LOCAL_EXECUTION_API_BASE_URL,
      });

      const userAddress = await sdk.connectAccount(user.privateKey, CHAIN_ID);

      const sendStart = Date.now();
      const sent = await sdk.sendDeposit(
        userAddress,
        CHAIN_ID,
        DEPOSIT_AMOUNT.toString(),
        "USDC",
      );
      const acceptanceMs = Date.now() - sendStart;

      expect(sent.success).toBe(true);
      expect(sent.txHash).toMatch(/^0x[0-9a-fA-F]{64}$/);
      expect(sent.smartWallet).toMatch(/^0x[0-9a-fA-F]{40}$/);
      expect(sent.amount).toBe(DEPOSIT_AMOUNT.toString());
      expect(sent.registration.id).toBeTruthy();
      expect(sent.registration.status).toBe("handover_pending");
      expect(sent.registration.balanceCredited).toBe(false);
      expect(sent.registration.statusUrl).toContain(sent.registration.id);

      const watchStart = Date.now();
      const credited = await sdk.waitForDepositCredit(
        sent.registration.id,
        CHAIN_ID,
      );
      const terminalMs = Date.now() - watchStart;

      expect(credited.status).toBe("credited");
      expect(credited.balanceCredited).toBe(true);
      expect(credited.id).toBe(sent.registration.id);

      const positions = await sdk.getPositions(userAddress, CHAIN_ID);
      expect(positions.portfolio?.ownershipTransferred).toBe(true);

      const publicClient = createPublicClient({
        chain: base,
        transport: http(),
      });
      const onChainBalance = await publicClient.readContract({
        address: token,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [sent.smartWallet as Address],
      });
      expect(onChainBalance).toBeGreaterThanOrEqual(DEPOSIT_AMOUNT);

      console.log(
        JSON.stringify({
          evidence: "send-deposit-wait-credit",
          depositId: sent.registration.id,
          userAddress,
          smartWallet: sent.smartWallet,
          chainId: CHAIN_ID,
          txHash: sent.txHash,
          depositAmount: DEPOSIT_AMOUNT.toString(),
          acceptanceMs,
          terminalMs,
          statusTransitions: {
            acceptance: sent.registration.status,
            terminal: credited.status,
          },
        }),
      );
    });
  },
);
